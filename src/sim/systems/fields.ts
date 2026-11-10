// Control fields (design/towers.md § 7, the Stasis Bloom; T600a slot, T608 fills it): each tower
// whose tier has a `field` Chills the enemies inside it and pulses Stasis on its timer (Gravity
// Well also pulls them back, `Enemy.pullImmuneTicks`). Runs after the status system and before the
// enemy abilities (tick.ts), so a pulse interrupts a tell this tick. Until T608 lands, createSim
// refuses a field (`tower.field`; the Bloom is a stub tower too), so this pass has nothing to do.
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

export function fields(_state: SimState, _ctx: TickContext): void {
  // T608.
}
