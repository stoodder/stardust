// Shared Skitterkin body builder: round, fuzzy, big-eyed, butter-bellied, moss-tufted, with a
// faint gold shimmer on the back (story/races.md § Skitterkin; art-direction §4). Bodies are
// shaded ellipses lit from the upper left; faces and features are stamped on top.
import { grid, plot, rows, stamp, type CharGrid } from '../helpers.ts';

export interface SkitterBody {
  readonly w: number;
  readonly h: number;
  /** Ellipse center (pixel-edge coordinates) and radii. */
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
  readonly facing: 'se' | 'ne';
  /** Belly patch size, 0–1 of the body (front view only). */
  readonly belly: number;
}

/** Draws the shaded body and, facing SE, the butter belly. */
export function skitterBody(b: SkitterBody): CharGrid {
  const g = grid(b.w, b.h);
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      const dx = (x + 0.5 - b.cx) / b.rx;
      const dy = (y + 0.5 - b.cy) / b.ry;
      const d = Math.hypot(dx, dy);
      if (d > 1) continue;
      const lit = -0.6 * dx - 0.8 * dy; // toward the upper-left light
      // Lit mostly in `3`, so bodies sit a value band above Act I's ground (art-direction §1).
      let ch = '2';
      if (lit > 0.4 && d < 0.8) ch = '4';
      else if (lit > -0.25) ch = '3';
      else if (d > 0.82 && lit < -0.15) ch = '1';
      const inBelly =
        b.facing === 'se' && dy > 0.75 - b.belly && Math.abs(dx - 0.2) < 0.25 + b.belly && d < 0.95;
      if (inBelly) ch = d > 0.8 ? '7' : lit > -0.25 ? '9' : '8';
      // Fuzz: a few rim pixels drop out so the silhouette reads soft, not geometric.
      if (d > 0.93 && (x * 7 + y * 3) % 5 === 0) continue;
      plot(g, x, y, ch);
    }
  }
  return g;
}

/** Stamps feature rows (`.` skipped) and returns the grid as rows. */
export function finish(
  g: CharGrid,
  stamps: readonly (readonly [number, number, readonly string[]])[],
): string[] {
  for (const [x, y, src] of stamps) stamp(g, x, y, src);
  return rows(g);
}

/** A 2×2 eye: glint top-left. */
export const EYE = ['wk', 'kk'] as const;
/** A 2×3 big eye for the youngest, roundest faces. */
export const BIG_EYE = ['wk', 'kk', 'kk'] as const;
