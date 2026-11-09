// The Brood Hauler's sack (design/enemies.md § Brood Hauler; art-direction §8 `carrier` tell: a
// pack on the back): a tied burlap bag, lit from the upper left, flecked with gold glitter. In
// Act I it reads as cargo, "stolen stardust"; the glitter is really the young's shimmer.
// Shared by the walking body, its icon, and the burst.
import { at, plot, type CharGrid } from '../helpers.ts';

/** Custom legend for the sack: burlap ramp, rope, and the pink half of the glitter. */
export const SACK_LEGEND = {
  G: 'grime.4',
  H: 'grime.3',
  J: 'grime.2',
  I: 'grime.1',
  R: 'gold.1',
  P: 'pink.3',
} as const;

export interface SackShape {
  /** Bag center (pixel-edge coordinates) and radii. */
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
  /** Which glitter pattern twinkles this frame. */
  readonly twinkle: 0 | 1;
}

/** Draws the bag, its tied neck and knot, creases, and glitter. */
export function sack(g: CharGrid, s: SackShape): void {
  const top = Math.floor(s.cy - s.ry);
  for (let y = top; y <= Math.ceil(s.cy + s.ry); y++) {
    for (let x = Math.floor(s.cx - s.rx) - 1; x <= Math.ceil(s.cx + s.rx); x++) {
      const dx = (x + 0.5 - s.cx) / s.rx;
      const dy = (y + 0.5 - s.cy) / s.ry;
      // A bag sags: narrower at the top, full at the bottom.
      const w = dy < 0 ? 1 - 0.35 * dy * dy : 1;
      const d = Math.hypot(dx / w, dy);
      if (d > 1) continue;
      const lit = -0.7 * dx - 0.7 * dy;
      let ch = 'H';
      if (lit > 0.05 && d < 0.9) ch = 'G';
      else if (lit < -0.5 || (d > 0.88 && dy > 0.4)) ch = 'J';
      if (dy > 0.8 && d > 0.9) ch = 'I';
      plot(g, x, y, ch);
    }
  }
  // Creases fanning down from the neck.
  const nx = Math.round(s.cx - 0.5);
  for (const [ox, len] of [
    [-2, 3],
    [2, 4],
  ] as const) {
    for (let k = 1; k <= len; k++) {
      const x = nx + ox + Math.sign(ox) * Math.floor(k / 3);
      if (at(g, x, top + k) !== '.') plot(g, x, top + k, ox < 0 ? 'H' : 'J');
    }
  }
  // The tied neck and its knot, with two cloth ears.
  plot(g, nx, top - 1, 'J');
  plot(g, nx + 1, top - 1, 'I');
  plot(g, nx, top - 2, 'G');
  plot(g, nx + 1, top - 2, 'H');
  plot(g, nx - 1, top - 3, 'G');
  plot(g, nx + 2, top - 3, 'H');
  plot(g, nx, top, 'R');
  plot(g, nx + 1, top, 'R');
  // Glitter: gold (the emissive slots, so they glow) and pink, twinkling between two patterns.
  const flecks: readonly (readonly [number, number, string])[] =
    s.twinkle === 0
      ? [
          [-3, 1, '*'],
          [2, -1, '+'],
          [-1, 3, 'P'],
          [3, 2, '+'],
          [0, -3, 'P'],
          [-2, -3, '*'],
          [1, 4, '+'],
        ]
      : [
          [-2, -1, '+'],
          [1, 1, '*'],
          [-3, 3, '+'],
          [3, -2, 'P'],
          [1, 4, 'P'],
          [-1, -4, '+'],
          [3, 3, '*'],
        ];
  for (const [fx, fy, ch] of flecks) {
    const x = Math.round(s.cx + (fx * s.rx) / 6);
    const y = Math.round(s.cy + (fy * s.ry) / 6);
    if (at(g, x, y) !== '.') plot(g, x, y, ch);
  }
}
