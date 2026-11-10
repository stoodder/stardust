// Salvage Crane (`crane`): Vrell scrap (design/towers.md § Vrell towers), an economy tower, not a
// gun. A squat rust cab with a lit window and a patina counterweight (its price tag dangling), and
// the Vrell oversized limb (art-direction §4): a long brass lattice jib, its hook hanging on a
// steel cable, swung toward the job. From tier 2 the jib is longer and the hook carries a crate of
// salvage (D029: the upgrade reads in the head too). The tier-4 specs: **Haggler's Stall**
// (`spec_a`) is open for business, a striped awning over the cab (Zibzab's shop's), a price board
// hung off the jib and a sack of goods on the hook, on a base with a counter of crates and a jar of
// coins; **Magnet Crane** (`spec_b`) swaps the hook for a great electromagnet glowing hot beneath,
// on a base braced by outrigger pads and a generator can. Only the Magnet Crane attacks, so only
// its head has fire frames: the magnet slams down, white-hot, sparks flying.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, isoBox, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { BASE_ANCHOR, BASE_H, BASE_MOUNT, BASE_W } from './base.ts';
import { VRELL_BASE_LEGEND, vrellBase, vrellSpecBase } from './vrellBase.ts';

const W = 34;
const H = 34;
const CX = 11;
const CY = 31;

type Facing = 'se' | 'ne';
type Kit = 't1' | 't2' | 'stall' | 'magnet';

/** The jib's foot on the cab and its tip, per facing and length. */
function jibEnds(facing: Facing, long: boolean): { x0: number; y0: number; x1: number; y1: number } {
  const reach = long ? 16 : 13;
  return facing === 'se'
    ? { x0: CX + 2, y0: CY - 8, x1: CX + 2 + reach, y1: CY - 8 - Math.round(reach * 1.2) }
    : { x0: CX + 1, y0: CY - 10, x1: CX + 1 + reach, y1: CY - 10 - Math.round(reach * 1.4) };
}

/** A brass lattice jib: two chords and a zigzag of struts between them. */
function jib(g: CharGrid, facing: Facing, long: boolean): void {
  const { x0, y0, x1, y1 } = jibEnds(facing, long);
  line(g, x0, y0, x1, y1, '4');
  line(g, x0 + 2, y0, x1 + 1, y1 + 1, '1');
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let k = 2; k < n; k += 3) {
    const t = k / n;
    const ax = Math.round(x0 + (x1 - x0) * t);
    const ay = Math.round(y0 + (y1 - y0) * t);
    plot(g, ax + 1, ay, '2');
    plot(g, ax + 1, ay + 1, '3');
  }
  // The sheave at the tip.
  plot(g, x1, y1 - 1, '3');
  plot(g, x1 + 1, y1 - 1, '2');
  plot(g, x1 + 1, y1, 'k');
}

/** The cab: rust, a lit window, a patina counterweight behind it with the price tag. */
function cab(g: CharGrid, facing: Facing, kit: Kit): void {
  isoBox(g, CX, CY, 6, 4, { top: '6', rim: '7', left: '6', right: '5' });
  isoBox(g, CX - 1, CY - 4, 5, 6, { top: '7', rim: '7', left: '7', right: '6' });
  if (facing === 'se') {
    // The window on the front face, warm, framed in brass.
    stamp(g, CX - 1, CY - 8, ['3333', '3+*3', '3++3']);
  }
  // The counterweight hung off the cab's back corner, the price tag swinging from it.
  isoBox(g, CX - 6, CY - 3, 2.5, 5, { top: 'd', rim: 'e', left: 'c', right: 'b' });
  plot(g, CX - 7, CY - 1, '1');
  stamp(g, CX - 8, CY, ['WW', 'WU']);
  if (kit === 'stall') {
    // A striped awning over the cab, orange and white, its scalloped edge out front.
    for (let x = CX - 7; x <= CX + 5; x++) {
      const stripe = Math.floor((x - CX + 20) / 2) % 2 === 0 ? 'W' : '+';
      for (let y = CY - 15; y <= CY - 13; y++) plot(g, x, y + Math.floor((x - CX + 7) / 4), stripe);
      if (x % 2 === 0) plot(g, x, CY - 12 + Math.floor((x - CX + 7) / 4), stripe);
    }
    // A lantern at the awning's corner.
    plot(g, CX - 7, CY - 11, '1');
    plot(g, CX - 7, CY - 10, '*');
  }
}

/** What hangs from the jib's tip: a hook, a crate, a sack of goods, or the magnet. */
function load(g: CharGrid, facing: Facing, kit: Kit, fire: boolean): void {
  const { x1, y1 } = jibEnds(facing, kit !== 't1');
  const hx = x1 + 1;
  const drop = kit === 'magnet' ? (fire ? 16 : 12) : 13;
  line(g, hx, y1 + 1, hx, y1 + drop, 'T');
  const by = y1 + drop;
  if (kit === 'magnet') {
    // The electromagnet: a fat dark disc, a patina rim, glowing hot underneath.
    for (let y = by; y <= by + 4; y++) {
      for (let x = hx - 4; x <= hx + 4; x++) {
        const d = Math.hypot((x + 0.5 - (hx + 0.5)) / 4.5, (y + 0.5 - (by + 2)) / 2.6);
        if (d > 1) continue;
        plot(g, x, y, y === by ? 'e' : y >= by + 3 ? (fire ? '*' : '+') : d > 0.8 ? 'c' : '0');
      }
    }
    line(g, hx - 1, by - 1, hx + 1, by - 1, '2');
    if (fire) {
      // The slam: sparks thrown out from under the plate.
      for (const [ox, oy] of [
        [-6, 4],
        [6, 4],
        [-5, 6],
        [5, 6],
        [-7, 2],
        [7, 2],
      ] as const)
        plot(g, hx + ox, by + oy, oy > 4 ? '+' : 'w');
    }
    return;
  }
  // The hook: a steel shank and a J, lit edge left.
  plot(g, hx - 1, by, 'S');
  plot(g, hx, by, 'S');
  plot(g, hx, by + 1, 'S');
  plot(g, hx, by + 2, 'T');
  plot(g, hx - 1, by + 3, 'T');
  plot(g, hx - 2, by + 2, 'S');
  if (kit === 't2') {
    // A crate of salvage hanging on the hook.
    isoBox(g, hx, by + 9, 3, 4, { top: '7', rim: '7', left: '6', right: '5' });
    line(g, hx - 2, by + 3, hx - 2, by + 5, 'T');
    line(g, hx + 2, by + 3, hx + 2, by + 5, 'T');
  } else if (kit === 'stall') {
    // A sack of goods with a tag on it.
    disc(g, hx, by + 6.5, 3, (d, x) => (d > 2.2 ? 'Q' : x < hx ? 'R' : 'Q'));
    plot(g, hx + 2, by + 5, 'W');
    plot(g, hx + 3, by + 5, 'W');
  }
}

function craneHead(facing: Facing, fire: boolean, kit: Kit): string[] {
  const g = grid(W, H);
  const long = kit !== 't1';
  if (facing === 'ne') {
    // Seen from behind, the jib rises beyond the cab.
    jib(g, facing, long);
    load(g, facing, kit, fire);
    cab(g, facing, kit);
  } else {
    cab(g, facing, kit);
    jib(g, facing, long);
    load(g, facing, kit, fire);
  }
  if (kit === 'stall') {
    // The price board hung off the jib: white, a scrawled blue price.
    const { x0, y0, x1, y1 } = jibEnds(facing, long);
    const mx = Math.round((x0 + x1) / 2);
    const my = Math.round((y0 + y1) / 2);
    stamp(g, mx - 1, my + 2, ['WWWW', 'WUUW', 'WWWW']);
    plot(g, mx, my + 1, 'T');
  }
  return rows(g);
}

/** Haggler's Stall's base: a counter of crates of goods and a jar of coins. */
function stallKit(g: CharGrid, cx: number, cy: number): void {
  for (const [x, h] of [
    [cx - 11, 5],
    [cx - 8, 3],
  ] as const) {
    isoBox(g, x, cy + 1, 2.5, h, { top: '7', rim: '7', left: '6', right: '5' });
  }
  // Goods heaped on the crates: patina cans and a white parcel.
  plot(g, cx - 12, cy - 6, 'd');
  plot(g, cx - 11, cy - 6, 'c');
  plot(g, cx - 10, cy - 7, 'W');
  plot(g, cx - 9, cy - 4, 'd');
  // The coin jar: patina glass full of brass coins, a white price tag on its neck.
  const jx = cx + 10;
  isoBox(g, jx, cy + 1, 3, 8, { top: 'e', rim: 'e', left: 'c', right: 'b' });
  for (let y = cy - 4; y <= cy; y++) {
    for (let x = Math.floor(jx - 2); x <= Math.ceil(jx + 1); x++) plot(g, x, y + (x > jx ? 1 : 0), (x + y) % 2 === 0 ? '4' : '3');
  }
  stamp(g, Math.round(jx) + 2, cy - 7, ['WW', 'UW']);
}

/** Magnet Crane's base: outrigger legs with pads at both side corners, a generator can. */
function magnetKit(g: CharGrid, cx: number, cy: number): void {
  for (const side of [-1, 1]) {
    line(g, cx + side * 6, cy - 1, cx + side * 13, cy + 3, '3');
    line(g, cx + side * 6, cy, cx + side * 13, cy + 4, '1');
    isoBox(g, cx + side * 13, cy + 5, 2.5, 1, { top: '2', rim: '3', left: '1', right: '0' });
  }
  // The generator: a patina can with a hot vent and a cable up to the cab.
  isoBox(g, cx + 9, cy - 1, 3, 7, { top: 'd', rim: 'e', left: 'c', right: 'b' });
  line(g, cx + 8, cy - 5, cx + 10, cy - 5, '+');
  line(g, cx + 7, cy - 9, cx + 3, cy - 7, 'k');
}

// Steel cable and hook, the goods' burlap, plus the price tag's colors.
const LEGEND = { ...VRELL_BASE_LEGEND, S: 'steel.4', T: 'steel.2', R: 'grime.4', Q: 'grime.2' } as const;

export const towerCrane = defineSprite({
  id: 'tower.crane',
  size: { w: BASE_W, h: BASE_H },
  anchor: BASE_ANCHOR,
  mount: BASE_MOUNT,
  palette: 'vrell',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: VRELL_BASE_LEGEND,
  frames: {
    t1: vrellBase(1),
    t2: vrellBase(2),
    t3: vrellBase(3),
    spec_a: vrellSpecBase(stallKit),
    spec_b: vrellSpecBase(magnetKit),
  },
});

export const towerCraneHead = defineSprite({
  id: 'tower.crane_head',
  size: { w: W, h: H },
  anchor: { x: CX, y: CY },
  palette: 'vrell',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: LEGEND,
  frames: {
    se: craneHead('se', false, 't1'),
    ne: craneHead('ne', false, 't1'),
    se_t2: craneHead('se', false, 't2'),
    ne_t2: craneHead('ne', false, 't2'),
    se_spec_a: craneHead('se', false, 'stall'),
    ne_spec_a: craneHead('ne', false, 'stall'),
    se_spec_b: craneHead('se', false, 'magnet'),
    se_spec_b_fire: craneHead('se', true, 'magnet'),
    ne_spec_b: craneHead('ne', false, 'magnet'),
    ne_spec_b_fire: craneHead('ne', true, 'magnet'),
  },
  anims: {
    // The grab and slam (every 6 s): the magnet drops white-hot, then hangs again.
    fire_se_spec_b: { frames: ['se_spec_b_fire', 'se_spec_b_fire', 'se_spec_b'], fps: 6, loop: false },
    fire_sw_spec_b: { mirrorOf: 'fire_se_spec_b' },
    fire_ne_spec_b: { frames: ['ne_spec_b_fire', 'ne_spec_b_fire', 'ne_spec_b'], fps: 6, loop: false },
    fire_nw_spec_b: { mirrorOf: 'fire_ne_spec_b' },
  },
});
