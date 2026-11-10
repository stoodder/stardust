// The Mindspike's and Stillness's minimal look (T507; art-direction §8 *Unnerved*, §7 Psionic):
// pure rules, unit-tested, applied by MindView and EnemyView (T530a's polish).
// - **Unnerved:** a wobbling squiggle above the head: a 9×5 zigzag in `violet.4` on an `ink.0`
//   rim (so it reads on bright ground and dark), two frames that swap every UNNERVED_WOBBLE_MS
//   (held on the first under reduced motion). It stands UNNERVED_GAP_PX over the body's top as
//   drawn (its lane offset and lift included, so it sits over the body, not the route's line),
//   clearing the health bar and the tell glyph. The body jitters 1 px side to side
//   (`unnervedJitterPx`, EnemyView: an uneven step every JITTER_STEP_MS, seeded per uid; still
//   under reduced motion).
// - **Echo Spike's echo:** a `violet.4` ring that grows to the echo's radius at the target, with
//   a small `white.1` pop at its heart, so it reads over a busy fight.
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
export const ECHO_COLOR: ColorName = 'violet.4';
export const ECHO_MS = 360;
/** The echo's heart: a small `white.1` ring popping at the target as the echo goes out. */
export const ECHO_POP_COLOR: ColorName = 'white.1';
export const ECHO_POP_TILES = 0.35;
export const ECHO_POP_MS = 160;
/** The Unnerved body's jitter steps this often (ms, page time). */
export const JITTER_STEP_MS = 90;
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

/** What the squiggle reads of a unit. */
export interface UnnervedUnit {
  readonly alive: boolean;
  readonly unnervedTicks: number;
  readonly burrowed: boolean;
  readonly phased: boolean;
  readonly leaving: boolean;
}

/**
 * Whether a unit wears the squiggle: alive and Unnerved, and out in the open (not burrowed or
 * Phased), and not leaving (a fleeing, standing-down or leaked unit; review C7, as MarkView and
 * EnemyView's jitter): a stood-down Aelari is out of the fight, not rattled.
 */
export function showsUnnerved(e: UnnervedUnit): boolean {
  return e.alive && e.unnervedTicks > 0 && !e.burrowed && !e.phased && !e.leaving;
}

/** The squiggle's frame at `ms` (render time): it wobbles, or holds still under reduced motion. */
export function squiggleFrame(ms: number, reducedMotion: boolean): 0 | 1 {
  if (reducedMotion) return 0;
  return Math.floor(ms / UNNERVED_WOBBLE_MS) % 2 === 0 ? 0 : 1;
}

/**
 * An Unnerved body's sideways jitter (px: −1, 0 or +1) at page time `ms` for unit `uid`: a new
 * uneven step every JITTER_STEP_MS, offset per uid so a cluster doesn't shake in unison; 0 under
 * reduced motion (the squiggle still tells).
 */
export function unnervedJitterPx(uid: number, ms: number, reducedMotion: boolean): -1 | 0 | 1 {
  if (reducedMotion) return 0;
  const step = Math.floor(ms / JITTER_STEP_MS) + uid * 7;
  // A cheap integer hash of the step, so the shake never settles into a beat.
  const h = Math.imul(step ^ (step >>> 3), 0x9e3779b1) >>> 0;
  const k = h % 3;
  return k === 0 ? -1 : k === 1 ? 0 : 1;
}
