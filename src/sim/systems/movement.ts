// System 6: movement. Advances every live enemy along its route by its speed this tick (Chilled
// slows it through `chillMul`; younglings move at YOUNGLING_SPEED_MUL), and leaks the ones that
// reach the route's end: the core loses the leak cost (design/core-loop.md §2.9; 0 for `fleeing`
// and `youngling` units; a boss drains it all, BOSS_LEAK_DRAINS_ALL), less what Emergency Bulkhead
// absorbs (a `quiet_wave` unit never takes it below 1, D097), the leak counts toward its tags'
// `stats.tagLeaked`, and the enemy is removed. Losing at 0 integrity is cleanup's check (T105b),
// at the end of the tick. Slots run in ascending order (determinism).
// Flyers move the same way along their air lane (design/maps.md §4: a polyline from an air spawn
// to the core, crossing any tile; compileMap.ts checks it ends on the core), and leak at the core
// like ground units. A neutral unit (Gerald, core-loop.md §2.7) never leaks: at its route's end it
// delivers and leaves (`NeutralExited`), with no integrity lost, no tag counted, and no leak for
// Perfect Core (sim/medals.ts `leakedThisTick`).
import { BOSS_LEAK_DRAINS_ALL, LEAK_FREE_TAGS, YOUNGLING_SPEED_MUL } from '../../content/rules.ts';
import type { WaveTag } from '../../content/types.ts';
import type { Enemy } from '../entities.ts';
import { countTags } from '../fireControl.ts';
import { poolKill } from '../pool.ts';
import { pointAt } from '../path.ts';
import { emit, type SimState } from '../state.ts';

/**
 * An enemy's speed this tick, in tiles per tick, ground or air: its base speed,
 * ×YOUNGLING_SPEED_MUL for a youngling, × its Chilled multiplier, × its pace (`paceMul`: a huddle
 * or a boss's haste, T304c). Lead targeting and flak intercepts predict with the same number.
 */
export function enemySpeedPerTick(e: Enemy): number {
  const base = e.def === null ? 0 : e.def.speedTilesPerTick;
  return (
    (e.tags.includes('youngling') ? base * YOUNGLING_SPEED_MUL : base) * e.chillMul * e.paceMul
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

export function movement(state: SimState): void {
  const enemies = state.enemies;
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
      countTags(state.stats.tagLeaked, e.tags);
      leak(
        state,
        e.def.id,
        e.def.boss !== null && BOSS_LEAK_DRAINS_ALL
          ? state.integrity + state.leakAbsorbLeft
          : leaksFree(e.tags)
            ? 0
            : e.def.leak,
        e.uid,
        e.tags.includes('quiet_wave') ? 1 : 0,
      );
      poolKill(enemies, e);
    } else {
      e.seg = pointAt(route, e.dist, e, e.seg);
    }
  }
}

/**
 * Applies a leak to the core: its cost, never taking the integrity below `floor`. Emergency
 * Bulkhead (`leakAbsorb`) absorbs the first `state.leakAbsorbLeft` of it over the map. EnemyLeaked
 * reports what was actually lost. A `quiet_wave` unit's floor is 1 (D097): sparing the Quiet Wave
 * never loses the map (core-loop.md § 2.7, C1 rule 1), for every player, not only par.
 */
function leak(state: SimState, enemy: string, cost: number, uid: number, floor: number): void {
  let amount = cost;
  if (state.leakAbsorbLeft > 0 && amount > 0) {
    const absorbed = amount < state.leakAbsorbLeft ? amount : state.leakAbsorbLeft;
    state.leakAbsorbLeft -= absorbed;
    amount -= absorbed;
  }
  const room = state.integrity > floor ? state.integrity - floor : 0;
  const lost = amount < room ? amount : room;
  state.integrity -= lost;
  state.stats.integrityLost += lost;
  emit(state, { type: 'EnemyLeaked', uid, enemy, leak: lost });
}
