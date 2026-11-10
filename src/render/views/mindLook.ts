// The Mindspike's and Stillness's minimal look (T507; art-direction §8 *Unnerved*, §7 Psionic):
// pure rules, unit-tested, applied by MindView. T530a polishes them (the 1 px jitter on the body
// is EnemyView's, and waits for it).
// - **Unnerved:** a wobbling squiggle above the head: a 9×5 zigzag in `violet.4` on an `ink.0`
//   rim (so it reads on bright ground and dark), two frames that swap every UNNERVED_WOBBLE_MS
//   (held on the first under reduced motion). It stands UNNERVED_GAP_PX over the body's top, so
//   it clears the health bar and the tell glyph.
// - **Echo Spike's echo:** a `violet.3` ring that grows to the echo's radius at the target, fast.
// - **Stillness:** the circle it froze, a pale `blue.4` disc that fades over the Stasis it gave,
//   and a ring that grows out to its radius as it lands.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';
import { HEALTH_BAR_ROOM_PX } from '../vfx/healthBar.ts';

/** A tell glyph's height (art-direction §8: 8×8). */
const TELL_GLYPH_PX = 8;

export const UNNERVED_COLOR: ColorName = 'violet.4';
export const UNNERVED_RIM: ColorName = 'ink.0';
export const UNNERVED_WOBBLE_MS = 160;
/**
 * The squiggle's gap over the body's top (px): over the health bar and the 8 px tell glyph's slot
 * (EnemyView's), so neither covers it, with a pixel between.
 */
export const UNNERVED_GAP_PX = HEALTH_BAR_ROOM_PX + TELL_GLYPH_PX + 1;
export const ECHO_COLOR: ColorName = 'violet.3';
export const ECHO_MS = 320;
export const STILLNESS_COLOR: ColorName = 'blue.4';
export const STILLNESS_RING_MS = 420;
/** The disc fades over Stillness's Stasis (core-loop.md § 3.2: 3 s), in render time. */
export const STILLNESS_FADE_MS = 3000;
/** The disc's alpha (it fades on TransientFx's ladder over the Stasis it gave). */
export const STILLNESS_FILL_ALPHA = 0.3;

/** The squiggle's two frames: the row of each column's lit pixel (rows 1–3 of 5). */
const WAVES: readonly (readonly number[])[] = [
  [2, 1, 1, 2, 3, 3, 2, 1, 1],
  [1, 1, 2, 3, 3, 2, 1, 1, 2],
];
export const SQUIGGLE_W = 9;
export const SQUIGGLE_H = 5;

/** Frame `frame` (0 or 1) of the Unnerved squiggle. */
export function squiggleImage(frame: 0 | 1): RgbaImage {
  const w = SQUIGGLE_W;
  const h = SQUIGGLE_H;
  const data = new Uint8ClampedArray(w * h * 4);
  const lit = rgbOf(UNNERVED_COLOR);
  const rim = rgbOf(UNNERVED_RIM);
  const wave = WAVES[frame]!; // frame is 0 or 1
  const put = (x: number, y: number, c: { r: number; g: number; b: number }): void => {
    const i = (y * w + x) * 4;
    data[i] = c.r;
    data[i + 1] = c.g;
    data[i + 2] = c.b;
    data[i + 3] = 255;
  };
  // The rim first (above and below each lit pixel), then the line over it.
  for (let x = 0; x < w; x++) {
    const y = wave[x]!; // x < w = wave length
    put(x, y - 1, rim);
    put(x, y + 1, rim);
  }
  for (let x = 0; x < w; x++) put(x, wave[x]!, lit); // x < w
  return { w, h, data };
}

/** The squiggle's frame at `ms` (render time): it wobbles, or holds still under reduced motion. */
export function squiggleFrame(ms: number, reducedMotion: boolean): 0 | 1 {
  if (reducedMotion) return 0;
  return Math.floor(ms / UNNERVED_WOBBLE_MS) % 2 === 0 ? 0 : 1;
}
