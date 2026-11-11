// HE HELD THE DOOR (`prop.held_door`; A3M4 decor under `door_choice = convoy`, act3.md § A3M4,
// marker `held_door`, gated by `markerWhen`): the colonists brought one leaf of the Gap's blast
// door (A3M3, `prop.blast_door`) down into the Shelters and stood it upright by the hall, for
// Bricks. A steel door leaf on a ferrocrete block, dented, its hazard stripe still down its seam
// edge, and across its face in hand-painted white, a little uneven, the paint run in drips: HE HELD /
// THE DOOR (the 3×5 font). At its foot what people left: three candles, a head of lettuce, and a
// white hard hat with a teal stripe. Frames `v0`/`v1` (anim `flicker`, 3 fps): the candle flames
// trade. Drawn in `everglow.jailbroken` so its emissive slots burn warm orange (the flames' baked
// glow) while the steel stays worn Everglow kit.
import { defineSprite } from '../defineSprite.ts';
import { textPixels } from '../font3x5.ts';
import { grid, isoBox, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 46;
const H = 44;
/** The anchor: the block's foot, under the door's middle. */
const AX = 22;
const AY = 39;
/** The leaf's face: left and right columns, top and bottom rows. */
const L = 5;
const R = 39;
const TOP = 4;
const BOT = 33;
/** The leaf's thickness, seen up and to the right of its face. */
const DEPTH = 3;

function heldDoor(k: 0 | 1): string[] {
  const g: CharGrid = grid(W, H);
  // The ferrocrete block it stands in, and its shadow.
  isoBox(g, AX, AY + 1, 21, 0, { top: '_', rim: '_', left: '_', right: '_' });
  isoBox(g, AX, AY, 20, 3, { top: 'M', rim: 'N', left: 'L', right: 'J' });
  // The leaf's edge (its thickness), in shade, then its face: worn steel, lit from the left, two
  // ribs across it and a dent.
  for (let d = 1; d <= DEPTH; d++) line(g, R + d, TOP - d, R + d, BOT - d, '0');
  line(g, L + 1, TOP - 1, R + 1, TOP - 1, '3');
  line(g, L + 2, TOP - 2, R + 2, TOP - 2, '2');
  line(g, L + 3, TOP - 3, R + 3, TOP - 3, '3');
  for (let y = TOP; y <= BOT; y++) {
    for (let x = L; x <= R; x++) {
      const rib = y === TOP + 12 || y === TOP + 22;
      plot(g, x, y, x === L ? '3' : rib ? '1' : x < L + 10 ? '2' : '1');
    }
  }
  stamp(g, R - 9, TOP + 23, ['.00.', '0110', '.00.']);
  // The hazard stripe down its seam edge (the edge that met the other leaf).
  for (let y = TOP; y <= BOT; y++) {
    for (const x of [R - 1, R]) plot(g, x, y, Math.floor((y + x + 64) / 2) % 2 === 0 ? 'c' : 'k');
  }
  // The words, painted by hand: white, each line a pixel off level, a drip under some letters.
  const paint = (text: string, x: number, y: number): void => {
    for (const p of textPixels(text, x, y)) plot(g, p.x, p.y + (p.x > x + 14 ? 1 : 0), 'W');
  };
  paint('HE HELD', L + 4, TOP + 4);
  paint('THE DOOR', L + 2, TOP + 15);
  for (const [x, y, n] of [
    [L + 5, TOP + 9, 2],
    [L + 17, TOP + 10, 1],
    [L + 12, TOP + 20, 2],
    [L + 27, TOP + 21, 1],
  ] as const) {
    for (let i = 0; i < n; i++) plot(g, x, y + i, 'V');
  }
  // At its foot: three candles (their flames trading), a head of lettuce, his hard hat.
  const flames: readonly (readonly [number, number])[] = [
    [L + 2, AY - 5],
    [L + 6, AY - 4],
    [R - 4, AY - 4],
  ];
  flames.forEach(([x, y], i) => {
    plot(g, x, y, 'W');
    plot(g, x, y + 1, 'W');
    const tall = (i + k) % 2 === 0;
    plot(g, x, y - 1, tall ? '*' : '+');
    if (tall) plot(g, x, y - 2, '+');
  });
  stamp(g, L + 10, AY - 6, ['.GH.', 'GHGH', '.GG.']);
  stamp(g, R - 13, AY - 7, ['.WWW.', 'W77WW', '33333']);
  return rows(g);
}

export const propHeldDoor = defineSprite({
  id: 'prop.held_door',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow.jailbroken',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 2 },
  legend: {
    // Ferrocrete (lit top, rim, faces), the paint and its drips, the lettuce.
    N: 'grime.4',
    M: 'grime.3',
    L: 'grime.2',
    J: 'grime.1',
    W: 'white.0',
    V: 'steel.4',
    G: 'green.2',
    H: 'green.3',
  },
  frames: { v0: heldDoor(0), v1: heldDoor(1) },
  anims: { flicker: { frames: ['v0', 'v1'], fps: 3 } },
});
