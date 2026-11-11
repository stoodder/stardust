// Big Glorp's puddle as rules (T705's minimal look; T730a switched it to T740b's `fx.puddle`;
// PuddleView applies them): pure, so they're unit-tested.
// - **The pool** (`fx.puddle`'s `pool_0`/`pool_1`, 64×32 for the spec's radius 1.0): a dithered
//   `green.3` pool with a ragged `green.4` rim and white-glinting bubbles that rise and pop
//   (POOL_STEP_TICKS a frame, offset per puddle so two never bubble in unison), at its centre in
//   `decal`, so it reads as a pool on the ground, not a range ring (dashed), the Bloom's frost disc
//   (blue), or Underfoot's toothed snare. A puddle of another radius scales the art
//   (`puddleScale`). Not the `acid` ramp: its yellow-green is the Hollow's (art-direction §2).
// - **Drying:** whole while it lives, then the sprite's `dry_0`–`dry_2` over its last half second
//   (DRY_TICKS: the fill thinning, the rim breaking, the last drops), so its end is no surprise;
//   under reduced motion it holds on `pool_0` and vanishes (`puddleFrame`).
import type { SpriteId } from '../../content/sprites/index.ts';
import { TICK_HZ } from '../../shared/time.ts';

/** The sprite, and the radius (tiles) its art is drawn for. */
export const PUDDLE_SPRITE: SpriteId = 'fx.puddle';
export const PUDDLE_ART_RADIUS = 1;
/** The drying runs over the puddle's last DRY_TICKS (half a second: the sprite's `dry` anim). */
export const DRY_TICKS = TICK_HZ / 2;
/** The bubbles' frame steps (3 fps, the sprite's `pool` anim). */
export const POOL_STEP_TICKS = TICK_HZ / 3;

export type PuddleFrame = 'pool_0' | 'pool_1' | 'dry_0' | 'dry_1' | 'dry_2';

/**
 * The puddle's frame with `ticksLeft` to go at sim `tick` (`uid` offsets its bubbling), or null
 * once it's gone: the pool, then the three drying frames over its last DRY_TICKS (under reduced
 * motion `pool_0` to the end).
 */
export function puddleFrame(
  ticksLeft: number,
  tick: number,
  uid: number,
  reducedMotion: boolean,
): PuddleFrame | null {
  if (ticksLeft <= 0) return null;
  if (reducedMotion) return 'pool_0';
  if (ticksLeft > DRY_TICKS) {
    return Math.floor((tick + uid * 7) / POOL_STEP_TICKS) % 2 === 0 ? 'pool_0' : 'pool_1';
  }
  const k = Math.min(2, Math.floor((1 - ticksLeft / DRY_TICKS) * 3));
  return k <= 0 ? 'dry_0' : k === 1 ? 'dry_1' : 'dry_2';
}

/** The art's scale for a puddle of `radiusTiles` (1 at the spec's 1.0). */
export function puddleScale(radiusTiles: number): number {
  return radiusTiles > 0 ? radiusTiles / PUDDLE_ART_RADIUS : 1;
}
