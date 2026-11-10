// System 6: movement. Advances every live enemy along its route by its speed this tick (Chilled
// slows it through `chillMul`, Unnerved through `unnervedSpeedMul` (T507); younglings move at
// YOUNGLING_SPEED_MUL), and leaks the ones that
// reach the route's end: the core loses the leak cost (design/core-loop.md §2.9; 0 for `fleeing`
// and `youngling` units; a boss drains it all, BOSS_LEAK_DRAINS_ALL), less what Emergency Bulkhead
// absorbs, the leak counts toward its tags' `stats.tagLeaked` (and, unless medal-exempt, toward
// `stats.leaksByFaction` and `leaksByEnemy`, and a Heavy unit's toward `heavyLeaks`), and the
// enemy is removed. Losing at
// 0 integrity is cleanup's check (T105b), at the end of the tick. Slots run in ascending order
// (determinism), except that `quiet_wave` units leak last in the tick (D098): a Quiet Wave leak
// never takes the core below 1 (D097), so leaking after every other leak of the tick means sparing
// it can never be what empties the core, whichever slots the units hold.
// Flyers move the same way along their air lane (design/maps.md §4: a polyline from an air spawn
// to the core, crossing any tile; compileMap.ts checks it ends on the core), and leak at the core
// like ground units. A neutral unit (Gerald, core-loop.md §2.7) never leaks: at its route's end it
// delivers and leaves (`NeutralExited`), with no integrity lost, no tag counted, and no leak for
// Perfect Core (sim/medals.ts `leakedThisTick`).
// On a Protect map (T305a), a unit whose route leads to the asset (`map.asset.routes`) leaks
// there instead: the same cost, floor, and boss rule against `state.asset`
// (sim/objectives.ts `leakToAsset`), and the core loses nothing. While the map is an Escort
// (T305c), every route ends at the safe exit: sim/escort.ts's exit rule takes the leak instead.
import {
  BOSS_LEAK_DRAINS_ALL,
  HUSH_SPEED_MUL,
  LEAK_FREE_TAGS,
  YOUNGLING_SPEED_MUL,
} from '../../content/rules.ts';
import type { CompiledEnemyDef, CompiledMapDef } from '../../content/compiled.ts';
import type { IdSpace, WaveTag } from '../../content/types.ts';
import type { Enemy } from '../entities.ts';
import { isMedalExempt } from '../conditions.ts';
import { leakAtExit } from '../escort.ts';
import { countTags } from '../fireControl.ts';
import { leakToAsset } from '../objectives.ts';
import { poolKill } from '../pool.ts';
import { pointAt } from '../path.ts';
import { emit, type SimState } from '../state.ts';
import { unnervedSpeedMul } from './status.ts';

/**
 * An enemy's speed this tick, in tiles per tick, ground or air: its base speed (×HUSH_SPEED_MUL
 * once Heavy, enemies.md § 5.4), ×YOUNGLING_SPEED_MUL for a youngling, × its Chilled multiplier,
 * × its pace (`paceMul`: a huddle, a boss's or Skittish haste, a hush tell's stop), × 0.8 while
 * Unnerved (not a boss; T507); 0 in Stasis
 * or Pinned (so a huddle's leader in either holds its group still too). Lead targeting and flak intercepts
 * predict with the same number.
 */
export function enemySpeedPerTick(e: Enemy): number {
  if (e.stasisTicks > 0) return 0; // frozen in Stasis (systems/status.ts; enemies.md § 2.4)
  if (e.pinnedTicks > 0) return 0; // held by a Pin (T408)
  const own = e.def === null ? 0 : e.def.speedTilesPerTick;
  const base = e.heavy ? own * HUSH_SPEED_MUL : own;
  return (
    (e.tags.includes('youngling') ? base * YOUNGLING_SPEED_MUL : base) *
    e.chillMul *
    e.paceMul *
    unnervedSpeedMul(e) // Unnerved's −20% on a non-boss (systems/status.ts; T507)
  );
}

/** Whether a unit with these tags leaks for 0 (LEAK_FREE_TAGS: fleeing, youngling). */
export function leaksFree(tags: readonly WaveTag[]): boolean {
  for (let i = 0; i < tags.length; i++) {
    if (LEAK_FREE_TAGS.includes(tags[i]!)) return true; // i < length
  }
  return false;
}

/**
 * Arrival tolerance, in tiles. `dist` sums a per-tick float step, so an enemy can come up a
 * rounding error short of the end on the exact tick it should arrive (2 tiles/s over 9 tiles sums
 * to 8.99999…, at tick 270); this keeps the leak on that tick. Far below any visible distance.
 */
export const ARRIVE_EPS_TILES = 1e-9;

/** The map's asset, for routing leaks (absent in unit tests that run movement alone: no asset). */
type AssetMap = Pick<CompiledMapDef<IdSpace>, 'asset'>;

export function movement(state: SimState, ctx?: { readonly map: AssetMap }): void {
  const map = ctx?.map ?? null;
  const enemies = state.enemies;
  let quietArrived = false;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (!e.alive || e.def === null || e.route === null || e.leaving) continue; // a leaving boss and its brood move in enemyAbilities (T304c)
    const route = e.route;
    e.dist += enemySpeedPerTick(e);
    if (e.dist >= route.lengthTiles - ARRIVE_EPS_TILES) {
      e.dist = route.lengthTiles;
      e.seg = pointAt(route, e.dist, e, e.seg);
      if (e.def.neutral) {
        emit(state, { type: 'NeutralExited', uid: e.uid, enemy: e.def.id, x: e.x, y: e.y });
        poolKill(enemies, e);
        continue;
      }
      if (e.tags.includes('quiet_wave')) {
        quietArrived = true; // leaks in the second pass, below
        continue;
      }
      arrive(state, map, e, e.def, 0);
    } else {
      e.seg = pointAt(route, e.dist, e, e.seg);
    }
  }
  if (!quietArrived) return;
  // The Quiet Wave's arrivals leak after every other leak this tick (D098), floored at 1.
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (!e.alive || e.def === null || e.route === null || e.leaving) continue;
    if (e.dist < e.route.lengthTiles || !e.tags.includes('quiet_wave')) continue;
    arrive(state, map, e, e.def, 1);
  }
}

/**
 * Leaks an enemy that reached its route's end (never below `floor`), at the asset if its route
 * leads there, else at the core, and removes it.
 */
function arrive(
  state: SimState,
  map: AssetMap | null,
  e: Enemy,
  def: CompiledEnemyDef,
  floor: number,
): void {
  countTags(state.stats.tagLeaked, e.tags);
  countLeak(state, e, def);
  const drains = def.boss !== null && BOSS_LEAK_DRAINS_ALL;
  const cost = drains ? null : leaksFree(e.tags) ? 0 : def.leak;
  // On an Escort (T305c) it reaches the safe exit instead: sim/escort.ts's exit rule.
  if (leakAtExit(state, e, cost)) {
    poolKill(state.enemies, e);
    return;
  }
  if (map === null || !leakToAsset(state, map, e, cost, floor)) {
    leak(state, def.id, cost ?? state.integrity + state.leakAbsorbLeft, e.uid, floor);
  }
  poolKill(state.enemies, e);
}

/**
 * Counts a leak by faction, by enemy id (the `leaks` condition atom; T400a), and by the unit's wave
 * (`leaks.waves`: Before the Dark; T500a), and a Heavy unit's
 * (`heavyLeaks`: Hiccup Contained, T460), except a medal-exempt unit's, which no Challenge may read
 * (core-loop.md § 2.7).
 */
function countLeak(state: SimState, e: Enemy, def: CompiledEnemyDef): void {
  if (isMedalExempt(e.tags)) return;
  const stats = state.stats;
  stats.leaksByFaction[def.faction]++;
  stats.leaksByEnemy[def.id] = (stats.leaksByEnemy[def.id] ?? 0) + 1;
  if (e.wave >= 1 && e.wave <= stats.leaksByWave.length) stats.leaksByWave[e.wave - 1]!++; // T500a
  if (e.heavy) stats.heavyLeaks++; // Hiccup Contained (T460)
}

/**
 * Applies a leak to the core: its cost, never taking the integrity below `floor`. A `quiet_wave`
 * unit's floor is 1 (D097): sparing the Quiet Wave never loses the map (core-loop.md § 2.7, C1
 * rule 1), for every player, not only par. The floor applies first (D098), so a leak the floor
 * already cancels spends none of Emergency Bulkhead (`leakAbsorb`), which absorbs the first
 * `state.leakAbsorbLeft` of what is left over the map. EnemyLeaked reports what was actually lost.
 */
function leak(state: SimState, enemy: string, cost: number, uid: number, floor: number): void {
  const room = state.integrity > floor ? state.integrity - floor : 0;
  let amount = floor > 0 && cost > room ? room : cost;
  if (state.leakAbsorbLeft > 0 && amount > 0) {
    const absorbed = amount < state.leakAbsorbLeft ? amount : state.leakAbsorbLeft;
    state.leakAbsorbLeft -= absorbed;
    amount -= absorbed;
  }
  const lost = amount < room ? amount : room;
  state.integrity -= lost;
  state.stats.integrityLost += lost;
  emit(state, { type: 'EnemyLeaked', uid, enemy, leak: lost });
}
