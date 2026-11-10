// An exposed warren (`prop.warren`; A2M3 decor, act2.md § A2M3 "exposed warrens with eggs line the
// path"): a Skitterkin burrow the mining cut open, a mound of the act's earth sliced through so its
// round chamber shows, and inside it a clutch of eggs: cream shells with pink and coral speckles,
// one with a faint warm shimmer (sung: these are young, art-direction §1 principle 6). The earth
// takes the act's env palette (the clay ramp) and a grey mining scar bites through its cut face;
// the eggs keep their own colors. `v0` three eggs in a nest of moss, `v1` two, and a third
// cracked and empty: the warrens are running.
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { ENV_VARIANTS } from '../tiles/tileGen.ts';

const W = 24;
const H = 16;
const AX = 12;
const AY = 12;

/** Fills an ellipse round the pixel-edge point (cx, cy) with `pick(u, v)` (u, v in −1..1). */
function ellipse(
  g: CharGrid,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  pick: (u: number, v: number, x: number, y: number) => string,
): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const u = (x + 0.5 - cx) / rx;
      const v = (y + 0.5 - cy) / ry;
      if (u * u + v * v <= 1) plot(g, x, y, pick(u, v, x, y));
    }
  }
}

/** An egg: a cream oval, lit upper left, speckled; a warm one glints (sung). */
function egg(g: CharGrid, x: number, y: number, warm: boolean): void {
  // prettier-ignore
  stamp(g, x, y, [
    '.EE.',
    'EEEE',
    'EEFD',
    'EEED',
    '.DD.',
  ]);
  if (warm) plot(g, x + 1, y + 1, '+');
}

function warrenGrid(v: 0 | 1): string[] {
  const g = grid(W, H);
  // The mound: the act's clay, lit upper left, shaded right, a fringe of grass along its crown.
  ellipse(g, AX, AY - 2, 11, 6.5, (u, w, x, y) => {
    if (w < -0.75) return (x + y) % 2 === 0 ? '2' : '1';
    if (u + w < -0.6) return 'd';
    return u > 0.45 || w > 0.6 ? 'b' : 'c';
  });
  // The cut face: the chamber opened by the mining, a dark hollow with a moss nest in its floor.
  ellipse(g, AX - 0.5, AY - 2, 7.5, 4.5, (u, w) =>
    u * u + w * w > 0.7 ? 'a' : w > 0.25 ? 'M' : 'K',
  );
  // A grey mining scar bitten through the mound's flank.
  for (let x = AX + 7; x <= AX + 10; x++) plot(g, x, AY - 4 + ((x + 1) % 2), 'G');
  plot(g, AX + 8, AY - 5, 'H');
  // The clutch.
  if (v === 0) {
    egg(g, AX - 6, AY - 5, false);
    egg(g, AX - 2, AY - 6, true);
    egg(g, AX + 2, AY - 5, false);
  } else {
    egg(g, AX - 5, AY - 5, true);
    egg(g, AX - 1, AY - 5, false);
    // An empty shell, cracked open: its young already ran.
    stamp(g, AX + 3, AY - 3, ['E.E', 'EKE', '.D.']);
  }
  // Its shadow.
  for (let x = AX - 10; x <= AX + 10; x++) plot(g, x, AY + 3, '_');
  return rows(g);
}

export const propWarren = defineSprite({
  id: 'prop.warren',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'act1',
  variants: ENV_VARIANTS,
  outline: 'auto',
  legend: {
    // The eggs: cream shells, pink and coral speckles.
    E: 'gold.4',
    D: 'coral.4',
    F: 'pink.4',
    // Moss in the nest.
    M: 'green.1',
    K: 'ink.1',
    // The mining scar through the cut face.
    G: 'grime.2',
    H: 'grime.3',
  },
  frames: { v0: warrenGrid(0), v1: warrenGrid(1) },
});
