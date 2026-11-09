// Optional objectives (Objective Intel; design/progression.md § 3, design/maps.md § 5.3; T304f).
// `MapDef.objectives` are conditions in the medal grammar (sim/conditions.ts), each with the Intel
// it pays on a win and optional script actions to run when it completes. `state.objectives` holds
// each one's standing, index-aligned with `map.objectives`: `open` until settled, `done`, or
// `failed`. Every change emits `ObjectiveProgress`. cleanup drives it, like the medals:
// - While playing, an objective whose condition has settled (settledCondition: a run atom passed
//   its bound, a marker was passed) is `done` or `failed` at once. A `done` objective runs its
//   `onComplete` actions then, so a mid-run objective can change the rest of the map (A3M5).
// - A win judges every open objective as things stand on the win tick (state atoms) and over the
//   run (run atoms). A loss fails every open one.
// Meta pays an objective's Intel only on a win, once per save (meta/runEnd.ts).
//
// Clean Audit's late sell (A1M4; the ruling for act1.md's "sell no tower after its build phase"):
// a tower's build phase lasts until the next wave starts after it was built, so a sell is late
// once any wave has started since its build. A misclick-grace refund (core-loop.md § 2.3) is
// never a sale. Rearranging during the countdown you built in is free; selling a tower that has
// seen a wave start is a write-off the auditor notices.
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import type { DeepReadonly } from '../shared/types.ts';
import { evaluateCondition, settledCondition, type ConditionContext } from './conditions.ts';
import { sellValue } from './economy.ts';
import type { Tower } from './entities.ts';
import { emit, type ObjectiveStatus, type SimState } from './state.ts';
import { runScriptAction } from './systems/triggers.ts';

type ObjectiveMap = Pick<CompiledMapDef<IdSpace>, 'objectives'>;

/**
 * Whether selling `tower` now is a late sell (Clean Audit): a wave has started since it was built
 * (one starting on its build tick doesn't count: commands apply before the waves system), and the
 * sell isn't a misclick-grace refund.
 */
export function isLateSell(
  tower: Pick<Tower, 'invested' | 'builtTick' | 'firstFiredTick'>,
  state: DeepReadonly<Pick<SimState, 'tick' | 'wave' | 'schedule'>>,
): boolean {
  if (state.wave <= 0) return false;
  const lastStart = state.schedule.startTick[state.wave - 1] ?? -1;
  if (lastStart <= tower.builtTick) return false;
  return !sellValue(tower, state.tick).full;
}

/** Settles each open objective whose condition can no longer change (cleanup, every tick in play). */
export function watchObjectives(state: SimState, map: ObjectiveMap, ctx: ConditionContext): void {
  const defs = map.objectives;
  for (let i = 0; i < defs.length; i++) {
    if (state.objectives[i] !== 'open') continue;
    const def = defs[i]!; // i < length
    const v = settledCondition(def.condition, state, ctx);
    if (v === null) continue;
    set(state, map, i, v ? 'done' : 'failed');
    if (v) {
      const actions = def.onComplete;
      for (let a = 0; a < actions.length; a++) runScriptAction(state, actions[a]!); // a < length
    }
  }
}

/** The map is won: every open objective judged on this tick. */
export function settleObjectivesWin(
  state: SimState,
  map: ObjectiveMap,
  ctx: ConditionContext,
): void {
  const defs = map.objectives;
  for (let i = 0; i < defs.length; i++) {
    if (state.objectives[i] !== 'open') continue;
    const ok = evaluateCondition(defs[i]!.condition, state, ctx); // i < length
    set(state, map, i, ok ? 'done' : 'failed');
  }
}

/** The map is lost: every open objective fails. */
export function settleObjectivesLoss(state: SimState, map: ObjectiveMap): void {
  for (let i = 0; i < map.objectives.length; i++) {
    if (state.objectives[i] === 'open') set(state, map, i, 'failed');
  }
}

/** Each objective's standing by id (the HUD's tracker reads it). */
export function objectiveStatusById(
  state: DeepReadonly<Pick<SimState, 'objectives'>>,
  map: ObjectiveMap,
): Record<string, ObjectiveStatus> {
  const out: Record<string, ObjectiveStatus> = {};
  for (const [i, o] of map.objectives.entries()) out[o.id] = state.objectives[i] ?? 'open';
  return out;
}

/** The objectives this run completed, as ids in map order (read at run end; paid on a win). */
export function completedObjectiveIds(
  state: DeepReadonly<Pick<SimState, 'objectives'>>,
  map: ObjectiveMap,
): string[] {
  return map.objectives.filter((_, i) => state.objectives[i] === 'done').map((o) => o.id);
}

function set(
  state: SimState,
  map: ObjectiveMap,
  i: number,
  status: Exclude<ObjectiveStatus, 'open'>,
): void {
  state.objectives[i] = status;
  emit(state, { type: 'ObjectiveProgress', id: map.objectives[i]!.id, status }); // i < length
}
