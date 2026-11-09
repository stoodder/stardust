// Rivet Autoturret (`rivet`): Everglow RV-1, a white housing with long twin barrels and a teal
// sensor. Hitscan, so its fire frame is a muzzle flash. From tier 2 the head is up-armored too, so
// the upgrade reads in the head's silhouette as well as the base's (D029): longer barrels, an
// orange ammo drum on the flank, and an armor cap on the housing. The tier-4 specs (design/towers.md
// § 7) change both halves: **Rivet Storm** (`spec_a`) is a minigun, a fat six-barrel rotary fed
// from two big ammo crates on the base; **Railspike** (`spec_b`) is a sniper, one long teal-charged
// rail with a scope, on a base braced by outrigger legs and two capacitor coils.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, isoBox, line, plot, rows, type CharGrid } from '../helpers.ts';
import { BASE_ANCHOR, BASE_H, BASE_MOUNT, BASE_W, everglowBase, everglowSpecBase } from './base.ts';

const W = 34;
const H = 22;
const CX = 8;
const CY = 19;

type Facing = 'se' | 'ne';
/** The head's kit: tier 1, the T2+ up-armor, or a spec. */
type Kit = 't1' | 't2' | 'storm' | 'rail';

/** Where a gun leaves the housing, and the screen slope it runs along (down-right for SE). */
function gunStart(facing: Facing): { x0: number; y0: number; dir: 1 | -1 } {
  return facing === 'se' ? { x0: CX + 3, y0: CY - 6, dir: 1 } : { x0: CX + 3, y0: CY - 9, dir: -1 };
}

function barrels(g: CharGrid, facing: Facing, fire: boolean, long: boolean): void {
  // Two barrels 2 px apart, each a dark line with a lit top edge, ending in a white muzzle.
  const { x0, y0: y00, dir } = gunStart(facing);
  for (const off of [0, 3]) {
    const y0 = y00 + off;
    const x1 = x0 + (long ? 11 : 9);
    const y1 = y0 + dir * (long ? 5 : 4);
    line(g, x0, y0, x1, y1, '0');
    line(g, x0, y0 - 1, x1, y1 - 1, '2');
    plot(g, x1, y1, 'w');
    plot(g, x1, y1 - 1, 'w');
    if (fire) {
      plot(g, x1 + 1, y1, '*');
      plot(g, x1 + 1, y1 - 1, '*');
      plot(g, x1 + 2, y1 + dir - 1, '+');
    }
  }
  shroud(g, facing);
}

/** The recoil shroud where the guns leave the housing. */
function shroud(g: CharGrid, facing: Facing): void {
  isoBox(g, CX + 4.5, facing === 'se' ? CY - 3 : CY - 6, 2, 4, {
    top: '1',
    rim: '2',
    left: '1',
    right: '0',
  });
}

/**
 * Rivet Storm's rotary: a fat bundle of barrels (five rows of alternating lit and dark stripes,
 * which shift one row on the `spin` frame so the barrels read as turning), a clamp collar, and a
 * muzzle ring of bores. Short and fat next to Railspike's long rail.
 */
function rotary(g: CharGrid, facing: Facing, fire: boolean, spin: boolean): void {
  const { x0, y0, dir } = gunStart(facing);
  const len = 10;
  const x1 = x0 + len;
  const y1 = y0 + dir * 5;
  const stripes = spin ? ['1', '3', '0', '4', '0', '2'] : ['3', '0', '4', '0', '2', '1'];
  for (let k = 0; k < 6; k++) line(g, x0, y0 - 3 + k, x1, y1 - 3 + k, stripes[k] ?? '0');
  // The clamp collar two-thirds along, and the muzzle ring: a white rim around dark bores.
  for (const [t, lit] of [
    [0.6, '4'],
    [1, 'w'],
  ] as const) {
    const cx = Math.round(x0 + len * t);
    const cy = Math.round(y0 + dir * 5 * t);
    for (let k = -4; k <= 3; k++) plot(g, cx, cy + k, k === -4 || k === 3 ? '0' : lit);
    plot(g, cx + 1, cy - 3, '2');
    plot(g, cx + 1, cy + 2, '1');
  }
  for (const k of spin ? [-2, 1] : [-1, 2]) plot(g, x1, y1 + k, 'k');
  if (fire) {
    // A big star of a flash: white core, teal halo, sparks flung forward.
    disc(g, x1 + 3.5, y1 + 0.5, 2.6, (d) => (d < 1.3 ? 'w' : '*'));
    plot(g, x1 + 6, y1, '+');
    plot(g, x1 + 3, y1 - 3, '+');
    plot(g, x1 + 3, y1 + 3, '+');
    plot(g, x1 + 6, y1 + dir * 2, '*');
  }
  shroud(g, facing);
}

/**
 * Railspike's rail: two long parallel rails with a teal charge running between them, ending in
 * white tips. It fires a white-hot streak off the end of the rails.
 */
function rail(g: CharGrid, facing: Facing, fire: boolean): void {
  const { x0, y0, dir } = gunStart(facing);
  const len = 16;
  const x1 = x0 + len;
  const y1 = y0 + dir * 8;
  // The charge between the rails: teal, white-hot while firing.
  line(g, x0 + 1, y0 + 1, x1 - 1, y1 + 1, fire ? '*' : '7');
  line(g, x0 + 1, y0, x1 - 1, y1, fire ? 'w' : '8');
  // The rails, each a lit top over a dark underside, and white tips.
  for (const off of [-2, 2]) {
    line(g, x0, y0 + off, x1, y1 + off, off < 0 ? '4' : '2');
    line(g, x0, y0 + off + 1, x1, y1 + off + 1, '0');
  }
  for (const off of [-2, 2]) plot(g, x1, y1 + off, 'w');
  if (fire) {
    // The streak: a white line off the rail's end with a teal halo, and a ring at the tips.
    line(g, x1 + 1, y1 + 1, x1 + 6, y1 + 1 + dir * 2, 'w');
    line(g, x1 + 1, y1, x1 + 6, y1 + dir * 2, '*');
    line(g, x1 + 1, y1 + 2, x1 + 6, y1 + 2 + dir * 2, '+');
    plot(g, x1 + 1, y1 - 2, '+');
    plot(g, x1 + 1, y1 + 3, '+');
  }
  shroud(g, facing);
}

function gun(g: CharGrid, facing: Facing, fire: boolean, kit: Kit, spin: boolean): void {
  if (kit === 'storm') rotary(g, facing, fire, spin);
  else if (kit === 'rail') rail(g, facing, fire);
  else barrels(g, facing, fire, kit === 't2');
}

function rivetHead(facing: Facing, fire: boolean, kit: Kit = 't1', spin = false): string[] {
  const g = grid(W, H);
  if (facing === 'ne') gun(g, facing, fire, kit, spin);
  isoBox(g, CX, CY, 6, 1, { top: '7', rim: '8', left: '7', right: '6' });
  isoBox(g, CX, CY - 1, 6, 6, { top: '4', rim: '4', left: '3', right: '2' });
  isoBox(g, CX, CY - 7, 3.5, 1, { top: '3', rim: '4', left: '2', right: '1' });
  if (kit !== 't1') {
    // An armor cap: a raised plate with a dark seam, standing proud of the housing's top.
    isoBox(g, CX, CY - 8, 4.5, 2, { top: '3', rim: '4', left: '1', right: '0' });
  }
  if (kit === 't2') {
    // The ammo drum slung on the left flank, safety orange, feeding the barrels.
    isoBox(g, CX - 5, CY + 1, 3, 6, { top: 'd', rim: 'e', left: 'c', right: 'b' });
    plot(g, CX - 6, CY - 2, '0');
    plot(g, CX - 5, CY - 2, '0');
  } else if (kit === 'storm') {
    // The belt feed: a chute of rounds (orange caps on dark links) over the left flank.
    for (let i = 0; i < 6; i++) plot(g, CX - 6 + i, CY - 1 - Math.floor(i / 2), i % 2 ? '0' : 'e');
    for (let i = 0; i < 6; i++) plot(g, CX - 6 + i, CY - Math.floor(i / 2), i % 2 ? 'c' : '0');
  } else if (kit === 'rail') {
    // The scope on the cap: a dark tube with a teal lens toward the facing.
    line(g, CX - 3, CY - 12, CX + 2, CY - 12, '1');
    line(g, CX - 3, CY - 13, CX + 2, CY - 13, '3');
    plot(g, CX + 3, CY - 13, facing === 'se' ? '*' : '0');
    plot(g, CX + 3, CY - 12, facing === 'se' ? '+' : '0');
    plot(g, CX - 1, CY - 11, '0');
  }
  if (facing === 'se') {
    // The teal sensor on the front face, then the gun over the housing.
    plot(g, CX + 1, CY - 4, '+');
    plot(g, CX + 2, CY - 4, '*');
    plot(g, CX + 2, CY - 5, '+');
    gun(g, facing, fire, kit, spin);
  } else {
    plot(g, CX - 3, CY - 4, '1'); // vents on the back face
    plot(g, CX - 2, CY - 4, '1');
  }
  return rows(g);
}

/** A band across a block's side faces, `y` px above its footprint center (side-face pixels only). */
function band(g: CharGrid, cx: number, cy: number, hw: number, y: number, ch: string): void {
  for (let x = Math.floor(cx - hw); x < Math.ceil(cx + hw); x++) {
    const yy = cy - y + (Math.abs(x + 0.5 - cx) <= 1 ? 1 : 0);
    const under = g[yy]?.[x];
    if (under === 'd' || under === 'c' || under === '1' || under === '2') plot(g, x, yy, ch);
  }
}

/** Rivet Storm's base: a big safety-orange ammo crate at each side corner, strapped and stenciled. */
function stormKit(g: CharGrid, cx: number, cy: number): void {
  for (const side of [-1, 1]) {
    const x = cx + side * 10;
    // Lit bright (top and left in the light steps), so the crates sit in the actors' value band.
    isoBox(g, x, cy + 1, 3.5, 9, { top: 'e', rim: 'e', left: 'd', right: 'c' });
    band(g, x, cy + 1, 3.5, 3, '1');
    band(g, x, cy + 1, 3.5, 7, '1');
    plot(g, Math.round(x) + side * 2 - (side < 0 ? 1 : 0), cy - 1, 'w');
  }
}

/**
 * Railspike's base: outrigger legs braced out from the front faces (a wide, low bipod stance) and
 * a capacitor coil at each side corner, banded with teal charge rings under a white cap.
 */
function railKit(g: CharGrid, cx: number, cy: number): void {
  for (const side of [-1, 1]) {
    line(g, cx + side * 5, cy + 3, cx + side * 13, cy + 5, '1');
    line(g, cx + side * 5, cy + 4, cx + side * 13, cy + 6, '0');
    line(g, cx + side * 12, cy + 6, cx + side * 14, cy + 6, '2');
    const x = cx + side * 10;
    isoBox(g, x, cy + 1, 2.5, 12, { top: '4', rim: 'w', left: '3', right: '1' });
    for (const y of [3, 6, 9]) {
      for (let px = Math.floor(x - 2.5); px < Math.ceil(x + 2.5); px++) {
        const yy = cy + 1 - y + (Math.abs(px + 0.5 - x) <= 1 ? 1 : 0);
        plot(g, px, yy, px + 0.5 < x ? '+' : '8');
      }
    }
    plot(g, Math.round(x) - 1, cy - 12, '*');
    plot(g, Math.round(x), cy - 12, '*');
  }
}

export const towerRivet = defineSprite({
  id: 'tower.rivet',
  size: { w: BASE_W, h: BASE_H },
  anchor: BASE_ANCHOR,
  mount: BASE_MOUNT,
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: {
    t1: everglowBase(1, '7'),
    t2: everglowBase(2, '7'),
    t3: everglowBase(3, '7'),
    spec_a: everglowSpecBase('7', stormKit),
    spec_b: everglowSpecBase('7', railKit),
  },
});

export const towerRivetHead = defineSprite({
  id: 'tower.rivet_head',
  size: { w: W, h: H },
  anchor: { x: CX, y: CY },
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: {
    se: rivetHead('se', false),
    se_fire: rivetHead('se', true),
    ne: rivetHead('ne', false),
    ne_fire: rivetHead('ne', true),
    se_t2: rivetHead('se', false, 't2'),
    se_t2_fire: rivetHead('se', true, 't2'),
    ne_t2: rivetHead('ne', false, 't2'),
    ne_t2_fire: rivetHead('ne', true, 't2'),
    se_spec_a: rivetHead('se', false, 'storm'),
    se_spec_a_fire: rivetHead('se', true, 'storm'),
    se_spec_a_spin: rivetHead('se', false, 'storm', true),
    ne_spec_a: rivetHead('ne', false, 'storm'),
    ne_spec_a_fire: rivetHead('ne', true, 'storm'),
    ne_spec_a_spin: rivetHead('ne', false, 'storm', true),
    se_spec_b: rivetHead('se', false, 'rail'),
    se_spec_b_fire: rivetHead('se', true, 'rail'),
    ne_spec_b: rivetHead('ne', false, 'rail'),
    ne_spec_b_fire: rivetHead('ne', true, 'rail'),
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
    // Rivet Storm fires 7.5 shots/s: flash, the barrels turn, rest (about one shot's length).
    fire_se_spec_a: {
      frames: ['se_spec_a_fire', 'se_spec_a_spin', 'se_spec_a'],
      fps: 24,
      loop: false,
    },
    fire_sw_spec_a: { mirrorOf: 'fire_se_spec_a' },
    fire_ne_spec_a: {
      frames: ['ne_spec_a_fire', 'ne_spec_a_spin', 'ne_spec_a'],
      fps: 24,
      loop: false,
    },
    fire_nw_spec_a: { mirrorOf: 'fire_ne_spec_a' },
    // Railspike: a long flash for a slow, heavy shot.
    fire_se_spec_b: {
      frames: ['se_spec_b_fire', 'se_spec_b_fire', 'se_spec_b'],
      fps: 12,
      loop: false,
    },
    fire_sw_spec_b: { mirrorOf: 'fire_se_spec_b' },
    fire_ne_spec_b: {
      frames: ['ne_spec_b_fire', 'ne_spec_b_fire', 'ne_spec_b'],
      fps: 12,
      loop: false,
    },
    fire_nw_spec_b: { mirrorOf: 'fire_ne_spec_b' },
  },
});
