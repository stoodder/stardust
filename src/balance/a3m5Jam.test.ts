// A3M5's jamming (T721, retuned by T760; D146 addenda). Jam stays a required counter here, but the
// harness exempts it from #5 (`counterExemptions`; #6 never runs for jam): the jam exam is the
// bearers' hub, where the hunt's Silencers (two in W13, one in W15) hush the guns over the old intake
// as the bearers walk past. What jam costs is pinned here instead:
// - the reference no-jam build (Harpoon, Prism, Thumper, Sproing; Scanner Sweep, no casts) loses
//   most of the bearers to those two hunts (par answers with System Reboot as the tendrils reach
//   out, Stillness, and its Bloom), ends at least 40 points under par, forfeits Declined, and still
//   loses more tower-time to W14's Takeover and its Auditor than par does; it doesn't lose the map
//   (every hunt that takes its last bearers also breaks the alts and Story);
// - Hostile Takeover takes min(2, floor(25% × placed)) and never lands past the 25% limit, even
//   with an Auditor pair timed onto it (#10 stays clean in par on the map as built);
// - Declined is earnable: par with its Choir built after its other tier-3 towers (so the laser
//   picks towers inside the Choir's T3 aura: 1 s jams), at T3 by W13, and its yard Harpoon and
//   the hub's Thumper left at T2.
// Also the Gravity Well stacking test (towers.md § Stasis Bloom): two Gravity Wells on the same
// road pull each unit at most once per 20 s between them, and the stacked build stays in band.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledBuild } from '../content/compiled.ts';
import { PADS } from '../content/maps/a3_m05/builds.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { secToTicks } from '../shared/time.ts';
import { runA3m5 } from './__fixtures__/a3m5.ts';
import { expectCounterCost } from './__fixtures__/counterCost.ts';
import { shiftedContent } from './__fixtures__/shifts.ts';
import { validate } from '../content/validate.ts';
import type { CounterExemption } from '../content/types.ts';
import { noCounterChecks } from './counterChecks.ts';
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

  it('costs the reference no-jam build the hub’s bearers, Declined, and more of W14', () => {
    expect(par.outcome).toBe('won');
    expectCounterCost({
      map: 'a3_m05',
      counter: 'jam',
      par: margin(par),
      without: margin(noJam),
      minPoints: 40,
    });
    // The hunts with Silencers: par loses at most two bearers in each, no-jam at least four.
    for (const w of [13, 15]) {
      const lost = (r: typeof par): number =>
        r.startOf[w]!.asset - (r.startOf[w + 1]?.asset ?? r.asset);
      expect(lost(par), `par W${w}`).toBeLessThanOrEqual(2);
      expect(lost(noJam), `no-jam W${w}`).toBeGreaterThanOrEqual(4);
    }
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
    // About 1.6% of par's tower-time is jammed (its answers cut the hunts' jams short).
    expect(par.stats.jammedTowerTicks / par.stats.towerTicks).toBeLessThan(0.025);
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
          if (s.kind === 'upgrade' && same(s.tile, PADS.BEND)) {
            return [{ ...s, wave: s.wave === 7 ? 10 : 13 }];
          }
          if (s.kind === 'upgrade' && same(s.tile, PADS.YARD_N) && s.wave === 12) return [];
          if (s.kind === 'upgrade' && same(s.tile, PADS.SLUICE_S) && s.wave === 13) return [];
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
    // Not degenerate: the credits the two Wells cost buy less than par's own towers would.
    expect(r.outcome).toBe('won');
    expect(margin(r)).toBeLessThan(50);
  });
});

describe('counter exemptions (BuildsDef.counterExemptions)', () => {
  it("skip #5 and #6 for a listed counter only, and validate as one of the map's required", () => {
    const ids = (m: typeof map) => noCounterChecks(m, [1], []).map((k) => `${k.id} ${k.subject}`);
    expect(ids(map)).toEqual([
      '5 noCounter:armor',
      '6 noCounter:armor',
      '5 noCounter:splash',
      '6 noCounter:splash',
    ]);
    expect(ids({ ...map, builds: { ...map.builds, counterExemptions: [] } })).toContain(
      '5 noCounter:jam',
    );
    const raw = RAW_CONTENT.maps.a3_m05;
    const withEx = (counterExemptions: readonly CounterExemption[]) =>
      validate({
        ...RAW_CONTENT,
        maps: { ...RAW_CONTENT.maps, a3_m05: { ...raw, counterExemptions } },
      }).filter((e) => e.includes('counterExemptions'));
    const pinnedBy = 'src/balance/a3m5Jam.test.ts';
    expect(withEx([{ counter: 'jam', reason: 'ok', pinnedBy }])).toEqual([]);
    expect(withEx([{ counter: 'jam', reason: ' ', pinnedBy }]).join()).toMatch(/needs a reason/);
    expect(withEx([{ counter: 'jam', reason: 'ok', pinnedBy: 'a3m5Jam' }]).join()).toMatch(
      /must name the unit test/,
    );
    expect(
      withEx([
        { counter: 'jam', reason: 'a', pinnedBy },
        { counter: 'jam', reason: 'b', pinnedBy },
      ]).join(),
    ).toMatch(/listed twice/);
    const a3m4 = RAW_CONTENT.maps.a3_m02;
    const off = validate({
      ...RAW_CONTENT,
      maps: {
        ...RAW_CONTENT.maps,
        a3_m02: { ...a3m4, counterExemptions: [{ counter: 'jam', reason: 'x', pinnedBy }] },
      },
    });
    expect(off.join('\n')).toMatch(
      /a3_m02\.counterExemptions\[0\].*not one of the map's required counters/,
    );
  });
});
