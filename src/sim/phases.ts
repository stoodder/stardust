// Script phases and the light (design/maps.md § 5.5; T800a slot, T806 fills it): `setPhase` moves
// the map's script phase on (`state.phase`, `state.phaseTick`; `PhaseChanged`), which the
// `{ phase, afterSec }` trigger and the `phaseAtLeast` condition read; `checkpoint` records a
// labelled retry checkpoint (`CheckpointReached { label }`: "Retry from the Halls"); and
// `setLighting` sets the light's key (`state.lightingKey`; `LightingSet`: Dawn). This pass runs
// after the triggers (tick.ts), for what a phase does on its own clock (Dawn's hold before the
// map is won). Until T806 lands, createSim refuses these script parts (SCRIPT_GATES).
import type { SimState } from './state.ts';
import type { TickContext } from './tick.ts';

export function phases(_state: SimState, _ctx: TickContext): void {
  // T806.
}

/** Whether the script phase is `phase` or later, `afterTicks` after it began (T806). */
export function phaseReached(state: SimState, phase: number, afterTicks: number): boolean {
  return (
    state.phase > phase || (state.phase === phase && state.tick - state.phaseTick >= afterTicks)
  );
}

/** The `setPhase` action (T806). */
export function setPhase(_state: SimState, _phase: number): void {
  // T806.
}

/** The `checkpoint` action (T806): a labelled retry checkpoint. */
export function scriptCheckpoint(_state: SimState, _label: string): void {
  // T806.
}

/** The `setLighting` action (T806). */
export function setLighting(_state: SimState, _key: string): void {
  // T806.
}
