// Script phases, the labelled checkpoint, and the light (design/maps.md § 5.5; T806). The rules as
// built, all script actions (systems/triggers.ts runs them in the event's action order):
// - **`setPhase`** moves the map's script phase on (`state.phase`, 1 from the start;
//   `state.phaseTick` the tick it began; `PhaseChanged`). Phases only rise: a `setPhase` to the
//   phase now or an earlier one does nothing, so the `{ phase, afterSec }` trigger (`phaseReached`)
//   and the `phaseAtLeast` condition are monotonic, as every trigger is. The finale's 2 is the
//   Unsung (Directive 0 fires `{ phase: 2, afterSec: 20 }`), its 3 Dawn (the map is won by an
//   `endMap` event `{ phase: 3, afterSec: 8 }`), so no phase needs a system of its own.
// - **`checkpoint`** records a labelled retry checkpoint (`CheckpointReached { wave, tick, label }`:
//   'halls', "Retry from the Halls"), whatever the map's act (a wave checkpoint is the waves
//   system's, every 5th wave). Like a wave checkpoint, its `tick` is the state after the tick it
//   runs on (`state.tick + 1`), so replaying the logged commands below it reproduces that state
//   exactly: the towers, credits, Voices, the Bore's fill and its fixed boss bonus, the phase and
//   its clock (architecture.md § Checkpoints). `wave` is the last wave started (0 in setup).
// - **`setLighting`** turns the light to a lighting set (content/lightingSets.ts: Dawn) from this
//   tick (`state.lightingKey`, `state.lightingTick`; `LightingSet`); render eases to it, and a
//   Sundown darkness lifts with it (sim/darkness.ts). The same key again does nothing.
import type { SimState } from './state.ts';
import { emit } from './state.ts';

/** Whether the script phase is `phase` or later, `afterTicks` after it began. */
export function phaseReached(state: SimState, phase: number, afterTicks: number): boolean {
  return (
    state.phase > phase || (state.phase === phase && state.tick - state.phaseTick >= afterTicks)
  );
}

/** The `setPhase` action: the script phase rises to `phase` now (never falls). */
export function setPhase(state: SimState, phase: number): void {
  if (phase <= state.phase) return;
  state.phase = phase;
  state.phaseTick = state.tick;
  emit(state, { type: 'PhaseChanged', phase });
}

/** The `checkpoint` action: a labelled retry checkpoint, resuming at the state after this tick. */
export function scriptCheckpoint(state: SimState, label: string): void {
  emit(state, { type: 'CheckpointReached', wave: state.wave, tick: state.tick + 1, label });
}

/** The `setLighting` action: the light turns to lighting set `key` from this tick. */
export function setLighting(state: SimState, key: string): void {
  if (state.lightingKey === key) return;
  state.lightingKey = key;
  state.lightingTick = state.tick;
  emit(state, { type: 'LightingSet', key });
}
