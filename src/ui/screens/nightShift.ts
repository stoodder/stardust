// Night Shift (act3.md § A3M4, *Base vignette*, `a3_m04_base_night_shift`; T714): the base's
// mandatory visit after C4, staged full-screen in the shelters at night. One lamp, the last
// Mandatory Fun Friday banner sagging over the sleeping colony, the bays dark. The beat it exists
// for is Ves'thara's laugh: as her laugh line shows, the lamp's pool blooms warm, and the room stays
// a step warmer for the rest of the scene (she had forgotten she could). Pure: the room's state is
// a function of the lines shown so far; the stage (nightShiftStage.tsx) draws. Silent; mandatory
// (`noSkip`, app/baseScenes.ts); reduced motion holds each state still, with no bloom animation.

/** The room alone before the first line (ms; `stagingLeadInMs` for `night_shift`). */
export const NIGHT_SHIFT_LEAD_IN_MS = 1400;
/** Under reduced motion: a shorter look at the still room. */
export const NIGHT_SHIFT_LEAD_IN_STILL_MS = 800;

export function nightShiftLeadInMs(still: boolean): number {
  return still ? NIGHT_SHIFT_LEAD_IN_STILL_MS : NIGHT_SHIFT_LEAD_IN_MS;
}

/** The banner's words (act3.md § A3M4, *Layout*: the last Mandatory Fun Friday banner). */
export const BANNER_TEXT = 'Mandatory Fun Friday';

/** The room's light: before the laugh, as it lands, and after it. */
export type RoomLight = 'cold' | 'laugh' | 'warm';

/** A line as the stage reads it. */
interface RoomLine {
  readonly speaker: string;
  readonly portrait: { readonly expression: string } | null;
}

/** Whether `l` is Ves'thara's laugh (her `laugh` expression; T741's portrait). */
export function isLaugh(l: RoomLine): boolean {
  return l.speaker === 'vesthara' && l.portrait?.expression === 'laugh';
}

/**
 * The room's light with `current` on screen after `before`: the laugh's bloom while her laugh line
 * shows, warm once it has been said, cold until then.
 */
export function roomLight(before: readonly RoomLine[], current: RoomLine | null): RoomLight {
  if (current !== null && isLaugh(current)) return 'laugh';
  return before.some(isLaugh) ? 'warm' : 'cold';
}

/** The screen reader's account of the room (the stage is aria-hidden; the lines speak). */
export function nightShiftLabel(light: RoomLight): string {
  const room =
    'The shelters at night: one lamp, the Mandatory Fun Friday banner sagging over the sleeping colony';
  if (light === 'laugh') return `${room}. The lamp's light warms.`;
  if (light === 'warm') return `${room}, the lamp a little warmer now.`;
  return `${room}.`;
}
