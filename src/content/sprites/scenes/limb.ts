// A planet's limb seen from space (art-direction § 6: the orbit's Tumble IV and the prelude's view
// from the freighter's viewport): a vast disc whose edge arcs across the frame, a thin atmosphere
// in two bands over its rim, and relief from smooth value noise, squashed vertically as a globe's
// face is foreshortened toward its limb. Each still colours the bands and the relief its own way.
import { hash01 } from '../helpers.ts';

/** A planet's disc in a still's px: centre and radius (most of it off the frame). */
export interface Limb {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
}

/** Where a pixel stands against the limb, outside in. */
export type LimbBand = 'space' | 'air_high' | 'air' | 'rim' | 'ground';

/** The signed distance from the limb's edge (positive in space, negative on the ground). */
export function limbDistance(p: Limb, x: number, y: number): number {
  return Math.hypot(x - p.cx, y - p.cy) - p.r;
}

/**
 * The band at a signed distance `d` from the edge: space beyond 3 px, the atmosphere's thin high
 * band (2–3 px) and its bright low one (0–2 px), the rim (the ground's first 1.5 px), the ground.
 */
export function limbBand(d: number): LimbBand {
  if (d > 3) return 'space';
  if (d > 2) return 'air_high';
  if (d > 0) return 'air';
  if (d > -1.5) return 'rim';
  return 'ground';
}

/** Smoothstep. */
export function ease(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Smooth value noise in [0, 1): hashed lattice corners blended bilinearly (`cell` px apart). */
export function smooth(x: number, y: number, cell: number, seed: number): number {
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  const fx = x / cell - gx;
  const fy = y / cell - gy;
  const a = hash01(gx, gy, seed) + (hash01(gx + 1, gy, seed) - hash01(gx, gy, seed)) * ease(fx);
  const b =
    hash01(gx, gy + 1, seed) + (hash01(gx + 1, gy + 1, seed) - hash01(gx, gy + 1, seed)) * ease(fx);
  return a + (b - a) * ease(fy);
}

/**
 * The ground's relief at (x, y) in [0, 1): two octaves of smooth noise (22 px and 9 px cells,
 * seeds `seed` and `seed + 1`) over rows stretched 2.2×, so features flatten toward the limb.
 */
export function limbRelief(x: number, y: number, seed: number): number {
  return smooth(x, y * 2.2, 22, seed) * 0.7 + smooth(x, y * 2.2, 9, seed + 1) * 0.3;
}
