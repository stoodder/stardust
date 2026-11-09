// Marks render draws around a unit's body (T430a; art-direction §8 trait and status tells): pure
// RGBA buffers sized to the body, unit-tested; vfx/overlayTextures.ts registers them once per size.
// - The **shield bubble** (`shielded`): a 1 px hexagon round the body, flat on top and bottom, its
//   upper-left edges lit `white.1` like glass catching the light and the rest `blue.3`, so it reads
//   on gold grass and on the Act II dusk alike. EnemyView holds it faint and flashes it on a hit.
// - The **target bracket** (Revealed): four 3 px corner brackets 2 px clear of the body, in
//   detection's `green.4` over a 1 px `ink.0` stroke outside them (the Scanner Sweep's colour).
// - **Debris pixels**: a white 1×1 and 2×2, tinted per particle (TransientFx's debris).
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';

/** The bubble's margin round the body (px): 2 each side, 1 above and below. */
export const BUBBLE_PAD_X = 2;
export const BUBBLE_PAD_Y = 1;
/** The bracket's gap from the body (px) and its arm length. */
export const BRACKET_PAD = 2;
export const BRACKET_ARM = 3;

function blank(w: number, h: number): Uint8ClampedArray<ArrayBuffer> {
  return new Uint8ClampedArray(w * h * 4);
}

function put(
  data: Uint8ClampedArray,
  w: number,
  x: number,
  y: number,
  c: { r: number; g: number; b: number },
): void {
  const i = (y * w + x) * 4;
  data[i] = c.r;
  data[i + 1] = c.g;
  data[i + 2] = c.b;
  data[i + 3] = 255;
}

/** A 1 px line from (x0, y0) to (x1, y1) (Bresenham), each pixel through `plot`. */
function line(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  plot: (x: number, y: number) => void,
): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    plot(x, y);
    if (x === x1 && y === y1) return;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/** The bubble's size for a body `bodyW` × `bodyH` px. */
export function bubbleSize(
  bodyW: number,
  bodyH: number,
): { readonly w: number; readonly h: number } {
  return { w: bodyW + 2 * BUBBLE_PAD_X, h: bodyH + 2 * BUBBLE_PAD_Y };
}

/**
 * The shield bubble for a body `bodyW` × `bodyH` px: a hexagon with flat top and bottom edges, its
 * left and right points at mid-height, the upper-left edges in `hi`, the rest in `edge`.
 */
export function hexBubbleImage(
  bodyW: number,
  bodyH: number,
  edge: ColorName = 'blue.3',
  hi: ColorName = 'white.1',
): RgbaImage {
  const { w, h } = bubbleSize(bodyW, bodyH);
  const data = blank(w, h);
  const e = rgbOf(edge);
  const l = rgbOf(hi);
  const mid = Math.floor((h - 1) / 2);
  // The slanted sides rise at about 2:1 (pixel-art 60°), capped so the flat edges keep some length.
  const q = Math.min(Math.ceil(mid / 2), Math.floor((w - 1) / 3));
  const left = 0;
  const right = w - 1;
  const top = 0;
  const bottom = h - 1;
  const lit = (x: number, y: number): void => put(data, w, x, y, l);
  const dim = (x: number, y: number): void => put(data, w, x, y, e);
  line(left + q, top, right - q, top, lit); // top
  line(left, mid, left + q, top, lit); // upper left
  line(right - q, top, right, mid, dim); // upper right
  line(right, mid, right - q, bottom, dim); // lower right
  line(right - q, bottom, left + q, bottom, dim); // bottom
  line(left + q, bottom, left, mid, dim); // lower left
  return { w, h, data };
}

/**
 * Corner brackets round a body `bodyW` × `bodyH` px, BRACKET_PAD clear of it: arms BRACKET_ARM long
 * in `color`, each with a 1 px `stroke` on its outer side.
 */
export function targetBracketImage(
  bodyW: number,
  bodyH: number,
  color: ColorName = 'green.4',
  stroke: ColorName = 'ink.0',
): RgbaImage {
  // The stroke ring is outermost: 1 px, then the bracket, then the gap.
  const w = bodyW + 2 * (BRACKET_PAD + 2);
  const h = bodyH + 2 * (BRACKET_PAD + 2);
  const data = blank(w, h);
  const c = rgbOf(color);
  const s = rgbOf(stroke);
  const corner = (cx: number, cy: number, dx: number, dy: number): void => {
    // (cx, cy): the bracket's corner pixel; (dx, dy): which way its arms run.
    for (let k = 0; k < BRACKET_ARM; k++) {
      put(data, w, cx + dx * k, cy, c);
      put(data, w, cx, cy + dy * k, c);
      put(data, w, cx + dx * k, cy - dy, s);
      put(data, w, cx - dx, cy + dy * k, s);
    }
    put(data, w, cx - dx, cy - dy, s);
  };
  corner(1, 1, 1, 1);
  corner(w - 2, 1, -1, 1);
  corner(1, h - 2, 1, -1);
  corner(w - 2, h - 2, -1, -1);
  return { w, h, data };
}

/** A solid white `size` × `size` square (a debris pixel, tinted when drawn). */
export function solidImage(size: number): RgbaImage {
  const data = blank(size, size);
  data.fill(255);
  return { w: size, h: size, data };
}
