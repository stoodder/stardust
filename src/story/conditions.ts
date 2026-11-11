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
import {
  type BankCurrency,
  type Condition,
  type RunStoryStat,
  type StoryAct,
} from '../content/dialogue/types.ts';
import type { TowerId } from '../content/types.ts';
import { evaluateFlagRule, flagValue, type FlagRuleStats } from './flags.ts';

/** A run's stats as story conditions read them (`runStat`; T569). */
export type RunStoryStats = Readonly<Record<RunStoryStat, number>>;

/** The run that just ended, for `outcome` and `thisRun` (a debrief, results, run-end barks). */
export interface RunContext {
  readonly outcome: 'won' | 'lost';
  /** Each run-end rule's value over this run's stats (`runEndFlags`), set or not. */
  readonly ruleFlags: Readonly<Partial<Record<BooleanFlagId, boolean>>>;
  /** Its final stats, for `runStat` (absent when the run's stats weren't given). */
  readonly stats?: RunStoryStats;
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
  /**
   * The optional objectives on file, by map (the save's `MapRecord.objectives`, for
   * `objectiveDone`); none when left out.
   */
  readonly objectives?: Readonly<Partial<Record<CampaignMapId, readonly string[]>>>;
  /**
   * The save's banks (`currencies`), for `bank` (C2's `none`: A2M4's debrief with nothing to
   * trade); every `bank` test is false when left out.
   */
  readonly bank?: Readonly<Record<BankCurrency, number>>;
  /**
   * The battle in play's stats so far, for `runStat` (app/dialogue.ts fills it from the sim while
   * a battle is bound); none between maps.
   */
  readonly live?: RunStoryStats;
  /** The save's revoked tower classes (`unlocks.revokedTowers`), for `revokedTower`. */
  readonly revokedTowers?: readonly TowerId[];
}

/**
 * The story's view of a run's stats (`runStat`): `stats`' counters of those names, each 0 when
 * absent (a stats object from before the counter existed, or a test's partial one).
 */
export function runStoryStats(
  stats: Readonly<Partial<Record<RunStoryStat, number>>>,
): RunStoryStats {
  return {
    pivotWave: stats.pivotWave ?? 0,
    evacuated: stats.evacuated ?? 0,
    refugeesLost: stats.refugeesLost ?? 0,
    revocations: stats.revocations ?? 0,
  };
}

/** This run's stats a `runStat` reads: the battle's live ones, else the ended run's; none outside. */
function runStatsOf(ctx: StoryContext): RunStoryStats | undefined {
  return ctx.live ?? ctx.run?.stats;
}

/**
 * The run context for a run of `map` that ended `outcome` with `stats` (every rule of the map), with
 * its `runStat` stats (`runStoryStats`: the sim's stats carry them; a counter they lack reads 0).
 */
export function runContextOf(
  map: CampaignMapId,
  outcome: 'won' | 'lost',
  stats: FlagRuleStats & Readonly<Partial<Record<RunStoryStat, number>>>,
  rules: readonly FlagRule[] = FLAG_RULES,
): RunContext {
  const ruleFlags: Partial<Record<BooleanFlagId, boolean>> = {};
  for (const r of rules) {
    if (r.onMapEnd === map) ruleFlags[r.flag] = evaluateFlagRule(r.value, stats);
  }
  return { outcome, ruleFlags, stats: runStoryStats(stats) };
}

/**
 * Whether `cond` holds in `ctx`.
 * - `flag`: the set value, else the registry default.
 * - `act`: the map's act; before A1M1 (`map` null) the story is in Act I.
 * - `mapAtLeast` / `mapIs`: campaign order; false before A1M1.
 * - `outcome` / `thisRun`: false without a run; `thisRun` is false too when the ended map has no
 *   rule for that flag (its value is unknown, so neither `eq` holds).
 * - `objectiveDone`: the save holds that map's objective (a win completed it, on any run).
 * - `bank`: the context's bank of that currency is within `gte`/`lte` (inclusive); false without
 *   a bank.
 * - `runStat`: this run's stat (the battle's live one, else the ended run's) is within
 *   `gte`/`lte`; false outside a run.
 * - `revokedTower`: the save has that class revoked; false without the context's list.
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
  if ('bank' in cond) {
    const v = ctx.bank?.[cond.bank];
    if (v === undefined) return false;
    return (cond.gte === undefined || v >= cond.gte) && (cond.lte === undefined || v <= cond.lte);
  }
  if ('runStat' in cond) {
    const v = runStatsOf(ctx)?.[cond.runStat];
    if (v === undefined) return false;
    return (cond.gte === undefined || v >= cond.gte) && (cond.lte === undefined || v <= cond.lte);
  }
  if ('objectiveDone' in cond) {
    const done = ctx.objectives?.[cond.objectiveDone.map] ?? [];
    return done.includes(cond.objectiveDone.objective);
  }
  if ('revokedTower' in cond) return ctx.revokedTowers?.includes(cond.revokedTower) ?? false;
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
