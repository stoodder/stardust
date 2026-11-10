// The Brood Hauler's sack (design/enemies.md § Brood Hauler; art-direction §8 `carrier` tell: a
// pack on the back): a tied burlap bag, lit from the upper left, flecked with gold glitter. In
// Act I it reads as cargo, "stolen stardust"; the glitter is really the young's shimmer.
// Shared by the walking body, its icon, and the burst.
import { at, plot, stamp, type CharGrid } from '../helpers.ts';

/**
 * The young's own colours (custom, so a fleeing body's flatten/glance never reads them as its own
 * tuft or face): the youngling's coral (`coral.2`–`.4`), its ink eyes with a white glint, and its
 * seedling's greens (art-direction §6; D134).
 */
const YOUNG_LEGEND = {
  C: 'coral.3',
  D: 'coral.2',
  E: 'coral.4',
  K: 'ink.1',
  W: 'white.1',
  L: 'green.4',
  M: 'green.2',
} as const;

/**
 * Custom legend for the sack: burlap lit to parchment (`brass.4`), bright enough that the cargo
 * sits in the actor value band (art-direction §1) and a step below the glitter's gold, so the
 * flecks read; rope, and the glitter's pink and gold.
 */
export const SACK_LEGEND = {
  ...YOUNG_LEGEND,
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
   * From Act II (a fleeing Hauler, art-direction §6): the neck is untied, the bag lit pale behind
   * the young (so their heads read against it), and its mouth a dark fold; youngHeads() puts them
   * in it, once the frame has YOUNG_HEADROOM rows above it.
   */
  readonly young?: 'se' | 'ne';
}

/**
 * One of the young over the sack's rim (D134: they read by sight at 1×): the W1 youngling's face
 * small — its seedling (two leaves on a stem), a round coral crown lit upper left, two eyes
 * looking straight out (a white glint over ink), a shaded chin on the rim. Eyes forward in both
 * facings: walking away, the young peer back out of the open sack at you.
 */
// prettier-ignore
export const YOUNG_HEAD = [
  'L.L..',
  '.M...',
  '.EEC.',
  'CWCWC',
  'CKCKD',
  'DDDDD',
] as const;
/** Rows a young head stands above its chin. */
const HEAD_RISE = YOUNG_HEAD.length - 1;
/** How far above the bag's top the young can reach (rows a frame must leave clear above it). */
export const YOUNG_HEADROOM = 2;

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
      // An untied sack is lit pale behind its young (its upper half), so their heads stand out.
      if ((lit > -0.15 || (s.young !== undefined && dy < 0.1)) && d < 0.9) ch = 'G';
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
    // The untied mouth: a dark fold of burlap the young stand in.
    for (let x = nx - 4; x <= nx + 5; x++) if (at(g, x, top + 1) !== '.') plot(g, x, top + 1, 'J');
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

/** The bag's neck column and top row, as sack() draws them. */
export function sackMouth(s: SackShape): { readonly nx: number; readonly top: number } {
  return { nx: Math.round(s.cx - 0.5), top: Math.floor(s.cy - s.ry) };
}

/**
 * Three young over an untied sack's rim (D134), drawn `dy` rows down (the headroom the frame was
 * given above the sack's own rows): two at the sides riding with the bag, the middle one in
 * front, a row higher, which holds still as the bag bobs on `step` 1, so they jostle each step.
 * Their chins sit on the mouth's dark fold.
 */
export function youngHeads(g: CharGrid, s: SackShape, dy: number, step: 0 | 1): void {
  const { nx, top } = sackMouth(s);
  const half = s.rx * 0.62;
  const chin = top + dy;
  stamp(g, Math.round(nx - half) - 2, chin - HEAD_RISE, YOUNG_HEAD);
  stamp(g, Math.round(nx + half) - 1, chin - HEAD_RISE, YOUNG_HEAD);
  stamp(g, nx - 2, chin - 1 + step - HEAD_RISE, YOUNG_HEAD);
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
