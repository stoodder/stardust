// The Rig Nine crew's hut (`prop.crew_hut`; A2M1 decor, act2.md § A2M1, bible.md § The Hollow): a
// grimy Everglow prefab beside the bore road, its window dark and its door ajar, and on a plank
// bench in front of it the hushed crew: three miners in orange coveralls and white hard hats,
// sitting in a row with their hands on their knees, staring at nothing. Their faces are blank
// (two dot eyes, no mouths), they never move, and a cold violet mote drifts by them (the Hollow
// touched them). Alive, unharmed, unreachable: nothing in play can reach them. One untouched mug
// on the bench. Colors are fixed (Everglow paint, the crew's skin and coveralls), in every act.
import { defineSprite } from '../defineSprite.ts';
import { grid, isoBox, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 38;
const H = 34;
const CX = 20;
const FOOT_Y = 27; // the footprint's center (the anchor)

/** A seated, hushed miner: a hard hat, a blank face, orange coveralls, hands on the knees. */
function miner(g: CharGrid, x: number, y: number, skin: readonly [string, string]): void {
  const [lit, dark] = skin;
  // prettier-ignore
  stamp(g, x, y, [
    '.www.',
    '44443',
    `.${lit}${lit}${dark}.`,
    `.k${lit}k.`,
    `.${lit}${dark}${dark}.`,
    'OOOOQ',
    'OOOOQ',
    `O${lit}OO${dark}`,
    'QQ.QQ',
    'Q...Q',
  ]);
}

function hutGrid(): string[] {
  const g = grid(W, H);
  isoBox(g, CX, FOOT_Y + 1, 16, 0, { top: '_', rim: '_', left: '_', right: '_' });
  // The prefab: grimy white walls, a dark window and a door left ajar, a teal band, a flat roof.
  const hx = CX + 3;
  const hy = FOOT_Y - 4;
  isoBox(g, hx, hy, 11, 13, { top: '3', rim: '4', left: 'G', right: 'F' });
  for (let x = hx - 11; x < hx + 11; x++) {
    const y = hy - 13 + Math.round(Math.abs(x + 0.5 - hx) / 2);
    plot(g, x, y + 4, x < hx ? '8' : '7');
  }
  // prettier-ignore
  stamp(g, hx - 8, hy - 6, [
    'KKK',
    'KJK',
    'KKK',
  ]);
  // prettier-ignore
  stamp(g, hx + 4, hy - 7, [
    'KKK',
    'KKK',
    'KKJ',
    'KKJ',
    'KKJ',
  ]);
  plot(g, hx + 3, hy - 7, '1'); // the door, swung in
  // Grime streaks running down the walls from the roof.
  for (const x of [hx - 10, hx - 5, hx + 8]) {
    for (let y = hy - 9; y < hy - 4; y++) if ((x + y) % 3 !== 0) plot(g, x, y, 'F');
  }
  // The bench: a plank on two trestles in front of the hut.
  for (let x = CX - 17; x <= CX + 2; x++) plot(g, x, FOOT_Y - 1, 'B');
  for (let x = CX - 17; x <= CX + 2; x++) plot(g, x, FOOT_Y, 'A');
  for (const x of [CX - 16, CX + 1]) stamp(g, x, FOOT_Y + 1, ['A', 'A']);
  // The hushed crew, in a row a little apart, staring out at nothing.
  miner(g, CX - 17, FOOT_Y - 8, ['S', 'T']);
  miner(g, CX - 11, FOOT_Y - 8, ['U', 'V']);
  miner(g, CX - 5, FOOT_Y - 8, ['X', 'Y']);
  // An untouched mug on the bench's end, and a cold violet mote drifting past them.
  stamp(g, CX + 1, FOOT_Y - 3, ['44', '43']);
  plot(g, CX - 12, FOOT_Y - 11, 'P');
  plot(g, CX - 13, FOOT_Y - 12, 'Z');
  return rows(g);
}

export const propCrewHut = defineSprite({
  id: 'prop.crew_hut',
  size: { w: W, h: H },
  anchor: { x: CX, y: FOOT_Y },
  palette: 'everglow',
  outline: 'auto',
  legend: {
    // Grime-streaked walls, a dark window and doorway with a glint of the empty room.
    G: 'grime.4',
    F: 'grime.3',
    K: 'ink.2',
    J: 'ink.4',
    A: 'brass.1',
    B: 'brass.2',
    // The coveralls: Everglow mining orange, shaded.
    O: 'orange.2',
    Q: 'orange.1',
    // The crew's skin, three tones (lit and shaded).
    S: 'skin.a.3',
    T: 'skin.a.2',
    U: 'skin.b.3',
    V: 'skin.b.2',
    X: 'skin.c.3',
    Y: 'skin.c.2',
    // The mote: cold violet (unsung).
    P: 'violet.3',
    Z: 'violet.4',
  },
  frames: { v0: hutGrid() },
});
