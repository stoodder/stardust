// Pixel art for in-world UI that render draws itself (art-direction.md § Range rings and
// placement): dashed 1 px range ellipses and the tile-mask highlight. Pure RGBA buffers (no
// canvas, no Phaser), so they're unit-tested; vfx/overlayTextures.ts registers them with Phaser.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { inTileMask, TILE_H, TILE_W } from '../../content/sprites/helpers.ts';
import { rangeEllipsePx, type Vec2 } from '../iso.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';

/** Range rings are baked per radius in quarter-tile steps (art-direction §7). */
export const RING_STEP_TILES = 0.25;
/** The dash pattern along each quadrant of a ring: this many pixels on, then off. */
const DASH_ON = 3;
const DASH_PERIOD = 5;
/** Stepped alpha (art-direction §7): the tile highlight's fill. */
export const HIGHLIGHT_FILL_ALPHA = 0.15;

/** A ring's radius snapped to the bake step (so rings are cached per step, not per float). */
export function snapRingRadius(radiusTiles: number): number {
  return Math.max(RING_STEP_TILES, Math.round(radiusTiles / RING_STEP_TILES) * RING_STEP_TILES);
}

/** A baked ring: the image and the pixel (an edge coordinate) that sits on the tower's center. */
export interface RingImage {
  readonly image: RgbaImage;
  readonly cx: number;
  readonly cy: number;
}

const scratch: Vec2 = { x: 0, y: 0 };

/**
 * One quadrant of a midpoint (Bresenham) ellipse with integer semi-axes, in path order from
 * (0, b) to (a, 0), so a dash pattern can run along it.
 */
export function ellipseQuadrant(a: number, b: number): [number, number][] {
  const out: [number, number][] = [];
  const a2 = a * a;
  const b2 = b * b;
  let x = 0;
  let y = b;
  let dx = 0;
  let dy = 2 * a2 * y;
  let d1 = b2 - a2 * b + 0.25 * a2;
  while (dx < dy) {
    out.push([x, y]);
    x++;
    dx += 2 * b2;
    if (d1 < 0) {
      d1 += dx + b2;
    } else {
      y--;
      dy -= 2 * a2;
      d1 += dx - dy + b2;
    }
  }
  let d2 = b2 * (x + 0.5) * (x + 0.5) + a2 * (y - 1) * (y - 1) - a2 * b2;
  while (y >= 0) {
    out.push([x, y]);
    y--;
    dy -= 2 * a2;
    if (d2 > 0) {
      d2 += a2 - dy;
    } else {
      x++;
      dx += 2 * b2;
      d2 += dx - dy + a2;
    }
  }
  return out;
}

/**
 * A 1 px range ellipse for a range of `radiusTiles` (snapped to the bake step): dashed for range
 * rings, solid for effect rings (the Sprinkler's pulse, render/views/FxView.ts).
 */
export function ringImage(radiusTiles: number, color: ColorName, dashed = true): RingImage {
  rangeEllipsePx(snapRingRadius(radiusTiles), scratch);
  const a = Math.max(1, Math.round(scratch.x));
  const b = Math.max(1, Math.round(scratch.y));
  const w = 2 * a + 1;
  const h = 2 * b + 1;
  const data = new Uint8ClampedArray(w * h * 4);
  const c = rgbOf(color);
  const put = (x: number, y: number): void => {
    const i = (y * w + x) * 4;
    data[i] = c.r;
    data[i + 1] = c.g;
    data[i + 2] = c.b;
    data[i + 3] = 255;
  };
  const quad = ellipseQuadrant(a, b);
  for (let i = 0; i < quad.length; i++) {
    if (dashed && i % DASH_PERIOD >= DASH_ON) continue;
    const [x, y] = quad[i]!; // i < length
    put(a + x, b + y);
    put(a - x, b + y);
    put(a + x, b - y);
    put(a - x, b - y);
  }
  return { image: { w, h, data }, cx: a, cy: b };
}

/** The canonical tile mask (32×16): a 1 px edge in `color`, filled at the stepped fill alpha. */
export function tileHighlightImage(color: ColorName): RgbaImage {
  const data = new Uint8ClampedArray(TILE_W * TILE_H * 4);
  const c = rgbOf(color);
  const fill = Math.round(HIGHLIGHT_FILL_ALPHA * 255);
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (!inTileMask(x, y)) continue;
      const edge =
        !inTileMask(x - 1, y) ||
        !inTileMask(x + 1, y) ||
        !inTileMask(x, y - 1) ||
        !inTileMask(x, y + 1);
      const i = (y * TILE_W + x) * 4;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = edge ? 255 : fill;
    }
  }
  return { w: TILE_W, h: TILE_H, data };
}
