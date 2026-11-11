// Okonkwo's Gap's blast doors (`prop.blast_door`; A3M3, act3.md § A3M3, markers `door_west` and
// `door_east` on the two door cores): the shelters' doors at the foot of the old mining cut, each
// a squat ferrocrete portal across its road, so the road runs in through it. The portal is a wall
// along the grid's x axis (its face toward the viewer, the road's way in), two hazard-chevroned
// pillars round a doorway as wide as the road, an alarm beacon on top, and Everglow's teal chevron
// stencilled on the wall's right end.
// - `open`: the leaves slid back into the pillars, the doorway lit warm from inside (the shelter's
//   lamps), a teal status lamp: the door C3 chose.
// - `shut`: the two leaves met in the doorway (steel, hazard-striped at the seam), the inside dark,
//   the beacon and the lamp out: the door C3 didn't choose, "shut and dark".
// - `closing_0`–`closing_2` (anim `closing`, 6 fps, once): the leaves running shut from `open`,
//   the warm light narrowing to a slit, the beacon lit red: the SEAL.
// - `sealed_0`/`sealed_1` (anim `sealed`, 2 fps): shut, the alarm beacon turning red over it and a
//   red seal lamp on the seam: held.
// Everglow-owned (the faction's palette) with ferrocrete (`grime`) and the alarm reds in its own
// legend, so it keeps its colours in every act.
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows, type CharGrid } from '../helpers.ts';

const W = 44;
const H = 42;
/** The anchor: the tile's center, where the road crosses the wall's foot. */
const AX = 22;
const AY = 33;
/** The wall's half-length along x (px across the screen), its height, and its depth. */
const HALF = 18;
const TALL = 22;
const DEPTH = 5;
/** The doorway's half-width (px across the screen) and height. */
const GAP = 7;
const DOOR_H = 14;

/** The wall's foot row at column x: slope ½ (the grid's x axis runs down to the right). */
function footAt(x: number): number {
  return AY + Math.round((x - AX) / 2);
}

type Look = 'open' | 'shut' | 'closing_0' | 'closing_1' | 'closing_2' | 'sealed_0' | 'sealed_1';

/** How far each leaf stands out of its pillar (0 open, GAP shut). */
function leafOf(look: Look): number {
  if (look === 'open') return 0;
  if (look.startsWith('closing')) return Math.round(((Number(look.slice(-1)) + 1) * GAP) / 4);
  return GAP;
}

function door(look: Look): string[] {
  const g: CharGrid = grid(W, H);
  const leaf = leafOf(look);
  const lit = look === 'open' || look.startsWith('closing');
  const alarm = look.startsWith('closing') || look === 'sealed_0';
  // The contact shadow along the foot.
  for (let x = AX - HALF - 1; x <= AX + HALF + 1; x++) plot(g, x, footAt(x) + 1, '_');
  // The top face: DEPTH rows back (each a step up and two right), filled column by column.
  for (let x = AX - HALF; x <= AX + HALF + DEPTH * 2; x++) {
    for (let j = 0; j < DEPTH * 2; j++) {
      const fx = x - j;
      if (fx < AX - HALF || fx > AX + HALF) continue;
      plot(g, x, footAt(x) - TALL - j, j >= DEPTH * 2 - 2 ? 'N' : j === 0 ? 'N' : 'M');
    }
  }
  // The right end's face, in shade: from the face's right edge back up-right.
  for (let j = 0; j < DEPTH * 2; j++) {
    const x = AX + HALF + 1 + j;
    const top = footAt(AX + HALF) - TALL - j;
    for (let y = top; y <= footAt(AX + HALF) - j; y++) plot(g, x, y + Math.ceil(j / 2), 'L');
  }
  // The front face: ferrocrete, coursed, lit along its top.
  for (let x = AX - HALF; x <= AX + HALF; x++) {
    const foot = footAt(x);
    for (let y = foot - TALL + 1; y <= foot; y++) {
      const course = (foot - y) % 6 === 0;
      plot(g, x, y, y === foot - TALL + 1 ? 'N' : course ? 'L' : 'M');
    }
  }
  // The pillars' hazard chevrons, either side of the doorway.
  for (const side of [-1, 1] as const) {
    const px = AX + side * (GAP + 3);
    for (let dx = -2; dx <= 2; dx++) {
      const x = px + dx;
      const foot = footAt(x);
      for (let y = foot - 9; y <= foot - 1; y++) {
        plot(g, x, y, Math.floor((y - foot + x * side + 64) / 2) % 2 === 0 ? 'c' : 'k');
      }
    }
  }
  // The doorway: deep and dark, or lit warm from inside (a floor of light spilling out).
  for (let x = AX - GAP; x < AX + GAP; x++) {
    const foot = footAt(x);
    for (let y = foot - DOOR_H + 1; y <= foot; y++) {
      const top = y === foot - DOOR_H + 1;
      let ch = top ? 'k' : 'J';
      if (lit && !top) ch = y > foot - 3 ? 'Y' : y > foot - 8 ? 'H' : 'O';
      plot(g, x, y, ch);
    }
    // The light on the road in front.
    if (lit) plot(g, x, foot + 1, (x + 64) % 2 === 0 ? 'H' : 'O');
  }
  // The leaves: steel slabs running in from each side, a hazard stripe down the seam.
  for (const side of [-1, 1] as const) {
    for (let k = 0; k < leaf; k++) {
      const x = side < 0 ? AX - GAP + k : AX + GAP - 1 - k;
      const foot = footAt(x);
      const seam = k === leaf - 1 && leaf === GAP;
      for (let y = foot - DOOR_H + 2; y <= foot; y++) {
        const stripe = seam || k === leaf - 1;
        plot(g, x, y, stripe ? ((y + 64) % 3 === 0 ? 'k' : 'c') : side < 0 ? '2' : '1');
      }
      plot(g, x, foot - DOOR_H + 6, '1'); // a rib across each leaf
    }
  }
  // The Everglow chevron, stencilled teal on the wall's right end.
  const sx = AX + GAP + 6;
  const sy = footAt(sx) - TALL + 6;
  plot(g, sx, sy, '7');
  plot(g, sx + 2, sy + 1, '7');
  plot(g, sx + 1, sy + 1, '7');
  plot(g, sx + 1, sy + 2, '7');
  plot(g, sx + 4, sy + 2, '7');
  plot(g, sx + 3, sy + 2, '7');
  // The status lamp over the doorway, and the alarm beacon on top.
  const lampX = AX - 1;
  const lampY = footAt(lampX) - DOOR_H - 2;
  const sealed = look.startsWith('sealed');
  plot(g, lampX, lampY, look === 'open' ? '+' : sealed ? 'R' : look === 'shut' ? 'k' : 'R');
  plot(g, lampX + 1, lampY, look === 'open' ? '*' : sealed ? 'R' : look === 'shut' ? 'k' : 'R');
  // The alarm beacon: a red dome on a steel collar, dark until the SEAL.
  const bx = AX - HALF + 6;
  const by = footAt(bx) - TALL - 3;
  for (let dx = -1; dx <= 2; dx++) plot(g, bx + dx, by + 1, '1');
  for (let dx = 0; dx <= 1; dx++) {
    plot(g, bx + dx, by, alarm ? 'R' : 'Q');
    plot(g, bx + dx, by - 1, alarm ? (dx === 0 ? 'S' : 'R') : 'Q');
  }
  if (alarm) {
    // The beacon's sweep: a red flare off each side.
    plot(g, bx - 2, by, 'R');
    plot(g, bx - 3, by, 'R');
    plot(g, bx + 3, by - 1, 'R');
    plot(g, bx + 4, by - 1, 'R');
  }
  if (sealed) {
    // The seal lamp on the seam, lit red the length of a hand.
    for (let y = footAt(AX) - 9; y <= footAt(AX) - 6; y++) plot(g, AX - 1, y, 'S');
  }
  return rows(g);
}

export const propBlastDoor = defineSprite({
  id: 'prop.blast_door',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  // Ferrocrete (lit top, face, coursing), the doorway's dark, the shelter's warm light, the alarm.
  legend: {
    N: 'grime.4',
    M: 'grime.2',
    L: 'grime.1',
    J: 'ink.0',
    O: 'orange.1',
    H: 'orange.3',
    Y: 'gold.4',
    R: 'red.3',
    S: 'red.4',
    Q: 'red.0',
  },
  frames: {
    open: door('open'),
    shut: door('shut'),
    closing_0: door('closing_0'),
    closing_1: door('closing_1'),
    closing_2: door('closing_2'),
    sealed_0: door('sealed_0'),
    sealed_1: door('sealed_1'),
  },
  anims: {
    closing: { frames: ['closing_0', 'closing_1', 'closing_2', 'sealed_0'], fps: 6, loop: false },
    sealed: { frames: ['sealed_0', 'sealed_1'], fps: 2 },
  },
});
