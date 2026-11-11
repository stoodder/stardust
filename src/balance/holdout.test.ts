// The Holdout in the harness (T605; balance/holdout.ts): its margin is Evacuated % on every run, a
// run counts as won only through its forced input at or above `evacuatedFloor`, #17 replaces
// #1–#2, its band is [floor, 100], and the harness no longer refuses it.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent } from '../content/compiled.ts';
import type { MapDef } from '../content/types.ts';
import { SIM_FIXTURE, type FixtureIds } from '../sim/__fixtures__/sim.ts';
import type { HeadlessResult } from '../sim/index.ts';
import { fakeResult } from './__fixtures__/harness.ts';
import { marginOf } from './checks.ts';
import { runMap } from './harness.ts';
import { holdoutBand, judgeHoldout } from './holdout.ts';
import { HARNESS_GATES, refusedFeatures } from './refusals.ts';

/** fx_map as a Holdout: 6 refugees walk the road to the gate (its door); W2's start forces 'press'. */
const HOLDOUT: Partial<MapDef<FixtureIds, 'fx_map'>> = {
  objective: 'holdout',
  meterLabel: 'evacuated',
  evacuatedFloor: 0.25,
  markers: { rock: [0, 2], gate: [5, 4] },
  safeExit: 'gate',
  refugees: { g1: { route: 'a' } },
  events: [
    { id: 'g1', on: { wave: 1, phase: 'start' }, actions: [{ spawnAllies: 'g1' }] },
    { id: 'seal', on: { wave: 2, phase: 'start' }, actions: [{ forceInput: { id: 'press' } }] },
    { id: 'held', on: { forcedInputResolved: 'press' }, actions: [{ endMap: 'completed' }] },
  ],
};

function holdoutContent(): CompiledContent<FixtureIds> {
  const raw = SIM_FIXTURE.maps.fx_map;
  const compiled = compileContent<FixtureIds>({
    ...SIM_FIXTURE,
    maps: {
      fx_map: {
        ...raw,
        ...HOLDOUT,
        parBuild: {
          ...raw.parBuild,
          steps: [...raw.parBuild.steps, { wave: 2, scriptInput: 'press' }],
        },
        altBuilds: {},
      },
    },
  });
  // Without wave tags, as the harness fixtures run (no #16 runs).
  const map = compiled.maps.fx_map;
  const waves = map.waves.map((w) =>
    Object.assign({}, w, { groups: w.groups.map((g) => Object.assign({}, g, { tags: [] })) }),
  );
  return { ...compiled, maps: { fx_map: Object.assign({}, map, { waves }) } };
}

const MAP = { objective: 'holdout' as const, evacuatedFloor: 0.5 };

/** A Holdout result of 12 refugees, `evacuated` of them through, ended by `forced` presses. */
function holdoutResult(evacuated: number, forced: readonly string[] = ['seal']): HeadlessResult {
  const r = fakeResult('won', 20);
  return {
    ...r,
    objective: 'holdout',
    escortTotal: 12,
    forcedInputs: forced,
    stats: { ...r.stats, refugeesSpawned: 12, evacuated },
    waves: [1, 2, 3].map((wave) => ({ ...emptyWave, wave })),
  };
}
const emptyWave = {
  wave: 1,
  spawned: 0,
  killed: 0,
  leaked: 0,
  integrityLost: 0,
  assetLost: 0,
  refugeesLost: 0,
  startTick: 0,
  early: false,
  earlyBonus: 0,
  clearedTick: 0,
  bankAtPhase: 0,
  unspentAtStart: 0,
};

describe('the Holdout judged against its floor', () => {
  it('is scored by Evacuated % on every run', () => {
    expect(marginOf(holdoutResult(9))).toBe(75);
    expect(marginOf({ ...holdoutResult(3), outcome: 'lost' })).toBe(25);
  });

  it('wins only through a forced input at or above the floor; else it loses at its last wave', () => {
    expect(judgeHoldout(MAP, holdoutResult(6)).outcome).toBe('won'); // 50%: on the floor
    expect(judgeHoldout(MAP, holdoutResult(5))).toMatchObject({ outcome: 'lost', lostAtWave: 3 });
    expect(judgeHoldout(MAP, holdoutResult(12, [])).outcome).toBe('lost'); // never pressed
    const timeout = { ...holdoutResult(12), outcome: 'timeout' as const };
    expect(judgeHoldout(MAP, timeout)).toBe(timeout);
    // Other maps pass through.
    const defend = fakeResult('won', 20);
    expect(judgeHoldout({ objective: 'defend', evacuatedFloor: null }, defend)).toBe(defend);
    expect(holdoutBand(MAP)).toEqual({ lo: 50, hi: 100 });
  });
});

describe('the harness on a Holdout', () => {
  it('lifts its refusal', () => {
    expect(HARNESS_GATES.holdout).toBeNull();
    expect(refusedFeatures(holdoutContent().maps.fx_map)).toEqual([]);
  });

  it('asserts #17 in place of #1–#2: par ends on its forced input with Evacuated ≥ the floor', () => {
    const report = runMap(holdoutContent(), 'fx_map', { seeds: 1 });
    expect(report.band).toEqual({ lo: 25, hi: 100 });
    const ids = report.checks.map((c) => c.id);
    expect(ids).toContain('17');
    expect(ids).not.toContain('1');
    expect(ids).not.toContain('2');
    const par = report.runs.find((r) => r.build === 'par' && !r.repeat)!; // par always runs
    const r = par.result!; // the fixture's par runs
    expect(r.forcedInputs).toEqual(['press']);
    expect(r.objective).toBe('holdout');
    expect(r.escortTotal).toBe(6);
    expect(par.marginPct).toBe((100 * r.stats.evacuated) / 6);
    expect(r.violations).toEqual([]);
    const c17 = report.checks.find((c) => c.id === '17')!;
    expect(c17.ok).toBe(par.marginPct >= 25);
    expect(report.checks.filter((c) => c.summary === 'refused')).toEqual([]);
    // Doing nothing (#4) still presses the forced input as par does (policies.ts), so it ends.
    const none = report.runs.find((x) => x.build === 'none')!;
    expect(none.result?.forcedInputs).toEqual(['press']);
    expect(none.result?.outcome).not.toBe('timeout');
  });
});
