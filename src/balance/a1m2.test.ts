// A1M2's tuning is robust where it matters (T210b, D049): with W7–W8's Haulers released a little
// closer together or further apart, and W6–W8's other groups shifted ±0.2 s, the harness's
// verdicts still hold: par wins in band, the no-armor build loses (also on the full catalog),
// early calls stay winnable, and the alt builds keep their floors and the no-single-wave-wall
// rule. The one exception is the `abilities` check: par's W8 strike is worth a Hauler (15 points)
// on the documented timing (W8's second Hauler), but a shift can let the towers finish that Hauler
// without it, so that check isn't asserted here. The shifts run as two compound shifts (T460: the
// gate's time; T210b checked each alone). It also checks that Sitting Ducks is what holds W8
// (T226). The waves and builds are documented in docs/story/campaign/act1.md § A1M2.
import { describe, expect, it } from 'vitest';
import type { CompiledBuild } from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { runHeadless } from '../sim/index.ts';
import {
  both,
  bothWays,
  delay,
  enemy,
  judgeShift,
  shiftedContent,
  spaced,
} from './__fixtures__/shifts.ts';
import { buildFor, runMap } from './harness.ts';
import { referenceRunProfile, runConfig } from './profile.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const raw = RAW_CONTENT.maps.a1_m02;
const content = compileContent(RAW_CONTENT);

/** W7–W8's Haulers `d` s further apart. */
const haulers = (d: number) => spaced(enemy('hauler'), d);

/** The compound shifts, each run both ways (`s` = ±1). */
const SHIFTS = {
  'W6–W8’s groups (0.2 s) and W7–W8’s Haulers (0.5 s)': (s: number) => ({
    6: delay(enemy('chonk'), 0.2 * s),
    7: both(delay(enemy('nibbler'), 0.2 * s), haulers(0.5 * s)),
    8: both(delay(enemy('zoomer'), 0.2 * s), haulers(0.5 * s)),
  }),
  'W7–W8’s Haulers (1 s)': (s: number) => ({ 7: haulers(s), 8: haulers(s) }),
} as const;

// Each test re-runs a whole map's harness (A1M2 also runs its R&D picks, T313): seconds, not
// milliseconds, and slower while other suites share the machine.
describe('A1M2 balance', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  const report = runMap(content, 'a1_m02', { seeds: 1 });

  it('passes every harness check as tuned', () => {
    expect(report.checks.filter((k) => !k.ok).map((k) => k.id)).toEqual([]);
  });

  it.each(bothWays(SHIFTS))('holds with %s shifted %s', (_name, _way, patches) => {
    const { failed } = judgeShift(shiftedContent('a1_m02', patches), 'a1_m02');
    expect(failed.filter((f) => !f.startsWith('#abilities '))).toEqual([]);
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
    const map = noDucks.maps.a1_m02;
    /** Integrity `build` loses in W8 on seed 1 without the link (one headless run). */
    const unlinked = (label: string): number => {
      const build: CompiledBuild = buildFor(label, map, noDucks)!;
      const cfg = runConfig(noDucks, map, build, referenceRunProfile(map, noDucks), 1);
      return runHeadless(cfg, build).waves[7]?.integrityLost ?? -1;
    };
    for (const build of ['par', 'alt:no_upgrades', 'alt:stops_after_w5', 'alt:par_minus_last']) {
      const run = report.runs.find((r) => r.build === build && r.seed === 1 && !r.repeat);
      expect({ build, linked: run?.result?.waves[7]?.integrityLost }).toEqual({ build, linked: 0 });
      // One Hauler (3 integrity) through for par, two for the under-built alts.
      expect({ build, unlinked: unlinked(build) }).toEqual({
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
