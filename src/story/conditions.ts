// Story conditions (docs/tech/story-runtime.md § Conditions): `Condition` data evaluated over the
// story's context (flags, the map the story is about, the lifetime counter, the run that just
// ended). Pure. In-map conditions are the sim's `ConditionDef` (src/sim/conditions.ts), not these.
import type { CampaignMapId } from '../content/campaign.ts';
import type { BooleanFlagId, FlagSet } from '../content/dialogue/flags.ts';
import type { Condition, StoryAct } from '../content/dialogue/types.ts';
import { notImplemented } from './notImplemented.ts';

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
  /** Set only while a run's end is on screen. */
  readonly run: RunContext | null;
}

/** Whether `cond` holds in `ctx`. `outcome`/`thisRun` are false without a run. */
export function evaluateCondition(cond: Condition, ctx: StoryContext): boolean {
  void cond;
  void ctx;
  return notImplemented('evaluateCondition', 'T302a');
}

/** The act a campaign map belongs to (`a1_*` → 1, …, `fin_*` → 'finale'). */
export function actOf(map: CampaignMapId): StoryAct {
  void map;
  return notImplemented('actOf', 'T302a');
}
