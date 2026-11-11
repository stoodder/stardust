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
//
// The Holdout (design/maps.md § 5.2, core-loop.md § 2.10; T605; A3M3) is an Escort with no defeat
// that ends on a scripted event, here and in the systems it touches:
// - **No defeat.** Its refugees walk to their doors (each group's `exit`, a core `C`) as on an
//   Escort, and an enemy reaching a door follows the Escort's exit rule (sim/escort.ts `leakAtExit`:
//   it takes one sheltered refugee, costs no integrity), so the core never falls. It has no
//   `maxLost` (validation) and a boss at a door isn't a loss there, so cleanup never loses it.
// - **No checkpoints** (systems/waves.ts `checkpointAt`).
// - **The end** is a script's `endMap` (`'completed'` or `'won'`, both ending the map as won;
//   `endMap` below), normally on the SEAL's press (`forcedInputResolved`; sim/forcedInput.ts). Its
//   score is Evacuated; its pay is flat (meta), and the harness holds it to `evacuatedFloor`.
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import type { DeepReadonly } from '../shared/types.ts';
import { evaluateCondition, settledCondition, type ConditionContext } from './conditions.ts';
import { sellValue } from './economy.ts';
import type { Enemy, Tower } from './entities.ts';
import { settleWin } from './medals.ts';
import { emit, type ObjectiveStatus, type SimState } from './state.ts';
import { runScriptAction } from './systems/triggers.ts';

type ObjectiveMap = Pick<CompiledMapDef<IdSpace>, 'objectives' | 'escort'>;

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

/**
 * Protect the asset (design/maps.md § 5.2; D101; T305a): a unit leaking along one of
 * `map.asset.routes` costs the asset meter (`state.asset`) instead of the core. movement passes
 * the leak's `cost` as it would charge the core (0 for a fleeing unit or a youngling), or null for
 * a boss, which drains the asset. A `floor` of 1 (the Quiet Wave, D097) never takes it below 1.
 * Emergency Bulkhead guards the core only. Emits `EnemyLeaked` with leak 0 (the core lost
 * nothing; render and the barks still see a leak), then `AssetHit`, and `AssetLost` as the meter
 * reaches 0 (cleanup then loses the map). Returns whether the leak went to the asset.
 */
export function leakToAsset(
  state: SimState,
  map: Pick<CompiledMapDef<IdSpace>, 'asset'>,
  e: Pick<Enemy, 'uid' | 'def' | 'route' | 'x' | 'y'>,
  cost: number | null,
  floor: number,
): boolean {
  const asset = map.asset;
  const def = e.def;
  if (asset === null || def === null || e.route === null) return false;
  if (!asset.routes.includes(e.route.id)) return false;
  const left = state.asset;
  const room = left > floor ? left - floor : 0;
  const want = cost === null ? left : cost;
  const lost = want < room ? want : room;
  state.asset = left - lost;
  emit(state, { type: 'EnemyLeaked', uid: e.uid, enemy: def.id, leak: 0 });
  emit(state, { type: 'AssetHit', uid: e.uid, enemy: def.id, lost, x: e.x, y: e.y });
  if (lost > 0 && state.asset === 0) emit(state, { type: 'AssetLost' });
  return true;
}

/** Whether a Protect map's asset is gone (the map is lost; cleanup). */
export function isAssetLost(state: DeepReadonly<Pick<SimState, 'asset' | 'maxAsset'>>): boolean {
  return state.maxAsset > 0 && state.asset <= 0;
}

/**
 * The asset's damage state, for the rig props (render) and the HUD meter: `intact` while full,
 * `damaged` above ASSET_CRITICAL_SHARE of its meter, `critical` at or below it (A2M2's two rigs:
 * one is down; the HUD's low-asset alarm), `lost` at 0. `none` on a map without an asset.
 */
export type AssetDamage = 'none' | 'intact' | 'damaged' | 'critical' | 'lost';

/** The share of the asset meter at or below which it is `critical` (half: one rig of two). */
export const ASSET_CRITICAL_SHARE = 0.5;

/** The asset's damage state from its meter (assetDamage bands). */
export function assetDamage(asset: number, maxAsset: number): AssetDamage {
  if (maxAsset <= 0) return 'none';
  if (asset <= 0) return 'lost';
  if (asset >= maxAsset) return 'intact';
  return asset <= maxAsset * ASSET_CRITICAL_SHARE ? 'critical' : 'damaged';
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
      for (let a = 0; a < actions.length; a++) runScriptAction(state, actions[a]!, map); // a < length
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

/**
 * `endMap` (a script action; the Holdout's end, T605): the map is won on this tick, whatever its
 * waves (`'completed'` and `'won'` alike; no `completed` outcome exists): the medals and the open
 * objectives settle as on any win, then MapWon. The rest of the tick doesn't run (tick.ts).
 */
export function endMap(
  state: SimState,
  ctx: ConditionContext & { readonly map: ObjectiveMap & Pick<CompiledMapDef<IdSpace>, 'medals'> },
): void {
  if (state.outcome !== 'playing') return;
  state.outcome = 'won';
  settleWin(state, ctx.map, ctx);
  settleObjectivesWin(state, ctx.map, ctx);
  emit(state, { type: 'MapWon' });
}
