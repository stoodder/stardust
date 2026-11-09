// Thumper Mortar (`thumper`): Everglow TM-4, a squat mount with a fat hazard-striped tube.
// Lobbed shells, so the fire frame is a warm flash plus smoke at the muzzle. From tier 2 the head
// is up-armored too (D029): a ready rack of orange shells on the right cheek, a second trunnion
// cheek, and a flared muzzle brake, so it reads wider and heavier. Facing SE the muzzle shows its
// open bore; facing NE (away) only a dark sliver of the far bore shows over the near lip.
// The tier-4 specs (design/towers.md § 7): **Cluster Thumper** (`spec_a`) has a pepperbox muzzle of
// four bores and a hopper of orange bomblets, on a base with a bomblet bin at each side corner;
// **Bunker Buster** (`spec_b`) has a longer, thicker tube in reinforcing rings with a heavy brake
// and a big orange round showing in the bore, on a base behind slab blast shields.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, isoBox, plot, rows, type CharGrid } from '../helpers.ts';
import { BASE_ANCHOR, BASE_H, BASE_MOUNT, BASE_W, everglowBase, everglowSpecBase } from './base.ts';

const W = 24;
const H = 23;
const CX = 9;
const CY = 20;

type Facing = 'se' | 'ne';
/** The head's kit: tier 1, the T2+ up-armor, or a spec. */
type Kit = 't1' | 't2' | 'cluster' | 'buster';

/** A stack of orange-capped shells (or bomblets) standing on the right cheek. */
function rack(g: CharGrid, spots: readonly (readonly [number, number])[], tall: number): void {
  for (const [x, y] of spots) {
    isoBox(g, CX + x, CY + y, 1.5, tall, { top: 'e', rim: 'e', left: 'd', right: 'c' });
  }
}

function thumperHead(facing: Facing, fire: boolean, kit: Kit = 't1'): string[] {
  const g = grid(W, H);
  const buster = kit === 'buster';
  isoBox(g, CX, CY, buster ? 8 : 7, 3, { top: '3', rim: '4', left: '2', right: '1' });
  // Trunnion cheeks either side of the tube.
  isoBox(g, CX - 4, CY - 3, 2, 3, { top: '2', rim: '3', left: '1', right: '0' });
  if (kit === 't2') {
    rack(
      g,
      [
        [7, -3],
        [9, -2],
        [8, -1],
      ],
      4,
    );
  } else if (kit === 'cluster') {
    // The bomblet hopper: a steel bin heaped with round orange bomblets.
    isoBox(g, CX + 8, CY - 1, 3.5, 4, { top: '1', rim: '3', left: '2', right: '0' });
    for (const [x, y] of [
      [6, -6],
      [8, -6],
      [10, -6],
      [7, -7],
      [9, -7],
      [8, -8],
    ] as const) {
      plot(g, CX + x, CY + y, 'd');
      plot(g, CX + x + 1, CY + y, 'b');
      plot(g, CX + x, CY + y - 1, 'e');
    }
  } else if (buster) {
    // A slab of armor bolted on the right cheek, with a hazard stripe.
    isoBox(g, CX + 7, CY - 1, 3, 7, { top: '2', rim: '3', left: '1', right: '0' });
    for (let y = 0; y < 7; y++) plot(g, CX + 8 + (y % 2), CY - 3 - y, y % 2 ? 'c' : '0');
  }
  // The tube: discs stepped up and toward the facing, shaded lit-left. NE leans as far right as
  // SE (both aim right); only the muzzle changes.
  const steps = buster ? 10 : 8;
  const r = buster ? 4.3 : 3.8;
  for (let i = 0; i <= steps; i++) {
    const x = CX + 0.5 + i * 0.4;
    const y = CY - 4 - i;
    const hazard = buster ? i === 4 || i === 5 : i === 3 || i === 4;
    const ring = buster && (i === 2 || i === 8);
    disc(g, x, y, r, (d, px) => {
      if (hazard) return (px + i) % 2 === 0 ? 'c' : 'd';
      if (ring) return px + 0.5 < x - 1 ? '2' : '0';
      if (px + 0.5 < x - 1.5) return '4';
      if (px + 0.5 < x + 0.5) return '3';
      return d > r - 0.8 ? '1' : '2';
    });
  }
  // The muzzle: a rim ellipse. SE (toward the viewer) shows the open bore; NE (away) shows the
  // near lip lit, with only a dark sliver of the far bore over it, so it never reads as a visor.
  const mx = CX + 0.5 + steps * 0.4;
  const my = CY - 4 - steps;
  // T2's flared brake makes the muzzle a size larger; Bunker Buster's heavy brake larger still.
  const rx = kit === 't1' ? 4 : buster ? 5.5 : 5;
  const ry = facing === 'se' ? 1.6 : 1.1;
  if (facing === 'ne') {
    // Seen from behind, the tube ends at the muzzle: no dome of tube shows above its far lip.
    for (let y = Math.floor(my - r - 1); y + 0.5 < my - ry - 0.9; y++) {
      for (let x = Math.floor(mx - r - 1); x <= Math.ceil(mx + r + 1); x++) {
        if (Math.hypot(x + 0.5 - mx, y + 0.5 - my) <= r + 0.5) plot(g, x, y, '.');
      }
    }
  }
  for (let y = Math.floor(my - 3); y <= Math.ceil(my + 3); y++) {
    for (let x = Math.floor(mx - rx); x <= Math.ceil(mx + rx); x++) {
      const dx = x + 0.5 - mx;
      const dy = y + 0.5 - my;
      const e = (dx / rx) ** 2 + (dy / (ry + 0.9)) ** 2;
      if (e > 1) continue;
      if (facing === 'se') {
        const inner = (dx / 2.6) ** 2 + (dy / ry) ** 2;
        plot(g, x, y, inner <= 1 ? 'k' : dy < 0 ? '2' : '4');
      } else {
        // NE: the far lip in shadow along the top, the bore a 1 px sliver, the near lip lit.
        const row = Math.floor(dy);
        plot(g, x, y, row < -1 ? '1' : row === -1 ? (Math.abs(dx) < rx - 1.5 ? 'k' : '2') : '4');
      }
    }
  }
  if (facing === 'se') {
    if (kit === 'cluster') {
      // A pepperbox: the bore is four smaller bores in a steel web.
      for (let y = Math.floor(my - 2); y <= Math.ceil(my + 2); y++) {
        for (let x = Math.floor(mx - 3); x <= Math.ceil(mx + 3); x++) {
          if (g[y]?.[x] === 'k') plot(g, x, y, '1');
        }
      }
      for (const [dx, dy] of [
        [-2, -1],
        [0, -1],
        [-2, 1],
        [0, 1],
      ] as const) {
        plot(g, Math.round(mx) + dx, Math.round(my) + dy, 'k');
      }
    } else if (buster) {
      // The bunker buster round chambered: a big orange ogive filling the bore, glinting.
      const bx = Math.round(mx);
      const by = Math.round(my);
      for (const [dx, dy, ch] of [
        [-2, -1, 'c'],
        [-1, -1, 'e'],
        [0, -1, 'd'],
        [-2, 0, 'b'],
        [-1, 0, 'd'],
        [0, 0, 'c'],
        [-1, -2, 'w'],
      ] as const) {
        if (g[by + dy]?.[bx + dx] === 'k') plot(g, bx + dx, by + dy, ch);
      }
    }
  } else if (kit === 'cluster') {
    // NE: the pepperbox shows as a broken sliver.
    plot(g, Math.round(mx) - 1, Math.round(my) - 1, '2');
    plot(g, Math.round(mx) + 1, Math.round(my) - 1, '2');
  }
  if (buster) {
    // The heavy brake's side ports: dark notches at both ends of the rim.
    plot(g, Math.round(mx - rx), Math.round(my), '0');
    plot(g, Math.round(mx + rx) - 1, Math.round(my), '0');
  }
  if (fire) {
    const fr = buster ? 3.4 : 2.6;
    disc(g, mx, my - 1.5, fr, (d) => (d < fr * 0.45 ? 'w' : 'e'));
    plot(g, Math.round(mx) - 3, Math.round(my) - 3, '4');
    plot(g, Math.round(mx) + 3, Math.round(my) - 3, '4');
    if (kit === 'cluster') {
      // The bomblets go up with the shell: three orange sparks around the flash.
      plot(g, Math.round(mx) - 4, Math.round(my) - 1, 'd');
      plot(g, Math.round(mx) + 4, Math.round(my) - 1, 'd');
      plot(g, Math.round(mx), Math.round(my) - 5, 'd');
    }
  }
  return rows(g);
}

/** Cluster Thumper's base: a bin of orange bomblets at each side corner. */
function clusterKit(g: CharGrid, cx: number, cy: number): void {
  for (const side of [-1, 1]) {
    const x = cx + side * 10;
    isoBox(g, x, cy + 1, 3.5, 6, { top: '2', rim: '4', left: '3', right: '2' });
    // The heap: a dome of bomblets standing over the bin's rim.
    for (const [dx, dy] of [
      [-2, -6],
      [0, -6],
      [2, -6],
      [-1, -7],
      [1, -7],
      [0, -8],
      [-3, -5],
      [2, -5],
    ] as const) {
      plot(g, Math.round(x) + dx - 1, cy + dy, 'd');
      plot(g, Math.round(x) + dx, cy + dy, 'c');
      plot(g, Math.round(x) + dx - 1, cy + dy - 1, 'e');
    }
  }
}

/** Bunker Buster's base: thick slab blast shields at the side corners, hazard-striped. */
function busterKit(g: CharGrid, cx: number, cy: number): void {
  for (const side of [-1, 1]) {
    const x = cx + side * 10;
    isoBox(g, x, cy + 1, 4, 10, { top: '3', rim: '4', left: '2', right: '1' });
    // Diagonal hazard stripes across the outer face.
    for (let y = cy - 8; y <= cy + 2; y++) {
      for (let px = Math.floor(x - 4); px < Math.ceil(x + 4); px++) {
        const ch = g[y]?.[px];
        if ((ch === '2' || ch === '1') && (side < 0 ? px + 0.5 < x : px + 0.5 > x)) {
          if ((px + y * side + 40) % 4 < 2) plot(g, px, y, side < 0 ? 'd' : 'c');
        }
      }
    }
    // Bolt heads along the top.
    plot(g, Math.round(x) - 1, cy - 9, '4');
    plot(g, Math.round(x) + 1, cy - 9, '4');
  }
}

export const towerThumper = defineSprite({
  id: 'tower.thumper',
  size: { w: BASE_W, h: BASE_H },
  anchor: BASE_ANCHOR,
  mount: BASE_MOUNT,
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: {
    t1: everglowBase(1, 'c'),
    t2: everglowBase(2, 'c'),
    t3: everglowBase(3, 'c'),
    spec_a: everglowSpecBase('c', clusterKit),
    spec_b: everglowSpecBase('c', busterKit),
  },
});

export const towerThumperHead = defineSprite({
  id: 'tower.thumper_head',
  size: { w: W, h: H },
  anchor: { x: CX, y: CY },
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  frames: {
    se: thumperHead('se', false),
    se_fire: thumperHead('se', true),
    ne: thumperHead('ne', false),
    ne_fire: thumperHead('ne', true),
    se_t2: thumperHead('se', false, 't2'),
    se_t2_fire: thumperHead('se', true, 't2'),
    ne_t2: thumperHead('ne', false, 't2'),
    ne_t2_fire: thumperHead('ne', true, 't2'),
    se_spec_a: thumperHead('se', false, 'cluster'),
    se_spec_a_fire: thumperHead('se', true, 'cluster'),
    ne_spec_a: thumperHead('ne', false, 'cluster'),
    ne_spec_a_fire: thumperHead('ne', true, 'cluster'),
    se_spec_b: thumperHead('se', false, 'buster'),
    se_spec_b_fire: thumperHead('se', true, 'buster'),
    ne_spec_b: thumperHead('ne', false, 'buster'),
    ne_spec_b_fire: thumperHead('ne', true, 'buster'),
  },
  anims: {
    fire_se: { frames: ['se_fire', 'se'], fps: 10, loop: false },
    fire_sw: { mirrorOf: 'fire_se' },
    fire_ne: { frames: ['ne_fire', 'ne'], fps: 10, loop: false },
    fire_nw: { mirrorOf: 'fire_ne' },
    fire_se_t2: { frames: ['se_t2_fire', 'se_t2'], fps: 10, loop: false },
    fire_sw_t2: { mirrorOf: 'fire_se_t2' },
    fire_ne_t2: { frames: ['ne_t2_fire', 'ne_t2'], fps: 10, loop: false },
    fire_nw_t2: { mirrorOf: 'fire_ne_t2' },
    fire_se_spec_a: { frames: ['se_spec_a_fire', 'se_spec_a'], fps: 10, loop: false },
    fire_sw_spec_a: { mirrorOf: 'fire_se_spec_a' },
    fire_ne_spec_a: { frames: ['ne_spec_a_fire', 'ne_spec_a'], fps: 10, loop: false },
    fire_nw_spec_a: { mirrorOf: 'fire_ne_spec_a' },
    fire_se_spec_b: {
      frames: ['se_spec_b_fire', 'se_spec_b_fire', 'se_spec_b'],
      fps: 10,
      loop: false,
    },
    fire_sw_spec_b: { mirrorOf: 'fire_se_spec_b' },
    fire_ne_spec_b: {
      frames: ['ne_spec_b_fire', 'ne_spec_b_fire', 'ne_spec_b'],
      fps: 10,
      loop: false,
    },
    fire_nw_spec_b: { mirrorOf: 'fire_ne_spec_b' },
  },
});
