// The fallen mailbox (A1M3 decor, act1.md § A1M3: "The Peeker's rock is behind a fallen
// mailbox"): an Everglow post box knocked flat beside the mail road, Gerald's livery (white with
// a teal band and chevron), its door sprung open on the lit end with letters spilled on the grass,
// the orange flag still up out of habit, and the bent post stub it snapped off.
import { defineSprite } from '../defineSprite.ts';
import { grid, line, plot, rows, stamp } from '../helpers.ts';

const W = 24;
const H = 16;
/** The prism's back-left bottom corner (pixel edges): the box lies along the grid's x axis. */
const OX = 5;
const OY = 6;
const L = 7; // length along grid x, in half-steps (2 px across, 1 px down each)
const B = 3; // depth along grid y
const Z = 6; // height
const AX = 12;
const AY = 12;

/** Which face of the lying box pixel (x, y) shows: its top, long side, or end, with coordinates. */
function face(x: number, y: number): { f: 'top' | 'side' | 'end'; a: number; b: number; z: number } | null {
  const px = x + 0.5 - OX;
  const py = y + 0.5 - OY;
  // Top: py + Z = a + b, px = 2a − 2b.
  {
    const a = (px / 2 + py + Z) / 2;
    const b = (py + Z - px / 2) / 2;
    if (a >= 0 && a <= L && b >= 0 && b <= B) return { f: 'top', a, b, z: Z };
  }
  // The long side facing the viewer's left (b = B).
  {
    const a = (px + 2 * B) / 2;
    const z = a + B - py;
    if (a >= 0 && a <= L && z >= 0 && z <= Z) return { f: 'side', a, b: B, z };
  }
  // The end facing the viewer's right (a = L).
  {
    const b = (2 * L - px) / 2;
    const z = L + b - py;
    if (b >= 0 && b <= B && z >= 0 && z <= Z) return { f: 'end', a: L, b, z };
  }
  return null;
}

function mailboxGrid(): string[] {
  const g = grid(W, H);
  // Its shadow on the grass.
  for (let x = 2; x < 22; x++) {
    const y = Math.round(OY + (x - OX) / 2 + 2);
    if (y >= 0 && y < H) plot(g, x, y, '_');
    if (y + 1 < H && x > 3 && x < 20) plot(g, x, y + 1, '_');
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const f = face(x, y);
      if (f === null) continue;
      const band = Math.abs(f.a - L * 0.45) < 0.6; // the teal band around its middle
      let ch: string;
      if (f.f === 'top') ch = band ? '8' : f.b < 0.6 || f.a < 0.5 ? 'w' : '4';
      else if (f.f === 'side') ch = band ? '7' : f.z < 1 ? '1' : f.z > Z - 1 ? '4' : '3';
      else ch = f.b > 0.6 && f.b < B - 0.6 && f.z > 1 && f.z < Z - 1 ? 'k' : '1'; // the sprung door's dark mouth
      plot(g, x, y, ch);
    }
  }
  // The Everglow chevron on the long side.
  stamp(g, 6, 9, ['8.8', '.8.']);
  // The door, swung open off the end, and letters spilled on the grass (one with a blue stamp).
  stamp(g, 21, 7, ['3', '3', '2', '1']);
  stamp(g, 17, 13, ['www', 'w3B']);
  stamp(g, 20, 11, ['ww', '3w']);
  // The orange flag, still up out of habit, and the snapped post stub behind.
  line(g, 9, 3, 9, 0, '1');
  stamp(g, 10, 0, ['cc', 'd.']);
  stamp(g, 2, 6, ['2', '1', '0']);
  return rows(g);
}

export const propMailbox = defineSprite({
  id: 'prop.mailbox',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  legend: { B: 'blue.3' },
  frames: { v0: mailboxGrid() },
});
