// A1M4's tuning is robust where it matters (T304f): with W5's Chonks ±0.2 s apart, W7's and W9's
// Haulers 1 s closer or further apart, and W3–W9's other groups shifted ±0.2 s, the harness's
// verdicts still hold and par stays at 85: it wins in band, earns Asset Recovery and completes
// Clean Audit, its casts and Orbital Strike Mk II still change its result (T228), both no-counter
// builds lose (also on the full catalog), early calls stay fair, and the alt builds keep their
// floors and the no-single-wave-wall rule. W1's Zoomer rush (par's one designed leak) moves par
// between 80 and 90 when nudged, never out of the band. The waves and builds are documented in
// docs/story/campaign/act1.md § A1M4.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { RawContent, WaveDef, WaveGroup } from '../content/types.ts';
import { runMap } from './harness.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const raw = RAW_CONTENT.maps.a1_m04;
const content = compileContent(RAW_CONTENT);

/** The content with each group in `waves` (1-based) passed through `patch`. */
function shifted(waves: readonly number[], patch: (g: WaveGroup) => WaveGroup): typeof content {
  const ws = raw.waves.map((w: WaveDef, i): WaveDef =>
    waves.includes(i + 1) ? { ...w, groups: w.groups.map(patch) } : w,
  );
  const next: RawContent = {
    ...RAW_CONTENT,
    maps: { ...RAW_CONTENT.maps, a1_m04: { ...raw, waves: ws } },
  };
  return compileContent(next);
}

/** Every failing check, and par's margin on the seed. */
function judge(c: typeof content): { failed: string[]; par: number } {
  const report = runMap(c, 'a1_m04', { seeds: 1 });
  const par = report.runs.find((r) => r.build === 'par' && !r.repeat)?.marginPct ?? -1;
  return { failed: report.checks.filter((k) => !k.ok).map((k) => `#${k.id} ${k.title}`), par };
}

/** Shifts `enemy`'s groups `d` s later (a group at the wave's start stays there). */
const delay =
  (enemy: string, d: number) =>
  (g: WaveGroup): WaveGroup =>
    g.enemy === enemy ? { ...g, delaySec: Math.max(0, (g.delaySec ?? 0) + d) } : g;
/** Spaces `enemy`'s groups `d` s further apart. */
const spaced =
  (enemy: string, d: number) =>
  (g: WaveGroup): WaveGroup =>
    g.enemy === enemy && g.intervalSec !== undefined ? { ...g, intervalSec: g.intervalSec + d } : g;

// Each test re-runs a whole map's harness (with its R&D pick): seconds, not milliseconds.
describe('A1M4 balance', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  it('passes every harness check as tuned, par at 85 with Clean Audit', () => {
    const report = runMap(content, 'a1_m04', { seeds: 1 });
    expect(report.checks.filter((k) => !k.ok).map((k) => k.id)).toEqual([]);
    const par = report.runs.find((r) => r.build === 'par' && !r.repeat)!;
    expect(par.marginPct).toBe(85);
    expect(par.result?.objectives).toEqual(['done']);
    expect(par.result?.stats.lateSells).toBe(0);
  });

  it.each([-0.2, 0.2])('holds with W5’s Chonks %s s further apart', (d) => {
    expect(judge(shifted([5], spaced('chonk', d)))).toEqual({ failed: [], par: 85 });
  });

  it.each([-1, 1])('holds with W7’s and W9’s Haulers %s s further apart', (d) => {
    expect(judge(shifted([7, 9], spaced('hauler', d)))).toEqual({ failed: [], par: 85 });
  });

  it.each([
    [3, 'zoomer'],
    [5, 'bunchling'],
    [6, 'bunchling'],
    [8, 'bunchling'],
    [9, 'bunchling'],
  ] as const)('holds with W%i’s %s groups ±0.2 s later', (wave, enemy) => {
    for (const d of [-0.2, 0.2]) {
      expect({ d, ...judge(shifted([wave], delay(enemy, d))) }).toEqual({ d, failed: [], par: 85 });
    }
  });

  it('keeps par in the band with W1’s Zoomer rush nudged', () => {
    for (const patch of [delay('zoomer', -0.2), delay('zoomer', 0.2), spaced('zoomer', 0.05)]) {
      const { failed, par } = judge(shifted([1], patch));
      expect(failed).toEqual([]);
      expect(par).toBeGreaterThanOrEqual(80);
      expect(par).toBeLessThanOrEqual(90);
    }
  });

  it('releases W7’s and W9’s Haulers one at a time, further apart than a strike covers (D052)', () => {
    const strike = content.abilities.orbital_strike.effect;
    const radius = strike.kind === 'strike' ? strike.radiusTiles + 0.5 : Infinity; // Mk II
    for (const w of [6, 8]) {
      const h = raw.waves[w]!.groups.find((g) => g.enemy === 'hauler')!;
      expect(h.intervalSec! * content.enemies.hauler.speedTilesPerTick * 60).toBeGreaterThan(
        2 * radius,
      );
    }
  });
});
