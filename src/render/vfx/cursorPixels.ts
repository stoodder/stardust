// The keyboard tile cursor's pixels (T126; art-direction.md § Range rings and placement): four
// `gold.3` corner brackets 1 px outside the tile's diamond, each with an `ink.0` outer stroke so
// they read on light ground too. Gold keeps it apart from the hover (`white.0`), selected
// (`teal.3`), and invalid (`red.3`) tile masks. Pure, so it's unit-tested.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { inTileMask, TILE_H, TILE_W } from '../../content/sprites/helpers.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';

/** Clear space around the tile in the cursor image (bracket plus stroke). */
export const CURSOR_MARGIN = 2;
export const CURSOR_W = TILE_W + 2 * CURSOR_MARGIN;
export const CURSOR_H = TILE_H + 2 * CURSOR_MARGIN;
export const CURSOR_COLOR: ColorName = 'gold.3';
const STROKE_COLOR: ColorName = 'ink.0';
/** A bracket covers the outline this far (tile px) from each side vertex, ±x; top/bottom ±y. */
const SIDE_REACH = 5;
const TIP_REACH = 2;

const N4: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Whether tile-mask pixel (x, y) (tile coordinates) lies on a bracket, near a vertex. */
function nearVertex(x: number, y: number): boolean {
  return (
    x <= SIDE_REACH || x >= TILE_W - 1 - SIDE_REACH || y <= TIP_REACH - 1 || y >= TILE_H - TIP_REACH
  );
}

/** The cursor image (CURSOR_W × CURSOR_H): its top-left sits CURSOR_MARGIN up-left of the tile's. */
export function tileCursorImage(): RgbaImage {
  const w = CURSOR_W;
  const h = CURSOR_H;
  const m = CURSOR_MARGIN;
  const kind = new Uint8Array(w * h); // 0 empty, 1 bracket, 2 stroke
  const inMask = (x: number, y: number): boolean => inTileMask(x - m, y - m);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (inMask(x, y) || !N4.some(([dx, dy]) => inMask(x + dx, y + dy))) continue;
      if (nearVertex(x - m, y - m)) kind[y * w + x] = 1;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (kind[y * w + x] !== 0 || inMask(x, y)) continue;
      const touches = N4.some(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        return nx >= 0 && ny >= 0 && nx < w && ny < h && kind[ny * w + nx] === 1;
      });
      if (touches) kind[y * w + x] = 2;
    }
  }
  const data = new Uint8ClampedArray(w * h * 4);
  const gold = rgbOf(CURSOR_COLOR);
  const ink = rgbOf(STROKE_COLOR);
  for (let i = 0; i < w * h; i++) {
    const k = kind[i];
    if (k === 0) continue;
    const c = k === 1 ? gold : ink;
    data[i * 4] = c.r;
    data[i * 4 + 1] = c.g;
    data[i * 4 + 2] = c.b;
    data[i * 4 + 3] = 255;
  }
  return { w, h, data };
}
