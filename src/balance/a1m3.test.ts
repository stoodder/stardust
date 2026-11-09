// A1M3's tuning is robust where it matters (T304e): with W6–W8's Haulers released a little closer
// together or further apart, Gerald's passes a little earlier or later, W4's Chonks ±0.2 s apart,
// and W5–W8's other groups shifted ±0.2 s, the harness's verdicts still hold: par wins in band and
// earns Return to Sender, Orbital Strike Mk II still changes par's result (T228), both no-counter
// builds lose (also on the full catalog), early calls stay winnable, and the alt builds keep their
// floors and the no-single-wave-wall rule. The waves and builds are documented in
// docs/story/campaign/act1.md § A1M3.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { RawContent, WaveDef, WaveGroup } from '../content/types.ts';
import { runMap } from './harness.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const raw = RAW_CONTENT.maps.a1_m03;
const content = compileContent(RAW_CONTENT);

/** The content with each group in `waves` (1-based) passed through `patch`. */
function shifted(waves: readonly number[], patch: (g: WaveGroup) => WaveGroup): typeof content {
  const ws = raw.waves.map((w: WaveDef, i): WaveDef =>
    waves.includes(i + 1) ? { ...w, groups: w.groups.map(patch) } : w,
  );
  const next: RawContent = {
    ...RAW_CONTENT,
    maps: { ...RAW_CONTENT.maps, a1_m03: { ...raw, waves: ws } },
  };
  return compileContent(next);
}

/** Every failing check (`except` names checks a shift may legitimately move). */
function failures(c: typeof content, except: readonly string[] = []): string[] {
  return runMap(c, 'a1_m03', { seeds: 1 })
    .checks.filter((k) => !k.ok && !except.includes(k.id))
    .map((k) => `#${k.id} ${k.title}`);
}

const gap =
  (d: number) =>
  (g: WaveGroup): WaveGroup =>
    g.enemy === 'hauler' && g.intervalSec !== undefined
      ? { ...g, intervalSec: g.intervalSec + d }
      : g;
/** Shifts `enemy`'s groups `d` s later (a group at the wave's start stays there). */
const delay =
  (enemy: string, d: number) =>
  (g: WaveGroup): WaveGroup =>
    g.enemy === enemy ? { ...g, delaySec: Math.max(0, (g.delaySec ?? 0) + d) } : g;

// Each test re-runs a whole map's harness (with its R&D pick): seconds, not milliseconds.
describe('A1M3 balance', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  it('passes every harness check as tuned', () => {
    const report = runMap(content, 'a1_m03', { seeds: 1 });
    expect(report.checks.filter((k) => !k.ok).map((k) => k.id)).toEqual([]);
  });

  it.each([-1, -0.5, 0.5, 1])('holds with W6–W8’s Haulers %s s further apart', (d) => {
    expect(failures(shifted([6, 7, 8], gap(d)))).toEqual([]);
  });

  it.each([
    [5, 'zoomer'],
    [6, 'puffwing'],
    [7, 'nibbler'],
    [8, 'zoomer'],
  ] as const)('holds with W%i’s %s groups ±0.2 s later', (wave, enemy) => {
    for (const d of [-0.2, 0.2]) {
      expect({ d, failed: failures(shifted([wave], delay(enemy, d))) }).toEqual({ d, failed: [] });
    }
  });

  it('holds with Gerald’s W4 and W7 passes ±1 s', () => {
    for (const d of [-1, 1]) {
      expect({ d, failed: failures(shifted([4, 7], delay('gerald', d))) }).toEqual({
        d,
        failed: [],
      });
    }
  });

  it.each([-0.2, 0.2])('holds with W4’s Chonks %s s further apart (Mk II still decides)', (d) => {
    const wider = (g: WaveGroup): WaveGroup =>
      g.enemy === 'chonk' ? { ...g, intervalSec: g.intervalSec! + d } : g;
    expect(failures(shifted([4], wider))).toEqual([]);
  });

  it('spaces W4’s Chonks wider than a Mk I strike covers and within Mk II’s (T228)', () => {
    const chonks = raw.waves[3]!.groups.find((g) => g.enemy === 'chonk')!;
    const strike = content.abilities.orbital_strike.effect;
    expect(strike.kind).toBe('strike');
    const radius = strike.kind === 'strike' ? strike.radiusTiles : 0;
    const speed = content.enemies.chonk.speedTilesPerTick * 60;
    const length = (chonks.count - 1) * chonks.intervalSec! * speed;
    expect(length).toBeGreaterThan(2 * radius); // Mk I (1.5): 3 tiles
    expect(length).toBeLessThanOrEqual(2 * (radius + 0.5)); // Mk II (2.0): 4 tiles
  });

  it('releases W6–W8’s Haulers one at a time, further apart than a strike covers (D052)', () => {
    const strike = content.abilities.orbital_strike.effect;
    const radius = strike.kind === 'strike' ? strike.radiusTiles + 0.5 : Infinity;
    for (const w of [5, 6, 7]) {
      const h = raw.waves[w]!.groups.find((g) => g.enemy === 'hauler')!;
      expect(h.intervalSec! * content.enemies.hauler.speedTilesPerTick * 60).toBeGreaterThan(
        2 * radius,
      );
    }
  });
});
