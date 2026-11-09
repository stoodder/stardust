// Extraction Rig 3 (A1M2 decor, act1.md § A1M2): an Everglow pump rig on a steel plinth. An
// open lattice derrick with a teal beacon (open, so the road behind it still shows through),
// a white pump house with a big orange "3" stencilled on its lit face, and a little heap of
// drill spoil whose flecks are cold violet (art-direction §1 principle 6: drill spoil is unsung).
// QUILL's "(Per policy.)" build site sits beside it.
import { defineSprite } from '../defineSprite.ts';
import { grid, isoBox, line, plot, rows, stamp } from '../helpers.ts';

const W = 30;
const H = 44;
const CX = 15;
const FOOT_Y = 37; // footprint center (the anchor)

function rigGrid(): string[] {
  const g = grid(W, H);
  // Ground shadow and the steel plinth.
  isoBox(g, CX, FOOT_Y + 1, 14, 0, { top: '_', rim: '_', left: '_', right: '_' });
  isoBox(g, CX, FOOT_Y, 12, 2, { top: '2', rim: '3', left: '1', right: '0' });
  // The derrick: two legs leaning in to a crown, lit left and shaded right, braced in X's.
  const base = FOOT_Y - 4;
  const top = 8;
  const legAt = (y: number, side: -1 | 1): number => {
    const t = (base - y) / (base - top);
    return Math.round(CX + side * (8 - 6 * t)) - (side > 0 ? 1 : 0);
  };
  for (let y = top; y <= base; y++) {
    plot(g, legAt(y, -1), y, '3');
    plot(g, legAt(y, 1), y, '1');
  }
  for (let y = top + 2; y + 6 <= base; y += 6) {
    line(g, legAt(y, -1) + 1, y, legAt(y + 6, 1) - 1, y + 6, '2');
    line(g, legAt(y, 1) - 1, y, legAt(y + 6, -1) + 1, y + 6, '2');
    for (let x = legAt(y, -1) + 1; x < legAt(y, 1); x++) plot(g, x, y, '1');
  }
  // The drill string down the middle, and the crown block with its safety band and beacon.
  for (let y = top + 1; y <= base + 1; y++) plot(g, CX - 1, y, y % 3 === 0 ? '0' : '2');
  stamp(g, CX - 3, top - 2, ['.4443.', '4dcdc1', '332211']);
  stamp(g, CX - 2, top - 5, ['.+.', '+*+', '.+.']);
  // The pump house, front right, in white Everglow paint with a teal band.
  const hx = CX + 5;
  const hy = FOOT_Y - 1;
  isoBox(g, hx, hy, 6, 8, { top: '4', rim: 'w', left: '4', right: '3' });
  for (let x = hx - 6; x < hx + 6; x++) {
    const y = hy - 8 + Math.round(Math.abs(x + 0.5 - hx) / 2);
    plot(g, x, y + 2, x < hx ? '8' : '7');
  }
  // prettier-ignore
  stamp(g, hx - 5, hy - 4, [
    'dd.',
    '..d',
    '.dd',
    '..d',
    'dd.',
  ]);
  plot(g, hx + 2, hy - 3, '+'); // a status light on the shaded face
  // A pipe from the pump house to the drill string.
  for (let x = CX; x < hx - 6; x++) plot(g, x, hy - 5, '3');
  // The spoil heap, front left: grey drill tailings with two cold violet flecks.
  // prettier-ignore
  stamp(g, CX - 11, FOOT_Y - 3, [
    '..NN...',
    '.NNNM..',
    'NNMMMM.',
    '_MMMM__',
  ]);
  plot(g, CX - 9, FOOT_Y - 2, 'V');
  plot(g, CX - 7, FOOT_Y - 1, 'U');
  return rows(g);
}

export const propRig = defineSprite({
  id: 'prop.rig',
  size: { w: W, h: H },
  anchor: { x: CX, y: FOOT_Y },
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { M: 'grime.2', N: 'grime.3', U: 'violet.3', V: 'violet.4' },
  frames: { v0: rigGrid() },
});
