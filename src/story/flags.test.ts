// Story flags at run time (story-runtime.md § Flags; conventions.md § Story runner): the run-end
// rules at their thresholds (the Quiet Wave: Old Thrum leaked or not, younglings at 74%, 75%, and
// 100%; held_fire_second_look at 49%
// and 50% fleeing leaked, with and without Hold Fire), the registry's rule set, defaults, and the
// flags a run's scripts see.
import { describe, expect, it } from 'vitest';
import { FLAG_RULES, FLAGS, type FlagRule } from '../content/dialogue/flags.ts';
import { CAMPAIGN_PLAN_IDS } from '../content/campaign.ts';
import type { WaveTag } from '../content/types.ts';
import {
  evaluateFlagRule,
  flagRule,
  flagValue,
  isFlagValue,
  runEndFlags,
  SCRIPT_FLAG_IDS,
  scriptFlagsOf,
  type FlagRuleStats,
} from './flags.ts';

const zero = (): Record<WaveTag, number> => ({
  quiet_wave: 0,
  youngling: 0,
  fleeing: 0,
  medal_exempt: 0,
});

/** Stats with `spawned` units of `tag`, `leaked` of them leaked, and the rest killed. */
function stats(
  tag: WaveTag,
  spawned: number,
  leaked: number,
  over: Partial<FlagRuleStats> = {},
): FlagRuleStats {
  const s = { tagSpawned: zero(), tagLeaked: zero(), tagKilled: zero() };
  s.tagSpawned[tag] = spawned;
  s.tagLeaked[tag] = leaked;
  s.tagKilled[tag] = spawned - leaked;
  return {
    holdFireUses: 0,
    holdFireTicks: 0,
    integrityLost: 0,
    towersBuilt: 0,
    creditsSpent: 0,
    abilityUses: 0,
    ...s,
    ...over,
  };
}

/**
 * A1M5-shaped Quiet Wave stats: Old Thrum (quiet_wave only) leaked or killed, and `younglings`
 * (quiet_wave + youngling) of which `leaked` leaked.
 */
function quiet(thrumLeaked: boolean, younglings: number, leaked: number): FlagRuleStats {
  const s = stats('quiet_wave', 1 + younglings, (thrumLeaked ? 1 : 0) + leaked);
  return {
    ...s,
    tagSpawned: { ...s.tagSpawned, youngling: younglings },
    tagLeaked: { ...s.tagLeaked, youngling: leaked },
    tagKilled: { ...s.tagKilled, youngling: younglings - leaked },
  };
}

const spared = flagRule('spared_quiet_wave')!;
const secondLook = flagRule('held_fire_second_look')!;

describe('run-end rules (campaign.md § 6.2)', () => {
  it.each([
    ['Thrum and 74% of the younglings leaked', true, 100, 74, false],
    ['Thrum and 75% of the younglings leaked', true, 100, 75, true],
    ['all seven leaked', true, 6, 6, true],
    ['Thrum and 5 of 6 younglings', true, 6, 5, true],
    ['Thrum and 4 of 6 younglings (67%)', true, 6, 4, false],
    ['Thrum killed, every youngling leaked (hold fire after she falls)', false, 6, 6, false],
    ['none leaked', false, 6, 0, false],
  ] as const)('spared_quiet_wave: %s', (_, thrum, younglings, leaked, want) => {
    expect(evaluateFlagRule(spared.value, quiet(thrum, younglings, leaked))).toBe(want);
  });

  it('spared_quiet_wave is false when no quiet wave spawned (the ratio needs a spawn)', () => {
    expect(evaluateFlagRule(spared.value, stats('quiet_wave', 0, 0))).toBe(false);
    // Younglings alone (no Old Thrum) never count as sparing her.
    expect(evaluateFlagRule(spared.value, quiet(false, 6, 6))).toBe(false);
  });

  it('tagRatio.except counts only the units without the excepted tag', () => {
    const s = quiet(true, 6, 0);
    const thrum = { tag: 'quiet_wave', except: 'youngling', of: 'leaked', gte: 1 } as const;
    expect(evaluateFlagRule({ tagRatio: thrum }, s)).toBe(true);
    expect(evaluateFlagRule({ tagRatio: { ...thrum, of: 'killed', gte: 0.01 } }, s)).toBe(false);
    expect(evaluateFlagRule({ tagRatio: thrum }, quiet(false, 6, 6))).toBe(false);
  });

  it.each([
    ['49% leaked, Hold Fire used', 49, 1, false],
    ['50% leaked, Hold Fire used', 50, 1, true],
    ['50% leaked, no Hold Fire (Spare runners alone)', 50, 0, false],
    ['100% leaked, Hold Fire used twice', 100, 2, true],
  ] as const)('held_fire_second_look: %s', (_, leaked, uses, want) => {
    const s = stats('fleeing', 100, leaked, { holdFireUses: uses });
    expect(evaluateFlagRule(secondLook.value, s)).toBe(want);
  });

  it('evaluates any, not, killed ratios, and stat bounds', () => {
    const s = stats('fleeing', 10, 2, { towersBuilt: 4 });
    expect(evaluateFlagRule({ tagRatio: { tag: 'fleeing', of: 'killed', gte: 0.8 } }, s)).toBe(
      true,
    );
    expect(evaluateFlagRule({ stat: 'towersBuilt', lte: 3 }, s)).toBe(false);
    expect(evaluateFlagRule({ stat: 'towersBuilt', gte: 4, lte: 4 }, s)).toBe(true);
    expect(evaluateFlagRule({ not: { stat: 'towersBuilt', gte: 5 } }, s)).toBe(true);
    expect(
      evaluateFlagRule({ any: [{ stat: 'abilityUses', gte: 1 }, { stat: 'towersBuilt' }] }, s),
    ).toBe(true);
    expect(evaluateFlagRule({ any: [] }, s)).toBe(false);
    expect(evaluateFlagRule({ all: [] }, s)).toBe(true);
  });

  it('runEndFlags sets only the ended map’s flags, true or false', () => {
    const full = quiet(true, 6, 6);
    expect(runEndFlags('a1_m05', full)).toEqual({ spared_quiet_wave: true });
    expect(runEndFlags('a1_m05', quiet(false, 6, 0))).toEqual({ spared_quiet_wave: false });
    expect(runEndFlags('a2_m03', stats('fleeing', 4, 4, { holdFireUses: 1 }))).toEqual({
      held_fire_second_look: true,
    });
    expect(runEndFlags('a1_m01', full)).toEqual({});
    const custom: FlagRule[] = [{ flag: 'peeker_poked', onMapEnd: 'a1_m01', value: { all: [] } }];
    expect(runEndFlags('a1_m01', full, custom)).toEqual({ peeker_poked: true });
  });
});

describe('the flag registry (content/dialogue/flags.ts)', () => {
  it('has one rule per flag, each on a planned map, with shares in (0, 1]', () => {
    const flags = FLAG_RULES.map((r) => r.flag);
    expect(new Set(flags).size).toBe(flags.length);
    const shares: number[] = [];
    const walk = (c: FlagRule['value']): void => {
      if ('all' in c) c.all.forEach(walk);
      else if ('any' in c) c.any.forEach(walk);
      else if ('not' in c) walk(c.not);
      else if ('tagRatio' in c) shares.push(c.tagRatio.gte);
    };
    for (const r of FLAG_RULES) {
      expect(CAMPAIGN_PLAN_IDS).toContain(r.onMapEnd);
      expect(FLAGS[r.flag].values).toEqual([true, false]);
      walk(r.value);
    }
    expect(shares.length).toBeGreaterThan(0);
    for (const g of shares) expect(g > 0 && g <= 1).toBe(true);
  });

  it('declares snake_case ids, distinct values, and a default that is a value or null', () => {
    for (const [id, def] of Object.entries(FLAGS)) {
      expect(id).toMatch(/^[a-z][a-z0-9_]*$/);
      const values: readonly unknown[] = def.values;
      expect(new Set(values).size).toBe(values.length);
      expect(def.default === null || values.includes(def.default)).toBe(true);
      expect(def.description.length).toBeGreaterThan(0);
    }
  });

  it('lets scripts read the four flags map data reads (story-runtime.md § Map scripts)', () => {
    expect(SCRIPT_FLAG_IDS.toSorted()).toEqual([
      'door_choice',
      'quill_choice',
      'spared_quiet_wave',
      'stardust_choice',
    ]);
  });

  it('flagValue falls back to the default; isFlagValue checks the declared values', () => {
    expect(flagValue({}, 'spared_quiet_wave')).toBe(false);
    expect(flagValue({}, 'door_choice')).toBeNull();
    expect(flagValue({ door_choice: 'warren' }, 'door_choice')).toBe('warren');
    expect(flagValue({ spared_quiet_wave: true }, 'spared_quiet_wave')).toBe(true);
    expect(isFlagValue('door_choice', 'convoy')).toBe(true);
    expect(isFlagValue('door_choice', 'sold')).toBe(false);
    expect(isFlagValue('peeker_poked', 1)).toBe(false);
  });
});

describe('scriptFlagsOf', () => {
  it('passes the set script flags and leaves out the rest (no defaults)', () => {
    expect(
      scriptFlagsOf({
        spared_quiet_wave: false,
        door_choice: 'convoy',
        peeker_poked: true,
        arrival_reason: 'lettuce',
      }),
    ).toEqual({ spared_quiet_wave: false, door_choice: 'convoy' });
    expect(scriptFlagsOf({})).toEqual({});
  });
});
