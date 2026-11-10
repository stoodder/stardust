// Story conditions (story-runtime.md § Conditions): every atom, the combinators, the context
// before A1M1, and the run-end atoms with and without a run.
import { describe, expect, it } from 'vitest';
import type { Condition } from '../content/dialogue/types.ts';
import type { WaveTag } from '../content/types.ts';
import {
  actOf,
  evaluateCondition,
  runContextOf,
  withFlags,
  type StoryContext,
} from './conditions.ts';
import type { FlagRuleStats } from './flags.ts';

const base: StoryContext = {
  flags: {},
  map: 'a1_m03',
  pestsProcessed: 500,
  seen: ['a1_m01_brief'],
  run: null,
};
const holds = (c: Condition, ctx: StoryContext = base): boolean => evaluateCondition(c, ctx);

const zero = (): Record<WaveTag, number> => ({
  quiet_wave: 0,
  youngling: 0,
  fleeing: 0,
  medal_exempt: 0,
});
/** A Quiet Wave of `spawned` (Old Thrum, then younglings), `leaked` of them leaked, Thrum first. */
function quietStats(spawned: number, leaked: number): FlagRuleStats {
  const s = { tagSpawned: zero(), tagLeaked: zero(), tagKilled: zero() };
  s.tagSpawned.quiet_wave = spawned;
  s.tagLeaked.quiet_wave = leaked;
  s.tagKilled.quiet_wave = spawned - leaked;
  s.tagSpawned.youngling = spawned - 1;
  s.tagLeaked.youngling = Math.max(0, leaked - 1);
  s.tagKilled.youngling = s.tagSpawned.youngling - s.tagLeaked.youngling;
  return {
    holdFireUses: 0,
    holdFireTicks: 0,
    integrityLost: 0,
    towersBuilt: 0,
    creditsSpent: 0,
    abilityUses: 0,
    ...s,
  };
}

describe('evaluateCondition', () => {
  it('reads flags, falling back to the registry default', () => {
    expect(holds({ flag: 'spared_quiet_wave', eq: false })).toBe(true);
    expect(holds({ flag: 'door_choice', eq: 'convoy' })).toBe(false);
    const set = { ...base, flags: { door_choice: 'convoy' as const } };
    expect(holds({ flag: 'door_choice', eq: 'convoy' }, set)).toBe(true);
  });

  it('reads the act and the map in campaign order', () => {
    expect(holds({ act: 1 })).toBe(true);
    expect(holds({ act: 2 })).toBe(false);
    expect(holds({ mapAtLeast: 'a1_m03' })).toBe(true);
    expect(holds({ mapAtLeast: 'a1_m04' })).toBe(false);
    expect(holds({ mapAtLeast: 'a1_m01' })).toBe(true);
    expect(holds({ mapIs: 'a1_m03' })).toBe(true);
    expect(holds({ mapIs: 'a1_m02' })).toBe(false);
    const fin = { ...base, map: 'fin_m01' as const };
    expect(holds({ act: 'finale' }, fin)).toBe(true);
    expect(holds({ mapAtLeast: 'a3_m06' }, fin)).toBe(true);
  });

  it('before A1M1 the story is in Act I and before every map', () => {
    const intake = { ...base, map: null };
    expect(holds({ act: 1 }, intake)).toBe(true);
    expect(holds({ mapAtLeast: 'a1_m01' }, intake)).toBe(false);
    expect(holds({ mapIs: 'a1_m01' }, intake)).toBe(false);
  });

  it('reads the counter and the scenes seen', () => {
    expect(holds({ stat: 'pestsProcessed', gte: 500 })).toBe(true);
    expect(holds({ stat: 'pestsProcessed', gte: 501 })).toBe(false);
    expect(holds({ seen: 'a1_m01_brief' })).toBe(true);
    expect(holds({ seen: 'a1_m02_brief' })).toBe(false);
  });

  it('combines with all, any, and not', () => {
    const t: Condition = { act: 1 };
    const f: Condition = { act: 2 };
    expect(holds({ all: [t, t] })).toBe(true);
    expect(holds({ all: [t, f] })).toBe(false);
    expect(holds({ all: [] })).toBe(true);
    expect(holds({ any: [f, t] })).toBe(true);
    expect(holds({ any: [] })).toBe(false);
    expect(holds({ not: f })).toBe(true);
  });

  it('reads the run that just ended, and nothing without one', () => {
    expect(holds({ outcome: 'won' })).toBe(false);
    expect(holds({ thisRun: 'spared_quiet_wave', eq: false })).toBe(false);
    const spared = {
      ...base,
      map: 'a1_m05' as const,
      run: runContextOf('a1_m05', 'won', quietStats(4, 4)),
    };
    expect(holds({ outcome: 'won' }, spared)).toBe(true);
    expect(holds({ outcome: 'lost' }, spared)).toBe(false);
    expect(holds({ thisRun: 'spared_quiet_wave', eq: true }, spared)).toBe(true);
    expect(holds({ thisRun: 'spared_quiet_wave', eq: false }, spared)).toBe(false);
    // C1 on a replay: this run's lines read this run; the saved flag is untouched.
    const replay = { ...spared, flags: { spared_quiet_wave: false } };
    expect(holds({ thisRun: 'spared_quiet_wave', eq: true }, replay)).toBe(true);
    expect(holds({ flag: 'spared_quiet_wave', eq: false }, replay)).toBe(true);
    const cleared = { ...spared, run: runContextOf('a1_m05', 'lost', quietStats(4, 1)) };
    expect(holds({ thisRun: 'spared_quiet_wave', eq: false }, cleared)).toBe(true);
    // A map with no rule for the flag: neither value holds.
    const other = { ...base, run: runContextOf('a1_m03', 'won', quietStats(4, 4)) };
    expect(holds({ thisRun: 'spared_quiet_wave', eq: true }, other)).toBe(false);
    expect(holds({ thisRun: 'spared_quiet_wave', eq: false }, other)).toBe(false);
  });
});

describe('objectiveDone (A2M1’s crew logs)', () => {
  const crewLogs: Condition = { objectiveDone: { map: 'a2_m01', objective: 'crew_logs' } };

  it('holds once the save has that map’s objective on file, and not before', () => {
    expect(holds(crewLogs)).toBe(false);
    expect(holds(crewLogs, { ...base, objectives: { a2_m01: [] } })).toBe(false);
    expect(holds(crewLogs, { ...base, objectives: { a1_m04: ['crew_logs'] } })).toBe(false);
    expect(holds(crewLogs, { ...base, objectives: { a2_m01: ['crew_logs'] } })).toBe(true);
  });

  it('reads the save, not the run (a later loss keeps it)', () => {
    const ctx: StoryContext = {
      ...base,
      objectives: { a2_m01: ['crew_logs'] },
      run: { outcome: 'lost', ruleFlags: {} },
    };
    expect(holds(crewLogs, ctx)).toBe(true);
  });
});

/** The base context with `stardust` banked (and 3 Intel). */
const at = (stardust: number): StoryContext => ({ ...base, bank: { stardust, intel: 3 } });

describe('bank (C2: nothing to trade, T500b)', () => {
  const broke: Condition = { bank: 'stardust', lte: 0 };
  it('reads the bank in the context, with inclusive bounds', () => {
    expect(holds(broke, at(0))).toBe(true);
    expect(holds(broke, at(1))).toBe(false);
    expect(holds({ bank: 'stardust', gte: 625 }, at(625))).toBe(true);
    expect(holds({ bank: 'stardust', gte: 625 }, at(624))).toBe(false);
    expect(holds({ bank: 'intel', gte: 2, lte: 3 }, at(0))).toBe(true);
    expect(holds({ bank: 'intel', gte: 4 }, at(0))).toBe(false);
  });

  it('is false without a bank (and so its negation holds)', () => {
    expect(holds(broke)).toBe(false);
    expect(holds({ not: broke })).toBe(true);
  });
});

describe('actOf and withFlags', () => {
  it('maps ids to acts', () => {
    expect(actOf('a1_m05')).toBe(1);
    expect(actOf('a2_m01')).toBe(2);
    expect(actOf('a3_m06')).toBe(3);
    expect(actOf('fin_m01')).toBe('finale');
  });

  it('lays a scene’s flags over the save’s', () => {
    const ctx = { ...base, flags: { peeker_poked: true as const } };
    expect(withFlags(ctx, {})).toBe(ctx);
    expect(withFlags(ctx, { door_choice: 'warren' }).flags).toEqual({
      peeker_poked: true,
      door_choice: 'warren',
    });
  });
});
