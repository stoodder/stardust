// Medals (design/progression.md § 3; core-loop.md § 2.7): every map's Victory and Perfect Core,
// and the map's Challenge (`MapDef.medals.challenge`, a ConditionDef). `state.medals` holds each
// one's standing: `open` until settled, `forfeited` the moment it can't be earned this run,
// `earned` at victory. Every change emits `MedalProgress`. cleanup drives it all, at the end of
// each tick:
// - A leak books against Perfect Core: a medal-exempt unit's counts in `stats.medalExemptLeaks`
//   and never breaks it; any other unit's forfeits it ("no leaks", even one Emergency Bulkhead
//   absorbs or one whose leak cost is 0). While the map is an Escort, Perfect means "no refugee
//   lost" instead (T305c): a lost refugee forfeits it, a leak doesn't by itself (sim/escort.ts).
// - While playing, a Challenge whose condition has settled false (settledCondition: a run atom
//   broke, such as a Brood Hauler past the pump station) is forfeited at once.
// - A loss forfeits everything still open. A win earns Victory and an open Perfect Core, and
//   judges an open Challenge as things stand on the win tick (state atoms) and over the run (run
//   atoms).
// A map without a Challenge leaves `challenge` open and never emits for it. Checkpoint runs
// forfeit Perfect Core and the Challenge at run end (meta; checkpoints arrive in M3).
import type { CompiledMapDef } from '../content/compiled.ts';
import { HELD_THE_DOOR_PCT } from '../content/rules.ts';
import type { IdSpace, MedalId, MedalKind } from '../content/types.ts';
import type { DeepReadonly } from '../shared/types.ts';
import {
  evaluateCondition,
  isMedalExempt,
  settledCondition,
  type ConditionContext,
} from './conditions.ts';
import type { Enemy } from './entities.ts';
import { emit, type MedalStatus, type SimState } from './state.ts';

/** Every map's medals, in display order. */
export const MEDAL_KINDS: readonly MedalKind[] = ['victory', 'perfectCore', 'challenge'];

/** The save ids of the two medals every map has (meta-runtime.md § Save system). */
export const VICTORY_MEDAL_ID: MedalId = 'victory';
export const PERFECT_CORE_MEDAL_ID: MedalId = 'perfect_core';

type MedalMap = Pick<CompiledMapDef<IdSpace>, 'medals'>;

/** A medal's save id on `map`: `victory`, `perfect_core`, or the Challenge's id (null without one). */
export function medalId(map: MedalMap, kind: MedalKind): MedalId | null {
  if (kind === 'victory') return VICTORY_MEDAL_ID;
  if (kind === 'perfectCore') return PERFECT_CORE_MEDAL_ID;
  return map.medals === null ? null : map.medals.challenge.id;
}

/** The medals `map` offers, as save ids in MEDAL_KINDS order (two or three). */
export function mapMedalIds(map: MedalMap): MedalId[] {
  const out: MedalId[] = [];
  for (const kind of MEDAL_KINDS) {
    const id = medalId(map, kind);
    if (id !== null) out.push(id);
  }
  return out;
}

/** The medals this run earned, as save ids in MEDAL_KINDS order (read at run end). */
export function earnedMedalIds(
  state: DeepReadonly<Pick<SimState, 'medals'>>,
  map: MedalMap,
): MedalId[] {
  const out: MedalId[] = [];
  for (const kind of MEDAL_KINDS) {
    const id = medalId(map, kind);
    if (id !== null && state.medals[kind] === 'earned') out.push(id);
  }
  return out;
}

/**
 * Whether an enemy that is dead this tick leaked (movement leaves a leaked unit at its route's
 * end). A neutral unit (Gerald) at its route's end delivered and left: never a leak (T304a).
 */
export function leakedThisTick(e: Enemy): boolean {
  return e.route !== null && e.dist >= e.route.lengthTiles && e.def?.neutral !== true;
}

/**
 * Books one leak (cleanup, for each enemy leakedThisTick). While the map is an Escort, a leak
 * forfeits nothing by itself: Perfect there is "no refugee lost" (bookRefugeeLost; T305c).
 */
export function bookLeak(state: SimState, e: Enemy): void {
  if (isMedalExempt(e.tags)) state.stats.medalExemptLeaks++;
  else if (
    state.objective !== 'escort' &&
    state.objective !== 'holdout' &&
    state.objective !== 'choir' // Perfect there: no singer hushed (sim/choir.ts; T804)
  ) {
    forfeit(state, 'perfectCore');
  }
}

/**
 * A refugee was lost (sim/escort.ts): Perfect on an Escort is "no refugee lost"; a Holdout's Held
 * the Door is judged at the win instead.
 */
export function bookRefugeeLost(state: SimState): void {
  if (state.objective !== 'holdout') forfeit(state, 'perfectCore');
}

/** Forfeits an open Challenge whose condition can no longer hold (cleanup, every tick in play). */
export function watchChallenge(state: SimState, map: MedalMap, ctx: ConditionContext): void {
  if (map.medals === null || state.medals.challenge !== 'open') return;
  if (settledCondition(map.medals.challenge.condition, state, ctx) === false) {
    forfeit(state, 'challenge');
  }
}

/** The map is lost: every open medal is forfeited. */
export function settleLoss(state: SimState, map: MedalMap): void {
  forfeit(state, 'victory');
  forfeit(state, 'perfectCore');
  if (map.medals !== null) forfeit(state, 'challenge');
}

/** The map is won: Victory, an open Perfect Core, and the Challenge judged on this tick. */
export function settleWin(state: SimState, map: MedalMap, ctx: ConditionContext): void {
  set(state, 'victory', 'earned');
  if (state.medals.perfectCore === 'open') {
    set(state, 'perfectCore', heldTheDoor(state) ? 'earned' : 'forfeited');
  }
  if (map.medals !== null && state.medals.challenge === 'open') {
    const ok = evaluateCondition(map.medals.challenge.condition, state, ctx);
    set(state, 'challenge', ok ? 'earned' : 'forfeited');
  }
}

/** Perfect's slot at a win: always on most maps; on a Holdout, Held the Door (see the header). */
function heldTheDoor(state: SimState): boolean {
  if (state.objective !== 'holdout') return true;
  return state.stats.evacuated >= HELD_THE_DOOR_PCT * state.refugeeTotal;
}

function forfeit(state: SimState, kind: MedalKind): void {
  if (state.medals[kind] === 'open') set(state, kind, 'forfeited');
}

function set(state: SimState, kind: MedalKind, status: Exclude<MedalStatus, 'open'>): void {
  state.medals[kind] = status;
  emit(state, { type: 'MedalProgress', medal: kind, status });
}
