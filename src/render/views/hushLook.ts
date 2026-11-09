// The hush rule's minimal look (T402; design/enemies.md § 5.4; art-direction §8 `heavy`), until
// T430a's render pass and T440a's baked `heavy` variant: pure rules, so they're unit-tested, and
// EnemyView applies them. The pose (`panic` for the held runner and a bolting one) is
// enemyPose.ts's.
// - **Heavy:** the body multiplies by HEAVY_TINT (`hollow.3`: a pale Mote goes charcoal, a dark
//   knot against any ground) for the rest of its life, hit flashes aside. (An acid tint sank into
//   Act II's olive ground.)
// - **Held** (a runner in a Hollow unit's hush tell): it struggles, a 1 px side-to-side shake on
//   the shimmer's 3 Hz cycle (under the photosensitivity cap; none under reduced motion, where the
//   ring and the `panic` pose carry it).
// The ring at the contact and the vanish are battleEvents.ts's (HushStarted, Hushed).
import { rgbOf } from '../../content/palettes/master.ts';
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
