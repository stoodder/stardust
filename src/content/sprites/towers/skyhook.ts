// Skyhook Flak Battery (`skyhook`): Everglow SK-2, "Keep Your Skies Corporate". It shoots only at
// the air, so its guns never point at the ground: twin long flak barrels stand almost straight up
// from a white cradle, leaning a little toward the target, with a teal radar dish on the cradle's
// shoulder. That steep, tall silhouette is what sets it apart from the Rivet's level barrels at 1×.
// Its base wears a sky-blue trim ring. Each shot is a white-hot, orange-rimmed flash at the
// muzzles. From tier 2 (D029: the upgrade reads in the head too) it is a quad mount: two more
// barrels outboard and an orange ready-round box on the cradle's flank.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, isoBox, line, plot, rows, type CharGrid } from '../helpers.ts';
import { BASE_ANCHOR, BASE_H, BASE_MOUNT, BASE_W, everglowBase } from './base.ts';

const W = 24;
const H = 28;
const CX = 11;
const CY = 25;

type Facing = 'se' | 'ne';

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
function guns(g: CharGrid, quad: boolean): [number, number][] {
  const offs = quad ? [-5, -2, 1, 4] : [-2, 2];
  const out: [number, number][] = [];
  for (const o of offs) {
    // Outboard barrels stand a little shorter, so a quad mount fans like a hand of cards.
    const top = Math.abs(o) > 3 ? 4 : 1;
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
function radar(g: CharGrid, facing: Facing): void {
  const x = facing === 'se' ? CX - 6 : CX + 6;
  line(g, x, CY - 7, x, CY - 10, '2');
  disc(g, x + 0.5, CY - 12, 2.2, (d) => (d > 1.5 ? '6' : '8'));
  plot(g, x, CY - 12, '*');
}

function skyhookHead(facing: Facing, fire: boolean, quad: boolean): string[] {
  const g = grid(W, H);
  if (facing === 'ne') {
    // Seen from behind, the barrels rise beyond the cradle; the radar sits in front.
    const m = guns(g, quad);
    cradle(g, facing, quad);
    radar(g, facing);
    if (fire) flash(g, m);
  } else {
    radar(g, facing);
    cradle(g, facing, quad);
    const m = guns(g, quad);
    if (fire) flash(g, m);
  }
  return rows(g);
}

export const towerSkyhook = defineSprite({
  id: 'tower.skyhook',
  size: { w: BASE_W, h: BASE_H },
  anchor: BASE_ANCHOR,
  mount: BASE_MOUNT,
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  // The sky-blue trim ring: the one tower that looks up.
  legend: { B: 'blue.3' },
  frames: { t1: everglowBase(1, 'B'), t2: everglowBase(2, 'B'), t3: everglowBase(3, 'B') },
});

export const towerSkyhookHead = defineSprite({
  id: 'tower.skyhook_head',
  size: { w: W, h: H },
  anchor: { x: CX, y: CY },
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: {
    se: skyhookHead('se', false, false),
    se_fire: skyhookHead('se', true, false),
    ne: skyhookHead('ne', false, false),
    ne_fire: skyhookHead('ne', true, false),
    se_t2: skyhookHead('se', false, true),
    se_t2_fire: skyhookHead('se', true, true),
    ne_t2: skyhookHead('ne', false, true),
    ne_t2_fire: skyhookHead('ne', true, true),
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
