// Zapcoil (`zapcoil`): Zibzab's free sample, "ten percent better than new" (design/towers.md § Vrell
// towers). A Vrell tesla coil on a patched brass base (towers/vrellBase.ts): a squat rust footing,
// a column of brass windings, a patina toroid on top with a white-hot core, and the Vrell "one
// oversized limb" (art-direction §4): a big lopsided emitter arm on a brass knuckle, ending in a
// two-pronged electrode that swings toward its target. Energy reads blue-white (art-direction §7):
// the prongs spark `blue.4`, and each shot cracks a jagged blue-white arc off the prongs while the
// toroid flares. From tier 2 (D029) the coil is up-rated: patina insulator discs stacked on the
// windings, a bigger toroid with a discharge spike, and a scrap counterweight on the arm's far side.
// The tier-4 specs (design/towers.md § 7): **Overload Coil** (`spec_a`, chains to 8) stacks a second
// toroid on a taller column and forks its claw three ways, every prong arcing when it fires, on a
// base with an insulator stack at each corner; **Capacitor Bank** (`spec_b`) hangs two glass
// capacitor jars on the column and ends the arm in a heavy ball electrode (render's charge orb sits
// at it), on a base with a bank of jars lit blue.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, isoBox, line, plot, rows, type CharGrid } from '../helpers.ts';
import { BASE_ANCHOR, BASE_H, BASE_MOUNT, BASE_W } from './base.ts';
import { VRELL_BASE_LEGEND, vrellBase, vrellSpecBase } from './vrellBase.ts';

const W = 30;
const H = 31;
const CX = 11;
const CY = 28;

type Facing = 'se' | 'ne';
type Kit = 't1' | 't2' | 'overload' | 'bank';

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
function arm(g: CharGrid, facing: Facing, fire: boolean, t2: boolean, kit: Kit = 't1'): void {
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
  if (kit === 'bank') {
    // The ball electrode: a heavy brass sphere, a blue charge glinting in it.
    disc(g, px + 2, py + 0.5, 2.8, (d, x, y) =>
      d > 2 ? '1' : x + y < px + py + 1 ? (d < 1 ? 'w' : '4') : '3',
    );
    plot(g, px + 3, py + 1, 'Z');
    if (fire) {
      // The discharge: one fat bolt cracking off the ball.
      line(g, px + 5, py, px + 9, py - 2, 'w');
      line(g, px + 5, py - 1, px + 9, py - 3, 'Z');
      line(g, px + 5, py + 1, px + 9, py - 1, 'Z');
      plot(g, px + 10, py - 1, 'w');
    }
    return;
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
  if (kit === 'overload') {
    // A third prong straight out between the two, its own spark.
    line(g, px + 1, py, px + 5, py, '3');
    plot(g, px + 5, py + 1, '1');
    plot(g, px + 6, py, 'w');
    plot(g, px + 7, py, 'Z');
    if (fire) {
      // An arc off every prong: up, out, and down, the chain leaping eight ways.
      line(g, px + 5, py - 4, px + 8, py - 7, 'Z');
      line(g, px + 6, py - 4, px + 9, py - 6, 'w');
      line(g, px + 5, py + 4, px + 8, py + 7, 'Z');
      line(g, px + 6, py + 4, px + 9, py + 6, 'w');
    }
  }
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

/** Capacitor Bank's jars: two glass cylinders lit blue inside, brass caps, on the column's flanks. */
function jars(g: CharGrid): void {
  for (const jx of [CX - 6, CX + 4]) {
    for (let y = CY - 11; y <= CY - 3; y++) {
      for (let x = jx; x <= jx + 2; x++) {
        const edge = x === jx || x === jx + 2;
        plot(g, x, y, y === CY - 11 ? '3' : edge ? 'Y' : y > CY - 8 ? 'Z' : 'X');
      }
    }
    plot(g, jx + 1, CY - 12, '4');
  }
}

/** Overload Coil's crown: a second, smaller toroid stacked over the first on a short post. */
function crown(g: CharGrid, fire: boolean): void {
  const cy = CY - 24;
  line(g, CX - 1, CY - 20, CX - 1, cy + 1, '3');
  line(g, CX, CY - 20, CX, cy + 1, '1');
  for (let y = cy - 2; y <= cy + 2; y++) {
    for (let x = CX - 4; x <= CX + 3; x++) {
      const d = Math.hypot((x + 0.5 - CX) / 3.6, (y + 0.5 - cy) / 1.9);
      if (d > 1) continue;
      plot(g, x, y, d < 0.45 ? 'w' : y + 0.5 < cy ? 'd' : 'c');
    }
  }
  if (fire) {
    for (const [x, y] of [
      [CX - 5, cy],
      [CX + 4, cy - 1],
      [CX - 1, cy - 3],
    ] as const)
      plot(g, x, y, 'Z');
  }
}

function zapcoilHead(facing: Facing, fire: boolean, kit: Kit = 't1'): string[] {
  const g = grid(W, H);
  const t2 = kit !== 't1';
  if (kit === 'overload') crown(g, fire);
  if (facing === 'ne') {
    arm(g, facing, fire, t2, kit);
    column(g, t2);
  } else {
    column(g, t2);
    arm(g, facing, fire, t2, kit);
  }
  if (kit === 'bank') jars(g);
  toroid(g, t2, fire);
  return rows(g);
}

/** Overload Coil's base: a stack of patina insulator discs at each corner, sparking at the top. */
function overloadKit(g: CharGrid, cx: number, cy: number): void {
  for (const side of [-1, 1]) {
    const x = Math.round(cx + side * 10);
    isoBox(g, x, cy + 1, 3, 2, { top: '2', rim: '3', left: '2', right: '1' });
    for (let k = 0; k < 4; k++) {
      const y = cy - 2 - k * 3;
      line(g, x - 3, y, x + 2, y, 'd');
      line(g, x - 2, y + 1, x + 1, y + 1, 'b');
      plot(g, x - 1, y + 2, '2');
      plot(g, x, y + 2, '1');
    }
    plot(g, x - 1, cy - 14, 'Z');
    plot(g, x, cy - 15, 'w');
  }
}

/** Capacitor Bank's base: a row of glass jars lit blue at each corner, wired together in brass. */
function bankKit(g: CharGrid, cx: number, cy: number): void {
  for (const side of [-1, 1]) {
    for (const k of [0, 1]) {
      const x = Math.round(cx + side * (8 + k * 4)) - 1;
      const top = cy - 7 + k * 2;
      for (let y = top; y <= cy + 1 + k; y++) {
        for (let px = x; px <= x + 2; px++) {
          const edge = px === x || px === x + 2;
          plot(g, px, y, y === top ? '3' : edge ? 'Y' : y === top + 2 ? 'w' : 'Z');
        }
      }
      plot(g, x + 1, top - 1, '4');
    }
    line(g, Math.round(cx + side * 8), cy - 8, Math.round(cx + side * 12), cy - 6, '2');
  }
}

// Energy: the prong sparks and arcs (`blue.4`), plus the price tag's colors on the base.
const LEGEND = { Z: 'blue.4', Y: 'blue.2', X: 'blue.1' } as const;

export const towerZapcoil = defineSprite({
  id: 'tower.zapcoil',
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
    spec_a: vrellSpecBase(overloadKit),
    spec_b: vrellSpecBase(bankKit),
  },
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
    se: zapcoilHead('se', false),
    se_fire: zapcoilHead('se', true),
    ne: zapcoilHead('ne', false),
    ne_fire: zapcoilHead('ne', true),
    se_t2: zapcoilHead('se', false, 't2'),
    se_t2_fire: zapcoilHead('se', true, 't2'),
    ne_t2: zapcoilHead('ne', false, 't2'),
    ne_t2_fire: zapcoilHead('ne', true, 't2'),
    se_spec_a: zapcoilHead('se', false, 'overload'),
    se_spec_a_fire: zapcoilHead('se', true, 'overload'),
    ne_spec_a: zapcoilHead('ne', false, 'overload'),
    ne_spec_a_fire: zapcoilHead('ne', true, 'overload'),
    se_spec_b: zapcoilHead('se', false, 'bank'),
    se_spec_b_fire: zapcoilHead('se', true, 'bank'),
    ne_spec_b: zapcoilHead('ne', false, 'bank'),
    ne_spec_b_fire: zapcoilHead('ne', true, 'bank'),
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
    fire_se_spec_a: { frames: ['se_spec_a_fire', 'se_spec_a'], fps: 12, loop: false },
    fire_sw_spec_a: { mirrorOf: 'fire_se_spec_a' },
    fire_ne_spec_a: { frames: ['ne_spec_a_fire', 'ne_spec_a'], fps: 12, loop: false },
    fire_nw_spec_a: { mirrorOf: 'fire_ne_spec_a' },
    // The Capacitor's discharge: a long, heavy crack.
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
