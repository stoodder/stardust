// The Terrace 2 scarecrow (A1M2 decor, act1.md § A1M2; the Joke of the Shift): out there since
// 2349, outstanding in his field. A burlap head with button eyes and a stitched smile under a
// faded Everglow cap; a faded blue plaid shirt on the crossbar (cool, so he never reads as a
// Skitterkin at a glance) with straw at the cuffs and hem; his gold Employee of the Month badge;
// and a small bird sitting on his arm, entirely unbothered.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, isoBox, plot, rows, stamp } from '../helpers.ts';

const W = 20;
const H = 30;
const CX = 10;
const FOOT_Y = 27; // the pole's foot (the anchor)

function scarecrowGrid(): string[] {
  const g = grid(W, H);
  isoBox(g, CX, FOOT_Y + 1, 4, 0, { top: '_', rim: '_', left: '_', right: '_' });
  // The pole, lit on its left.
  for (let y = 10; y <= FOOT_Y; y++) {
    plot(g, CX - 1, y, 'N');
    plot(g, CX, y, 'M');
  }
  // The crossbar, then the shirt over it: faded blue plaid, a pink patch, straw at the cuffs.
  for (let x = CX - 8; x <= CX + 7; x++) plot(g, x, 13, 'M');
  for (let y = 12; y <= 21; y++) {
    const half = y <= 14 ? 7 : 4;
    for (let x = CX - half; x < CX + half; x++) {
      const check = ((x >> 1) + (y >> 1)) % 2 === 0;
      const shade = x >= CX + 1 || y === 21;
      plot(g, x, y, shade ? (check ? 'A' : 'B') : check ? 'B' : 'C');
    }
  }
  stamp(g, CX + 1, 17, ['PP', 'PO']);
  stamp(g, CX - 9, 12, ['Y.', 'ZY', 'Y.']);
  stamp(g, CX + 7, 12, ['.Y', 'YZ', '.Y']);
  stamp(g, CX - 4, 22, ['Y.ZY.Y.Z']);
  // Employee of the Month: a gold badge with a glint and pink ribbon tails.
  stamp(g, CX - 4, 15, ['wY', 'YZ', 'P.', '.P']);
  // The head: a burlap sack, button eyes, a stitched smile.
  disc(g, CX, 8.5, 3.6, (d, x, y) => (d > 2.8 && x >= CX ? 'M' : x + y < CX + 6 ? 'H' : 'N'));
  plot(g, CX - 2, 8, 'k');
  plot(g, CX + 1, 8, 'k');
  stamp(g, CX - 2, 10, ['k..k', '.kk.']);
  // The faded Everglow cap: a teal crown with its logo pixel and a brim to the right.
  // prettier-ignore
  stamp(g, CX - 4, 3, [
    '..7777..',
    '.778777.',
    '67777766',
    '.......66',
  ]);
  plot(g, CX - 1, 4, '4');
  // The bird on his right arm, facing him: ink body, an orange beak, perfectly at ease.
  stamp(g, CX + 4, 9, ['RQQ.', '.QQQ', '..Q.']);
  return rows(g);
}

export const propScarecrow = defineSprite({
  id: 'prop.scarecrow',
  size: { w: W, h: H },
  anchor: { x: CX, y: FOOT_Y },
  palette: 'everglow',
  outline: 'auto',
  legend: {
    H: 'grime.4',
    N: 'grime.3',
    M: 'grime.2',
    Y: 'gold.3',
    Z: 'gold.2',
    P: 'pink.3',
    O: 'pink.2',
    A: 'blue.1',
    B: 'steel.1',
    C: 'blue.2',
    Q: 'ink.4',
    R: 'orange.3',
  },
  frames: { v0: scarecrowGrid() },
});
