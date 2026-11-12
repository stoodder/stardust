// Escort maps in the harness (T305c; design/maps.md § 6.1): the margin is Evacuated % for a run
// that ends as an Escort (from the start or by a pivot), escort maps form their own monotonic
// chain, the per-wave tallies carry refugees lost, the `gradual` judge walls on them against the
// losses that lose the map (`maxLost`), and the harness no longer refuses an Escort.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent } from '../content/compiled.ts';
import type { MapDef } from '../content/types.ts';
import { SIM_FIXTURE, type FixtureIds } from '../sim/__fixtures__/sim.ts';
import type { HeadlessResult } from '../sim/index.ts';
import { fakeResult } from './__fixtures__/harness.ts';
import { lossPerWave, marginOf, notGradual } from './checks.ts';
import { marginChain, runMap } from './harness.ts';
import { HARNESS_GATES, refusedFeatures } from './refusals.ts';

/** fx_map as an Escort: two groups (6 + 2) to the gate (its core), released as W1 and W2 start. */
const ESCORT: Partial<MapDef<FixtureIds, 'fx_map'>> = {
  objective: 'escort',
  maxLost: 3,
  markers: { rock: [0, 2], gate: [5, 4] },
  safeExit: 'gate',
  refugees: { g1: { route: 'a' }, g2: { route: 'a', count: 2 } },
  events: [
    { id: 'g1', on: { wave: 1, phase: 'start' }, actions: [{ spawnAllies: 'g1' }] },
    { id: 'g2', on: { wave: 2, phase: 'start' }, actions: [{ spawnAllies: 'g2' }] },
  ],
};

function escortContent(
  over: Partial<MapDef<FixtureIds, 'fx_map'>> = {},
): CompiledContent<FixtureIds> {
  const compiled = compileContent<FixtureIds>({
    ...SIM_FIXTURE,
    maps: { fx_map: { ...SIM_FIXTURE.maps.fx_map, ...ESCORT, ...over } },
  });
  // Without wave tags, as the harness fixtures run (no #16 runs).
  const map = compiled.maps.fx_map;
  const waves = map.waves.map((w) =>
    Object.assign({}, w, { groups: w.groups.map((g) => Object.assign({}, g, { tags: [] })) }),
  );
  return { ...compiled, maps: { fx_map: Object.assign({}, map, { waves }) } };
}

/** A result ending as an Escort of 12 refugees (`maxLost` 6), with refugees lost per wave. */
function escortResult(
  evacuated: number,
  lostPerWave: readonly number[] = [],
  outcome: HeadlessResult['outcome'] = 'won',
): HeadlessResult {
  const r = fakeResult(outcome, 20, outcome === 'lost' ? lostPerWave.length : null);
  const lost = lostPerWave.reduce((n, x) => n + x, 0);
  return {
    ...r,
    objective: 'escort',
    escortTotal: 12,
    maxLost: 6,
    stats: { ...r.stats, refugeesSpawned: 12, evacuated, refugeesLost: lost },
    waves: lostPerWave.map((refugeesLost, i) => ({
      wave: i + 1,
      spawned: 0,
      killed: 0,
      leaked: 0,
      integrityLost: 0,
      assetLost: 0,
      singersHushed: 0,
      refugeesLost,
      startTick: 0,
      early: false,
      earlyBonus: 0,
      clearedTick: 0,
      bankAtPhase: 0,
      unspentAtStart: 0,
    })),
  };
}

describe('the Escort margin', () => {
  it('is Evacuated % for a run that ends as an Escort, 0 on a loss', () => {
    expect(marginOf(escortResult(9))).toBe(75);
    expect(marginOf(escortResult(12))).toBe(100);
    expect(marginOf(escortResult(9, [1, 2], 'lost'))).toBe(0);
    // A run still on Defend (lost before its pivot) measures the core.
    expect(marginOf({ ...escortResult(0), objective: 'defend', integrity: 15 })).toBe(75);
  });

  it('walls on refugees against the losses that lose the map, and tallies them per wave', () => {
    // maxLost 6: six lose the map, so a wave may lose at most 3.
    expect(notGradual(escortResult(9, [1, 2]))).toBeNull();
    expect(notGradual(escortResult(8, [0, 4]))).toBe(
      'W2 loses 4 refugees of the 6 that lose the map, over 50%',
    );
    // A loss whose losses started a wave earlier is gradual; one that starts on its last isn't.
    expect(notGradual(escortResult(5, [0, 3, 3], 'lost'))).toBeNull();
    expect(notGradual(escortResult(5, [0, 0, 3], 'lost'))).toBe(
      'it loses in W3, but its leaks only start in W3 (they must start by W2)',
    );
    expect(lossPerWave(escortResult(9, [0, 2]))).toBe('0,0+2r');
  });
});

describe('the Escort chain', () => {
  const base = escortContent().maps.fx_map;
  it('holds Escort maps, and Defend maps a script pivots into one; the Holdout is in neither', () => {
    expect(marginChain(base)).toBe('escort');
    const defend = Object.assign({}, base, { objective: 'defend' as const, events: [] });
    expect(marginChain(defend)).toBe('integrity');
    const pivot = escortContent({
      objective: 'defend',
      events: [
        {
          id: 'pivot',
          on: { wave: 2, phase: 'start' },
          actions: [{ setObjective: 'escort' }, { spawnAllies: 'g1' }],
        },
      ],
    }).maps.fx_map;
    expect(marginChain(pivot)).toBe('escort');
    expect(marginChain(Object.assign({}, base, { objective: 'holdout' as const }))).toBeNull();
  });
});

describe('the harness on an Escort map', () => {
  it('lifts its refusal (the Choir is measured on Voices since T804)', () => {
    expect(HARNESS_GATES.objectives).toBeNull();
    const map = escortContent().maps.fx_map;
    expect(refusedFeatures(map)).toEqual([]);
    expect(refusedFeatures(Object.assign({}, map, { objective: 'choir' as const }))).toEqual([]);
  });

  it('judges par by Evacuated %, with the escort numbers in the result', () => {
    const content = escortContent();
    const report = runMap(content, 'fx_map', { seeds: 1 });
    const par = report.runs.find((r) => r.build === 'par' && !r.repeat)!; // par always runs
    const r = par.result!; // the fixture's par runs
    expect([r.objective, r.escortTotal, r.maxLost]).toEqual(['escort', 8, 3]);
    expect(r.stats.refugeesSpawned).toBe(8);
    expect(par.marginPct).toBe(marginOf(r));
    if (r.outcome === 'won') expect(par.marginPct).toBe((100 * r.stats.evacuated) / 8);
    expect(r.waves.reduce((n, w) => n + w.refugeesLost, 0)).toBe(r.stats.refugeesLost);
    expect(r.violations).toEqual([]);
    expect(report.checks.filter((c) => c.summary === 'refused')).toEqual([]);
  });
});
