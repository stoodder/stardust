// The Preserve's sign (`prop.preserve_sign`; A3M1 decor, act3.md § A3M1, marker `sign`): Everglow's
// "HUMANE RELOCATION PRESERVE" hung over the inner gate, where the refugee road starts. Two tall
// steel gateposts with a crossbar, and from it on two chains a white Everglow plate in a teal
// frame: the small print ("HUMANE RELOCATION") as ink lines over "PRESERVE" in the 3×5 font, and
// the gold Evie sun at its left end, chipped: the brand on a cage, in the Long Night. Everglow-owned,
// so it keeps its colours in every act (`v0`).
import { defineSprite } from '../defineSprite.ts';
import { textPixels } from '../font3x5.ts';
import { grid, line, plot, rows, type CharGrid } from '../helpers.ts';

const W = 40;
const H = 40;
/** The anchor: the tile's center, between the posts' feet. */
const AX = 20;
const AY = 35;
const POST = 30;

function sign(): string[] {
  const g: CharGrid = grid(W, H);
  // The gateposts and their shadows.
  for (const px of [AX - 18, AX + 17]) {
    plot(g, px, AY + 1, '_');
    plot(g, px + 1, AY + 1, '_');
    for (let y = AY - POST; y <= AY; y++) {
      plot(g, px, y, '3');
      plot(g, px + 1, y, '1');
    }
    plot(g, px, AY - POST - 1, 'c');
    plot(g, px + 1, AY - POST - 1, 'b');
  }
  // The crossbar.
  line(g, AX - 17, AY - POST + 1, AX + 16, AY - POST + 1, '2');
  // The chains.
  for (let y = AY - POST + 2; y <= AY - POST + 4; y++) {
    plot(g, AX - 13, y, '1');
    plot(g, AX + 12, y, '1');
  }
  // The plate: a teal frame round white.
  const top = AY - POST + 5;
  const x0 = AX - 17;
  const x1 = AX + 16;
  for (let x = x0; x <= x1; x++) {
    for (let y = top; y <= top + 12; y++) {
      const edge = x === x0 || x === x1 || y === top || y === top + 12;
      plot(g, x, y, edge ? '7' : y === top + 11 ? '3' : '4');
    }
  }
  // The small print, as ink lines.
  for (let x = x0 + 8; x <= x1 - 2; x++) {
    if ((x + 1) % 4 !== 0) plot(g, x, top + 2, '1');
  }
  // PRESERVE.
  for (const p of textPixels('PRESERVE', x0 + 1, top + 5)) {
    plot(g, p.x, p.y, '6');
  }
  // The gold Evie sun at the left, chipped.
  for (const [dx, dy] of [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [1, -1],
    [1, 2],
  ] as const) {
    plot(g, x0 + 3 + dx, top + 2 + dy, dx === 2 && dy === 1 ? '4' : 'G');
  }
  return rows(g);
}

export const propPreserveSign = defineSprite({
  id: 'prop.preserve_sign',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  legend: { G: 'gold.3' },
  frames: { v0: sign() },
});
