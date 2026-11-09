// Bark selection (docs/tech/story-runtime.md § Barks): picks the bark a trigger plays by the style
// guide's priority (script cue → boss → first-time trigger → repeat), spacing (one per 6 s of sim
// time unless scripted), presence (QUILL and the companion), and no-repeat pools, with its own
// seeded RNG. Pure: the pick state is data the caller keeps.
import type { Bark, BarkId, BarkTrigger, SpeakerId } from '../content/dialogue/types.ts';
import type { StoryContext } from './conditions.ts';
import { notImplemented } from './notImplemented.ts';

/** Bark state for one battle: what played, when, and the pools' draw order. */
export interface BarkState {
  readonly lastAtSec: number | null;
  readonly played: readonly BarkId[];
  readonly seed: number;
}

/** A trigger as it fires: the trigger, the sim time, and who is on the radio. */
export interface BarkEvent {
  readonly trigger: BarkTrigger;
  readonly atSec: number;
  readonly present: readonly SpeakerId[];
}

/** A fresh state for a battle. */
export function newBarkState(seed: number): BarkState {
  void seed;
  return notImplemented('newBarkState', 'T302a');
}

/** The bark `event` plays from `pool` (or null), and the state after it. */
export function pickBark(
  pool: readonly Bark[],
  event: BarkEvent,
  state: BarkState,
  ctx: StoryContext,
): { readonly bark: Bark | null; readonly state: BarkState } {
  void pool;
  void event;
  void state;
  void ctx;
  return notImplemented('pickBark', 'T302a');
}
