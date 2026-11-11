// Sterling's shuttle lifting off (A3M2, act3.md § A3M2; art-direction §6 *Sterling's shuttle*;
// ShuttleView draws it): as the map's `a3_m02_cue_shuttle` cue fires (W12 + 10 s), the pad's prop
// drops to its bare `pad` and the shuttle (`prop.shuttle`'s `ship`, at the same anchor) rises off
// it on its lift jets, hangs a moment, then climbs away north-east and fades: its lights cross the
// sky. Pure and on sim ticks (pause holds it, 2× runs it fast), so it is unit-tested; under reduced
// motion the ship neither climbs nor flickers its jets: it fades out where it stood.

/** The cue the shuttle lifts on (no scene; render keys on it) and the marker of its pad. */
export const SHUTTLE_CUE = 'a3_m02_cue_shuttle';
export const SHUTTLE_MARKER = 'shuttle_pad';

/** The lift-off: a slow rise off the pad, then the climb away (sim ticks, 60 a second). */
export const LIFT_HOVER_TICKS = 60;
export const LIFT_CLIMB_TICKS = 240;
/** How high the hover takes it, and how far the climb carries it up and east (px). */
export const LIFT_HOVER_PX = 10;
export const LIFT_CLIMB_UP_PX = 170;
export const LIFT_CLIMB_EAST_PX = 70;
/** The climb's last share fades the ship out (it's a light in the sky by then). */
const FADE_FROM = 0.6;
/** Under reduced motion: the ship fades out in place over this long. */
export const LIFT_STILL_TICKS = 60;

/** Where the ship is, `ticks` after the cue: its offset from the pad's anchor (px), alpha, and done. */
export interface LiftPose {
  dx: number;
  dy: number;
  alpha: number;
  /** It has gone: hide it. */
  done: boolean;
}

/** True once any of the map's events that cue `cue` has fired (`state.scriptFired`, same order). */
export function cueFired(
  events: readonly { readonly actions: readonly object[] }[],
  fired: readonly boolean[],
  cue: string,
): boolean {
  for (let i = 0; i < events.length; i++) {
    if (fired[i] !== true) continue;
    const ev = events[i]!; // i < length
    for (const a of ev.actions) if ('cue' in a && a.cue === cue) return true;
  }
  return false;
}

/** Smoothstep in, so it lifts off rather than jumps. */
function ease(t: number): number {
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  return k * k * (3 - 2 * k);
}

/** Writes the ship's pose `ticks` after the cue into `out` (`still`: reduced motion). */
export function liftPose(ticks: number, still: boolean, out: LiftPose): LiftPose {
  const t = Math.max(0, ticks);
  out.dx = 0;
  out.dy = 0;
  if (still) {
    out.alpha = Math.max(0, 1 - t / LIFT_STILL_TICKS);
    out.done = t >= LIFT_STILL_TICKS;
    return out;
  }
  if (t < LIFT_HOVER_TICKS) {
    out.dy = 0 - LIFT_HOVER_PX * ease(t / LIFT_HOVER_TICKS);
    out.alpha = 1;
    out.done = false;
    return out;
  }
  // The climb accelerates (it's leaving): up and to the east, fading over its last part.
  const k = Math.min(1, (t - LIFT_HOVER_TICKS) / LIFT_CLIMB_TICKS);
  const a = k * k;
  out.dy = -LIFT_HOVER_PX - LIFT_CLIMB_UP_PX * a;
  out.dx = LIFT_CLIMB_EAST_PX * a;
  out.alpha = k <= FADE_FROM ? 1 : Math.max(0, 1 - (k - FADE_FROM) / (1 - FADE_FROM));
  out.done = k >= 1;
  return out;
}
