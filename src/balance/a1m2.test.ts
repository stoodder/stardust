// A1M2's tuning is robust where it matters (T210b, D049): with W7–W8's Haulers released a little
// closer together or further apart, and W6–W8's other groups shifted ±0.2 s, the harness's
// verdicts still hold: par wins in band, the no-armor build loses (also on the full catalog),
// early calls stay winnable, and the alt builds keep their floors and the no-single-wave-wall
// rule. The one exception is the `abilities` check: par's W8 strike is worth a Hauler (15 points)
// on the documented timing (W8's second Hauler), but a shift can let the towers finish that Hauler
// without it, so that check isn't asserted here. It also checks that Sitting Ducks is what holds
// W8 (T226). The waves and builds are documented in docs/story/campaign/act1.md § A1M2.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { RawContent, WaveDef, WaveGroup } from '../content/types.ts';
import { runMap } from './harness.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

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

/** Integrity `build` loses in W8 on seed 1 (−1 without a result). */
function w8(c: typeof content, build: string): number {
  const run = runMap(c, 'a1_m02', { seeds: 1, build }).runs.find(
    (r) => r.build === build && r.seed === 1 && !r.repeat,
  );
  return run?.result?.waves[7]?.integrityLost ?? -1;
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

// Each test re-runs a whole map's harness (A1M2 also runs its R&D picks, T313): seconds, not
// milliseconds, and slower while other suites share the machine.
describe('A1M2 balance', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
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

  it('lets Sitting Ducks decide W8’s Haulers: par and the under-built alts leak without it (T226)', () => {
    // The same runs with the link's bonuses zeroed (Thumper +20% damage to Chilled pests, the
    // Sprinkler's +0.3 tiles): the pump station's pair is what holds W8.
    const links = RAW_CONTENT.links!;
    const [thumper, sprinkler] = links.sitting_ducks!.partners;
    const noDucks = compileContent({
      ...RAW_CONTENT,
      links: {
        ...links,
        sitting_ducks: {
          ...links.sitting_ducks!,
          partners: [
            { ...thumper, bonuses: [] },
            { ...sprinkler, bonuses: [] },
          ],
        },
      },
    });
    for (const build of ['par', 'alt:no_upgrades', 'alt:stops_after_w5', 'alt:par_minus_last']) {
      expect({ build, linked: w8(content, build) }).toEqual({ build, linked: 0 });
      // One Hauler (3 integrity) through for par, two for the under-built alts.
      expect({ build, unlinked: w8(noDucks, build) }).toEqual({
        build,
        unlinked: build === 'par' ? 3 : 6,
      });
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
