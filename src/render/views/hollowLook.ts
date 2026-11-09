// The Hollow's wrongness in motion (T430a; art-direction §4 *Hollow glitch*, the Act II tone): pure
// rules on the page clock, unit-tested; EnemyView applies them to every Hollow unit (faction
// `hollow`) that is walking.
// - **Stutter and frame-skip:** every STUTTER_MIN_MS–STUTTER_MAX_MS (per unit) its walk hitches: the
//   anim holds its frame for STUTTER_HOLD_MS, then jumps a frame ahead, so it never moves like the
//   living do. Kept under reduced motion (it moves nothing).
// - **Glitch offset:** every GLITCH_MIN_MS–GLITCH_MAX_MS it shows GLITCH_MS (two rendered frames)
//   shoved 1 or 2 px sideways. None under reduced motion (art-direction §8).
// Each unit's schedule comes from its uid (cosmetic, never the sim's RNG), so a pack never hitches
// in step. The 1–3 dropped pixels per frame are baked into its frames (sprites/enemies/hollow.ts).
import { hash01 } from '../../content/sprites/helpers.ts';

export const STUTTER_MIN_MS = 1100;
export const STUTTER_MAX_MS = 2000;
export const STUTTER_HOLD_MS = 130;
export const GLITCH_MIN_MS = 2000;
export const GLITCH_MAX_MS = 4000;
export const GLITCH_MS = 34;

/** What a Hollow unit's walk does right now. */
export interface HollowGlitch {
  /** The anim holds its frame (it jumps a frame ahead when the hold ends). */
  hold: boolean;
  /** Its sideways shove (px; 0 most of the time). */
  offsetPx: number;
}

/** Whether a unit of `faction` stutters and glitches (the Hollow alone). */
export function glitches(faction: string): boolean {
  return faction === 'hollow';
}

/** Unit `uid`'s period in [min, max) for a schedule (`salt` keeps the schedules apart). */
function period(uid: number, salt: number, min: number, max: number): number {
  return min + Math.floor(hash01(uid, salt, 7) * (max - min));
}

/** Unit `uid`'s phase (ms) in a schedule's period. */
function phase(uid: number, salt: number, p: number): number {
  return Math.floor(hash01(uid, salt, 11) * p);
}

/** Fills `out` with unit `uid`'s glitch at page time `nowMs`. Allocation-free. */
export function hollowGlitch(
  uid: number,
  nowMs: number,
  reducedMotion: boolean,
  out: HollowGlitch,
): HollowGlitch {
  const sp = period(uid, 1, STUTTER_MIN_MS, STUTTER_MAX_MS);
  out.hold = (nowMs + phase(uid, 1, sp)) % sp < STUTTER_HOLD_MS;
  out.offsetPx = 0;
  if (!reducedMotion) {
    const gp = period(uid, 2, GLITCH_MIN_MS, GLITCH_MAX_MS);
    const t = nowMs + phase(uid, 2, gp);
    if (t % gp < GLITCH_MS) {
      const cycle = Math.floor(t / gp);
      out.offsetPx = (cycle % 2 === 0 ? 1 : -1) * (1 + (Math.floor(cycle / 2) % 2));
    }
  }
  return out;
}
