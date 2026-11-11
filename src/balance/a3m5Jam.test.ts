// A3M5's jamming (T721; D146 addenda). Jam stays a required counter here, but the harness exempts
// it from #5/#6 (`counterExemptions`): the jammers' first tells come a period less a tell after
// they spawn, so most die in the kill zones first, and a jam is at most 4 s on a tower. What jam
// costs is pinned here instead (T768/T760 retune jamming to retire the exemption):
// - the reference no-jam build (Harpoon, Prism, Thumper, Sproing; Scanner Sweep, no casts)
//   forfeits Declined, loses more tower-time to W14's Takeover and its Auditor than par does (par:
//   Reboot, Stillness, the Choir's aura), and never scores above par (they tie today; T768 aims
//   for ≥ 10 points under);
// - Hostile Takeover takes min(2, floor(25% × placed)) and never lands past the 25% limit, even
//   with an Auditor pair timed onto it (#10 stays clean in par on the map as built);
// - Declined is earnable: par with its Choir built after its other tier-3 towers (so the laser
//   picks towers inside the Choir's T3 aura: 1 s jams) and its yard Harpoon left at T2.
// Also the Gravity Well stacking test (towers.md open question 3): two Gravity Wells on the same
// road pull each unit at most once per 20 s between them, and the stacked build stays in band.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledBuild } from '../content/compiled.ts';
import { PADS } from '../content/maps/a3_m05/builds.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { secToTicks } from '../shared/time.ts';
import { runA3m5 } from './__fixtures__/a3m5.ts';
import { shiftedContent } from './__fixtures__/shifts.ts';
import { fullCatalogProfile } from './profile.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a3_m05;
const margin = (r: { integrity: number; asset: number }): number =>
  Math.min(r.integrity / 22, r.asset / 12) * 100;
const same = (a: readonly number[], b: readonly number[]): boolean =>
  a[0] === b[0] && a[1] === b[1];

describe('A3M5 jamming', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  const par = runA3m5(content, 'par');
  const noJam = runA3m5(content, 'noCounter:jam');

  it('costs the reference no-jam build Declined and more of W14, never scoring above par', () => {
    expect(par.outcome).toBe('won');
    // Not ≥ 10 points under par yet (they tie today: the Prism where par's Choir stands out-damages
    // the Choir's +20%); that target is T768's (T760's jam retune).
    expect(margin(noJam)).toBeLessThanOrEqual(margin(par));
    expect(noJam.medals.challenge).toBe('forfeited');
    // The metric: tower-ticks spent Jammed during W14 (the Takeover and its Auditor).
    expect(noJam.jammedTicksByWave[14]!).toBeGreaterThan(par.jammedTicksByWave[14]!);
  });

  it('keeps Hostile Takeover within min(2, 25%) and par within #10', () => {
    expect(par.takeoverJams.length).toBeGreaterThan(0);
    const { jammed, placed } = par.takeoverPeak;
    expect(jammed).toBeLessThanOrEqual(Math.min(2, Math.floor(0.25 * placed)));
    expect(par.takeoverOverLimit).toBe(0);
    expect(par.stats.jamOverLimitTicks).toBe(0);
    // About 1% of par's tower-time is jammed (the jammers die before their second tell).
    expect(par.stats.jammedTowerTicks / par.stats.towerTicks).toBeLessThan(0.02);
  });

  it('never lands a Takeover past the limit with an Auditor pair timed onto it', () => {
    for (const d of [30, 40, 50, 60]) {
      const c = shiftedContent('a3_m05', {
        14: (g) => (g.enemy === 'auditor' ? { ...g, delaySec: d, count: 2 } : g),
      });
      const r = runA3m5(c, 'par');
      expect(r.outcome, `${d} s`).toBe('won');
      expect(r.takeoverOverLimit, `${d} s`).toBe(0);
    }
  });

  it('lets a Choir at T3 earn Declined (1 s jams) when the laser picks towers in its aura', () => {
    const p = map.builds.parBuild;
    const late: CompiledBuild = {
      ...p,
      steps: p.steps
        .flatMap((s) => {
          if (s.kind === 'build' && s.tower === 'choir') return [{ ...s, wave: 9 }];
          if (s.kind === 'upgrade' && same(s.tile, PADS.BEND) && s.wave === 7) {
            return [{ ...s, wave: 10 }];
          }
          if (s.kind === 'upgrade' && same(s.tile, PADS.YARD_N) && s.wave === 12) return [];
          return [s];
        })
        .toSorted((a, b) => a.wave - b.wave),
    };
    const r = runA3m5(content, 'par', { build: late });
    expect(r.outcome).toBe('won');
    expect(r.takeoverJams.length).toBeGreaterThan(0);
    expect(r.takeoverJams.every((j) => j.ticks === 60)).toBe(true);
    expect(r.stats.takeoverJamTicks).toBeLessThanOrEqual(60);
    expect(r.medals.challenge).toBe('earned');
    // Par as built forfeits it: its first lasers take its yard Harpoon and the Choir (4 s each).
    expect(par.medals.challenge).toBe('forfeited');
  });
});

describe('A3M5 Gravity Well stacking', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  it('pulls each unit at most once per 20 s across two Wells on one road, and stays in band', () => {
    // Par's Bloom by the old intake and a second over the yard's west run (both reach the road's
    // drop past Intake B), each to Gravity Well, on the full-catalog profile with the Bloom's
    // specs unlocked (the reference doesn't own them).
    const p = map.builds.parBuild;
    const wells: CompiledBuild['steps'] = [
      { wave: 10, kind: 'build', tower: 'bloom', tile: PADS.HOPPER_N },
      { wave: 10, kind: 'upgrade', tile: PADS.INTAKE_W },
      { wave: 10, kind: 'upgrade', tile: PADS.INTAKE_W },
      { wave: 10, kind: 'specialize', tile: PADS.INTAKE_W, spec: 'a' },
      { wave: 10, kind: 'upgrade', tile: PADS.HOPPER_N },
      { wave: 10, kind: 'upgrade', tile: PADS.HOPPER_N },
      { wave: 10, kind: 'specialize', tile: PADS.HOPPER_N, spec: 'a' },
    ];
    const steps = [
      ...p.steps.filter((s) => s.wave <= 9),
      ...wells,
      ...p.steps.filter((s) => s.wave >= 10),
    ];
    const catalog = fullCatalogProfile(map, content);
    const r = runA3m5(content, 'par', {
      build: { ...p, steps },
      profile: { ...catalog, specs: [...catalog.specs, 'bloom'] },
    });
    const gap = secToTicks(20);
    let pulled = 0;
    for (const ticks of r.pulls.values()) {
      pulled += ticks.length;
      for (let i = 1; i < ticks.length; i++) {
        expect(ticks[i]! - ticks[i - 1]!).toBeGreaterThanOrEqual(gap);
      }
    }
    expect(pulled).toBeGreaterThan(0);
    expect(r.outcome).toBe('won');
    expect(margin(r)).toBeLessThanOrEqual(75);
  });
});
