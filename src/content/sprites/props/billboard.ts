// An Evie billboard, `beaming` (art-direction §6; apron decor on Act I maps). The A1M1 board
// reads "PESTS PROCESSED THIS QUARTER: 38% MORE!"; at 1× only "38%" survives, so the rest is
// drawn as symbols: the smiling Evie sun, a rising pink bar chart, and small-print lines.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, plot, rows, stamp } from '../helpers.ts';

const W = 38;
const H = 26;
const AX = 19;
const AY = 25;
const TOP = 1;
const BOTTOM = 16;

// prettier-ignore
const DIGITS: Readonly<Record<string, readonly string[]>> = {
  '3': ['kkk', '..k', '.kk', '..k', 'kkk'],
  '8': ['kkk', 'k.k', 'kkk', 'k.k', 'kkk'],
  '%': ['k.k', '..k', '.k.', 'k..', 'k.k'],
};

function beaming(): string[] {
  const g = grid(W, H);
  // Two steel legs with a shadow at their feet.
  for (let y = BOTTOM + 1; y < AY; y++) {
    for (const x of [9, 28]) {
      plot(g, x, y, '3');
      plot(g, x + 1, y, '1');
    }
  }
  for (let x = 7; x < 32; x++) plot(g, x, AY, '_');
  // The panel: white paint in a teal frame, shaded on its lower edge.
  for (let y = TOP; y <= BOTTOM; y++) {
    for (let x = 1; x < W - 1; x++) {
      const edge = y === TOP || y === BOTTOM || x === 1 || x === W - 2;
      plot(g, x, y, edge ? (y === BOTTOM ? '6' : '8') : y === BOTTOM - 1 ? '3' : '4');
    }
  }
  // Evie: a gold sun with a smile.
  disc(g, 8, 8.5, 5, (d) => (d > 4.2 ? 'G' : d > 3.4 ? 'H' : 'I'));
  plot(g, 6, 7, 'k');
  plot(g, 9, 7, 'k');
  stamp(g, 5, 9, ['k....k', '.kkkk.']);
  // The chart: three pink bars rising to an arrow.
  const bars: readonly [number, number][] = [
    [14, 3],
    [17, 5],
    [20, 8],
  ];
  for (const [x, h] of bars) {
    for (let y = BOTTOM - 2 - h; y <= BOTTOM - 2; y++) {
      plot(g, x, y, 'P');
      plot(g, x + 1, y, 'Q');
    }
  }
  stamp(g, 21, 2, ['P', 'PP']);
  // "38%".
  let x = 25;
  for (const ch of '38%') {
    stamp(g, x, 3, DIGITS[ch] ?? []);
    x += 4;
  }
  // The small print nobody reads.
  for (const [y, len] of [
    [10, 10],
    [12, 7],
  ] as const) {
    for (let i = 0; i < len; i++) if (i % 3 !== 2) plot(g, 25 + i, y, '2');
  }
  return rows(g);
}

export const propBillboard = defineSprite({
  id: 'prop.billboard',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  legend: { G: 'gold.2', H: 'gold.3', I: 'gold.4', P: 'pink.3', Q: 'pink.2' },
  frames: { beaming: beaming() },
});
