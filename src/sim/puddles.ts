// Big Glorp's puddles (design/towers.md § 7, the Gloop Spitter's spec A; T700a slot, T705 fills
// it): each `puddle` zone a hit left (`PuddleSpawned`) Chills every ground enemy inside its
// `chillPct` and deals its acid per second as a DoT that bypasses armor, credited to its tower,
// until it dries. Runs after movement and Underfoot's traps (tick.ts), so it judges where units
// stand this tick. Until T705 lands, createSim refuses a tier with a puddle (`tower.puddle`), so
// this pass has nothing to do.
import type { SimState } from './state.ts';
import type { TickContext } from './tick.ts';

export function puddles(_state: SimState, _ctx: TickContext): void {
  // T705.
}
