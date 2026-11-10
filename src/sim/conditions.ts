// Conditions (story-runtime.md § Conditions): the one grammar map data uses for the Challenge
// medal, optional objectives, and script `when` guards (`ConditionDef` in content/types.ts).
// Pure functions over run state; nothing here allocates per tick.
//
// Atoms and when each is judged (design/progression.md § 3, "Evaluation"):
// - State atoms, judged as things stand when the condition is evaluated (a medal's at the moment
//   of victory): `towers` (live towers of a tower id or faction, `gte`/`lte`), `linkActive` (at
//   least one pair of that synergy link), `tagRatio` (leaked or killed ÷ spawned for a wave tag; 0
//   when none spawned).
// - Run atoms, accumulated over the whole run: `stat` (a run counter, `gte`/`lte`; counters only
//   grow), `leaks` (non-exempt leaks of a faction or enemy, `gte`/`lte`; T400a), `wreckageCleared`
//   (the drone cleared the wreckage under a marker; T400a), and `passedMarker` (a non-exempt unit
//   of the kind went past the marker at some point; latched in `stats.markersPassed` by
//   trackConditions, which cleanup runs every tick). M5 (T500a): `leaks.waves` counts the leaks by
//   units of those waves (`stats.leaksByWave`), and `passedMarker.unrevealed` only a cloaked unit
//   never Revealed before it went past (`Enemy.everRevealed`; latched under its own key). M6
//   (T600a): `groupLost` counts one refugee group's losses on the road (`stats.lostByGroup`;
//   The Matriarch's Young), `gte`/`lte` like `stat`.
// - `objectiveDone`: another optional objective of the map is `done` (T400a; settled once that
//   objective settles).
// - `flag`: a story flag from `SimConfig.scriptFlags` (fixed for the run; unset never matches).
// - `all`, `any`, `not`.
//
// settledCondition() says whether the rest of the run can still change a condition's value: a
// run atom settles once its counter passes a bound or its marker is passed, a flag is settled
// from the start, and a state atom stays open until it is judged. The medals use it to forfeit a
// Challenge the moment it can no longer be earned (sim/medals.ts).
import type { CompiledContent, CompiledMapDef, CompiledRoute } from '../content/compiled.ts';
import type { ConditionDef, EnemyFaction, IdSpace, WaveTag } from '../content/types.ts';
import { MEDAL_EXEMPT_TAGS } from '../content/validateMedals.ts';
import type { DeepReadonly } from '../shared/types.ts';
import type { SimConfig } from './config.ts';
import type { ObjectiveStatus, SimState } from './state.ts';
import { isLinkActive } from './systems/links.ts';

type Condition = ConditionDef<IdSpace>;
type View = DeepReadonly<SimState>;

/**
 * What conditions read besides state: the links (for `linkActive`), the story flags, and the map
 * (markers for `wreckageCleared`, objectives for `objectiveDone`, refugee groups for `groupLost`).
 */
export interface ConditionContext {
  readonly content: Pick<CompiledContent<IdSpace>, 'links'>;
  readonly config: Pick<SimConfig<IdSpace>, 'scriptFlags'>;
  readonly map: Pick<CompiledMapDef<IdSpace>, 'markers' | 'cols' | 'objectives' | 'escort'>;
}

/** The `markersPassed` key for "any enemy" (`passedMarker` without `enemy`). */
export const ANY_ENEMY = '*';

/** Two route points closer than this (squared tiles) are the same distance from a marker. */
const TIE_EPS_SQ = 1e-9;

/** The condition's value now: state atoms as things stand, run atoms as accumulated so far. */
export function evaluateCondition(c: Condition, state: View, ctx: ConditionContext): boolean {
  if ('all' in c) {
    for (let i = 0; i < c.all.length; i++)
      if (!evaluateCondition(c.all[i]!, state, ctx)) return false; // i < length
    return true;
  }
  if ('any' in c) {
    for (let i = 0; i < c.any.length; i++)
      if (evaluateCondition(c.any[i]!, state, ctx)) return true; // i < length
    return false;
  }
  if ('not' in c) return !evaluateCondition(c.not, state, ctx);
  return atom(c, state, ctx);
}

/**
 * true or false once nothing later in the run can change the condition's value; null while it is
 * still open (any state atom it depends on, or a run atom short of its bound).
 */
export function settledCondition(c: Condition, state: View, ctx: ConditionContext): boolean | null {
  if ('all' in c || 'any' in c) {
    const list = 'all' in c ? c.all : c.any;
    const decisive = 'any' in c; // any: one true settles it; all: one false does
    let open = false;
    for (let i = 0; i < list.length; i++) {
      const v = settledCondition(list[i]!, state, ctx); // i < length
      if (v === decisive) return decisive;
      if (v === null) open = true;
    }
    return open ? null : !decisive;
  }
  if ('not' in c) {
    const v = settledCondition(c.not, state, ctx);
    return v === null ? null : !v;
  }
  if ('flag' in c) return atom(c, state, ctx);
  if ('passedMarker' in c || 'wreckageCleared' in c) return atom(c, state, ctx) ? true : null;
  if ('stat' in c || 'leaks' in c || 'groupLost' in c) {
    const v =
      'stat' in c
        ? state.stats[c.stat]
        : 'leaks' in c
          ? leakCount(state, c.leaks)
          : groupLostCount(state, ctx, c.groupLost);
    if (c.lte !== undefined) return v > c.lte ? false : null;
    return c.gte === undefined || v >= c.gte ? true : null;
  }
  if ('objectiveDone' in c) {
    const status = objectiveStatus(state, ctx, c.objectiveDone);
    return status === 'open' ? null : status === 'done';
  }
  return null; // towers, linkActive, tagRatio: judged when evaluated
}

function atom(c: Condition, state: View, ctx: ConditionContext): boolean {
  if ('stat' in c) return within(state.stats[c.stat], c.gte, c.lte);
  if ('towers' in c)
    return within(countTowers(state, c.towers.tower, c.towers.faction), c.gte, c.lte);
  if ('linkActive' in c) return isLinkActive(state, ctx.content, c.linkActive);
  if ('tagRatio' in c) {
    const { tag, of, gte } = c.tagRatio;
    const spawned = state.stats.tagSpawned[tag];
    const n = of === 'leaked' ? state.stats.tagLeaked[tag] : state.stats.tagKilled[tag];
    return spawned > 0 && n / spawned >= gte;
  }
  if ('passedMarker' in c) {
    const { marker, enemy, unrevealed } = c.passedMarker;
    return markerPassedTick(state, marker, markerKey(enemy, unrevealed === true)) >= 0;
  }
  if ('flag' in c) return ctx.config.scriptFlags[c.flag] === c.eq;
  if ('leaks' in c) return within(leakCount(state, c.leaks), c.gte, c.lte);
  if ('wreckageCleared' in c) return wreckageClearedAt(state, ctx.map, c.wreckageCleared);
  if ('objectiveDone' in c) return objectiveStatus(state, ctx, c.objectiveDone) === 'done';
  if ('groupLost' in c) return within(groupLostCount(state, ctx, c.groupLost), c.gte, c.lte);
  return false; // combinators are handled by the callers
}

/** Refugees of group `id` lost this run (0 for an unknown group: validate rejects it). */
function groupLostCount(state: View, ctx: ConditionContext, id: string): number {
  const groups = ctx.map.escort?.groups ?? [];
  for (let i = 0; i < groups.length; i++) {
    if (groups[i]!.id === id) return state.stats.lostByGroup[i] ?? 0; // i < length
  }
  return 0;
}

/**
 * Non-exempt leaks of `faction` and/or `enemy` (both given: the enemy's, if of that faction), or by
 * units of waves `waves[0]`–`waves[1]`.
 */
function leakCount(
  state: View,
  of: {
    readonly faction?: EnemyFaction;
    readonly enemy?: string;
    readonly waves?: readonly [number, number];
  },
): number {
  if (of.waves !== undefined) {
    const byWave = state.stats.leaksByWave;
    let n = 0;
    for (let w = of.waves[0]; w <= of.waves[1]; w++) n += byWave[w - 1] ?? 0;
    return n;
  }
  if (of.enemy !== undefined) return state.stats.leaksByEnemy[of.enemy] ?? 0;
  if (of.faction !== undefined) return state.stats.leaksByFaction[of.faction];
  const f = state.stats.leaksByFaction;
  return f.skitterkin + f.aelari + f.everglow + f.hollow;
}

/** Whether the drone has cleared the wreckage tile under `marker` this run. */
export function wreckageClearedAt(
  state: DeepReadonly<Pick<SimState, 'wreckage'>>,
  map: Pick<CompiledMapDef<IdSpace>, 'markers' | 'cols'>,
  marker: string,
): boolean {
  const pos = map.markers[marker];
  if (pos === undefined) return false; // validateScripts rejects an unknown marker
  return state.wreckage.cleared.includes(pos[1] * map.cols + pos[0]);
}

/** The standing of the map's objective `id` ('open' for an unknown id: validate rejects it). */
function objectiveStatus(state: View, ctx: ConditionContext, id: string): ObjectiveStatus {
  const objectives = ctx.map.objectives;
  for (let i = 0; i < objectives.length; i++) {
    if (objectives[i]!.id === id) return state.objectives[i] ?? 'open'; // i < length
  }
  return 'open';
}

function within(v: number, gte: number | undefined, lte: number | undefined): boolean {
  return (gte === undefined || v >= gte) && (lte === undefined || v <= lte);
}

/** Live towers of `tower` and `faction` (either may be omitted). */
function countTowers(state: View, tower: string | undefined, faction: string | undefined): number {
  let n = 0;
  const towers = state.towers;
  for (let i = 0; i < towers.used; i++) {
    const t = towers.items[i]!; // i < used ≤ items.length
    if (!t.alive || t.def === null) continue;
    if (tower !== undefined && t.def.id !== tower) continue;
    if (faction !== undefined && t.def.faction !== faction) continue;
    n++;
  }
  return n;
}

/**
 * The `markersPassed` key a `passedMarker` latches under: the enemy id (ANY_ENEMY for any), with
 * UNREVEALED_SUFFIX when only never-Revealed units count.
 */
export function markerKey(enemy: string | undefined, unrevealed: boolean): string {
  const key = enemy ?? ANY_ENEMY;
  return unrevealed ? `${key}${UNREVEALED_SUFFIX}` : key;
}

/** Marks a `markersPassed` key that counts only never-Revealed cloaked units. */
export const UNREVEALED_SUFFIX = ':unrevealed';

/** The tick a unit of `enemy` (ANY_ENEMY for any) first went past `marker`, or −1. */
export function markerPassedTick(
  state: DeepReadonly<Pick<SimState, 'stats'>>,
  marker: string,
  enemy: string,
): number {
  const byEnemy = state.stats.markersPassed[marker];
  const tick = byEnemy === undefined ? undefined : byEnemy[enemy];
  return tick ?? -1;
}

/**
 * Latches `passedMarker` for every marker the map's conditions watch (its Challenge, its optional
 * objectives, and its events' `when`s). cleanup runs it every tick before dead enemies are
 * released, so a unit that went past a marker and died or leaked on the same tick still counts.
 */
export function trackConditions(state: SimState, map: CompiledMapDef<IdSpace>): void {
  if (map.medals !== null) track(map.medals.challenge.condition, state, map);
  const objectives = map.objectives;
  for (let i = 0; i < objectives.length; i++) {
    track(objectives[i]!.condition, state, map); // i < length
  }
  const events = map.events;
  for (let i = 0; i < events.length; i++) {
    const when = events[i]!.when; // i < length
    if (when !== null) track(when, state, map);
  }
}

function track(c: Condition, state: SimState, map: CompiledMapDef<IdSpace>): void {
  if ('all' in c || 'any' in c) {
    const list = 'all' in c ? c.all : c.any;
    for (let i = 0; i < list.length; i++) track(list[i]!, state, map); // i < length
    return;
  }
  if ('not' in c) {
    track(c.not, state, map);
    return;
  }
  if (!('passedMarker' in c)) return;
  const { marker, enemy } = c.passedMarker;
  const unrevealed = c.passedMarker.unrevealed === true;
  const key = markerKey(enemy, unrevealed);
  if (markerPassedTick(state, marker, key) >= 0) return;
  const pos = map.markers[marker];
  if (pos === undefined) return; // validateMedals rejects an unknown marker
  const mx = pos[0] + 0.5;
  const my = pos[1] + 0.5;
  const enemies = state.enemies;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    // uid 0 is a free slot; a unit that died or leaked this tick is still here (alive false).
    if (e.uid === 0 || e.def === null || e.route === null) continue;
    if (enemy !== undefined && e.def.id !== enemy) continue;
    if (isMedalExempt(e.tags)) continue;
    if (unrevealed && (!e.def.cloaked || e.everRevealed)) continue;
    if (e.dist > markerRouteDist(e.route, mx, my)) {
      (state.stats.markersPassed[marker] ??= {})[key] = state.tick;
      return;
    }
  }
}

/** Whether a unit with these wave tags is medal-exempt (design/core-loop.md § 2.7). */
export function isMedalExempt(tags: readonly WaveTag[]): boolean {
  for (let i = 0; i < tags.length; i++) {
    if (MEDAL_EXEMPT_TAGS.includes(tags[i]!)) return true; // i < length
  }
  return false;
}

/**
 * How far along `route` (tiles) a marker at (x, y) sits: the route distance of the route point
 * closest to it. On a tie (a route that doubles back past it) the later point wins, so a unit
 * passes the marker only once it has cleared every stretch beside it.
 */
export function markerRouteDist(route: CompiledRoute, x: number, y: number): number {
  const { xs, ys, cumLenTiles } = route;
  let best = Infinity;
  let at = 0;
  for (let i = 0; i + 1 < xs.length; i++) {
    const ax = xs[i]!; // i + 1 < length
    const ay = ys[i]!;
    const dx = xs[i + 1]! - ax;
    const dy = ys[i + 1]! - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = ax + t * dx - x;
    const ey = ay + t * dy - y;
    const d2 = ex * ex + ey * ey;
    if (d2 <= best + TIE_EPS_SQ) {
      if (d2 < best) best = d2;
      at = cumLenTiles[i]! + t * Math.sqrt(len2); // cumLenTiles has one entry per point
    }
  }
  return at;
}
