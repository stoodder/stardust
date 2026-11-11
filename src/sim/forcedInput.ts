// The forced single input (design/core-loop.md § 2.11: A3M3's SEAL; T605). The rules as built:
// - **Requested.** A `forceInput: { id }` script action (systems/triggers.ts) sets
//   `state.pendingInput` and emits ForcedInputRequested; the host shows the single-button overlay
//   on it. A second request while one is pending is ignored (one button at a time).
// - **Frozen.** While `pendingInput` is set, runTick (tick.ts) runs only its WHILE_FORCED systems
//   (applyCommands): the wave schedule, movement, firing, statuses, cooldowns, script
//   triggers, and timers all hold, but `tick` still advances, so render animates on and the command
//   log stays continuous. A request freezes the rest of its own tick: it runs in the triggers
//   system, and every later system that tick is skipped (this system, next in the order, is where
//   the freeze begins).
// - **Commands.** Every command but `scriptInput` with the pending id is rejected `forcedInput`
//   (systems/applyCommands.ts), and so is a `scriptInput` for another id or with none pending.
// - **Pressed.** The matching `scriptInput` clears `pendingInput`, appends the id to
//   `state.forcedResolved`, and emits ForcedInputResolved. The same tick then runs whole (a press
//   while paused, by applyPending, runs as the next tick starts), and its triggers reach the
//   `forcedInputResolved: id` trigger: the Holdout's `endMap` (sim/objectives.ts) ends the map on
//   it. The balance harness presses it with a `scriptInput` build step (sim/headless.ts).
// Real-time lines (Bricks's "Kid. It's okay." after 20 s) are a story-side timer on wall-clock
// time, never sim ticks.
import type { RejectReason } from './commands.ts';
import { emit, type SimState } from './state.ts';
import type { TickContext } from './tick.ts';

/** `forceInput` (a script action): waves, movement, and firing freeze until `id` is pressed. */
export function requestForcedInput(state: SimState, id: string): void {
  if (state.pendingInput !== null) return;
  state.pendingInput = id;
  emit(state, { type: 'ForcedInputRequested', id });
}

/**
 * The `scriptInput` command: presses the pending forced input `id` (see the header). Returns null,
 * or `forcedInput` when no input is pending or another one is.
 */
export function pressForcedInput(state: SimState, id: string): RejectReason | null {
  if (state.pendingInput === null || state.pendingInput !== id) return 'forcedInput';
  state.pendingInput = null;
  state.forcedResolved.push(id);
  emit(state, { type: 'ForcedInputResolved', id });
  return null;
}

/** Whether forced input `id` has been pressed this run (the `forcedInputResolved` trigger). */
export function forcedInputResolved(
  state: { readonly forcedResolved: readonly string[] },
  id: string,
): boolean {
  return state.forcedResolved.includes(id);
}

/**
 * System 3b: the freeze's first system. It has nothing to run itself: runTick skips it and every
 * system after it while `pendingInput` is set (see the header), so a `forceInput` action freezes
 * the rest of its own tick.
 */
export function forcedInput(_state: SimState, _ctx: TickContext): void {
  // The freeze is runTick's (tick.ts WHILE_FORCED); see the header.
}
