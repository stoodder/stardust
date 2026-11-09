// Story flags at run time (docs/tech/story-runtime.md § Flags): the run-end rules evaluated over a
// finished run's stats, the value story reads for a flag, and the flags a run's map scripts see.
// Pure functions over content data (content/dialogue/flags.ts) and sim stats.
import {
  FLAG_RULES,
  FLAGS,
  type FlagRule,
  type FlagRuleCondition,
  type FlagRuleStat,
  type FlagSet,
} from '../content/dialogue/flags.ts';
import type { FlagId, FlagValue, ScriptFlagId, WaveTag } from '../content/types.ts';
import type { ScriptFlags, SimStats } from '../sim/index.ts';

/** The run stats run-end rules read: the per-tag counts and the counters (`FlagRuleStat`). */
export type FlagRuleStats = {
  readonly [S in FlagRuleStat]: number;
} & {
  readonly [T in 'tagSpawned' | 'tagLeaked' | 'tagKilled']: Readonly<Record<WaveTag, number>>;
};

// SimStats must keep every field the rules read (a compile error here if one is renamed).
const _statsFit = (s: SimStats): FlagRuleStats => s;
void _statsFit;

/** Whether `c` holds over a finished run's stats (FlagRuleCondition's atoms). */
export function evaluateFlagRule(c: FlagRuleCondition, stats: FlagRuleStats): boolean {
  if ('all' in c) return c.all.every((x) => evaluateFlagRule(x, stats));
  if ('any' in c) return c.any.some((x) => evaluateFlagRule(x, stats));
  if ('not' in c) return !evaluateFlagRule(c.not, stats);
  if ('tagRatio' in c) {
    const { tag, of, gte } = c.tagRatio;
    const spawned = stats.tagSpawned[tag];
    const n = of === 'leaked' ? stats.tagLeaked[tag] : stats.tagKilled[tag];
    return spawned > 0 && n / spawned >= gte;
  }
  const v = stats[c.stat];
  return (c.gte === undefined || v >= c.gte) && (c.lte === undefined || v <= c.lte);
}

/** The run-end rule that sets `flag`, if one does. */
export function flagRule(
  flag: FlagId,
  rules: readonly FlagRule[] = FLAG_RULES,
): FlagRule | undefined {
  return rules.find((r) => r.flag === flag);
}

/**
 * The flags the rules for `mapId` set from a run that first completes it (meta-runtime.md § Run
 * end, step 2). Each rule sets its flag to true or false. Other maps' rules are not consulted.
 */
export function runEndFlags(
  mapId: string,
  stats: FlagRuleStats,
  rules: readonly FlagRule[] = FLAG_RULES,
): FlagSet {
  const out: FlagSet = {};
  for (const r of rules) {
    if (r.onMapEnd === mapId) out[r.flag] = evaluateFlagRule(r.value, stats);
  }
  return out;
}

/** Whether `value` is one of `flag`'s declared values. */
export function isFlagValue(flag: FlagId, value: unknown): value is FlagValue {
  const values: readonly unknown[] = FLAGS[flag].values;
  return values.includes(value);
}

/** The value story reads for `flag`: the set value, else the registry's default. */
export function flagValue(flags: FlagSet, flag: FlagId): FlagValue | null {
  return flags[flag] ?? FLAGS[flag].default;
}

/** The registry's script-readable flags (`script: true`), in registry order. */
export const SCRIPT_FLAG_IDS: readonly ScriptFlagId[] = (Object.keys(FLAGS) as FlagId[]).filter(
  (f): f is ScriptFlagId => 'script' in FLAGS[f],
);

/**
 * The story flags a run's map scripts see (`SimConfig.scriptFlags`): the save's set flags that
 * scripts may read. Unset flags stay out (no defaults), so an unset flag never matches.
 */
export function scriptFlagsOf(flags: Readonly<Partial<Record<FlagId, FlagValue>>>): ScriptFlags {
  const out: Partial<Record<ScriptFlagId, FlagValue>> = {};
  for (const f of SCRIPT_FLAG_IDS) {
    const v = flags[f];
    if (v !== undefined) out[f] = v;
  }
  return out;
}
