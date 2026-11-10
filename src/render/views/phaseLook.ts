// Phasing's look (T503's minimal view; art-direction §8's `phasing` tell: "alternating-frame flicker
// (visible / dithered) during the tell; dithered while untargetable", a broken circle in `teal.4`;
// enemies.md § 2.6, § 3), pure so it's unit-tested without Phaser. EnemyView reads the body's look
// here; PhaseView.ts draws the broken ring under the unit.
// - **The tell** (`phaseTelling`, the last 0.5 s before the Moth phases): the body alternates
//   whole and dithered on the sim's 3 Hz tell step (vfx/fxTiming.ts `tellHigh`, so it holds while
//   paused and keeps pace at 2×); under reduced motion it stays whole and the ring alone tells.
// - **Phased:** dithered and faint (a ghost), steady: the baked `cloak` variant's 50% checker at
//   PHASED_ALPHA, or, for a sprite without one, the plain body at PHASED_PLAIN_ALPHA, inside a
//   1 px `white.1` rim at PHASED_RIM_ALPHA hugging its silhouette from outside (`ghostRimImage`,
//   from the plain frame's silhouette; EnemyDress draws it), so the ghost keeps its shape on A2M4's
//   pale gold (review U10).
// T530a polishes it (the Moth's own phase frames are T540a's).
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { phaseTelling } from '../../sim/index.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';
import { tellHigh } from '../vfx/fxTiming.ts';
import type { PoseEnemy } from './enemyPose.ts';

/** A Phased body's alpha in its dithered `cloak` variant (with the checker, a ghost). */
export const PHASED_ALPHA = 0.55;
/** A Phased body's alpha without a dithered variant. */
export const PHASED_PLAIN_ALPHA = 0.3;
/** The tell's dithered frames' alpha (the whole frames draw at 1). */
export const TELL_DITHER_ALPHA = 0.85;
/** The tell's dimmer frames without a dithered variant. */
export const TELL_PLAIN_ALPHA = 0.55;
/** The Phased ghost's rim: `white.1` at 50%, 1 px outside its silhouette (review U10). */
export const PHASED_RIM_COLOR: ColorName = 'white.1';
export const PHASED_RIM_ALPHA = 0.5;
/** The broken ring's colour (art-direction §8). */
export const PHASE_RING_COLOR: ColorName = 'teal.4';

/** Where a phaser is in its cycle, for render: solid, in its tell, or Phased. */
export type PhaseState = 'solid' | 'tell' | 'phased';

/** A live unit's phase state (solid for a unit that doesn't phase). */
export function phaseState(e: PoseEnemy): PhaseState {
  const phase = e.def?.phase ?? null;
  if (phase === null || !e.alive) return 'solid';
  if (e.phased) return 'phased';
  return phaseTelling(e, phase) ? 'tell' : 'solid';
}

/** Whether the body draws dithered this frame: Phased, or a tell's dithered step. */
export function phaseDithered(e: PoseEnemy, reducedMotion: boolean): boolean {
  const s = phaseState(e);
  if (s === 'phased') return true;
  return s === 'tell' && !tellHigh(e.phaseTicks, reducedMotion);
}

/**
 * The body's alpha factor from phasing (1 for a solid unit); `hasDither`: its sprite bakes the
 * `cloak` variant, which EnemyView draws while `phaseDithered`.
 */
export function phaseAlpha(e: PoseEnemy, hasDither: boolean, reducedMotion: boolean): number {
  const s = phaseState(e);
  if (s === 'phased') return hasDither ? PHASED_ALPHA : PHASED_PLAIN_ALPHA;
  if (s === 'tell' && !tellHigh(e.phaseTicks, reducedMotion)) {
    return hasDither ? TELL_DITHER_ALPHA : TELL_PLAIN_ALPHA;
  }
  return 1;
}

/** The broken ring's alpha: stepping with the tell (steady under reduced motion), steady Phased. */
export function phaseRingAlpha(e: PoseEnemy, reducedMotion: boolean): number {
  const s = phaseState(e);
  if (s === 'phased') return 0.85;
  if (s === 'tell') return tellHigh(e.phaseTicks, reducedMotion) ? 1 : 0.6;
  return 0;
}

/**
 * A ghost's rim: 1 px of `color` round the silhouette of a `w`×`h` RGBA image (`data`; alpha > 0
 * is solid), just outside it: every clear pixel with a solid 4-neighbour. The image grows 1 px on
 * every side, so its anchor is the source's plus (1, 1). Fed the plain frame, so a dithered
 * body's holes never rim.
 */
export function ghostRimImage(
  data: ArrayLike<number>,
  w: number,
  h: number,
  color: ColorName = PHASED_RIM_COLOR,
): RgbaImage {
  const ow = w + 2;
  const oh = h + 2;
  const out = new Uint8ClampedArray(ow * oh * 4);
  const solid = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < w && y < h && (data[(y * w + x) * 4 + 3] ?? 0) > 0;
  const c = rgbOf(color);
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const sx = x - 1;
      const sy = y - 1;
      if (solid(sx, sy)) continue;
      if (!solid(sx - 1, sy) && !solid(sx + 1, sy) && !solid(sx, sy - 1) && !solid(sx, sy + 1)) {
        continue;
      }
      const o = (y * ow + x) * 4;
      out[o] = c.r;
      out[o + 1] = c.g;
      out[o + 2] = c.b;
      out[o + 3] = 255;
    }
  }
  return { w: ow, h: oh, data: out };
}
