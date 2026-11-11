// The x-ray's pixels (review R3, R2-S3, D143/D144; art-direction §7, *Bricks at the Gap*): while a
// blocker (Bricks at his post) has a tower standing in front of him, his silhouette shows THROUGH
// it, drawn over the tower's own pixels only: his covered pixels as themselves under a 50% ordered
// dither of `ink.0` (a checker anchored to the screen, so it never crawls as his frames change),
// edged by a 1 px `white.1` rim on his covered edge pixels: a darkened ghost of him, head, arms and
// all, that reads as him at 1× even where a narrow tower hides his whole head and torso. Where
// nothing covers him he shows as himself, and nothing is drawn round the tower, so it never reads
// as a selection outline.
// Pure, so the shape and the occlusion rule are unit-tested; AllyView bakes it per (his frame,
// the frames in front, their offset) and draws it in `overlay`.
//
// Timing (photosensitivity: nothing on the playfield changes faster than 3 Hz): its alpha steps
// through XRAY_ALPHA_STEPS, one step every XRAY_STEP_MS (a slow 2 s breath that never dims below
// 0.85, so it reads at 1×). Under reduced motion it holds still at full alpha.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';

/** The dither's colour, over half his covered pixels (his own colour shows in the other half). */
export const XRAY_FILL: ColorName = 'ink.0';
/** The rim's colour, on his covered edge pixels. */
export const XRAY_RIM: ColorName = 'white.1';
/** The stepped alpha, one step every XRAY_STEP_MS: a 2 s breath, its floor 0.85. */
export const XRAY_ALPHA_STEPS: readonly number[] = [1, 0.925, 0.85, 0.925];
export const XRAY_STEP_MS = 500;

/** The x-ray's alpha `ms` into its showing (full and still under reduced motion). */
export function xrayAlpha(ms: number, reducedMotion: boolean): number {
  if (reducedMotion || !(ms > 0)) return 1;
  return XRAY_ALPHA_STEPS[Math.floor(ms / XRAY_STEP_MS) % XRAY_ALPHA_STEPS.length]!; // mod length
}

/** A frame drawn in front of him: its alpha (> 0 solid) and its top-left in his frame's pixels. */
export interface Cover {
  readonly alpha: Uint8Array;
  readonly w: number;
  readonly h: number;
  readonly dx: number;
  readonly dy: number;
}

const N4: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * The x-ray image of his `w`×`h` frame (`rgba`, 4 bytes per pixel, row-major; alpha > 0 is solid)
 * behind `covers`, the same size as his frame and laid over it. A solid pixel of his that a cover's
 * solid pixel hides is drawn: `white.1` when it is on his edge (a 4-neighbour clear or off his
 * frame), else `ink.0` where `(x + y + phase)` is even (the dither; `phase` is the parity of his
 * frame's screen top-left, so the checker stays put on screen), else his own colour, opaque.
 * Everything he shows of himself, and everything outside him, is transparent.
 */
export function xrayImage(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  covers: readonly Cover[],
  phase = 0,
): RgbaImage {
  const data = new Uint8ClampedArray(w * h * 4);
  const solid = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < w && y < h && rgba[(y * w + x) * 4 + 3]! > 0; // in range
  const covered = (x: number, y: number): boolean => {
    for (const c of covers) {
      const cx = x - c.dx;
      const cy = y - c.dy;
      if (cx >= 0 && cy >= 0 && cx < c.w && cy < c.h && c.alpha[cy * c.w + cx]! > 0) return true; // in range
    }
    return false;
  };
  const put = (x: number, y: number, c: ColorName): void => {
    const o = (y * w + x) * 4;
    const { r, g, b } = rgbOf(c);
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = 255;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!solid(x, y) || !covered(x, y)) continue;
      let edge = false;
      for (const [dx, dy] of N4) if (!solid(x + dx, y + dy)) edge = true;
      if (edge) put(x, y, XRAY_RIM);
      else if (((x + y + phase) & 1) === 0) put(x, y, XRAY_FILL);
      else {
        const o = (y * w + x) * 4;
        data[o] = rgba[o]!;
        data[o + 1] = rgba[o + 1]!;
        data[o + 2] = rgba[o + 2]!;
        data[o + 3] = 255;
      }
    }
  }
  return { w, h, data };
}

/** A screen rectangle (px). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** How much of his frame a tower's frame must cover before the x-ray shows. */
export const OCCLUDE_MIN_FRAC = 0.15;

/**
 * Whether a frame `front` drawn at depth `frontDepth` hides enough of `back` (drawn at
 * `backDepth`) to call for the x-ray: it draws later (deeper), and the two frames overlap by at
 * least `minFrac` (OCCLUDE_MIN_FRAC) of `back`'s area (a frame's box includes its clear corners,
 * so a tower beside him, its box just grazing his, doesn't count). `minFrac` 0: any overlap.
 */
export function occludes(
  front: Rect,
  frontDepth: number,
  back: Rect,
  backDepth: number,
  minFrac = OCCLUDE_MIN_FRAC,
): boolean {
  if (!(frontDepth > backDepth)) return false;
  const ox = Math.min(front.x + front.w, back.x + back.w) - Math.max(front.x, back.x);
  const oy = Math.min(front.y + front.h, back.y + back.h) - Math.max(front.y, back.y);
  if (ox <= 0 || oy <= 0) return false;
  return ox * oy >= minFrac * back.w * back.h;
}
