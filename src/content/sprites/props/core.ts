// The colony core (the lose condition): an Everglow perimeter beacon with a glowing teal heart.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, isoBox, plot, rows, stamp } from '../helpers.ts';

const W = 28;
const H = 40;
const CX = 14;
const FOOT_Y = 33; // footprint center (the anchor)

function coreGrid(pulse: boolean): string[] {
  const g = grid(W, H);
  // Ground shadow, then a two-step plinth.
  isoBox(g, CX, FOOT_Y + 1, 13, 0, { top: '_', rim: '_', left: '_', right: '_' });
  isoBox(g, CX, FOOT_Y, 12, 3, { top: '2', rim: '3', left: '1', right: '0' });
  isoBox(g, CX, FOOT_Y - 3, 8, 2, { top: '4', rim: '4', left: '3', right: '1' });
  // The pylon: white paint, lit from the left.
  for (let y = 13; y <= FOOT_Y - 5; y++) {
    for (let x = CX - 4; x < CX + 4; x++) {
      const col = x - (CX - 4);
      plot(g, x, y, col === 0 ? '3' : col < 4 ? '4' : col < 7 ? '2' : '1');
    }
  }
  // Teal band with the Everglow chevron, and an orange safety stripe.
  for (let x = CX - 4; x < CX + 4; x++) plot(g, x, 20, x < CX + 1 ? '8' : '7');
  // prettier-ignore
  stamp(g, CX - 2, 23, [
    '8...8',
    '.8.8.',
    '..8..',
  ]);
  for (let x = CX - 4; x < CX + 4; x++) plot(g, x, 27, (x & 1) === 0 ? 'c' : 'd');
  // Cradle prongs hugging the heart.
  for (let y = 7; y <= 13; y++) {
    plot(g, CX - 7 + (y > 11 ? y - 11 : 0), y, '3');
    plot(g, CX + 6 - (y > 11 ? y - 11 : 0), y, '1');
  }
  // The glowing heart.
  disc(g, CX, 8.5, pulse ? 5.2 : 4.8, (d) => (d < 1.6 ? '*' : d < 3 ? '+' : d < 4.2 ? '8' : '7'));
  plot(g, CX - 2, 6, 'w');
  plot(g, CX - 1, 6, '9');
  return rows(g);
}

export const propCore = defineSprite({
  id: 'prop.core',
  size: { w: W, h: H },
  anchor: { x: CX, y: FOOT_Y },
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 2 },
  frames: { idle_0: coreGrid(false), idle_1: coreGrid(true) },
  anims: { idle: { frames: ['idle_0', 'idle_1'], fps: 2 } },
});
