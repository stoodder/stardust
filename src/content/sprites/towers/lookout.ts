// Lookout Shack (`lookout`): Vrell scrap, "Zibzab's Genuine Pre-Owned" (design/towers.md § Vrell
// towers). No gun: a little lean-to shack of rusted corrugated sheet under a patina roof, a lit
// window, a door, a patina ear trumpet out of its side (the Vrell hear everything; races.md), and
// on the roof a big brass spyglass on a swivel with a `green.4` lens glint (detection's green,
// art-direction §8 *Revealed*). It doesn't aim: its idle `look` sweeps the spyglass left, then
// right (4 frames). It stands on the patched Vrell base (towers/vrellBase.ts), whose pods and rod
// tell its tier. The tier-4 specs: **Crow's Nest** (`spec_a`) raises a tall scaffold mast with a
// barrel nest and a pennant on the base and a longer telescope on the roof; **Overclock Rig**
// (`spec_b`) bolts a flywheel and a hot exhaust stack to the base and a chimney and a pressure
// gauge in the red to the shack. Spec heads are their own idle anims (`look_spec_a`/`_b`).
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, isoBox, line, plot, rows, type CharGrid } from '../helpers.ts';
import { BASE_ANCHOR, BASE_H, BASE_MOUNT, BASE_W } from './base.ts';
import { VRELL_BASE_LEGEND, vrellBase, vrellSpecBase } from './vrellBase.ts';

const W = 28;
const H = 32;
const CX = 13;
const CY = 29;

type Kit = 't1' | 'nest' | 'rig';

/** The spyglass's sweep: four screen directions (left and up, left, right, right and up). */
const SWEEP: readonly (readonly [number, number])[] = [
  [-1, -0.45],
  [-1, 0.1],
  [1, 0.1],
  [1, -0.45],
];

/** The hut's floor, raised on stilts above the plinth. */
const FLOOR = CY - 6;

function shack(g: CharGrid, kit: Kit): void {
  // Brass stilts at the footprint's corners, X-braced, so the hut stands up off the plinth.
  for (const [x, lit] of [
    [CX - 5, '4'],
    [CX + 4, '1'],
    [CX - 1, '3'],
  ] as const) {
    const foot = x === CX - 1 ? CY + 2 : CY;
    line(g, x, FLOOR, x, foot, lit);
    line(g, x + 1, FLOOR, x + 1, foot, x === CX + 4 ? '0' : '2');
  }
  line(g, CX - 4, FLOOR + 1, CX - 2, CY + 1, '2');
  line(g, CX - 2, FLOOR + 1, CX - 4, CY, '1');
  line(g, CX + 1, FLOOR + 2, CX + 3, CY, '1');
  // The hut: rust plank walls, lit left, shaded right, each plank a darker seam below it.
  isoBox(g, CX, FLOOR, 6.5, 7, { top: '7', rim: '7', left: '7', right: '6' });
  for (let y = FLOOR - 10; y <= FLOOR + 4; y++) {
    for (let x = CX - 7; x <= CX + 7; x++) {
      const c = g[y]?.[x];
      const seam = (y - FLOOR + Math.floor(Math.abs(x + 0.5 - CX) / 2) + 40) % 3 === 0;
      if (!seam) continue;
      if (c === '7') plot(g, x, y, '6');
      else if (c === '6') plot(g, x, y, '5');
    }
  }
  // The window on the lit wall: a brass frame round a warm lamp; a patch plate on the shaded one.
  for (const [x, y, c] of [
    [CX - 5, FLOOR - 5, '3'],
    [CX - 4, FLOOR - 5, '3'],
    [CX - 3, FLOOR - 4, '3'],
    [CX - 2, FLOOR - 4, '3'],
    [CX - 5, FLOOR - 4, '3'],
    [CX - 4, FLOOR - 4, '*'],
    [CX - 3, FLOOR - 3, '+'],
    [CX - 2, FLOOR - 3, '3'],
    [CX - 5, FLOOR - 3, '3'],
    [CX - 4, FLOOR - 3, '+'],
    [CX - 3, FLOOR - 2, '3'],
    [CX - 2, FLOOR - 2, '3'],
  ] as const)
    plot(g, x, y, c);
  for (let y = FLOOR - 4; y <= FLOOR - 2; y++) {
    for (let x = CX + 2; x <= CX + 4; x++) plot(g, x, y - Math.floor((x - CX) / 2), 'b');
  }
  plot(g, CX + 2, FLOOR - 4, '3');
  // A hipped roof of patina sheet, stepping in to a peak, overhanging the walls.
  for (const [hw, dy] of [
    [8, 7],
    [6, 8],
    [4, 9],
    [2, 10],
  ] as const) {
    isoBox(g, CX, FLOOR - dy, hw, 1, { top: 'c', rim: 'd', left: 'd', right: 'b' });
  }
  // The ear trumpet off the shaded wall: a patina pipe up to a horn bell open to the road.
  line(g, CX + 6, FLOOR - 3, CX + 8, FLOOR - 4, 'b');
  for (const [x, y, c] of [
    [CX + 9, FLOOR - 7, 'e'],
    [CX + 10, FLOOR - 7, 'd'],
    [CX + 11, FLOOR - 6, 'd'],
    [CX + 9, FLOOR - 6, 'k'],
    [CX + 10, FLOOR - 6, 'k'],
    [CX + 9, FLOOR - 5, 'c'],
    [CX + 10, FLOOR - 5, 'k'],
    [CX + 11, FLOOR - 5, 'c'],
    [CX + 8, FLOOR - 5, 'c'],
    [CX + 9, FLOOR - 4, 'b'],
    [CX + 10, FLOOR - 4, 'b'],
  ] as const)
    plot(g, x, y, c);
  if (kit === 'rig') {
    // A chimney through the roof's back slope, soot at its lip, a puff of smoke over it.
    for (let y = FLOOR - 15; y <= FLOOR - 9; y++) {
      plot(g, CX + 3, y, '7');
      plot(g, CX + 4, y, '5');
    }
    plot(g, CX + 3, FLOOR - 15, 'k');
    plot(g, CX + 4, FLOOR - 15, 'k');
    disc(g, CX + 5, FLOOR - 18, 1.8, (d) => (d > 1.1 ? 'T' : 'S'));
    disc(g, CX + 2.5, FLOOR - 20, 1.3, () => 'T');
    // A pressure gauge on the lit wall, its needle in the red.
    disc(g, CX - 3, FLOOR + 0.5, 1.6, (d) => (d > 1.1 ? '3' : 'w'));
    plot(g, CX - 3, FLOOR, '*');
  }
}

/** The spyglass on its swivel post on the roof, pointing along `dir`, `len` px long. */
function spyglass(g: CharGrid, dir: readonly [number, number], len: number): void {
  const px = CX;
  const py = FLOOR - 13;
  line(g, px, FLOOR - 10, px, py, '2');
  line(g, px - 1, FLOOR - 10, px - 1, py, '4');
  const n = Math.hypot(dir[0], dir[1]);
  const ux = dir[0] / n;
  const uy = dir[1] / n;
  const x0 = Math.round(px - ux * 3);
  const y0 = Math.round(py - uy * 3);
  const x1 = Math.round(px + ux * (len - 3));
  const y1 = Math.round(py + uy * (len - 3));
  // Lit top edge, dark underside; a brass band at the swivel; the eyepiece dark.
  line(g, x0, y0 - 1, x1, y1 - 1, '4');
  line(g, x0, y0, x1, y1, '2');
  plot(g, px, py - 1, '3');
  plot(g, px, py, '1');
  plot(g, x0, y0, 'k');
  plot(g, x0, y0 - 1, '1');
  // The lens: a wide brass hood with a green glint.
  const hx = x1 + Math.sign(ux);
  plot(g, hx, y1 - 2, '3');
  plot(g, hx, y1 - 1, 'G');
  plot(g, hx, y1, 'G');
  plot(g, hx, y1 + 1, '1');
}

function lookoutHead(k: number, kit: Kit): string[] {
  const g = grid(W, H);
  const dir = SWEEP[k] ?? [1, 0];
  // A glass pointing back over the roof draws behind it.
  shack(g, kit);
  spyglass(g, dir, kit === 'nest' ? 12 : 9);
  return rows(g);
}

/** Crow's Nest's base: a tall scaffold mast with a barrel nest and a pennant, and a signal lamp. */
function nestKit(g: CharGrid, cx: number, cy: number): void {
  const mx = cx - 10;
  // The mast: two brass poles with rungs between them (a ladder up the back corner).
  isoBox(g, mx, cy + 1, 3.5, 2, { top: '2', rim: '3', left: '2', right: '1' });
  for (let y = cy - 19; y <= cy + 1; y++) {
    plot(g, mx - 2, y, '4');
    plot(g, mx + 1, y, '2');
    if (y % 3 === 0) {
      plot(g, mx - 1, y, '3');
      plot(g, mx, y, '3');
    }
  }
  // The barrel nest: rust staves banded in brass.
  isoBox(g, mx, cy - 18, 3.5, 5, { top: 'k', rim: '7', left: '7', right: '6' });
  line(g, mx - 3, cy - 21, mx + 3, cy - 21, '3');
  // A pennant on a pole above it: the price tag's orange, snapping in the wind.
  line(g, mx, cy - 24, mx, cy - 26, '2');
  line(g, mx + 1, cy - 26, mx + 4, cy - 25, '+');
  line(g, mx + 1, cy - 25, mx + 3, cy - 25, 'd');
  // A signal lamp on a post at the right corner.
  isoBox(g, cx + 10, cy + 1, 3.5, 3, { top: '2', rim: '3', left: '2', right: '1' });
  line(g, cx + 10, cy - 3, cx + 10, cy - 8, '2');
  isoBox(g, cx + 10, cy - 8, 2.5, 4, { top: '3', rim: '4', left: '+', right: '+' });
  plot(g, cx + 9, cy - 10, '*');
  plot(g, cx + 10, cy - 10, '*');
}

/** Overclock Rig's base: a brass flywheel at the right corner, a hot exhaust stack at the left. */
function rigKit(g: CharGrid, cx: number, cy: number): void {
  const fx = cx + 10;
  const fy = cy - 4;
  for (let y = Math.floor(fy - 6); y <= Math.ceil(fy + 6); y++) {
    for (let x = Math.floor(fx - 3); x <= Math.ceil(fx + 3); x++) {
      const d = Math.hypot((x + 0.5 - fx) / 3, (y + 0.5 - fy) / 6);
      if (d > 1) continue;
      const spoke = Math.abs(x + 0.5 - fx) < 0.6 || Math.abs(y + 0.5 - fy) < 0.6;
      plot(g, x, y, d > 0.72 ? (x + 0.5 < fx ? '4' : '2') : spoke ? '3' : 'k');
    }
  }
  plot(g, fx - 1, fy - 1, 'w');
  // The drive belt back to the plinth.
  line(g, fx - 3, fy - 5, cx + 4, cy - 7, '5');
  line(g, fx - 3, fy + 5, cx + 4, cy - 3, '5');
  // The exhaust stack: a fat rust pipe, a welding-hot collar, soot at the lip.
  const sx = cx - 10;
  for (let y = cy - 14; y <= cy + 2; y++) {
    plot(g, sx - 2, y, '7');
    plot(g, sx - 1, y, '7');
    plot(g, sx, y, '6');
    plot(g, sx + 1, y, '5');
  }
  line(g, sx - 2, cy - 6, sx + 1, cy - 6, '+');
  line(g, sx - 2, cy - 5, sx + 1, cy - 5, '*');
  line(g, sx - 2, cy - 14, sx + 1, cy - 14, 'k');
  disc(g, sx - 0.5, cy - 17, 2.2, (d) => (d > 1.4 ? 'T' : 'S'));
}

// The lens glint (detection's green), the chimney smoke, plus the price tag's colors on the base.
const LEGEND = { G: 'green.4', S: 'steel.4', T: 'steel.2' } as const;

export const towerLookout = defineSprite({
  id: 'tower.lookout',
  size: { w: BASE_W, h: BASE_H },
  anchor: BASE_ANCHOR,
  mount: BASE_MOUNT,
  palette: 'vrell',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { ...VRELL_BASE_LEGEND, ...LEGEND },
  frames: {
    t1: vrellBase(1),
    t2: vrellBase(2),
    t3: vrellBase(3),
    spec_a: vrellSpecBase(nestKit),
    spec_b: vrellSpecBase(rigKit),
  },
});

const LOOK = [0, 1, 2, 3] as const;

export const towerLookoutHead = defineSprite({
  id: 'tower.lookout_head',
  size: { w: W, h: H },
  anchor: { x: CX, y: CY },
  palette: 'vrell',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: LEGEND,
  frames: Object.fromEntries([
    ...LOOK.map((k) => [`look_${k}`, lookoutHead(k, 't1')]),
    ...LOOK.map((k) => [`look_spec_a_${k}`, lookoutHead(k, 'nest')]),
    ...LOOK.map((k) => [`look_spec_b_${k}`, lookoutHead(k, 'rig')]),
  ]),
  anims: {
    // Looking about: left and up, left, right, right and up, at 3 fps.
    look: { frames: LOOK.map((k) => `look_${k}`), fps: 3 },
    look_spec_a: { frames: LOOK.map((k) => `look_spec_a_${k}`), fps: 3 },
    // The Overclock Rig looks about faster: it is overclocked.
    look_spec_b: { frames: LOOK.map((k) => `look_spec_b_${k}`), fps: 6 },
  },
});
