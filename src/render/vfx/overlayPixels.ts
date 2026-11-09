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
 * rings, solid for effect rings (render/views/FxView.ts). `underStroke` adds a 1 px shadow in that
 * color under every lit pixel (the image grows a row), so the ring reads on light ground.
 * `dashShift` moves the dashes along the ring by that many pixels (a marching reticle's frames).
 */
export function ringImage(
  radiusTiles: number,
  color: ColorName,
  dashed = true,
  underStroke: ColorName | null = null,
  dashShift = 0,
): RingImage {
  rangeEllipsePx(snapRingRadius(radiusTiles), scratch);
  const a = Math.max(1, Math.round(scratch.x));
  const b = Math.max(1, Math.round(scratch.y));
  const w = 2 * a + 1;
  const h = 2 * b + 1 + (underStroke === null ? 0 : 1);
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
    if (dashed && (i + dashShift) % DASH_PERIOD >= DASH_ON) continue;
    const [x, y] = quad[i]!; // i < length
    put(a + x, b + y);
    put(a - x, b + y);
    put(a + x, b - y);
    put(a - x, b - y);
  }
  if (underStroke !== null) {
    const u = rgbOf(underStroke);
    // Bottom-up, so a shadow never lands on a pixel that is itself a shadow source.
    for (let y = h - 1; y >= 1; y--) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const above = ((y - 1) * w + x) * 4;
        if (data[i + 3] !== 0 || data[above + 3] === 0) continue;
        if (data[above] !== c.r || data[above + 1] !== c.g || data[above + 2] !== c.b) continue;
        data[i] = u.r;
        data[i + 1] = u.g;
        data[i + 2] = u.b;
        data[i + 3] = 255;
      }
    }
  }
  return { image: { w, h, data }, cx: a, cy: b };
}

/**
 * A filled 2:1 ellipse of `radiusTiles` (ground-flash and scorch decals), in `color` at `alpha`
 * (0–1). With `ditherEdge`, the outer band is a checkerboard, so the decal's edge is ragged.
 */
export function discImage(
  radiusTiles: number,
  color: ColorName,
  alpha = 1,
  ditherEdge = false,
): RingImage {
  rangeEllipsePx(snapRingRadius(radiusTiles), scratch);
  const a = Math.max(1, Math.round(scratch.x));
  const b = Math.max(1, Math.round(scratch.y));
  const w = 2 * a + 1;
  const h = 2 * b + 1;
  const data = new Uint8ClampedArray(w * h * 4);
  const c = rgbOf(color);
  const al = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - a) / (a + 0.5);
      const dy = (y - b) / (b + 0.5);
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      if (ditherEdge && d > 0.55 && (x + y) % 2 === 1) continue;
      const i = (y * w + x) * 4;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = al;
    }
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

/** Hazard stripes across a tile tint: this many px of stripe, then as many clear (diagonal). */
const STRIPE_PX = 3;

/**
 * A tile tint (Suppressing Fire's ground strip and its aiming preview): the canonical tile mask in
 * `color`, its 1 px edge at `edgeAlpha` and its fill at `fillAlpha` (stepped alphas, 0–1). With
 * `stripes`, the fill is diagonal hazard stripes (STRIPE_PX on, STRIPE_PX off, running along the
 * tile's NE edge) instead of a wash, so it reads on any ground, the warm path included.
 */
export function tileTintImage(
  color: ColorName,
  fillAlpha: number,
  edgeAlpha = 1,
  stripes = false,
): RgbaImage {
  const data = new Uint8ClampedArray(TILE_W * TILE_H * 4);
  const c = rgbOf(color);
  const fill = Math.round(Math.min(1, Math.max(0, fillAlpha)) * 255);
  const edge = Math.round(Math.min(1, Math.max(0, edgeAlpha)) * 255);
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (!inTileMask(x, y)) continue;
      const onEdge =
        !inTileMask(x - 1, y) ||
        !inTileMask(x + 1, y) ||
        !inTileMask(x, y - 1) ||
        !inTileMask(x, y + 1);
      const striped = Math.floor((x + 2 * y) / STRIPE_PX) % 2 === 0;
      if (!onEdge && stripes && !striped) continue;
      const i = (y * TILE_W + x) * 4;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = onEdge ? edge : fill;
    }
  }
  return { w: TILE_W, h: TILE_H, data };
}
