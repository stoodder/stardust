// Underfoot's trap (design/core-loop.md § 3.2: Bramble's; T600a slot, T604 fills it): a `trap`
// zone on one path tile, live for its duration, springs on each ground enemy that crosses it
// (burrowed ones too), once each: Pinned and hit (TrapSprung; `state.trapSprung`). Runs after
// movement (tick.ts), so a crossing is judged on this tick's step. The cast itself is the
// abilities system's (systems/abilities.ts). Until T604 lands, createSim refuses the `pathTrap`
// ability (`ability.pathTrap`), so this pass has nothing to do.
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

export function traps(_state: SimState, _ctx: TickContext): void {
  // T604.
}
