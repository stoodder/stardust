// The hall door (`prop.hall_door`; A3M4 decor, act3.md § A3M4, marker `hall_door`): the Shelters'
// hall, where the colonists (or the warren) sleep under the last Fun Friday banner, opens off the
// generator's corridor through this door. A low ferrocrete portal along the grid's x axis, kept
// low (it stands just in front of the generator, so it never hides the core): coursed grime, lit
// along its top, the doorway lit warm from inside (the hall's lamps spilling onto the floor), the
// leaves slid back into hazard-striped jambs, a warm lamp over the lintel, and Everglow's teal
// chevron stencilled beside it. `v0`. Everglow-owned, with ferrocrete and the warm light in its own
// legend.
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows, type CharGrid } from '../helpers.ts';

const W = 34;
const H = 22;
/** The anchor: the tile's centre, at the wall's foot. */
const AX = 17;
const AY = 15;
/** The wall's half-length (px across the screen), height and top depth. */
const HALF = 14;
const TALL = 13;
const DEPTH = 3;
/** The doorway's half-width and height. */
const GAP = 6;
const DOOR_H = 9;

/** The wall's foot row at column x (slope ½: the grid's x axis runs down to the right). */
function footAt(x: number): number {
  return AY + Math.round((x - AX) / 2);
}

function hallDoor(): string[] {
  const g: CharGrid = grid(W, H);
  for (let x = AX - HALF - 1; x <= AX + HALF + 1; x++) plot(g, x, footAt(x) + 1, '_');
  // The top face, a few rows deep.
  for (let x = AX - HALF; x <= AX + HALF + DEPTH * 2; x++) {
    for (let j = 0; j < DEPTH * 2; j++) {
      const fx = x - j;
      if (fx < AX - HALF || fx > AX + HALF) continue;
      plot(g, x, footAt(x) - TALL - j, j === 0 || j === DEPTH * 2 - 1 ? 'N' : 'M');
    }
  }
  // The right end's face, in shade.
  for (let j = 0; j < DEPTH * 2; j++) {
    const x = AX + HALF + 1 + j;
    for (let y = footAt(AX + HALF) - TALL - j; y <= footAt(AX + HALF) - j; y++) {
      plot(g, x, y + Math.ceil(j / 2), 'L');
    }
  }
  // The front face: ferrocrete, coursed, lit along its top.
  for (let x = AX - HALF; x <= AX + HALF; x++) {
    const foot = footAt(x);
    for (let y = foot - TALL + 1; y <= foot; y++) {
      plot(g, x, y, y === foot - TALL + 1 ? 'N' : (foot - y) % 5 === 0 ? 'L' : 'M');
    }
  }
  // The jambs' hazard stripes, then the doorway lit warm, its light on the floor in front.
  for (const side of [-1, 1] as const) {
    const x = AX + side * (GAP + 1) - (side > 0 ? 1 : 0);
    for (let y = footAt(x) - DOOR_H; y <= footAt(x); y++) {
      plot(g, x, y, Math.floor((y + 64) / 2) % 2 === 0 ? 'c' : 'k');
    }
  }
  for (let x = AX - GAP; x < AX + GAP - 1; x++) {
    const foot = footAt(x);
    for (let y = foot - DOOR_H + 1; y <= foot; y++) {
      plot(g, x, y, y === foot - DOOR_H + 1 ? 'k' : y > foot - 3 ? 'Y' : y > foot - 6 ? 'H' : 'O');
    }
    plot(g, x, foot + 1, (x + 64) % 2 === 0 ? 'H' : 'O');
  }
  // A warm lamp over the doorway, and Everglow's chevron stencilled teal right of it.
  plot(g, AX - 1, footAt(AX - 1) - DOOR_H - 2, 'Y');
  plot(g, AX, footAt(AX) - DOOR_H - 2, 'H');
  const sx = AX + GAP + 3;
  const sy = footAt(sx) - TALL + 5;
  for (const [dx, dy] of [
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 2],
    [4, 1],
    [5, 1],
  ] as const) {
    plot(g, sx + dx, sy + dy, '7');
  }
  return rows(g);
}

export const propHallDoor = defineSprite({
  id: 'prop.hall_door',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  outline: 'auto',
  legend: {
    N: 'grime.4',
    M: 'grime.2',
    L: 'grime.1',
    O: 'orange.1',
    H: 'orange.3',
    Y: 'gold.4',
  },
  frames: { v0: hallDoor() },
});
