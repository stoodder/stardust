// Blink (design/enemies.md § 3, § 6; D101; T400a seam, run by T404). Every `everyTicks`
// (`Enemy.blinkTicks` counts down; the last `tellTicks` are the tell, BlinkTell with the landing
// point), the unit jumps `tiles` forward along its route (Blinked, the afterimage). Stasis and
// Unnerved interrupt the tell and restart the cooldown (BlinkInterrupted); a Stasis converted to
// Chilled on a boss doesn't (D101). A boss's completed blinks count in `stats.bossBlinks` (Glass
// Half Empty). Used by the Glass Witch's phase 2 now and M5's Blinkstrider.
//
// A stub until T404: no live unit blinks yet, and createSim refuses one (`enemy.blink`).
import type { CompiledBlink } from '../../content/compiled.ts';
import type { Enemy } from '../entities.ts';
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

export function blinkStep(
  _state: SimState,
  _ctx: TickContext,
  _e: Enemy,
  _blink: CompiledBlink,
): void {
  // T404.
}
