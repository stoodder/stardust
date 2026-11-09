// Zapcoil (`zapcoil`): Zibzab's free sample, "ten percent better than new" (design/towers.md § Vrell
// towers). A Vrell tesla coil on a patched brass base (towers/vrellBase.ts): a squat rust footing,
// a column of brass windings, a patina toroid on top with a white-hot core, and the Vrell "one
// oversized limb" (art-direction §4): a big lopsided emitter arm on a brass knuckle, ending in a
// two-pronged electrode that swings toward its target. Energy reads blue-white (art-direction §7):
// the prongs spark `blue.4`, and each shot cracks a jagged blue-white arc off the prongs while the
// toroid flares. From tier 2 (D029) the coil is up-rated: patina insulator discs stacked on the
// windings, a bigger toroid with a discharge spike, and a scrap counterweight on the arm's far side.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, isoBox, line, plot, rows, type CharGrid } from '../helpers.ts';
import { BASE_ANCHOR, BASE_H, BASE_MOUNT, BASE_W } from './base.ts';
import { VRELL_BASE_LEGEND, vrellBase } from './vrellBase.ts';

const W = 30;
const H = 27;
const CX = 11;
const CY = 24;

type Facing = 'se' | 'ne';

/** The coil column: footing, windings, and (t2) insulators. Its top is at CY − 15. */
function column(g: CharGrid, t2: boolean): void {
  isoBox(g, CX, CY, 5, 3, { top: '6', rim: '7', left: '6', right: '5' });
  for (let y = CY - 15; y <= CY - 3; y++) {
    const lit = (y - CY) % 2 === 0;
    plot(g, CX - 2, y, lit ? '4' : '2');
    plot(g, CX - 1, y, lit ? '4' : '3');
    plot(g, CX, y, lit ? '3' : '1');
    plot(g, CX + 1, y, lit ? '2' : '0');
  }
  if (t2) {
    for (const y of [CY - 5, CY - 10]) {
      line(g, CX - 4, y, CX + 3, y, 'c');
      line(g, CX - 3, y + 1, CX + 2, y + 1, 'b');
      plot(g, CX - 4, y, 'd');
    }
  }
}

/** The toroid: a patina ring around a white-hot core; it flares bigger while firing. */
function toroid(g: CharGrid, t2: boolean, fire: boolean): void {
  const cy = CY - 17;
  const rx = t2 ? 5 : 4;
  const ry = t2 ? 2.6 : 2.2;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(CX - rx); x <= Math.ceil(CX + rx); x++) {
      const d = Math.hypot((x + 0.5 - CX) / rx, (y + 0.5 - cy) / ry);
      if (d > 1) continue;
      plot(g, x, y, d < 0.45 ? 'w' : y + 0.5 < cy ? 'd' : d > 0.8 ? 'a' : 'c');
    }
  }
  if (t2) {
    // The up-rated toroid wears a discharge spike on its crown.
    const top = Math.floor(cy - ry);
    plot(g, CX - 1, top - 1, '4');
    plot(g, CX - 1, top - 2, '3');
    plot(g, CX - 1, top - 3, 'w');
  }
  if (fire) {
    for (const [x, y] of [
      [CX - rx - 1, cy - 1],
      [CX + rx, cy - 2],
      [CX - 1, cy - ry - 1],
      [CX + 2, cy - ry - 2],
    ] as const) {
      plot(g, Math.round(x), Math.round(y), 'Z');
    }
  }
}

/** Where the arm's knuckle sits on the column, and where its prongs end, per facing. */
function armEnds(facing: Facing): { kx: number; ky: number; px: number; py: number } {
  return facing === 'se'
    ? { kx: CX + 2, ky: CY - 10, px: CX + 10, py: CY - 6 }
    : { kx: CX + 2, ky: CY - 12, px: CX + 10, py: CY - 17 };
}

/** The oversized emitter arm: a 2 px brass strut, a knuckle, and a forked electrode. */
function arm(g: CharGrid, facing: Facing, fire: boolean, t2: boolean): void {
  const { kx, ky, px, py } = armEnds(facing);
  // A thick strut: lit top, mid, dark underside.
  line(g, kx, ky - 1, px, py - 1, '4');
  line(g, kx, ky, px, py, '3');
  line(g, kx, ky + 1, px, py + 1, '1');
  // Weld seams on the strut, a third and two-thirds along.
  for (const t of [0.35, 0.7])
    plot(g, Math.round(kx + (px - kx) * t), Math.round(ky + (py - ky) * t), '+');
  disc(g, kx + 0.5, ky + 0.5, 2.4, (d) => (d > 1.6 ? '1' : d > 0.8 ? '3' : '4'));
  if (t2) {
    // A scrap counterweight hung off the knuckle's far side.
    isoBox(g, CX - 5, ky + 3, 2, 3, { top: '6', rim: '7', left: '6', right: '5' });
  }
  // The fork: a brass collar, then two thick prongs splayed from the arm's end, white tips.
  disc(g, px + 0.5, py + 0.5, 1.6, () => '2');
  line(g, px + 1, py - 1, px + 4, py - 3, '4');
  line(g, px + 1, py - 2, px + 3, py - 3, '3');
  line(g, px + 1, py + 2, px + 4, py + 3, '2');
  line(g, px + 1, py + 3, px + 3, py + 4, '1');
  plot(g, px + 4, py - 3, 'w');
  plot(g, px + 4, py + 3, 'w');
  plot(g, px + 5, py - 3, 'Z');
  plot(g, px + 5, py + 3, 'Z');
  if (fire) {
    // A jagged arc cracks off the prongs toward the target: a white core in a blue halo.
    const dy = facing === 'se' ? 1 : -1;
    const pts: [number, number][] = [
      [px + 4, py],
      [px + 5, py - 2],
      [px + 6, py + 1],
      [px + 7, py - 1],
      [px + 8, py + 2 * dy],
    ];
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1] ?? [0, 0];
      const [x1, y1] = pts[i] ?? [0, 0];
      line(g, x0, y0 - 1, x1, y1 - 1, 'Z');
      line(g, x0, y0 + 1, x1, y1 + 1, 'Z');
      line(g, x0, y0, x1, y1, 'w');
    }
    plot(g, px + 4, py, 'w');
  }
}

function zapcoilHead(facing: Facing, fire: boolean, t2: boolean): string[] {
  const g = grid(W, H);
  if (facing === 'ne') {
    arm(g, facing, fire, t2);
    column(g, t2);
  } else {
    column(g, t2);
    arm(g, facing, fire, t2);
  }
  toroid(g, t2, fire);
  return rows(g);
}

// Energy: the prong sparks and arcs (`blue.4`), plus the price tag's colors on the base.
const LEGEND = { Z: 'blue.4' } as const;

export const towerZapcoil = defineSprite({
  id: 'tower.zapcoil',
  size: { w: BASE_W, h: BASE_H },
  anchor: BASE_ANCHOR,
  mount: BASE_MOUNT,
  palette: 'vrell',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: VRELL_BASE_LEGEND,
  frames: { t1: vrellBase(1), t2: vrellBase(2), t3: vrellBase(3) },
});

export const towerZapcoilHead = defineSprite({
  id: 'tower.zapcoil_head',
  size: { w: W, h: H },
  anchor: { x: CX, y: CY },
  palette: 'vrell',
  outline: 'auto',
  // The toroid's white-hot core and the arc's white strokes glow (the `hi` slot, `white.1`).
  glow: { slots: ['hi'], radius: 1 },
  legend: LEGEND,
  frames: {
    se: zapcoilHead('se', false, false),
    se_fire: zapcoilHead('se', true, false),
    ne: zapcoilHead('ne', false, false),
    ne_fire: zapcoilHead('ne', true, false),
    se_t2: zapcoilHead('se', false, true),
    se_t2_fire: zapcoilHead('se', true, true),
    ne_t2: zapcoilHead('ne', false, true),
    ne_t2_fire: zapcoilHead('ne', true, true),
  },
  anims: {
    fire_se: { frames: ['se_fire', 'se'], fps: 12, loop: false },
    fire_sw: { mirrorOf: 'fire_se' },
    fire_ne: { frames: ['ne_fire', 'ne'], fps: 12, loop: false },
    fire_nw: { mirrorOf: 'fire_ne' },
    fire_se_t2: { frames: ['se_t2_fire', 'se_t2'], fps: 12, loop: false },
    fire_sw_t2: { mirrorOf: 'fire_se_t2' },
    fire_ne_t2: { frames: ['ne_t2_fire', 'ne_t2'], fps: 12, loop: false },
    fire_nw_t2: { mirrorOf: 'fire_ne_t2' },
  },
});
