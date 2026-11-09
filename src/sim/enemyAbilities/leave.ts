// Leaving the map (design/enemies.md § 6.1): a boss's `driveOff` or `retreat`, and a driven-off
// boss's brood. A leaving unit is off its route: it heads straight for the nearest map edge (ties:
// west, east, north, south, in tile space) and is gone when it reaches it (sim positions never
// leave the map; render can carry the sprite on past the edge as it fades). It moves at
// its base speed, or faster when that wouldn't get it out in time: each tick it covers at least
// the distance left over the ticks left (`Enemy.abilityTicks`, from LEAVE_MAX_TICKS), so it's
// always gone within BOSS_LEAVE_MAX_SEC. Gone is not a leak or a kill: no integrity, no bounty,
// no medal effect. Cleanup books it against its wave like any other departure.
import type { Enemy } from '../entities.ts';
import { poolKill } from '../pool.ts';
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

/** One tick of a leaving unit: a step toward the nearest edge, or gone. */
export function leaveStep(state: SimState, ctx: TickContext, e: Enemy): void {
  const cols = ctx.map.cols;
  const rows = ctx.map.rows;
  // The nearest edge and the distance to it, along one axis.
  let axis = 0; // 0: x, 1: y
  let sign = -1;
  let d = e.x;
  if (cols - e.x < d) {
    d = cols - e.x;
    sign = 1;
  }
  if (e.y < d) {
    d = e.y;
    axis = 1;
    sign = -1;
  }
  if (rows - e.y < d) {
    d = rows - e.y;
    axis = 1;
    sign = 1;
  }
  const ticksLeft = e.abilityTicks > 1 ? e.abilityTicks : 1;
  const base = e.def === null ? 0 : e.def.speedTilesPerTick;
  const needed = d / ticksLeft;
  const step = base > needed ? base : needed;
  if (step >= d - 1e-9) {
    poolKill(state.enemies, e);
    return;
  }
  if (axis === 0) e.x += sign * step;
  else e.y += sign * step;
  e.abilityTicks = ticksLeft - 1;
}
