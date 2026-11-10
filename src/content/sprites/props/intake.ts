// Intake B (`prop.intake`; A2M4 decor, act2.md § A2M4, marker `intake_b`): the plant's receiving
// bay, where the Tidybots unload after every wave, in full view. A steel intake hopper on four legs
// over a dock slab: a wide square funnel, its mouth ringed in hazard stripes and dark inside,
// narrowing to a chute that drops into a conveyor housing (an Everglow teal band, a teal status
// light). A sign on a post at its front corner says what it is in a big orange stencilled "B".
// Plant hardware, so it keeps Everglow's colours in every act, a step under the units' values;
// T530b flies the Tidybots over its mouth (`prop.tidybot`'s `unload`). One frame, `v0`.
import { defineSprite } from '../defineSprite.ts';
import { grid, isoBox, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 34;
const H = 40;
const CX = 17;
/** The footprint center (the anchor). */
const FOOT_Y = 33;

/** True when the pixel center lies in the iso diamond of half-width `hw` round (cx, cy). */
function inDiamond(x: number, y: number, cx: number, cy: number, hw: number): boolean {
  return Math.abs(x + 0.5 - cx) / hw + Math.abs(y + 0.5 - cy) / (hw / 2) <= 1;
}

/** The hopper: a square funnel from half-width 4 at its neck to 12 at its mouth, 9 px tall. */
function hopper(g: CharGrid, cy: number): void {
  const tall = 9;
  for (let z = 0; z <= tall; z++) {
    const hw = 4 + (8 * z) / tall;
    const yc = cy - z;
    for (let y = Math.floor(yc - hw / 2) - 1; y <= Math.ceil(yc + hw / 2) + 1; y++) {
      for (let x = Math.floor(CX - hw) - 1; x <= Math.ceil(CX + hw) + 1; x++) {
        if (!inDiamond(x, y, CX, yc, hw)) continue;
        // Side faces, lit left and shaded right, with a seam down the front corner.
        let ch = x + 0.5 < CX ? 'D' : 'C';
        if (Math.abs(x + 0.5 - CX) < 1) ch = 'A';
        if (z === tall) {
          // The mouth: hazard-striped rim round a dark throat.
          const inner = inDiamond(x, y, CX, yc, hw - 2.5);
          ch = inner
            ? inDiamond(x, y, CX, yc + 1, hw - 4)
              ? 'K'
              : 'J'
            : (x + y) % 4 < 2
              ? 'O'
              : 'K';
        }
        plot(g, x, y, ch);
      }
    }
  }
}

function intakeGrid(): string[] {
  const g = grid(W, H);
  isoBox(g, CX, FOOT_Y + 1, 15, 0, { top: '_', rim: '_', left: '_', right: '_' });
  // The dock slab, and the conveyor housing on it under the chute.
  isoBox(g, CX, FOOT_Y, 14, 2, { top: 'B', rim: 'C', left: 'B', right: 'A' });
  isoBox(g, CX, FOOT_Y - 2, 6, 5, { top: 'C', rim: 'D', left: 'C', right: 'B' });
  for (let x = CX - 6; x < CX + 6; x++) {
    const y = FOOT_Y - 2 - 5 + Math.round(Math.abs(x + 0.5 - CX) / 2);
    plot(g, x, y + 3, x < CX ? '7' : '6');
  }
  plot(g, CX + 3, FOOT_Y - 3, '+');
  // The legs: front, left, and right corners of the hopper down to the slab.
  for (let y = FOOT_Y - 14; y <= FOOT_Y - 1; y++) {
    plot(g, CX - 10, y, 'C');
    plot(g, CX + 9, y, 'A');
  }
  line(g, CX - 10, FOOT_Y - 9, CX - 6, FOOT_Y - 7, 'B');
  line(g, CX + 9, FOOT_Y - 9, CX + 5, FOOT_Y - 7, 'A');
  // The chute: the hopper's neck down into the housing.
  for (let y = FOOT_Y - 12; y <= FOOT_Y - 7; y++) {
    plot(g, CX - 1, y, 'C');
    plot(g, CX, y, 'B');
  }
  hopper(g, FOOT_Y - 14);
  // The sign: a post at the front-left corner, a white plate with an orange stencilled "B".
  for (let y = FOOT_Y - 10; y <= FOOT_Y + 1; y++) plot(g, CX - 13, y, 'B');
  // prettier-ignore
  stamp(g, CX - 16, FOOT_Y - 17, [
    'EEEEEEE',
    'EEccEEE',
    'EEcEcEE',
    'EEccEEE',
    'EEcEcEE',
    'EEccEEE',
    'DDDDDDD',
  ]);
  return rows(g);
}

export const propIntake = defineSprite({
  id: 'prop.intake',
  size: { w: W, h: H },
  anchor: { x: CX, y: FOOT_Y },
  palette: 'everglow',
  outline: 'auto',
  legend: {
    A: 'steel.0',
    B: 'steel.1',
    C: 'steel.2',
    D: 'steel.3',
    E: 'white.0',
    J: 'ink.2',
    K: 'ink.1',
    O: 'orange.2',
  },
  frames: { v0: intakeGrid() },
});
