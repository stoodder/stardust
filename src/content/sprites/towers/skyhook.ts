// Skyhook Flak Battery (`skyhook`): Everglow SK-2, "Keep Your Skies Corporate". It shoots only at
// the air, so its guns never point at the ground: twin long flak barrels stand almost straight up
// from a white cradle, leaning a little toward the target, with a teal radar dish on the cradle's
// shoulder. That steep, tall silhouette is what sets it apart from the Rivet's level barrels at 1×.
// Its base wears a sky-blue trim ring. Each shot is a white-hot, orange-rimmed flash at the
// muzzles. From tier 2 (D029: the upgrade reads in the head too) it is a quad mount: two more
// barrels outboard and an orange ready-round box on the cradle's flank. The tier-4 specs
// (design/towers.md § 7): **Flak Curtain** (`spec_a`) is a fan of six barrels in a wide shield
// collar, every muzzle flashing at once, on a base racked with orange flak shells; **Seeker Swarm**
// (`spec_b`) swaps the guns for a white four-tube missile pod, teal noses showing (its missiles'
// colour, art-direction §7), on a base with a missile cradle and a big radar mast.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, isoBox, line, plot, rows, type CharGrid } from '../helpers.ts';
import {
  BASE_ANCHOR,
  BASE_H,
  BASE_MOUNT,
  BASE_W,
  everglowBase,
  everglowSpecBase,
  JAILBREAK_LEGEND,
  withJailbreak,
} from './base.ts';

const W = 28;
const H = 28;
const CX = 13;
const CY = 25;

type Facing = 'se' | 'ne';
type Kit = 't1' | 't2' | 'curtain' | 'seeker';

/**
 * One barrel from the cradle at (x0, y0) up to (x1, y1): a lit left edge over a dark right edge,
 * a ringed flash hider, and a white muzzle.
 */
function barrel(g: CharGrid, x0: number, y0: number, x1: number, y1: number): void {
  line(g, x0, y0, x1, y1, '4');
  line(g, x0 + 1, y0, x1 + 1, y1, '1');
  plot(g, x1, y1 + 3, '0');
  plot(g, x1 + 1, y1 + 3, '0');
  plot(g, x1, y1, 'w');
  plot(g, x1 + 1, y1, '3');
}

/** The barrels for a tier-1 (twin) or tier-2+ (quad) mount; returns the muzzle points. */
function guns(g: CharGrid, quad: boolean, six = false): [number, number][] {
  // A six-gun curtain is two banks of three, side by side, all standing as tall.
  const offs = six ? [-9, -7, -5, 2, 4, 6] : quad ? [-5, -2, 1, 4] : [-2, 2];
  const out: [number, number][] = [];
  for (const o of offs) {
    // Outboard barrels stand a little shorter, so a quad mount fans like a hand of cards.
    const top = six ? 3 : Math.abs(o) > 3 ? 4 : 1;
    const x0 = CX + o;
    const x1 = x0 + 4;
    barrel(g, x0, CY - 8, x1, top);
    out.push([x1, top]);
  }
  return out;
}

function flash(g: CharGrid, muzzles: readonly [number, number][]): void {
  for (const [x, y] of muzzles) {
    // A white star at the muzzle in a safety-orange fireball, under a dark flak puff.
    disc(g, x + 1, y + 0.5, 1.7, () => 'e');
    plot(g, x, y, 'w');
    plot(g, x + 1, y, 'w');
    plot(g, x + 2, y - 1, 'd');
  }
  const [x, y] = muzzles[Math.floor(muzzles.length / 2)] ?? [CX, 2];
  plot(g, x - 1, Math.max(0, y - 1), '1');
}

function cradle(g: CharGrid, facing: Facing, quad: boolean): void {
  // The turntable collar, then the white cradle the barrels pivot in.
  isoBox(g, CX, CY, 6, 2, { top: '7', rim: '8', left: '7', right: '6' });
  isoBox(g, CX, CY - 2, 5.5, 5, { top: '4', rim: '4', left: '3', right: '2' });
  // Trunnion pins either side.
  plot(g, CX - 6, CY - 6, '1');
  plot(g, CX + 5, CY - 6, '0');
  if (quad) {
    // The ready-round box on the left flank, safety orange.
    isoBox(g, CX - 6, CY + 1, 2.5, 5, { top: 'd', rim: 'e', left: 'c', right: 'b' });
  }
  if (facing === 'se') {
    // A teal sight on the cradle's front face.
    plot(g, CX + 1, CY - 4, '+');
    plot(g, CX + 2, CY - 4, '*');
  }
}

/** The radar dish on a short arm at the cradle's back shoulder, its face lit teal. */
function radar(g: CharGrid, facing: Facing, big = false): void {
  const x = facing === 'se' ? CX - 6 : CX + 6;
  const r = big ? 3.2 : 2.2;
  line(g, x, CY - 7, x, CY - 10, '2');
  disc(g, x + 0.5, CY - 12, r, (d) => (d > r - 0.7 ? '6' : '8'));
  plot(g, x, CY - 12, '*');
}

/**
 * Seeker Swarm's pod: a white launcher box tipped up toward the sky, four tube mouths in its face
 * with teal missile noses in them (dark and flashing when it fires).
 */
function pod(g: CharGrid, facing: Facing, fire: boolean): void {
  const lean = facing === 'se' ? 1 : -1;
  // The box: three faces, lit left, tipped up so its face looks at the sky.
  for (let y = 3; y <= CY - 6; y++) {
    const x0 = CX - 5 + Math.round((CY - 6 - y) * 0.3 * lean);
    for (let x = x0; x <= x0 + 10; x++) plot(g, x, y, x === x0 ? '4' : x >= x0 + 9 ? '2' : '3');
  }
  // The face: four tube mouths in a 2 × 2, a white rim round each.
  for (const [tx, ty] of [
    [-3, 5],
    [2, 5],
    [-3, 10],
    [2, 10],
  ] as const) {
    const x = CX + tx + Math.round((CY - 6 - ty) * 0.3 * lean);
    plot(g, x, ty, 'w');
    plot(g, x + 1, ty, 'w');
    plot(g, x, ty + 1, fire ? '*' : '+');
    plot(g, x + 1, ty + 1, fire ? 'e' : '*');
    plot(g, x, ty + 2, fire ? 'e' : '0');
    plot(g, x + 1, ty + 2, '0');
  }
  if (fire) {
    // Exhaust bursting from the top pair.
    for (const [ox, oy] of [
      [-3, 2],
      [3, 2],
      [-2, 1],
      [4, 1],
    ] as const)
      plot(g, CX + ox + lean * 2, oy, 'd');
  }
}

/** Flak Curtain's shield collar: a wide white blast plate the six barrels rise through. */
function collar(g: CharGrid): void {
  for (const bx of [CX - 5, CX + 6]) {
    isoBox(g, bx, CY - 6, 3.5, 3, { top: '4', rim: '4', left: '3', right: '2' });
    plot(g, bx - 1, CY - 7, 'c');
    plot(g, bx, CY - 7, 'c');
  }
}

function skyhookHead(facing: Facing, fire: boolean, kit: Kit = 't1'): string[] {
  const g = grid(W, H);
  const quad = kit !== 't1';
  const six = kit === 'curtain';
  const draw = (): void => {
    if (kit === 'seeker') pod(g, facing, fire);
    else {
      const m = guns(g, quad, six);
      if (fire) flash(g, m);
    }
  };
  if (facing === 'ne') {
    // Seen from behind, the barrels rise beyond the cradle; the radar sits in front.
    draw();
    cradle(g, facing, quad);
    if (six) collar(g);
    radar(g, facing, kit === 'seeker');
  } else {
    radar(g, facing, kit === 'seeker');
    cradle(g, facing, quad);
    if (six) collar(g);
    draw();
  }
  return rows(g);
}

/** Flak Curtain's base: a rack of orange flak shells standing at each side corner. */
function curtainKit(g: CharGrid, cx: number, cy: number): void {
  for (const side of [-1, 1]) {
    const x = cx + side * 10;
    isoBox(g, x, cy + 1, 3.5, 3, { top: '2', rim: '3', left: '2', right: '1' });
    for (const dx of [-2, 0, 2]) {
      const px = Math.round(x) + dx;
      for (let y = cy - 8 + Math.abs(dx); y <= cy - 2; y++)
        plot(g, px, y, y < cy - 6 + Math.abs(dx) ? 'e' : 'c');
      plot(g, px - 1, cy - 4, 'd');
    }
  }
}

/** Seeker Swarm's base: a cradle of spare missiles at the right corner, a radar mast at the left. */
function seekerKit(g: CharGrid, cx: number, cy: number): void {
  const rx = cx + 10;
  isoBox(g, rx, cy + 1, 3.5, 4, { top: '2', rim: '3', left: '2', right: '1' });
  for (const dy of [-6, -9]) {
    line(g, rx - 4, cy + dy + 2, rx + 3, cy + dy - 1, '4');
    line(g, rx - 4, cy + dy + 3, rx + 3, cy + dy, '2');
    plot(g, rx + 4, cy + dy - 1, '8');
  }
  const lx = cx - 10;
  for (let y = cy - 16; y <= cy + 1; y++) {
    plot(g, lx - 1, y, '3');
    plot(g, lx, y, '1');
  }
  disc(g, lx - 0.5, cy - 19, 3.2, (d) => (d > 2.3 ? '6' : d > 1 ? '8' : '*'));
}

export const towerSkyhook = defineSprite({
  id: 'tower.skyhook',
  size: { w: BASE_W, h: BASE_H },
  anchor: BASE_ANCHOR,
  mount: BASE_MOUNT,
  palette: 'everglow',
  variants: ['everglow.worn', 'everglow.jailbroken'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  // The sky-blue trim ring: the one tower that looks up.
  legend: { B: 'blue.3', ...JAILBREAK_LEGEND },
  frames: withJailbreak({
    t1: everglowBase(1, 'B'),
    t2: everglowBase(2, 'B'),
    t3: everglowBase(3, 'B'),
    spec_a: everglowSpecBase('B', curtainKit),
    spec_b: everglowSpecBase('B', seekerKit),
  }),
});

export const towerSkyhookHead = defineSprite({
  id: 'tower.skyhook_head',
  size: { w: W, h: H },
  anchor: { x: CX, y: CY },
  palette: 'everglow',
  variants: ['everglow.worn', 'everglow.jailbroken'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: {
    se: skyhookHead('se', false),
    se_fire: skyhookHead('se', true),
    ne: skyhookHead('ne', false),
    ne_fire: skyhookHead('ne', true),
    se_t2: skyhookHead('se', false, 't2'),
    se_t2_fire: skyhookHead('se', true, 't2'),
    ne_t2: skyhookHead('ne', false, 't2'),
    ne_t2_fire: skyhookHead('ne', true, 't2'),
    se_spec_a: skyhookHead('se', false, 'curtain'),
    se_spec_a_fire: skyhookHead('se', true, 'curtain'),
    ne_spec_a: skyhookHead('ne', false, 'curtain'),
    ne_spec_a_fire: skyhookHead('ne', true, 'curtain'),
    se_spec_b: skyhookHead('se', false, 'seeker'),
    se_spec_b_fire: skyhookHead('se', true, 'seeker'),
    ne_spec_b: skyhookHead('ne', false, 'seeker'),
    ne_spec_b_fire: skyhookHead('ne', true, 'seeker'),
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
    // Flak Curtain fires 3 shots/s: a short flash.
    fire_se_spec_a: { frames: ['se_spec_a_fire', 'se_spec_a'], fps: 16, loop: false },
    fire_sw_spec_a: { mirrorOf: 'fire_se_spec_a' },
    fire_ne_spec_a: { frames: ['ne_spec_a_fire', 'ne_spec_a'], fps: 16, loop: false },
    fire_nw_spec_a: { mirrorOf: 'fire_ne_spec_a' },
    // A Seeker volley: the tubes flare, then hold empty a beat.
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
