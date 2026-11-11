// Blockers (design/maps.md § 5.4: Bricks at the Gap, A3M3; T605). An ally post with `block` stands
// on the choke and holds units instead of letting them pass, while its health follows its map's
// wave timeline only (D141: nothing it holds, and nothing the player builds, moves it, so no score
// reads as having failed him). Runs after the enemy abilities and before movement (tick.ts), so a
// unit it takes doesn't step this tick; it's skipped while a forced input is pending, like
// everything that moves (sim/forcedInput.ts). The rules as built:
// - **Where.** Its hold point on a route is where the route passes nearest its post (the closest
//   point of the route's polyline to the post's tile centre, within BLOCK_REACH_TILES: a path tile
//   beside the post). A route that doesn't pass within reach isn't blocked.
// - **Who.** A live, non-boss, non-neutral ground unit on a ground route that passes the post, not
//   burrowed, Phased, leaving, or standing down, and one an ally may target (no `quiet_wave`,
//   `youngling`, or `fleeing` tag: allies.ts `allyMayTarget`). Flyers and burrowed units pass
//   over and under him; bosses walk through.
// - **Taking.** In ascending slot order, an eligible unit within BLOCK_FRONT_TILES before the hold
//   point (and not past it) is taken while the blocker holds fewer than `capacity` (`blockCapacity`;
//   D141: Bricks 2): `Enemy.blockerUid` names the ally, Blocked `on`. Others walk past. A held unit
//   stands still (systems/movement.ts `enemySpeedPerTick` is 0 while `blockerUid` is set), so it
//   stays in the towers' and Bricks's fire.
// - **Releasing.** Each tick, before taking, a held unit is let go (Blocked `off`) once it's no
//   longer eligible (it burrowed, stood down, began to leave) or something moved it past the hold
//   point (a blink). One that died is simply gone: its slot's next unit starts unblocked. A freed
//   place is taken again the same tick. `blocking` is the count it holds after the pass.
// - **Health** (`Ally.health`, a fraction of full; `vulnerability: 'scripted'`): the timeline's
//   level at each wave's start (`blockerLevel`: full before the first key, each key's `pct` from
//   its wave, equal steps per wave between two keys, the last key's after). While a wave plays, he
//   eases linearly from where he stood towards the next wave's level, arriving as it starts (the
//   ticks to go are the rest of the wave's spawning plus the next countdown, or what is left of
//   the countdown), so a wave's start always finds him on its level: A3M3's SEAL, as W14 starts,
//   finds him on his 5% floor. An early call ends the ease early; he eases on from where he stood
//   towards the following level, never jumping. In the setup, while a wave waits for a boss fight
//   (`held`), and during the last wave he holds. Never below BLOCKER_HEALTH_FLOOR.
//   AllyHealthChanged fires each time his health crosses a whole percent (the HUD's bar and the
//   vitals cue read `Ally.health` itself).
import type { CompiledAllyPost, CompiledMapDef, CompiledRoute } from '../content/compiled.ts';
import { BLOCKER_HEALTH_FLOOR, BLOCKER_REACH_TILES } from '../content/rules.ts';
import type { DeepReadonly } from '../shared/types.ts';
import type { IdSpace } from '../content/types.ts';
import type { Ally, Enemy } from './entities.ts';
import { emit, type SimState } from './state.ts';
import { allyMayTarget } from './systems/allies.ts';
import { countdownTicksFor, runWaveModifiers } from './systems/waves.ts';
import type { TickContext } from './tick.ts';

/** How far from its post a route may pass and still be blocked: a path tile beside the post. */
export const BLOCK_REACH_TILES = BLOCKER_REACH_TILES;
/** How far before the hold point a unit is taken (it stops there, in front of him). */
export const BLOCK_FRONT_TILES = 0.5;
/** Rounding slack for "past the hold point" (a held unit's `dist` never moves). */
const PAST_EPS = 1e-6;

type BlockKeys = NonNullable<CompiledAllyPost['block']>['health'];

/**
 * The blocker's health level as wave `wave` starts (1-based): 1 before the first key, each key's
 * `pct` from its wave, equal steps per wave between two keys, the last key's after.
 */
export function blockerLevel(keys: BlockKeys, wave: number): number {
  if (keys.length === 0 || wave < keys[0]!.wave) return 1; // length ≥ 1
  let prev = keys[0]!; // length ≥ 1
  for (let k = 1; k < keys.length; k++) {
    const key = keys[k]!; // k < length
    if (wave < key.wave) {
      return prev.pct + ((key.pct - prev.pct) * (wave - prev.wave)) / (key.wave - prev.wave);
    }
    prev = key;
  }
  return prev.pct;
}

/**
 * The distance along `route` of its hold point for a post at tile centre (`px`, `py`): the
 * route's nearest point to it, if within BLOCK_REACH_TILES; −1 if the route doesn't pass the post
 * (or isn't a ground route). Ties go to the earlier point.
 */
export function holdDistOn(route: CompiledRoute, px: number, py: number): number {
  if (route.layer !== 'ground') return -1;
  const xs = route.xs;
  const ys = route.ys;
  const cum = route.cumLenTiles;
  let best = -1;
  let bestSq = BLOCK_REACH_TILES * BLOCK_REACH_TILES + 1e-9;
  for (let i = 0; i + 1 < xs.length; i++) {
    const ax = xs[i]!; // i + 1 < length
    const ay = ys[i]!;
    const dx = xs[i + 1]! - ax;
    const dy = ys[i + 1]! - ay;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0 ? 0 : Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    const qx = ax + t * dx - px;
    const qy = ay + t * dy - py;
    const dSq = qx * qx + qy * qy;
    if (dSq < bestSq - 1e-12) {
      bestSq = dSq;
      best = cum[i]! + t * (cum[i + 1]! - cum[i]!); // i + 1 < length
    }
  }
  return best;
}

/** The compiled post a blocker ally stands on (its tile), or null. */
export function blockerPost(
  map: Pick<CompiledMapDef<IdSpace>, 'allies'>,
  a: Pick<Ally, 'x' | 'y'>,
): CompiledAllyPost | null {
  const posts = map.allies;
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i]!; // i < length
    if (p.block !== null && p.tile[0] + 0.5 === a.x && p.tile[1] + 0.5 === a.y) return p;
  }
  return null;
}

/** What `blockable` reads of an enemy (a live Enemy, or render's read-only view of one). */
export type BlockableEnemy = DeepReadonly<
  Pick<
    Enemy,
    'alive' | 'def' | 'route' | 'burrowed' | 'phased' | 'leaving' | 'standDownTicks' | 'tags'
  >
>;

/** Whether a blocker may hold `e` at all (see the header's "Who"). */
export function blockable(e: BlockableEnemy): boolean {
  const def = e.def;
  const route = e.route;
  return (
    e.alive &&
    def !== null &&
    route !== null &&
    def.boss === null &&
    !def.neutral &&
    def.layer === 'ground' &&
    route.layer === 'ground' &&
    !(e.burrowed || e.phased || e.leaving) && // out of reach (layers.ts `outOfReach`)
    e.standDownTicks === 0 &&
    allyMayTarget(e.tags)
  );
}

export function blockers(state: SimState, ctx: TickContext): void {
  const pool = state.allies;
  for (let i = 0; i < pool.used; i++) {
    const a = pool.items[i]!; // i < used ≤ items.length
    if (!a.alive || a.blockCapacity <= 0) continue;
    const post = blockerPost(ctx.map, a);
    if (post === null || post.block === null) continue;
    stepHealth(state, ctx, a, post.block.health);
    hold(state, ctx, a);
  }
}

/**
 * Ticks from now until the next wave starts, as scheduled (see the header's "Health"), or −1 when
 * it isn't scheduled: the setup, a wave held for a boss fight, the last wave, or the schedule done.
 */
export function ticksToNextWave(
  state: DeepReadonly<Pick<SimState, 'schedule' | 'wave'>>,
  ctx: Pick<TickContext, 'map' | 'config'>,
): number {
  const s = state.schedule;
  if (s.phase === 'countdown') return s.countdownTicks;
  if (s.phase !== 'spawning') return -1;
  const waves = ctx.map.waves;
  const wave = waves[state.wave - 1];
  const next = waves[state.wave];
  if (wave === undefined || next === undefined) return -1;
  const countdown = countdownTicksFor(
    next.countdownTicks,
    runWaveModifiers(ctx.config).countdownPct,
  );
  return wave.lastSpawnTicks - s.waveTicks + 1 + countdown;
}

/** One tick of the blocker's health timeline (see the header's "Health"). */
function stepHealth(state: SimState, ctx: TickContext, a: Ally, keys: BlockKeys): void {
  if (state.wave <= 0) return;
  const left = ticksToNextWave(state, ctx);
  if (left < 0) return;
  const to = blockerLevel(keys, state.wave + 1);
  const before = a.health;
  const next = left <= 1 ? to : before + (to - before) / left;
  a.health = next > BLOCKER_HEALTH_FLOOR ? next : BLOCKER_HEALTH_FLOOR;
  if (Math.round(a.health * 100) !== Math.round(before * 100)) {
    emit(state, { type: 'AllyHealthChanged', uid: a.uid, health: a.health });
  }
}

/** Releases the units the blocker can't hold any longer, then takes new ones up to capacity. */
function hold(state: SimState, ctx: TickContext, a: Ally): void {
  // Each route's hold point for this post, by its index in the map's route list (scratch).
  const routes = ctx.map.routeList;
  const at = ctx.scratch.slots;
  at.length = 0;
  for (let r = 0; r < routes.length; r++) at.push(holdDistOn(routes[r]!, a.x, a.y)); // r < length
  const enemies = state.enemies;
  let held = 0;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (e.blockerUid !== a.uid || !e.alive) continue; // a dead one's slot starts unblocked
    const d = e.route === null ? -1 : (at[routes.indexOf(e.route)] ?? -1);
    if (blockable(e) && d >= 0 && e.dist <= d + PAST_EPS) {
      held++;
      continue;
    }
    e.blockerUid = 0;
    emit(state, { type: 'Blocked', allyUid: a.uid, enemyUid: e.uid, on: false });
  }
  for (let i = 0; i < enemies.used && held < a.blockCapacity; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (e.blockerUid !== 0 || !blockable(e)) continue;
    const d = at[routes.indexOf(e.route!)] ?? -1; // blockable: on a route
    if (d < 0 || e.dist > d + PAST_EPS || e.dist < d - BLOCK_FRONT_TILES) continue;
    e.blockerUid = a.uid;
    held++;
    emit(state, { type: 'Blocked', allyUid: a.uid, enemyUid: e.uid, on: true });
  }
  a.blocking = held;
}
