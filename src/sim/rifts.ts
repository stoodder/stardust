// Rift lanes (design/maps.md § 4; T600a slot, T602 fills it): Hollow ground routes through decor
// that open at their `opensAtWave`, telegraphed a wave ahead (RiftOpening as the wave before's
// countdown begins, RiftOpened as the wave starts). Runs after the waves system (tick.ts), so it
// sees this tick's countdown and wave start. Until T602 lands, createSim refuses a map with rift
// lanes (`map.rift`), so this pass has nothing to do.
import type { SimState } from './state.ts';
import type { TickContext } from './tick.ts';

export function rifts(_state: SimState, _ctx: TickContext): void {
  // T602.
}
