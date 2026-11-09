// Zapcoil's chain arc (art-direction §7 Energy: "chain arcs, a jagged polyline regenerated every 2
// frames with cosmetic RNG"; §6 Zapcoil: a jagged blue arc with a white core). Pure: the
// stroke's pixels and the jagged polyline between two screen points, so both are unit-tested;
// views/ChainFx.ts draws each segment as the stroke stretched and turned along it.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';

/**
 * The stroke across the arc, edge to edge: a 2 px white-hot core between `blue.3` edges, inside a
 * 1 px `ink.0` under-stroke at 60% each side, so it reads on grass, path, and pads alike (D097: the
 * old 3 px `blue.4` stroke washed out on Act I grass). Alpha 0–1.
 */
export const ARC_STROKE: readonly { readonly color: ColorName; readonly alpha: number }[] = [
  { color: 'ink.0', alpha: 0.6 },
  { color: 'blue.3', alpha: 1 },
  { color: 'white.1', alpha: 1 },
  { color: 'white.1', alpha: 1 },
  { color: 'blue.3', alpha: 1 },
  { color: 'ink.0', alpha: 0.6 },
];

/** Segments per hop: the jagged line's kinks (its two ends stay put). */
export const ARC_SEGMENTS = 5;
/** How far a kink may stray from the straight line, either side (px). */
export const ARC_JITTER_PX = 3;

/** The stroke texture: 1 px long, ARC_STROKE.length px thick (stretched along each segment). */
export function arcStrokeImage(): RgbaImage {
  const h = ARC_STROKE.length;
  const data = new Uint8ClampedArray(h * 4);
  ARC_STROKE.forEach(({ color, alpha }, y) => {
    const c = rgbOf(color);
    data[y * 4] = c.r;
    data[y * 4 + 1] = c.g;
    data[y * 4 + 2] = c.b;
    data[y * 4 + 3] = Math.round(alpha * 255);
  });
  return { w: 1, h, data };
}

/** A small LCG step (cosmetic only, never the sim's RNG): the next seed. */
export function nextSeed(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

/**
 * The jagged polyline from (x0, y0) to (x1, y1) in screen px: ARC_SEGMENTS + 1 points, flat
 * (x, y, x, y, …) into `out` (which must hold 2 × (ARC_SEGMENTS + 1) numbers), whole pixels, the
 * ends exact and each kink up to ARC_JITTER_PX off the straight line, perpendicular to it. Returns
 * the next seed. Allocation-free.
 */
export function jaggedArc(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  seed: number,
  out: number[],
): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  // The unit perpendicular (zero for a hop onto the same point).
  const px = len > 0 ? -dy / len : 0;
  const py = len > 0 ? dx / len : 0;
  let s = seed;
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const t = i / ARC_SEGMENTS;
    let off = 0;
    if (i > 0 && i < ARC_SEGMENTS) {
      s = nextSeed(s);
      off = (s / 2 ** 32) * 2 * ARC_JITTER_PX - ARC_JITTER_PX;
    }
    out[2 * i] = Math.round(x0 + dx * t + px * off);
    out[2 * i + 1] = Math.round(y0 + dy * t + py * off);
  }
  return s;
}
