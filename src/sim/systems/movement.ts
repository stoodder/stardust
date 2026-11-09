// System 6: movement. Advances every live enemy along its route by its speed this tick (Chilled
// slows it through `chillMul`), and leaks the ones that reach the route's end: the core loses the
// leak cost (design/core-loop.md §2.9), less what Emergency Bulkhead absorbs, and the enemy is
// removed. Losing at 0 integrity is
// cleanup's check (T105b), at the end of the tick. Slots run in ascending order (determinism).
import { poolKill } from '../pool.ts';
import { pointAt } from '../path.ts';
import { emit, type SimState } from '../state.ts';

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
    if (!e.alive || e.def === null || e.route === null) continue;
    const route = e.route;
    e.dist += e.def.speedTilesPerTick * e.chillMul;
    if (e.dist >= route.lengthTiles - ARRIVE_EPS_TILES) {
      e.dist = route.lengthTiles;
      e.seg = pointAt(route, e.dist, e, e.seg);
      leak(state, e.def.id, e.def.leak, e.tags.includes('fleeing'), e.uid);
      poolKill(enemies, e);
    } else {
      e.seg = pointAt(route, e.dist, e, e.seg);
    }
  }
}

/**
 * Applies a leak to the core: its cost, never more than the integrity left. Fleeing Skitterkin
 * leak for 0 (design/enemies.md §5.4). Emergency Bulkhead (`leakAbsorb`) absorbs the first
 * `state.leakAbsorbLeft` of it over the map. EnemyLeaked reports what was actually lost.
 */
function leak(state: SimState, enemy: string, cost: number, isFleeing: boolean, uid: number): void {
  let amount = isFleeing ? 0 : cost;
  if (state.leakAbsorbLeft > 0 && amount > 0) {
    const absorbed = amount < state.leakAbsorbLeft ? amount : state.leakAbsorbLeft;
    state.leakAbsorbLeft -= absorbed;
    amount -= absorbed;
  }
  const lost = amount < state.integrity ? amount : state.integrity;
  state.integrity -= lost;
  state.stats.integrityLost += lost;
  emit(state, { type: 'EnemyLeaked', uid, enemy, leak: lost });
}
