// A1M2's tuning is robust where it matters (T210b, D049): with W7–W8's Haulers released a little
// closer together or further apart, and W6–W8's other groups shifted ±0.2 s, the harness's
// verdicts still hold: par wins in band, the no-armor build loses (also on the full catalog),
// early calls stay winnable, and the alt builds keep their floors and the no-single-wave-wall
// rule. The one exception is the `abilities` check: par's W8 strike is worth a Hauler (15 points)
// on the documented timing (W8's second Hauler), but a shift can let the towers finish that Hauler
// without it, so that check isn't asserted here. The waves and builds are documented in
// docs/story/campaign/act1.md § A1M2.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { RawContent, WaveDef, WaveGroup } from '../content/types.ts';
import { runMap } from './harness.ts';

const raw = RAW_CONTENT.maps.a1_m02;

/** The content with each group in `waves` (1-based) passed through `patch`. */
function shifted(waves: readonly number[], patch: (g: WaveGroup) => WaveGroup): typeof content {
  const ws = raw.waves.map((w: WaveDef, i): WaveDef =>
    waves.includes(i + 1) ? { ...w, groups: w.groups.map(patch) } : w,
  );
  const next: RawContent = {
    ...RAW_CONTENT,
    maps: { ...RAW_CONTENT.maps, a1_m02: { ...raw, waves: ws } },
  };
  return compileContent(next);
}
const content = compileContent(RAW_CONTENT);

/** Every failing check but `abilities` (see the header). */
function failures(c: typeof content): string[] {
  return runMap(c, 'a1_m02', { seeds: 1 })
    .checks.filter((k) => !k.ok && k.id !== 'abilities')
    .map((k) => `#${k.id} ${k.title}`);
}

const gap =
  (d: number) =>
  (g: WaveGroup): WaveGroup =>
    g.enemy === 'hauler' && g.intervalSec !== undefined
      ? { ...g, intervalSec: g.intervalSec + d }
      : g;
const delay =
  (enemy: string, d: number) =>
  (g: WaveGroup): WaveGroup =>
    g.enemy === enemy ? { ...g, delaySec: (g.delaySec ?? 0) + d } : g;

describe('A1M2 balance', () => {
  it('passes every harness check as tuned', () => {
    const report = runMap(content, 'a1_m02', { seeds: 1 });
    expect(report.checks.filter((k) => !k.ok).map((k) => k.id)).toEqual([]);
  });

  it.each([-1, -0.5, 0.5, 1])('holds with W7–W8’s Haulers %s s further apart', (d) => {
    expect(failures(shifted([7, 8], gap(d)))).toEqual([]);
  });

  it.each([
    [6, 'chonk'],
    [7, 'nibbler'],
    [8, 'zoomer'],
  ] as const)('holds with W%i’s %s group ±0.2 s later', (wave, enemy) => {
    for (const d of [-0.2, 0.2]) {
      expect({ d, failed: failures(shifted([wave], delay(enemy, d))) }).toEqual({ d, failed: [] });
    }
  });

  it('sends W4’s Nibblers in clumps one Orbital Strike catches whole (D059)', () => {
    const clumps = raw.waves[3]!.groups.filter((g) => g.enemy === 'nibbler');
    expect(clumps.length).toBeGreaterThanOrEqual(3);
    const strike = content.abilities.orbital_strike.effect;
    expect(strike.kind).toBe('strike');
    const radius = strike.kind === 'strike' ? strike.radiusTiles : 0;
    const speed = content.enemies.nibbler.speedTilesPerTick * 60;
    for (const c of clumps) {
      // A clump's length along the road fits inside the Mk I strike's diameter.
      expect((c.count - 1) * c.intervalSec! * speed).toBeLessThan(2 * radius);
    }
  });

  it('teaches the Hauler alone in W5, then releases them one at a time in W7–W8', () => {
    expect(raw.waves[4]!.groups).toEqual([expect.objectContaining({ enemy: 'hauler', count: 1 })]);
    for (const w of [6, 7]) {
      const h = raw.waves[w]!.groups.find((g) => g.enemy === 'hauler')!;
      expect(h.count).toBeGreaterThanOrEqual(4);
      // Longer apart than one strike can cover, even Mk II's (2 tiles): the Orbital Strike
      // can't stand in for armor.
      const strike = content.abilities.orbital_strike.effect;
      expect(strike.kind).toBe('strike');
      const radius = strike.kind === 'strike' ? strike.radiusTiles + 0.5 : Infinity;
      expect(h.intervalSec! * content.enemies.hauler.speedTilesPerTick * 60).toBeGreaterThan(
        2 * radius,
      );
    }
  });
});
