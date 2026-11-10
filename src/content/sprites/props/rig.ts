// Extraction Rig 3 (A1M2 decor, act1.md § A1M2): an Everglow pump rig on a steel plinth. An
// open lattice derrick with a teal beacon (open, so the road behind it still shows through),
// a white pump house with a big orange "3" stencilled on its lit face, and a little heap of
// drill spoil whose flecks are cold violet (art-direction §1 principle 6: drill spoil is unsung).
// QUILL's "(Per policy.)" build site sits beside it. Act II's frames: `strip` (Rig 3 working
// A2M3's strip mine: its beacon hazard orange, the spoil heaped high, an ore skip loaded with cold
// violet) and `nine` (A2M1's Rig Nine head frame over the bore mouth: dead beacon and status light,
// a "9", grime run down the pump house, its spoil a cold violet drift with motes adrift).
import { defineSprite } from '../defineSprite.ts';
import { grid, isoBox, line, plot, rows, stamp } from '../helpers.ts';

const W = 30;
const H = 44;
const CX = 15;
const FOOT_Y = 37; // footprint center (the anchor)

/** Which rig: A1M2's Rig 3, Rig 3 working A2M3's strip mine, or A2M1's dead Rig Nine. */
type RigLook = 'v0' | 'strip' | 'nine';

// prettier-ignore
const DIGIT: Readonly<Record<RigLook, readonly string[]>> = {
  v0: ['dd.', '..d', '.dd', '..d', 'dd.'],
  strip: ['dd.', '..d', '.dd', '..d', 'dd.'],
  nine: ['.d.', 'd.d', '.dd', '..d', 'dd.'],
};

function rigGrid(look: RigLook = 'v0'): string[] {
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
  // Its beacon: teal while it pumps, hazard orange working the strip mine, dead on Rig Nine.
  if (look === 'v0') stamp(g, CX - 2, top - 5, ['.+.', '+*+', '.+.']);
  else if (look === 'strip') stamp(g, CX - 2, top - 5, ['.c.', 'cdc', '.c.']);
  else stamp(g, CX - 2, top - 5, ['.K.', 'KJK', '.K.']);
  // The pump house, front right, in white Everglow paint with a teal band.
  const hx = CX + 5;
  const hy = FOOT_Y - 1;
  isoBox(g, hx, hy, 6, 8, { top: '4', rim: 'w', left: '4', right: '3' });
  for (let x = hx - 6; x < hx + 6; x++) {
    const y = hy - 8 + Math.round(Math.abs(x + 0.5 - hx) / 2);
    plot(g, x, y + 2, x < hx ? '8' : '7');
  }
  stamp(g, hx - 5, hy - 4, DIGIT[look]);
  plot(g, hx + 2, hy - 3, look === 'nine' ? 'K' : '+'); // a status light on the shaded face
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
  if (look === 'strip') {
    // Working the strip mine: the spoil heaped high, and an ore skip loaded with cold violet.
    // prettier-ignore
    stamp(g, CX - 13, FOOT_Y - 7, [
      '...NN...',
      '..NNNM..',
      '.NNMVMM.',
      'NNMMMMU.',
    ]);
    isoBox(g, CX + 9, FOOT_Y + 3, 4, 3, { top: 'U', rim: 'V', left: 'c', right: 'b' });
  } else if (look === 'nine') {
    // Rig Nine, dead: grime run down the pump house, the spoil a cold violet drift, a mote adrift.
    for (const x of [hx - 4, hx - 1, hx + 3]) {
      for (let y = hy - 7; y < hy - 2; y++) if ((x + y) % 2 === 0) plot(g, x, y, 'N');
    }
    // prettier-ignore
    stamp(g, CX - 13, FOOT_Y - 5, [
      '..UNN..',
      '.NUVUM.',
      'NUMUUMM',
    ]);
    plot(g, CX - 6, FOOT_Y - 12, 'V');
    plot(g, CX - 4, FOOT_Y - 16, 'U');
  }
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
  legend: { M: 'grime.2', N: 'grime.3', U: 'violet.3', V: 'violet.4', K: 'ink.2', J: 'steel.1' },
  frames: { v0: rigGrid('v0'), strip: rigGrid('strip'), nine: rigGrid('nine') },
});
