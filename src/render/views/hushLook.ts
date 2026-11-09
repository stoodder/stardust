// The hush rule's look (T402's minimal view, T430a's polish; design/enemies.md § 5.4;
// art-direction §8 `heavy`): pure rules, so they're unit-tested, and EnemyView applies them (its
// outline, ring, and lean: EnemyDress.ts). The pose (`panic` for the held runner and a bolting
// one, the Mote's reach in its tell, a Heavy unit's walk) is enemyPose.ts's. A sprite that draws
// a `heavy` anim (the Mote, T440a: the victim's pale shape inside) wears it instead of the first
// look below:
// - **Heavy:** the body multiplies by HEAVY_TINT (`hollow.3`: a pale Mote goes charcoal, a dark
//   knot against any ground) and wears a second pixel of its pale, inverted outline (a 2 px
//   `hollow.4` rim: swollen), for the rest of its life, hit flashes aside. (An acid tint sank into
//   Act II's olive ground.)
// - **The Hollow unit's tell** (its 0.5 s hush): its anim freezes mid-reach, it leans 1 px toward
//   its victim, and an `acid.3` rim flickers round it on the sim's 3 Hz tell step (steady under
//   reduced motion).
// - **Held** (the runner in the tell): it struggles, a 1 px side-to-side shake on the shimmer's
//   3 Hz cycle (none under reduced motion, where the ring and the `panic` pose carry it), inside
//   the **hush ring**: a pale `hollow.4` ring over an `ink.0` under-stroke that closes from
//   HUSH_RING_FROM_TILES in on it over the tell, on sim ticks (fast-forward shortens it, a pause
//   holds it). It draws in `overlay`, over explosions and shell bursts, so it reads in a firefight.
// The vanish (a small acid ring) is battleEvents.ts's (Hushed).
import { rgbOf } from '../../content/palettes/master.ts';
import { HUSH_TELL_SEC } from '../../content/rules.ts';
import { secToTicks } from '../../shared/time.ts';
import { RING_STEP_TILES } from '../vfx/overlayPixels.ts';
import type { PoseEnemy } from './enemyPose.ts';

function hex(name: Parameters<typeof rgbOf>[0]): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}

/** A Heavy unit's body tint (multiply). */
export const HEAVY_TINT = hex('hollow.3');
/** The held runner's shake: this many px either side, flipping every HUSH_SHAKE_MS (3 Hz). */
export const HUSH_SHAKE_PX = 1;
export const HUSH_SHAKE_MS = 167;

/** Whether `e` is a runner held in a Hollow unit's hush tell. */
export function isHeld(e: PoseEnemy): boolean {
  return e.hushUid !== 0 && e.def !== null && !e.def.hushes;
}

/** The held runner's sideways shake now (px), or 0 (not held, or reduced motion). */
export function hushShakePx(e: PoseEnemy, nowMs: number, reducedMotion: boolean): number {
  if (!isHeld(e) || reducedMotion) return 0;
  return Math.floor(nowMs / HUSH_SHAKE_MS) % 2 === 0 ? HUSH_SHAKE_PX : -HUSH_SHAKE_PX;
}

/** The hush tell's length in sim ticks (the sim's HUSH_TELL_TICKS, from the same rule). */
export const HUSH_TELL_TICKS = secToTicks(HUSH_TELL_SEC);
/** The hush ring closes from this radius (tiles) in to HUSH_RING_TO_TILES over the tell. */
export const HUSH_RING_FROM_TILES = 0.75;
export const HUSH_RING_TO_TILES = 0.25;
/** The Hollow unit leans this far toward its victim during its tell (px). */
export const HUSH_LEAN_PX = 1;

/** Whether `e` is a Hollow unit in its hush tell. */
export function isHushing(e: PoseEnemy): boolean {
  return e.hushUid !== 0 && e.hushTicks > 0 && e.def !== null && e.def.hushes;
}

/**
 * The hush ring's radius (tiles) `elapsed` ticks into the tell: from HUSH_RING_FROM_TILES in to
 * HUSH_RING_TO_TILES, in the rings' quarter-tile steps.
 */
export function hushRingRadius(elapsed: number): number {
  const t = Math.min(1, Math.max(0, elapsed / HUSH_TELL_TICKS));
  const r = HUSH_RING_FROM_TILES + (HUSH_RING_TO_TILES - HUSH_RING_FROM_TILES) * t;
  return Math.max(HUSH_RING_TO_TILES, Math.round(r / RING_STEP_TILES) * RING_STEP_TILES);
}
