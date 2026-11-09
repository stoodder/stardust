// The Brood Hauler's sack (design/enemies.md § Brood Hauler; art-direction §8 `carrier` tell: a
// pack on the back): a tied burlap bag, lit from the upper left, flecked with gold glitter. In
// Act I it reads as cargo, "stolen stardust"; the glitter is really the young's shimmer.
// Shared by the walking body, its icon, and the burst.
import { at, plot, stamp, type CharGrid } from '../helpers.ts';

/**
 * Custom legend for the sack: burlap lit to parchment (`brass.4`), bright enough that the cargo
 * sits in the actor value band (art-direction §1) and a step below the glitter's gold, so the
 * flecks read; rope, and the glitter's pink and gold.
 */
export const SACK_LEGEND = {
  G: 'brass.4',
  H: 'grime.4',
  J: 'grime.3',
  I: 'grime.2',
  R: 'gold.1',
  P: 'pink.3',
  Y: 'gold.3',
} as const;

export interface SackShape {
  /** Bag center (pixel-edge coordinates) and radii. */
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
  /** Which glitter pattern twinkles this frame. */
  readonly twinkle: 0 | 1;
  /**
   * From Act II (a fleeing Hauler, art-direction §6): the neck is untied and the young show, a
   * cluster of round heads in the mouth of the bag, big-eyed facing you, frosted from behind.
   */
  readonly young?: 'se' | 'ne';
}

/** One of the young in the sack's mouth, facing you: coral fuzz, one huge eye, a glint. */
// prettier-ignore
const HEAD_SE = ['.33.', '3wk3', '2kk2'] as const;
/** One of the young seen from behind: coral fuzz with the pink-gold frost of the very young. */
// prettier-ignore
const HEAD_NE = ['.34.', '3P43', '2332'] as const;

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
      if (lit > -0.15 && d < 0.9) ch = 'G';
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
  if (s.young !== undefined) {
    glitter(g, s);
    youngInMouth(g, nx, top, s.young, s.twinkle);
    return;
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
  glitter(g, s);
}

/**
 * The untied mouth (a dark fold of burlap) and three young in it: the middle one up highest,
 * bobbing a pixel with the step; facing you, one huge eye each (the hauler_young's look).
 */
function youngInMouth(g: CharGrid, nx: number, top: number, facing: 'se' | 'ne', bob: 0 | 1): void {
  for (let x = nx - 3; x <= nx + 4; x++) if (at(g, x, top + 1) !== '.') plot(g, x, top + 1, 'J');
  const head = facing === 'se' ? HEAD_SE : HEAD_NE;
  stamp(g, nx - 4, top - 1, head);
  stamp(g, nx + 2, top - 1 + bob, head);
  stamp(g, nx - 1, top - 3 + bob, head);
  // Frost on the youngest's crown; a moss tuft on the eldest's.
  plot(g, nx, top - 3 + bob, 'P');
  plot(g, nx - 3, top - 2, 'c');
}

/**
 * Glitter: gold and pink, twinkling between two patterns; one or two flecks are emissive, so the
 * sack glints without its halo washing out the burlap.
 */
function glitter(g: CharGrid, s: SackShape): void {
  const flecks: readonly (readonly [number, number, string])[] =
    s.twinkle === 0
      ? [
          [-3, 1, '*'],
          [2, -1, 'Y'],
          [-1, 3, 'P'],
          [3, 2, 'Y'],
          [0, -3, 'P'],
          [-2, -3, 'Y'],
          [1, 4, '+'],
        ]
      : [
          [-2, -1, 'Y'],
          [1, 1, '*'],
          [-3, 3, 'Y'],
          [3, -2, 'P'],
          [1, 4, 'P'],
          [-1, -4, '+'],
          [3, 3, 'Y'],
        ];
  for (const [fx, fy, ch] of flecks) {
    const x = Math.round(s.cx + (fx * s.rx) / 6);
    const y = Math.round(s.cy + (fy * s.ry) / 6);
    if (at(g, x, y) !== '.') plot(g, x, y, ch);
  }
}
