// Stasis's minimal look (T407a; design/enemies.md § 2.4; art-direction §8: "sprite frozen on its
// current frame, crystal outline overlay"), until T430a's render pass draws the crystal outline:
// pure rules, unit-tested, applied by EnemyView.
// - **Frozen:** while the unit is in Stasis its anim holds its current frame (paused, then
//   resumed where it stopped) and its body multiplies by STASIS_TINT, a pale ice blue that reads
//   on every act's ground and over Heavy's charcoal (Stasis wins while it lasts). Hit flashes still
//   show. A boss is never frozen (its converted Chilled 50% has Chilled's look).
// - Flash Freeze's burst ring is battleEvents.ts's (PulseBurst), and Cloudburst's pulse over the
//   air lane is the ordinary pulse ring.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { PoseEnemy } from './enemyPose.ts';

/** A frozen unit's body tint (multiply): the brightest water step, an icy wash. */
export const STASIS_TINT = (() => {
  const c = rgbOf('act1.water.3');
  return (c.r << 16) | (c.g << 8) | c.b;
})();

/** Flash Freeze's burst ring (PulseBurst): pale ice, held a little longer than a pulse's. */
export const FREEZE_RING_COLOR: ColorName = 'act1.water.3';
export const FREEZE_RING_MS = 480;

/** Whether `e` is frozen in Stasis (its look holds while this is true). */
export function isFrozen(e: PoseEnemy): boolean {
  return e.alive && e.stasisTicks > 0;
}
