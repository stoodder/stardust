// Protect maps in the harness (T305a; design/maps.md § 6.1, D101): the margin is min(core %,
// asset %), the per-wave tallies carry the asset's losses, the `gradual` judge walls on either
// meter, and the harness no longer refuses a Protect map.
import { describe, expect, it } from 'vitest';
import type { CompiledAsset, CompiledContent } from '../content/compiled.ts';
import type { FixtureIds } from '../sim/__fixtures__/sim.ts';
import type { HeadlessResult } from '../sim/index.ts';
import { PLAIN_CONTENT, fakeResult } from './__fixtures__/harness.ts';
import { lossPerWave, marginOf, notGradual } from './checks.ts';
import { runMap } from './harness.ts';
import { HARNESS_GATES, refusedFeatures } from './refusals.ts';

/** The plain fixture as a Protect map whose asset (10) takes every leak of path `a`. */
const asset: CompiledAsset = {
  name: 'Rig',
  integrity: 10,
  marker: 'rock',
  tile: [0, 2],
  routes: ['a'],
};
const PROTECT: CompiledContent<FixtureIds> = {
  ...PLAIN_CONTENT,
  maps: {
    fx_map: Object.assign({}, PLAIN_CONTENT.maps.fx_map, { objective: 'protect' as const, asset }),
  },
};

/** A won result with these meters, and per-wave losses `[core, asset]`. */
function result(
  integrity: number,
  left: number,
  waves: readonly (readonly [number, number])[] = [],
  outcome: HeadlessResult['outcome'] = 'won',
): HeadlessResult {
  const r = fakeResult(outcome, integrity, outcome === 'lost' ? waves.length : null);
  return {
    ...r,
    asset: left,
    maxAsset: 10,
    waves: waves.map(([integrityLost, assetLost], i) => ({
      wave: i + 1,
      spawned: 0,
      killed: 0,
      leaked: 0,
      integrityLost,
      assetLost,
      refugeesLost: 0,
      singersHushed: 0,
      startTick: 0,
      early: false,
      earlyBonus: 0,
      clearedTick: 0,
      bankAtPhase: 0,
      unspentAtStart: 0,
    })),
  };
}

describe('the Protect margin', () => {
  it('is the lower of core % and asset %', () => {
    expect(marginOf(result(18, 7))).toBe(70);
    expect(marginOf(result(10, 9))).toBe(50);
    expect(marginOf(result(0, 10))).toBe(0);
    expect(marginOf(result(20, 0))).toBe(0);
    // A map without an asset measures the core alone.
    expect(marginOf(fakeResult('won', 15))).toBe(75);
  });

  it('walls on either meter, and counts asset leaks as leaks', () => {
    expect(
      notGradual(
        result(20, 5, [
          [0, 2],
          [0, 3],
        ]),
      ),
    ).toBeNull();
    expect(notGradual(result(20, 4, [[0, 6]]))).toBe('W1 costs 6 of 10 asset, over 50%');
    // A loss whose leaks started (at the asset) a wave earlier is gradual.
    expect(
      notGradual(
        result(
          20,
          0,
          [
            [0, 0],
            [0, 4],
            [0, 5],
            [0, 1],
          ],
          'lost',
        ),
      ),
    ).toBeNull();
    expect(
      lossPerWave(
        result(19, 8, [
          [1, 0],
          [0, 2],
        ]),
      ),
    ).toBe('1,0+2a');
  });
});

describe('the harness on a Protect map', () => {
  it('lifts its refusal (the Holdout is checked since T605, the Choir since T804)', () => {
    expect(HARNESS_GATES.protect).toBeNull();
    expect(refusedFeatures(PROTECT.maps.fx_map)).toEqual([]);
    const choir = Object.assign({}, PLAIN_CONTENT.maps.fx_map, { objective: 'choir' as const });
    expect(refusedFeatures(choir)).toEqual([]);
  });

  it("judges par by min(core %, asset %) and tallies the asset's losses per wave", () => {
    const report = runMap(PROTECT, 'fx_map', { seeds: 1 });
    const par = report.runs.find((r) => r.build === 'par' && !r.repeat)!; // par always runs
    const r = par.result!; // the fixture's par runs
    expect(r.maxAsset).toBe(10);
    expect(par.marginPct).toBe(marginOf(r));
    expect(r.waves.reduce((n, w) => n + w.assetLost, 0)).toBe(10 - r.asset);
    expect(r.waves.every((w) => w.integrityLost === 0)).toBe(true);
    // Every leak went to the asset (the plain fixture's 9 walkers and runners, 1 each).
    const none = report.runs.find((x) => x.build === 'none')!; // #4 always runs
    expect(none.result).toMatchObject({ outcome: 'won', integrity: 20, asset: 1 });
    expect(none.marginPct).toBe(10);
    expect(report.checks.filter((c) => c.summary === 'refused')).toEqual([]);
  });
});
