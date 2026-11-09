// Story conditions (docs/tech/story-runtime.md § Conditions): `Condition` data evaluated over the
// story's context (flags, the map the story is about, the lifetime counter, the scenes seen, the
// run that just ended). Pure. In-map conditions are the sim's `ConditionDef` (src/sim/conditions.ts),
// not these.
import type { CampaignMapId } from '../content/campaign.ts';
import {
  FLAG_RULES,
  type BooleanFlagId,
  type FlagRule,
  type FlagSet,
} from '../content/dialogue/flags.ts';
import { mapAct, mapIndex } from '../content/dialogue/rules.ts';
import type { Condition, StoryAct } from '../content/dialogue/types.ts';
import { evaluateFlagRule, flagValue, type FlagRuleStats } from './flags.ts';

/** The run that just ended, for `outcome` and `thisRun` (a debrief, results, run-end barks). */
export interface RunContext {
  readonly outcome: 'won' | 'lost';
  /** Each run-end rule's value over this run's stats (`runEndFlags`), set or not. */
  readonly ruleFlags: Readonly<Partial<Record<BooleanFlagId, boolean>>>;
}

/** What story conditions read. Built from the save by the caller (app/, meta/). */
export interface StoryContext {
  /** The save's set flags; unset flags read their registry default (`flagValue`). */
  readonly flags: FlagSet;
  /** The map the story is about; null before A1M1 (the intake). */
  readonly map: CampaignMapId | null;
  /** The lifetime Pests Processed (inside a map: plus the run's kills so far). */
  readonly pestsProcessed: number;
  /** The save's `story.seen`: scenes played and once-per-campaign barks. */
  readonly seen: readonly string[];
  /** Set only while a run's end is on screen. */
  readonly run: RunContext | null;
}

/** The run context for a run of `map` that ended `outcome` with `stats` (every rule of the map). */
export function runContextOf(
  map: CampaignMapId,
  outcome: 'won' | 'lost',
  stats: FlagRuleStats,
  rules: readonly FlagRule[] = FLAG_RULES,
): RunContext {
  const ruleFlags: Partial<Record<BooleanFlagId, boolean>> = {};
  for (const r of rules) {
    if (r.onMapEnd === map) ruleFlags[r.flag] = evaluateFlagRule(r.value, stats);
  }
  return { outcome, ruleFlags };
}

/**
 * Whether `cond` holds in `ctx`.
 * - `flag`: the set value, else the registry default.
 * - `act`: the map's act; before A1M1 (`map` null) the story is in Act I.
 * - `mapAtLeast` / `mapIs`: campaign order; false before A1M1.
 * - `outcome` / `thisRun`: false without a run; `thisRun` is false too when the ended map has no
 *   rule for that flag (its value is unknown, so neither `eq` holds).
 */
export function evaluateCondition(cond: Condition, ctx: StoryContext): boolean {
  if ('all' in cond) return cond.all.every((c) => evaluateCondition(c, ctx));
  if ('any' in cond) return cond.any.some((c) => evaluateCondition(c, ctx));
  if ('not' in cond) return !evaluateCondition(cond.not, ctx);
  if ('flag' in cond) return flagValue(ctx.flags, cond.flag) === cond.eq;
  if ('act' in cond) return (ctx.map === null ? 1 : mapAct(ctx.map)) === cond.act;
  if ('mapAtLeast' in cond) {
    return ctx.map !== null && mapIndex(ctx.map) >= mapIndex(cond.mapAtLeast);
  }
  if ('mapIs' in cond) return ctx.map === cond.mapIs;
  if ('stat' in cond) return ctx.pestsProcessed >= cond.gte;
  if ('seen' in cond) return ctx.seen.includes(cond.seen);
  if ('outcome' in cond) return ctx.run !== null && ctx.run.outcome === cond.outcome;
  const v = ctx.run?.ruleFlags[cond.thisRun];
  return v !== undefined && v === cond.eq;
}

/** The act a campaign map belongs to (`a1_*` → 1, …, `fin_*` → 'finale'). */
export function actOf(map: CampaignMapId): StoryAct {
  return mapAct(map);
}

/** `ctx` with `flags` laid over its own (the flags a scene has set so far). */
export function withFlags(ctx: StoryContext, flags: FlagSet): StoryContext {
  return Object.keys(flags).length === 0 ? ctx : { ...ctx, flags: { ...ctx.flags, ...flags } };
}
