// Grapple Harpoon (`harpoon`): Vrell scrap (design/towers.md § Vrell towers), a whaling gun bolted
// to a patched brass yoke. A fat brass breech, a long banded barrel with a barbed steel harpoon
// loaded in its muzzle, a rope drum on its flank whose line runs along the barrel to the harpoon,
// and the Vrell oversized limb (art-direction §4): a huge crank on the drum. Kinetic reads
// steel/white (art-direction §7), so the harpoon head is steel with a white point. Its fire frame
// is the harpoon gone: an empty bore, a flash and a puff, the line paying out after it. From tier 2
// a spare harpoon rides in a clamp over the breech (D029: the upgrade reads in the head too). The
// tier-4 specs: **Skewer** (`spec_a`) is a long lance gun, its harpoon barbed three times down its
// length, on a base racked with spare lances; **Tether** (`spec_b`) loads a three-hooked grapple on
// a heavy chain off a winch drum, on a base with a chain heap and a mooring bollard.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, isoBox, line, plot, rows, type CharGrid } from '../helpers.ts';
import { BASE_ANCHOR, BASE_H, BASE_MOUNT, BASE_W } from './base.ts';
import { VRELL_BASE_LEGEND, vrellBase, vrellSpecBase } from './vrellBase.ts';

const W = 36;
const H = 24;
const CX = 9;
const CY = 21;

type Facing = 'se' | 'ne';
type Kit = 't1' | 't2' | 'skewer' | 'tether';

/** Where the barrel leaves the breech, and its screen slope (down-right for SE). */
function bore(facing: Facing): { x0: number; y0: number; dir: 1 | -1 } {
  return facing === 'se' ? { x0: CX + 3, y0: CY - 7, dir: 1 } : { x0: CX + 3, y0: CY - 10, dir: -1 };
}

/** A point `t` px along the barrel (2 px across for each px of rise). */
function along(facing: Facing, t: number): [number, number] {
  const { x0, y0, dir } = bore(facing);
  return [x0 + t, y0 + Math.round((dir * t) / 2)];
}

/** The barbed head: a steel point with two barbs swept back, white at the tip. */
function harpoonHead(g: CharGrid, facing: Facing, at: number): void {
  const { dir } = bore(facing);
  const [x, y] = along(facing, at);
  line(g, x - 3, y - Math.round((dir * 3) / 2), x, y, 'S');
  plot(g, x + 1, y + (dir > 0 ? 1 : 0), 'w');
  plot(g, x + 1, y - 1 + (dir > 0 ? 1 : 0), 'S');
  // The barbs: one above, one below, swept back toward the gun.
  plot(g, x - 1, y - 2, 'T');
  plot(g, x - 2, y - 2, 'T');
  plot(g, x - 1, y + 2, 'T');
  plot(g, x - 2, y + 2, 'T');
}

/** The gun's barrel from the breech, `len` px, lit top, dark underside, brass bands. */
function barrel(g: CharGrid, facing: Facing, len: number): void {
  for (let t = 0; t <= len; t++) {
    const [x, y] = along(facing, t);
    plot(g, x, y - 1, '4');
    plot(g, x, y, '2');
    plot(g, x, y + 1, '1');
    if (t % 4 === 2) {
      plot(g, x, y - 2, '3');
      plot(g, x, y - 1, '3');
      plot(g, x, y + 2, '0');
    }
  }
  // The muzzle ring.
  const [mx, my] = along(facing, len);
  for (let k = -2; k <= 2; k++) plot(g, mx, my + k, k === -2 ? '4' : k === 2 ? '0' : '3');
}

/** The rope drum on the near flank, coiled with grimy line, and its oversized crank. */
function drum(g: CharGrid, facing: Facing, heavy: boolean): void {
  const dx = CX - 4;
  const dy = facing === 'se' ? CY - 5 : CY - 7;
  const rx = heavy ? 3.4 : 2.6;
  const ry = heavy ? 4.6 : 3.8;
  // A spool stood on end: brass flanges top and bottom, the line wound in coils between.
  for (let y = Math.floor(dy - ry); y <= Math.ceil(dy + ry); y++) {
    for (let x = Math.floor(dx - rx); x <= Math.ceil(dx + rx); x++) {
      const d = Math.hypot((x + 0.5 - dx) / rx, (y + 0.5 - dy) / ry);
      if (d > 1) continue;
      const flange = y <= Math.floor(dy - ry) + 1 || y >= Math.ceil(dy + ry) - 1;
      const lit = x + 0.5 < dx;
      if (flange) plot(g, x, y, lit ? '4' : '2');
      else if (heavy) plot(g, x, y, y % 2 === 0 ? (lit ? 'S' : 'T') : 'k');
      else plot(g, x, y, y % 2 === 0 ? (lit ? 'R' : 'Q') : lit ? 'Q' : '0');
    }
  }
  // The crank: a long brass arm off the hub, up and back, a fat rust knob.
  const hx = Math.round(dx - 0.5);
  const hy = Math.round(dy - 0.5);
  line(g, hx, hy, hx - 4, hy - 5, '3');
  line(g, hx + 1, hy, hx - 3, hy - 5, '1');
  plot(g, hx, hy, '4');
  plot(g, hx - 5, hy - 6, '7');
  plot(g, hx - 4, hy - 6, '7');
  plot(g, hx - 5, hy - 5, '6');
}

function gunHead(facing: Facing, fire: boolean, kit: Kit): string[] {
  const g = grid(W, H);
  const skewer = kit === 'skewer';
  const tether = kit === 'tether';
  const len = skewer ? 13 : 12;
  // The yoke: a rust swivel collar under a brass breech block.
  isoBox(g, CX, CY, 6, 3, { top: '6', rim: '7', left: '6', right: '5' });
  if (facing === 'ne') barrel(g, facing, len);
  isoBox(g, CX + 1, CY - 3, 4, 6, { top: '4', rim: '4', left: '3', right: '1' });
  if (facing === 'se') barrel(g, facing, len);
  // A weld seam and a sight on the breech.
  plot(g, CX - 2, CY - 6, '+');
  plot(g, CX + 2, CY - 10, '2');
  plot(g, CX + 2, CY - 11, '3');
  drum(g, facing, tether);
  // The line from the drum along the top of the barrel to the loaded harpoon.
  const [lx, ly] = along(facing, Math.min(6, len));
  line(g, CX - 2, facing === 'se' ? CY - 8 : CY - 10, lx, ly - 2, 'R');
  if (kit === 't2') {
    // A spare harpoon in a clamp over the breech, point up.
    line(g, CX - 3, CY - 6, CX + 3, CY - 18, 'S');
    line(g, CX - 2, CY - 6, CX + 4, CY - 18, 'T');
    plot(g, CX + 4, CY - 19, 'w');
    plot(g, CX + 2, CY - 18, 'T');
    plot(g, CX + 5, CY - 17, 'T');
    line(g, CX - 1, CY - 10, CX + 2, CY - 10, '3');
  }
  const [mx, my] = along(facing, len);
  if (!fire) {
    if (skewer) {
      // The lance: a long steel shaft out of the muzzle with three barbs down its length.
      const [tx, ty] = along(facing, len + 9);
      line(g, mx + 1, my, tx, ty, 'S');
      line(g, mx + 1, my + 1, tx, ty + 1, 'T');
      for (const at of [len + 3, len + 6]) {
        const [bx, by] = along(facing, at);
        plot(g, bx - 1, by - 1, 'T');
        plot(g, bx - 1, by + 2, 'T');
      }
      harpoonHead(g, facing, len + 11);
    } else if (tether) {
      // The grapple: three hooks splayed round the muzzle, a chain back into the bore.
      const [gx, gy] = along(facing, len + 3);
      line(g, mx, my, gx, gy, 'S');
      for (const [ox, oy] of [
        [1, -3],
        [2, 0],
        [1, 3],
      ] as const) {
        line(g, gx, gy, gx + ox, gy + oy, 'S');
        plot(g, gx + ox - 1, gy + oy + Math.sign(oy || 1), 'w');
      }
    } else {
      harpoonHead(g, facing, len + 4);
    }
  } else {
    // The bore stands empty; a flash and a puff at the muzzle; the line pays out after the shot.
    plot(g, mx, my, 'k');
    disc(g, mx + 2, my, 2.2, (d) => (d < 1 ? 'w' : d < 1.7 ? '*' : '+'));
    plot(g, mx + 1, my - 3, 'T');
    plot(g, mx + 2, my - 4, 'T');
    const [ex, ey] = along(facing, len + 8);
    line(g, mx + 2, my - 1, ex, ey - 1, tether ? 'S' : 'R');
  }
  return rows(g);
}

/** Skewer's base: a rack of spare lances leaning at each side corner, barbs up. */
function skewerKit(g: CharGrid, cx: number, cy: number): void {
  for (const side of [-1, 1]) {
    const x = cx + side * 10;
    isoBox(g, x, cy + 1, 3, 3, { top: '6', rim: '7', left: '6', right: '5' });
    for (const k of [-1, 1]) {
      const x0 = Math.round(x) + k;
      line(g, x0, cy, x0 - side * 3, cy - 14, k < 0 ? 'S' : 'T');
      plot(g, x0 - side * 3, cy - 15, 'w');
      plot(g, x0 - side * 3 - 1, cy - 13, 'T');
      plot(g, x0 - side * 3 + 1, cy - 13, 'T');
    }
    line(g, Math.round(x) - 2, cy - 6, Math.round(x) + 2, cy - 6, '3');
  }
}

/** Tether's base: a heap of chain at the left corner, a mooring bollard with chain at the right. */
function tetherKit(g: CharGrid, cx: number, cy: number): void {
  const lx = cx - 10;
  for (let k = 0; k < 4; k++) {
    disc(g, lx + (k % 2) * 2 - 1, cy - 1 - k * 1.5, 2.2 - k * 0.3, (d) => (d > 1.2 ? 'S' : 'T'));
  }
  const rx = cx + 10;
  isoBox(g, rx, cy + 1, 3, 9, { top: '3', rim: '4', left: '2', right: '1' });
  isoBox(g, rx, cy - 8, 4, 1, { top: '4', rim: '4', left: '3', right: '2' });
  for (const y of [cy - 4, cy - 2]) line(g, Math.round(rx) - 3, y, Math.round(rx) + 2, y + 1, 'S');
}

// Steel for the harpoon and chain (Kinetic: steel and white), grimy rope.
const LEGEND = { S: 'steel.4', T: 'steel.2', R: 'grime.4', Q: 'grime.2' } as const;

export const towerHarpoon = defineSprite({
  id: 'tower.harpoon',
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
    spec_a: vrellSpecBase(skewerKit),
    spec_b: vrellSpecBase(tetherKit),
  },
});

export const towerHarpoonHead = defineSprite({
  id: 'tower.harpoon_head',
  size: { w: W, h: H },
  anchor: { x: CX, y: CY },
  palette: 'vrell',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: LEGEND,
  frames: {
    se: gunHead('se', false, 't1'),
    se_fire: gunHead('se', true, 't1'),
    ne: gunHead('ne', false, 't1'),
    ne_fire: gunHead('ne', true, 't1'),
    se_t2: gunHead('se', false, 't2'),
    se_t2_fire: gunHead('se', true, 't2'),
    ne_t2: gunHead('ne', false, 't2'),
    ne_t2_fire: gunHead('ne', true, 't2'),
    se_spec_a: gunHead('se', false, 'skewer'),
    se_spec_a_fire: gunHead('se', true, 'skewer'),
    ne_spec_a: gunHead('ne', false, 'skewer'),
    ne_spec_a_fire: gunHead('ne', true, 'skewer'),
    se_spec_b: gunHead('se', false, 'tether'),
    se_spec_b_fire: gunHead('se', true, 'tether'),
    ne_spec_b: gunHead('ne', false, 'tether'),
    ne_spec_b_fire: gunHead('ne', true, 'tether'),
  },
  anims: {
    // A slow, heavy gun (0.4 shots/s): the empty bore holds a beat before the reload shows.
    fire_se: { frames: ['se_fire', 'se_fire', 'se'], fps: 8, loop: false },
    fire_sw: { mirrorOf: 'fire_se' },
    fire_ne: { frames: ['ne_fire', 'ne_fire', 'ne'], fps: 8, loop: false },
    fire_nw: { mirrorOf: 'fire_ne' },
    fire_se_t2: { frames: ['se_t2_fire', 'se_t2_fire', 'se_t2'], fps: 8, loop: false },
    fire_sw_t2: { mirrorOf: 'fire_se_t2' },
    fire_ne_t2: { frames: ['ne_t2_fire', 'ne_t2_fire', 'ne_t2'], fps: 8, loop: false },
    fire_nw_t2: { mirrorOf: 'fire_ne_t2' },
    fire_se_spec_a: { frames: ['se_spec_a_fire', 'se_spec_a_fire', 'se_spec_a'], fps: 8, loop: false },
    fire_sw_spec_a: { mirrorOf: 'fire_se_spec_a' },
    fire_ne_spec_a: { frames: ['ne_spec_a_fire', 'ne_spec_a_fire', 'ne_spec_a'], fps: 8, loop: false },
    fire_nw_spec_a: { mirrorOf: 'fire_ne_spec_a' },
    fire_se_spec_b: { frames: ['se_spec_b_fire', 'se_spec_b_fire', 'se_spec_b'], fps: 8, loop: false },
    fire_sw_spec_b: { mirrorOf: 'fire_se_spec_b' },
    fire_ne_spec_b: { frames: ['ne_spec_b_fire', 'ne_spec_b_fire', 'ne_spec_b'], fps: 8, loop: false },
    fire_nw_spec_b: { mirrorOf: 'fire_ne_spec_b' },
  },
});
