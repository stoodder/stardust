// The forced single input (design/core-loop.md § 2.11: A3M3's SEAL; T600a slot, T605 fills it):
// while `state.pendingInput` is set, waves, movement, and firing freeze but the sim keeps ticking,
// until a `scriptInput` command with that id resolves it (ForcedInputResolved, the
// `forcedInputResolved` trigger). Runs after the triggers (tick.ts), so a `forceInput` action
// freezes the same tick. Until T605 lands, createSim refuses `forceInput` (SCRIPT_GATES) and the
// `scriptInput` command is rejected `notImplemented`, so this pass has nothing to do.
import type { SimState } from './state.ts';
import type { TickContext } from './tick.ts';

export function forcedInput(_state: SimState, _ctx: TickContext): void {
  // T605.
}
