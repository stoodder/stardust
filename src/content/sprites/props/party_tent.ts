// The party tent (A1M5 decor beside the core, act1.md § A1M5: the Quarterly Results party): an
// Everglow marquee with a pink-and-white striped peaked roof over white walls with a teal skirt,
// its front flap tied open on a table with a gold-iced cake, an orange pennant on the peak, and a
// string of bunting from the peak to the eaves.
import { defineSprite } from '../defineSprite.ts';
import { grid, isoBox, plot, rows, stamp } from '../helpers.ts';

const W = 34;
const H = 34;
const AX = 17;
const AY = 29;
const HW = 13; // the footprint's half-width
const WALL = 8;
const PEAK_Y = 3;

type P = readonly [number, number];

/** Barycentric weights of (x, y) in triangle abc, or null outside it. */
function bary(x: number, y: number, a: P, b: P, c: P): [number, number, number] | null {
  const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  const u = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / d;
  const v = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / d;
  const w = 1 - u - v;
  return u >= 0 && v >= 0 && w >= 0 ? [u, v, w] : null;
}

function tentGrid(): string[] {
  const g = grid(W, H);
  isoBox(g, AX, AY + 1, HW + 1, 0, { top: '_', rim: '_', left: '_', right: '_' });
  isoBox(g, AX, AY, HW, WALL, { top: '4', rim: '4', left: '4', right: '2' });
  // The teal skirt along the walls' feet.
  for (let x = AX - HW; x < AX + HW; x++) {
    const y = Math.round(AY + HW / 2 - Math.abs(x + 0.5 - AX) / 2) - 1;
    plot(g, x, y, x < AX ? '8' : '7');
  }
  // The open flap on the lit wall: dark inside, a table and a gold-iced cake.
  stamp(g, AX - 9, AY - 6, ['.kkk.', 'kkkkk', 'kHGkk', 'k111k', 'k1k1k']);
  stamp(g, AX - 10, AY - 6, ['P', 'P', 'w', 'P']);
  // The roof: a pyramid from the eaves' diamond up to the peak, striped from the peak down.
  const ey = AY - WALL; // the eaves' center line
  const apex: P = [AX, PEAK_Y];
  const left: P = [AX - HW, ey];
  const right: P = [AX + HW, ey];
  const front: P = [AX, ey + HW / 2];
  const back: P = [AX, ey - HW / 2];
  const faces: readonly (readonly [P, P, boolean])[] = [
    [left, back, true],
    [back, right, false],
    [left, front, true],
    [front, right, false],
  ];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      for (const [a, b, lit] of faces) {
        const w = bary(x + 0.5, y + 0.5, apex, a, b);
        if (w === null) continue;
        // Stripes fan from the peak: the position along the eave edge picks the colour.
        const t = w[2] / Math.max(1e-6, w[1] + w[2]);
        const stripe = Math.floor(t * 5) % 2 === 0;
        const eave = w[0] < 0.08;
        plot(g, x, y, eave ? (lit ? 'Q' : '1') : stripe ? (lit ? 'P' : 'Q') : lit ? 'w' : '3');
      }
    }
  }
  // The pennant on the peak, and bunting from the peak to the eaves.
  stamp(g, AX, PEAK_Y - 3, ['1cc', '1c.', '1..']);
  for (let i = 1; i < 6; i++) {
    plot(g, AX - 2 * i - 1, PEAK_Y + 2 * i + 1, i % 2 === 0 ? 'G' : 'B');
    plot(g, AX + 2 * i + 1, PEAK_Y + 2 * i + 1, i % 2 === 0 ? 'B' : 'G');
  }
  return rows(g);
}

export const propPartyTent = defineSprite({
  id: 'prop.party_tent',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  legend: { P: 'pink.3', Q: 'pink.2', G: 'gold.3', H: 'gold.4', B: 'blue.3' },
  frames: { v0: tentGrid() },
});
