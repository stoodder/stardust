// System 6: movement. Advances every live enemy along its route by its speed this tick (Chilled
// slows it through `chillMul`; younglings move at YOUNGLING_SPEED_MUL), and leaks the ones that
// reach the route's end: the core loses the leak cost (design/core-loop.md §2.9; 0 for `fleeing`
// and `youngling` units), less what Emergency Bulkhead absorbs, the leak counts toward its tags'
// `stats.tagLeaked`, and the enemy is removed. Losing at 0 integrity is cleanup's check (T105b),
// at the end of the tick. Slots run in ascending order (determinism).
import { LEAK_FREE_TAGS } from '../../content/rules.ts';
import type { WaveTag } from '../../content/types.ts';
import type { Enemy } from '../entities.ts';
import { countTags } from '../fireControl.ts';
import { poolKill } from '../pool.ts';
import { pointAt } from '../path.ts';
import { emit, type SimState } from '../state.ts';

/**
 * The youngling wave modifier's speed (design/enemies.md § 5.1: speed ×0.5).
 * TODO(orchestrator): move to content/rules.ts beside YOUNGLING_BOUNTY once T208 lands.
 */
export const YOUNGLING_SPEED_MUL = 0.5;

/**
 * An enemy's speed this tick, in tiles per tick: its base speed, ×YOUNGLING_SPEED_MUL for a
 * youngling, × its Chilled multiplier. Lead targeting predicts with the same number.
 */
export function enemySpeedPerTick(e: Enemy): number {
  const base = e.def === null ? 0 : e.def.speedTilesPerTick;
  return (e.tags.includes('youngling') ? base * YOUNGLING_SPEED_MUL : base) * e.chillMul;
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
    if (!e.alive || e.def === null || e.route === null) continue;
    const route = e.route;
    e.dist += enemySpeedPerTick(e);
    if (e.dist >= route.lengthTiles - ARRIVE_EPS_TILES) {
      e.dist = route.lengthTiles;
      e.seg = pointAt(route, e.dist, e, e.seg);
      countTags(state.stats.tagLeaked, e.tags);
      leak(state, e.def.id, leaksFree(e.tags) ? 0 : e.def.leak, e.uid);
      poolKill(enemies, e);
    } else {
      e.seg = pointAt(route, e.dist, e, e.seg);
    }
  }
}

/**
 * Applies a leak to the core: its cost, never more than the integrity left. Emergency Bulkhead
 * (`leakAbsorb`) absorbs the first `state.leakAbsorbLeft` of it over the map. EnemyLeaked reports
 * what was actually lost.
 */
function leak(state: SimState, enemy: string, cost: number, uid: number): void {
  let amount = cost;
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
