// A kerb between two lanes of road that run side by side (T430b; art-direction §3): where two
// road tiles share an edge but no route steps across it (A2M2's hairpin, rows 4 and 5), a low
// stone kerb runs along the seam so the two lanes read apart, not as one wide road. Pure, so the
// shape is unit-tested; GroundView lays one overlay per kerbed edge over the road tile.
//
// One image per tile edge (`VergeEdge`: `nw` faces (col − 1, row), `ne` (col, row − 1), `se`
// (col + 1, row), `sw` (col, row + 1)), drawn in the tile's own 32×16 frame. The kerb is seen
// from the camera's side: on the back tile (its front edge, `se`/`sw`) its lit top, a row of the
// road's lightest stone; on the front tile (its back edge, `ne`/`nw`) its face in the clay's
// shade and a dithered shadow cast onto the lane in front.
import type { RgbaImage } from '../sprites/rasterize.ts';
import type { Rgb } from './lighting.ts';

export type KerbEdge = 'nw' | 'ne' | 'se' | 'sw';

export const KERB_W = 32;
export const KERB_H = 16;

/** The kerb's colors: its lit top, its face, and the shadow it casts. */
export interface KerbColors {
  readonly top: Rgb;
  readonly face: Rgb;
  readonly shadow: Rgb;
}

/** The canonical tile mask (content/sprites/helpers.ts `inTileMask`). */
function inMask(x: number, y: number): boolean {
  if (y < 0 || y >= KERB_H) return false;
  const r = y < 8 ? y : 15 - y;
  return x >= 15 - 2 * r && x <= 16 + 2 * r;
}

/** Distance from (x, y) to `edge` of the tile mask, in rows (verge.ts's measure). */
export function edgeDistance(x: number, y: number, edge: KerbEdge): number {
  const u = (x - 15.5) / 2;
  const v = y - 7.5;
  if (edge === 'nw') return 7.75 + u + v;
  if (edge === 'ne') return 7.75 - u + v;
  if (edge === 'se') return 7.75 - u - v;
  return 7.75 + u - v;
}

/** Whether `edge` faces the camera (the tile in front of it lies lower on screen). */
export function frontEdge(edge: KerbEdge): boolean {
  return edge === 'se' || edge === 'sw';
}

/** The kerb overlay for `edge` of a road tile. */
export function kerbImage(edge: KerbEdge, colors: KerbColors): RgbaImage {
  const data = new Uint8ClampedArray(new ArrayBuffer(KERB_W * KERB_H * 4));
  const put = (x: number, y: number, c: Rgb): void => {
    const i = (y * KERB_W + x) * 4;
    data[i] = c.r;
    data[i + 1] = c.g;
    data[i + 2] = c.b;
    data[i + 3] = 255;
  };
  const front = frontEdge(edge);
  for (let y = 0; y < KERB_H; y++) {
    for (let x = 0; x < KERB_W; x++) {
      if (!inMask(x, y)) continue;
      const d = edgeDistance(x, y, edge);
      if (front) {
        // The kerb's top along the back lane's front edge, two rows of light stone.
        if (d < 1.75) put(x, y, colors.top);
      } else if (d < 1.25) {
        put(x, y, colors.face);
      } else if (d < 2.5 && (x + y) % 2 === 0) {
        put(x, y, colors.shadow);
      }
    }
  }
  return { w: KERB_W, h: KERB_H, data };
}
