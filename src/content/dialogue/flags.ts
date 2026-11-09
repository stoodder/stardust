// Story flags (docs/tech/story-runtime.md § Flags): the registry of every flag in the canonical
// ledger (docs/story/campaign.md § 6.2), each with its values, the value story reads while it's
// unset, and whether map scripts may read it; and the run-end rules that derive flags from a run's
// stats when a map ends (evaluated by src/story/flags.ts). `FlagId` and `ScriptFlagId` in
// content/types.ts are derived from FLAGS, so a typo'd flag is a compile error.
import type { CampaignMapId } from '../campaign.ts';
import type { FlagId, FlagValue, WaveTag } from '../types.ts';

/** One flag's declaration. */
export interface FlagDef {
  /** Every value the flag can hold (a boolean flag lists both). */
  readonly values: readonly FlagValue[];
  /**
   * The value story reads while the flag is unset: `false` for a boolean (not done yet), `null`
   * for a choice not made yet. The sim never sees it: `scriptFlags` holds only set flags, and an
   * unset flag never matches a condition (story-runtime.md § Conditions).
   */
  readonly default: FlagValue | null;
  /** Map scripts may read it through `SimConfig.scriptFlags` (story-runtime.md § Map scripts). */
  readonly script?: true;
  /** One line: what sets it. Its payoffs are listed in campaign.md § 6.2. */
  readonly description: string;
}

const BOOL = [true, false] as const;

/** Every story flag, in campaign.md § 6.2's order. */
export const FLAGS = {
  arrival_reason: {
    values: ['bonus', 'family', 'lettuce'],
    default: null,
    description: 'Why the player came to Kepler, chosen at character creation.',
  },
  peeker_poked: {
    values: BOOL,
    default: false,
    description: 'The player clicked the Peeker on an Act I map (a UI event).',
  },
  spared_quiet_wave: {
    values: BOOL,
    default: false,
    script: true,
    description: 'C1: at A1M5 end, at least 75% of the quiet_wave group leaked (a run-end rule).',
  },
  asked_zibzab_early: {
    values: BOOL,
    default: false,
    description:
      'The player asked Zibzab where the Stardust comes from, after A1M3 and before A2M4.',
  },
  held_fire_second_look: {
    values: BOOL,
    default: false,
    description:
      'At A2M3 end, at least 50% of the fleeing units leaked and plain Hold Fire was used (a run-end rule).',
  },
  stardust_choice: {
    values: ['sold', 'returned', 'none'],
    default: null,
    script: true,
    description: "C2: Zibzab's price at the A2M4 debrief (`none` when the bank is 0).",
  },
  door_choice: {
    values: ['convoy', 'warren'],
    default: null,
    script: true,
    description: 'C3: which door Bricks holds, chosen in the A3M3 briefing.',
  },
  quill_choice: {
    values: ['purge', 'keep', 'rewrite'],
    default: null,
    script: true,
    description: "C4: QUILL's directives, chosen at the A3M4 debrief.",
  },
  ending_choice: {
    values: ['stay', 'go'],
    default: null,
    description: 'C5: stay or go, chosen after the finale.',
  },
} as const satisfies Readonly<Record<string, FlagDef>>;

/** The values one flag can hold. */
export type FlagValueOf<F extends FlagId> = (typeof FLAGS)[F]['values'][number];

/** Flags whose values are true and false. */
export type BooleanFlagId = {
  [F in FlagId]: FlagValueOf<F> extends boolean ? F : never;
}[FlagId];

/** Story flags as a save holds them: each set flag with one of its declared values. */
export type FlagSet = { -readonly [F in FlagId]?: FlagValueOf<F> };

/** A run stat a run-end rule may read (SimStats counters; they only grow during a run). */
export type FlagRuleStat =
  | 'holdFireUses'
  | 'holdFireTicks'
  | 'integrityLost'
  | 'towersBuilt'
  | 'creditsSpent'
  | 'abilityUses';

/**
 * What a run-end rule tests, over the finished run's stats. The same atoms as the sim's
 * `ConditionDef` (content/types.ts) where they overlap: `tagRatio` is that tag's leaked or killed
 * units ÷ its spawned units (false when none spawned), and `stat` reads a run counter.
 */
export type FlagRuleCondition =
  | {
      readonly tagRatio: {
        readonly tag: WaveTag;
        readonly of: 'leaked' | 'killed';
        readonly gte: number;
      };
    }
  | { readonly stat: FlagRuleStat; readonly gte?: number; readonly lte?: number }
  | { readonly all: readonly FlagRuleCondition[] }
  | { readonly any: readonly FlagRuleCondition[] }
  | { readonly not: FlagRuleCondition };

/**
 * A run-end rule: when `onMapEnd` is won for the first time, `flag` is set to whether `value`
 * holds over that run's stats (true or false, so the flag is always set after the map). Replays
 * and losses never change it: the map's results stamp, memo, and later scenes were already
 * decided by the run that completed it.
 */
export interface FlagRule {
  readonly flag: BooleanFlagId;
  readonly onMapEnd: CampaignMapId;
  readonly value: FlagRuleCondition;
}

/** The run-end rules (campaign.md § 6.2; design/core-loop.md § 2.7). One rule per flag. */
export const FLAG_RULES: readonly FlagRule[] = [
  // C1, the Quiet Wave: no prompt; holding fire through it is the choice.
  {
    flag: 'spared_quiet_wave',
    onMapEnd: 'a1_m05',
    value: { tagRatio: { tag: 'quiet_wave', of: 'leaked', gte: 0.75 } },
  },
  // Plain Hold Fire, not the Spare runners filter (holdFireUses counts only the former).
  {
    flag: 'held_fire_second_look',
    onMapEnd: 'a2_m03',
    value: {
      all: [
        { tagRatio: { tag: 'fleeing', of: 'leaked', gte: 0.5 } },
        { stat: 'holdFireUses', gte: 1 },
      ],
    },
  },
];
