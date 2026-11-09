// Clickable world objects (T409; story-runtime.md § Map scripts, design/maps.md § 5.3): a
// `setClickable` script action makes a marker the map lists in `clickables` clickable (A2M3's
// Peeker holding Pebble). While it is, an `interact` command (applyCommands) interacts with it; if
// the player never does, its fallback trigger does (systems/triggers.ts), so the story always
// lands. Either way the sim interacts once: the marker leaves `state.clickable` for
// `state.interacted`, `ClickableChanged { on: false }` then `Interacted { marker, byFallback }`
// are emitted, and the map's `interacted` trigger is reached.
//
// Rules: a marker is interacted with at most once per run, and a marker already interacted with
// never turns clickable again (`setClickable` on is a no-op then). Turning on a marker that's
// already clickable replaces its fallback, with no event. Turning it off drops its fallback too:
// a beat a script withdraws doesn't land by itself.
import type { CompiledScriptTrigger } from '../content/compiled.ts';
import type { IdSpace, MarkerId } from '../content/types.ts';
import type { RejectReason } from './commands.ts';
import { emit, type SimState } from './state.ts';

/** Runs a `setClickable` action: `marker` turns clickable (with `fallback`) or not. */
export function setClickable(
  state: SimState,
  marker: MarkerId,
  on: boolean,
  fallback: CompiledScriptTrigger<IdSpace> | null,
): void {
  const at = state.clickable.indexOf(marker);
  if (on) {
    if (state.interacted.includes(marker)) return; // once per run
    if (at >= 0) {
      state.clickFallback[at] = fallback;
      return;
    }
    state.clickable.push(marker);
    state.clickFallback.push(fallback);
    emit(state, { type: 'ClickableChanged', marker, on: true });
    return;
  }
  if (at < 0) return;
  state.clickable.splice(at, 1);
  state.clickFallback.splice(at, 1);
  emit(state, { type: 'ClickableChanged', marker, on: false });
}

/**
 * Interacts with `marker`: the player's `interact` command, or its fallback (`byFallback`).
 * Returns `notClickable` (changing nothing) unless the marker is clickable now.
 */
export function interact(
  state: SimState,
  marker: MarkerId,
  byFallback: boolean,
): RejectReason | null {
  const at = state.clickable.indexOf(marker);
  if (at < 0) return 'notClickable';
  state.clickable.splice(at, 1);
  state.clickFallback.splice(at, 1);
  state.interacted.push(marker);
  emit(state, { type: 'ClickableChanged', marker, on: false });
  emit(state, { type: 'Interacted', marker, byFallback });
  return null;
}
