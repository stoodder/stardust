// The Waykeeper beat (act3.md § A3M6, *Debrief*; T714): A3M6's debrief, played full-screen before
// the card (content/dialogue/resultsFlow.ts `debriefAsScene`), staged at Dome 1 with its doors open
// to the Long Night. Pebble names you; as her line finishes, the callsign plate turns: the old name
// (Thorn) dims and is struck through, and WAYKEEPER is written under it in gold. Behind it the choir
// gathers in Dome 1, one light at a time. Pure: the plate and the choir are functions of the lines
// and the clock; the stage (waykeeperStage.tsx) draws. Silent; reduced motion holds the choir
// gathered and turns the plate as soon as her line is whole.
import { CALLSIGNS } from '../../content/dialogue/profile.ts';
import { typeMs } from '../dialogue/text.ts';

/** The dome alone before Pebble speaks (ms; `stagingLeadInMs` for `waykeeper`). */
export const WAYKEEPER_LEAD_IN_MS = 1600;
export const WAYKEEPER_LEAD_IN_STILL_MS = 800;

export function waykeeperLeadInMs(still: boolean): number {
  return still ? WAYKEEPER_LEAD_IN_STILL_MS : WAYKEEPER_LEAD_IN_MS;
}

/** The plate holds the old name this long after her line is whole, then turns (ms). */
export const PLATE_TURN_HOLD_MS = 700;

/** How many lights the choir gathers, and how often one more comes in (ms). */
export const CHOIR_LIGHTS = 9;
export const CHOIR_EVERY_MS = 450;

/** The names on the plate (content/dialogue/profile.ts). */
export const OLD_CALLSIGN = CALLSIGNS.thorn;
export const NEW_CALLSIGN = CALLSIGNS.waykeeper;

/** A line as the stage reads it. */
interface NamingLine {
  readonly speaker: string;
  readonly text: string;
}

/** Whether `l` is Pebble naming you (her line that says the new callsign). */
export function isNaming(l: NamingLine): boolean {
  return l.speaker === 'pebble' && l.text.includes(NEW_CALLSIGN);
}

/**
 * Whether the plate has turned at `now`: her naming line already said, or on screen and whole
 * (typed out, or `done` by Next or reduced motion) for PLATE_TURN_HOLD_MS.
 */
export function plateTurned(
  said: readonly NamingLine[],
  current: NamingLine | null,
  typing: { readonly from: number; readonly done: boolean },
  now: number,
  still: boolean,
): boolean {
  if (said.some(isNaming)) return true;
  if (current === null || !isNaming(current)) return false;
  if (still) return true;
  const whole = typing.done ? typing.from : typing.from + typeMs(current.text);
  return now >= Math.max(typing.from, whole) + PLATE_TURN_HOLD_MS;
}

/** The choir's lights gathered `ms` after the staging starts (all of them under reduced motion). */
export function choirGathered(ms: number, still: boolean): number {
  if (still) return CHOIR_LIGHTS;
  return Math.max(0, Math.min(CHOIR_LIGHTS, Math.floor(ms / CHOIR_EVERY_MS)));
}

/** The screen reader's account (the stage is aria-hidden; the lines speak). */
export function waykeeperLabel(turned: boolean): string {
  const dome = 'Dome 1, its doors open, the choir gathering inside';
  return turned
    ? `${dome}. Callsign: ${NEW_CALLSIGN}, written over ${OLD_CALLSIGN}.`
    : `${dome}. Callsign: ${OLD_CALLSIGN}.`;
}
