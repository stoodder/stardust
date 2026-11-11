// The x-ray outline's pixels (review R3, D143; art-direction §7, *Bricks at the Gap*): while a
// blocker (Bricks at his post) has a tower standing in front of him, his silhouette shows through
// it, x-ray style, as a 1 px `white.1` line hugging his frame 1 px outside it, between two `ink.0`
// rims: one on his own edge pixels (where his baked outline already sits, so where he shows the
// line just thickens it) and one outside the white, so it reads over a pale tower and a dark one.
// The inside stays clear: the tower in front shows through, only his shape is drawn over it.
// Pure, so the shape and the occlusion rule are unit-tested; AllyView bakes it per frame he shows.
//
// Timing (photosensitivity: nothing on the playfield changes faster than 3 Hz): its alpha steps
// through XRAY_ALPHA_STEPS, one step every XRAY_STEP_MS (a slow 2 s breath, so it reads as a
// marker, not as part of him). Under reduced motion it holds still at full alpha.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';

export const XRAY_LINE: ColorName = 'white.1';
export const XRAY_RIM: ColorName = 'ink.0';
/** Clear space round the silhouette in the image: the line, then its outer rim. */
export const XRAY_PAD = 2;
/** The stepped alpha, one step every XRAY_STEP_MS: a 2 s breath. */
export const XRAY_ALPHA_STEPS: readonly number[] = [1, 0.85, 0.7, 0.85];
export const XRAY_STEP_MS = 500;

/** The outline's alpha `ms` into its showing (full and still under reduced motion). */
export function xrayAlpha(ms: number, reducedMotion: boolean): number {
  if (reducedMotion || !(ms > 0)) return 1;
  return XRAY_ALPHA_STEPS[Math.floor(ms / XRAY_STEP_MS) % XRAY_ALPHA_STEPS.length]!; // mod length
}

const N4: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * The x-ray image of a `w`×`h` frame whose alpha is `alpha` (one byte per pixel, row-major; > 0 is
 * solid), padded by XRAY_PAD on every side: its pixel (XRAY_PAD, XRAY_PAD) sits over the frame's
 * (0, 0). Edge pixels (solid, with a clear 4-neighbour) are `ink.0`; the clear pixels touching
 * the silhouette are the `white.1` line; the clear pixels touching the line (and neither solid nor
 * line) are its outer `ink.0` rim. Everything else is transparent.
 */
export function xrayImage(alpha: Uint8Array, w: number, h: number): RgbaImage {
  const p = XRAY_PAD;
  const iw = w + 2 * p;
  const ih = h + 2 * p;
  const data = new Uint8ClampedArray(iw * ih * 4);
  const solid = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < w && y < h && alpha[y * w + x]! > 0; // in range
  /** 0 clear, 1 line. */
  const line = new Uint8Array(iw * ih);
  const put = (x: number, y: number, c: ColorName): void => {
    const o = ((y + p) * iw + x + p) * 4;
    const { r, g, b } = rgbOf(c);
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = 255;
  };
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      const s = solid(x, y);
      let touches = false;
      for (const [dx, dy] of N4) if (solid(x + dx, y + dy) !== s) touches = true;
      if (!touches) continue;
      if (s) {
        put(x, y, XRAY_RIM);
      } else {
        put(x, y, XRAY_LINE);
        line[(y + p) * iw + x + p] = 1;
      }
    }
  }
  for (let y = -2; y <= h + 1; y++) {
    for (let x = -2; x <= w + 1; x++) {
      if (solid(x, y) || line[(y + p) * iw + x + p] === 1) continue;
      let byLine = false;
      for (const [dx, dy] of N4) {
        const nx = x + dx + p;
        const ny = y + dy + p;
        if (nx >= 0 && ny >= 0 && nx < iw && ny < ih && line[ny * iw + nx] === 1) byLine = true;
      }
      if (byLine) put(x, y, XRAY_RIM);
    }
  }
  return { w: iw, h: ih, data };
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
 * least OCCLUDE_MIN_FRAC of `back`'s area (a frame's box includes its clear corners, so a tower
 * beside him, its box just grazing his, doesn't count).
 */
export function occludes(front: Rect, frontDepth: number, back: Rect, backDepth: number): boolean {
  if (!(frontDepth > backDepth)) return false;
  const ox = Math.min(front.x + front.w, back.x + back.w) - Math.max(front.x, back.x);
  const oy = Math.min(front.y + front.h, back.y + back.h) - Math.max(front.y, back.y);
  if (ox <= 0 || oy <= 0) return false;
  return ox * oy >= OCCLUDE_MIN_FRAC * back.w * back.h;
}
