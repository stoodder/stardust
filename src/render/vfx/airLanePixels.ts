// The air lane's dotted line (art-direction §8 Tile readability: "a dotted line of 1 px dashes in
// the `decal` layer, drifting slowly in the direction of travel"; design/maps.md §4). Pure RGBA
// buffers, one per drift phase, so they're unit-tested; views/AirLaneView.ts registers them as an
// anim and shows the lane while a flyer is in the current or next wave, or while an armed tower
// hits air.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { Vec2 } from '../iso.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';

/** Dashes: this many pixels on, then off, along the lane (a dotted line, not a road marking). */
export const LANE_DASH_ON = 2;
export const LANE_DASH_PERIOD = 5;
/** The dashes and their 1 px under-stroke (so they read on light ground), and their alphas. */
const DASH: { readonly color: ColorName; readonly alpha: number } = {
  color: 'white.0',
  alpha: 1,
};
const UNDER: { readonly color: ColorName; readonly alpha: number } = {
  color: 'ink.0',
  alpha: 0.6,
};

/** A baked lane frame: its pixels and the screen point its (0, 0) sits on. */
export interface LaneImage {
  readonly image: RgbaImage;
  /** The image's top-left in the same screen space as the points. */
  readonly x: number;
  readonly y: number;
}

/**
 * The lane's pixels in path order (whole screen px, deduplicated), stepping each segment along its
 * longer axis so the line has no gaps.
 */
export function lanePixels(points: readonly Vec2[]): [number, number][] {
  const out: [number, number][] = [];
  for (let k = 0; k + 1 < points.length; k++) {
    const a = points[k]!; // k + 1 < length
    const b = points[k + 1]!;
    const x0 = Math.round(a.x);
    const y0 = Math.round(a.y);
    const dx = Math.round(b.x) - x0;
    const dy = Math.round(b.y) - y0;
    const n = Math.max(Math.abs(dx), Math.abs(dy), 1);
    for (let i = 0; i <= n; i++) {
      const x = x0 + Math.round((dx * i) / n);
      const y = y0 + Math.round((dy * i) / n);
      const last = out.at(-1);
      if (last !== undefined && last[0] === x && last[1] === y) continue;
      out.push([x, y]);
    }
  }
  return out;
}

/**
 * One frame of the dotted lane through `points` (screen px, travel order): dashes LANE_DASH_ON
 * on in every LANE_DASH_PERIOD pixels, shifted `phase` pixels along the direction of travel, each
 * over a 1 px under-stroke.
 */
export function airLaneImage(points: readonly Vec2[], phase: number): LaneImage {
  const px = lanePixels(points);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of px) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (px.length === 0) return { image: { w: 0, h: 0, data: new Uint8ClampedArray(0) }, x: 0, y: 0 };
  const w = maxX - minX + 1;
  const h = maxY - minY + 2; // a row for the under-stroke
  const data = new Uint8ClampedArray(w * h * 4);
  const put = (x: number, y: number, color: ColorName, alpha: number): void => {
    const c = rgbOf(color);
    const i = ((y - minY) * w + (x - minX)) * 4;
    data[i] = c.r;
    data[i + 1] = c.g;
    data[i + 2] = c.b;
    data[i + 3] = Math.round(alpha * 255);
  };
  const lit = (i: number): boolean =>
    (((i - phase) % LANE_DASH_PERIOD) + LANE_DASH_PERIOD) % LANE_DASH_PERIOD < LANE_DASH_ON;
  px.forEach(([x, y], i) => {
    if (lit(i)) put(x, y + 1, UNDER.color, UNDER.alpha);
  });
  px.forEach(([x, y], i) => {
    if (lit(i)) put(x, y, DASH.color, DASH.alpha);
  });
  return { image: { w, h, data }, x: minX, y: minY };
}
