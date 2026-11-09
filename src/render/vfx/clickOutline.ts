// The clickable-object outline's pixels (T409; art-direction §6, *Clickable world objects*): a
// 1 px dashed `gold.4` line hugging an object's silhouette, 1 px outside it, its dashes marching
// slowly round it, at stepped alpha. Each dash is rimmed in `ink.0` on its outer side (the
// under-stroke the range rings and the tile cursor carry), so it reads on the pale sand paths too. Pure, so the shape and the timing rules are unit-tested; the
// view (render/views/ClickableView.ts) reads the silhouette from the object's drawn frame.
//
// The line is every pixel outside the silhouette with a silhouette pixel beside it (4-neighbours),
// which makes a clean 1 px contour. Its pixels are ordered by their angle round the silhouette's
// centre (the objects are compact, so the order walks the contour), and each phase lights
// DASH_ON of every DASH_PERIOD of them, one further along per phase.
//
// Timing (photosensitivity: nothing on the playfield changes faster than 3 Hz): the dashes step
// once every MARCH_STEP_MS (2 Hz), and the alpha steps through ALPHA_STEPS in a 1 s cycle (each
// step a small change, never on/off). Under reduced motion the outline is steady (phase 0, full
// alpha).
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';

export const CLICK_OUTLINE_COLOR: ColorName = 'gold.4';
export const CLICK_OUTLINE_STROKE: ColorName = 'ink.0';
/** Clear space round the silhouette in the outline image: the dash, then its rim. */
export const OUTLINE_PAD = 2;
/** Lit pixels in each dash period along the contour. */
export const DASH_ON = 3;
export const DASH_PERIOD = 5;
/** One phase per step of the march. */
export const OUTLINE_PHASES = DASH_PERIOD;
/** The march steps every half second (2 Hz). */
export const MARCH_STEP_MS = 500;
/** The stepped alpha, one step every ALPHA_STEP_MS: a 1 s cycle. */
export const ALPHA_STEPS: readonly number[] = [1, 0.85, 0.7, 0.85];
export const ALPHA_STEP_MS = 250;

/** The contour round a silhouette, in its own pixels (it may lie 1 px outside the box). */
export interface Contour {
  /** x then y for each contour pixel, in contour order. */
  readonly points: readonly number[];
}

/**
 * The 1 px contour just outside the silhouette of a `w`×`h` image whose alpha is `alpha` (one
 * byte per pixel, row-major; > 0 is solid), ordered round its centre. Empty for no silhouette.
 */
export function silhouetteContour(alpha: Uint8Array, w: number, h: number): Contour {
  const solid = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < w && y < h && alpha[y * w + x]! > 0; // in range
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!solid(x, y)) continue;
      sx += x;
      sy += y;
      n++;
    }
  }
  if (n === 0) return { points: [] };
  const cx = sx / n;
  const cy = sy / n;
  const ring: { x: number; y: number; a: number }[] = [];
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
        ring.push({ x, y, a: Math.atan2(y - cy, x - cx) });
      }
    }
  }
  // Clockwise from the left; ties (the same angle, near and far) go nearer first.
  ring.sort((p, q) => p.a - q.a || Math.hypot(p.x - cx, p.y - cy) - Math.hypot(q.x - cx, q.y - cy));
  return { points: ring.flatMap((p) => [p.x, p.y]) };
}

/** Whether the contour's `i`th pixel is lit in `phase` (a dash marching one pixel per phase). */
export function dashLit(i: number, phase: number): boolean {
  return (((i - phase) % DASH_PERIOD) + DASH_PERIOD) % DASH_PERIOD < DASH_ON;
}

/**
 * The outline image for `phase` round a `w`×`h` silhouette whose alpha is `alpha`, padded by
 * OUTLINE_PAD on every side: its pixel (OUTLINE_PAD, OUTLINE_PAD) sits over the silhouette's
 * (0, 0), so it's drawn OUTLINE_PAD px up and left of the object's frame. Lit contour pixels are
 * `gold.4`; their 4-neighbours off the silhouette and off the contour are the `ink.0` rim.
 */
export function outlineImage(
  contour: Contour,
  alpha: Uint8Array,
  w: number,
  h: number,
  phase: number,
): RgbaImage {
  const p = OUTLINE_PAD;
  const iw = w + 2 * p;
  const ih = h + 2 * p;
  const data = new Uint8ClampedArray(iw * ih * 4);
  /** 0 empty, 1 contour (lit or not), 2 rim. */
  const kind = new Uint8Array(iw * ih);
  const pts = contour.points;
  for (let i = 0; i * 2 < pts.length; i++) kind[(pts[i * 2 + 1]! + p) * iw + pts[i * 2]! + p] = 1;
  const solid = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < w && y < h && alpha[y * w + x]! > 0; // in range
  const put = (o: number, c: ColorName): void => {
    const { r, g, b } = rgbOf(c);
    data[o * 4] = r;
    data[o * 4 + 1] = g;
    data[o * 4 + 2] = b;
    data[o * 4 + 3] = 255;
  };
  for (let i = 0; i * 2 < pts.length; i++) {
    if (!dashLit(i, phase)) continue;
    const x = pts[i * 2]!; // i * 2 < length
    const y = pts[i * 2 + 1]!;
    put((y + p) * iw + x + p, CLICK_OUTLINE_COLOR);
    for (const [dx, dy] of N4) {
      const nx = x + dx;
      const ny = y + dy;
      const o = (ny + p) * iw + nx + p;
      if (solid(nx, ny) || kind[o] !== 0) continue;
      kind[o] = 2;
      put(o, CLICK_OUTLINE_STROKE);
    }
  }
  return { w: iw, h: ih, data };
}

const N4: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** The look at `ms` since the outline appeared: its march phase and alpha (steady: 0 and 1). */
export function outlineLook(
  ms: number,
  reducedMotion: boolean,
  out: { phase: number; alpha: number },
): { phase: number; alpha: number } {
  if (reducedMotion || !(ms > 0)) {
    out.phase = 0;
    out.alpha = 1;
    return out;
  }
  out.phase = Math.floor(ms / MARCH_STEP_MS) % OUTLINE_PHASES;
  out.alpha = ALPHA_STEPS[Math.floor(ms / ALPHA_STEP_MS) % ALPHA_STEPS.length]!; // mod length
  return out;
}
