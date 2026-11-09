// Weft Warden (`weft_warden`, design/enemies.md § 5.2): heavy shield, light armor, slow. A tall
// lumenglass warden woven like cloth (art-direction §4: woven, never plated): a pointed-arch body of
// warp and weft (the only Aelari woven square, its threads close enough to be its light armor), a
// fringe of loose thread at its hem that sways as it glides, ruby knots at its brow and shoulders,
// a slit of light for its gaze, and a broad white-hot heart. It is the biggest Aelari line unit
// on the road, so its shield bubble (render) is too. Its `walk` is a slow glide: a 1 px bob, the
// hum, the fringe swinging (3 fps). From behind: no gaze, a dimmer heart.
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { hum, outlineOutside, rim, weave, type Mask } from './lattice.ts';

const W = 21;
const H = 27;
const CX = 10.5;
const TOP = 1;
const SHOULDER = 8;
const HEM = 21;

/** The waist (row): the body draws in under the shoulders, then flares to a bell at the hem. */
const WAIST = 14;

/**
 * Half-width at row y (bob `b` lifts it): a pointed hood to the shoulders, drawn in at the waist,
 * flared at the hem.
 */
function halfWidth(y: number, b: number): number {
  const yy = y + 0.5 + b;
  if (yy < TOP || yy > HEM) return -1;
  if (yy < SHOULDER) return 8.4 * Math.pow((yy - TOP) / (SHOULDER - TOP), 0.75);
  if (yy < WAIST) return 8.4 - ((yy - SHOULDER) / (WAIST - SHOULDER)) * 2.4;
  return 6 + ((yy - WAIST) / (HEM - WAIST)) * 3.4;
}

function warden(facing: 'se' | 'ne', beat: 0 | 1): string[] {
  const g: CharGrid = grid(W, H);
  const b = beat;
  const mask: Mask = (x, y) => {
    const hw = halfWidth(y, b);
    return hw >= 0 && Math.abs(x + 0.5 - CX) <= hw;
  };
  const front = facing === 'se';
  weave(g, mask, { mode: 'grid', spacing: 3, phase: 1, rise: b, lx: CX, ly: 12 - b }, 8);
  rim(g, mask, CX, 11 - b);
  // A second, diagonal pass over the chest: the warden's woven breastplate, its light armor.
  const chest: Mask = (x, y) => mask(x, y) && Math.abs(x + 0.5 - CX) < 5 && y + b > 9 && y + b < 17;
  weave(g, chest, { mode: 'diag', spacing: 4, phase: 1, rise: b, lx: CX, ly: 12 - b }, 8);
  hum(g, mask, beat, front ? 5 : 6);
  // The fringe: loose warp threads hanging from the hem, swinging a pixel each beat.
  const hem = HEM - b;
  for (let x = 3; x <= 17; x += 2) {
    const len = 1 + ((x * 7) % 2);
    const sway = beat === 0 ? 0 : x < CX ? -1 : 1;
    for (let k = 0; k < len; k++) plot(g, x + (k === len - 1 ? sway : 0), hem + 1 + k, '3');
  }
  const top = TOP - b;
  // Ruby knots: the brow and both shoulders; a ruby thread hangs from each shoulder knot.
  plot(g, 10, top, 'd');
  plot(g, 10, top + 1, 'c');
  stamp(g, 3, SHOULDER - b, ['d', 'c', 'b']);
  stamp(g, 17, SHOULDER - b, ['d', 'c', 'b']);
  // The heart, broad and white-hot; from behind, its glow through the weave.
  stamp(
    g,
    8,
    12 - b,
    front
      ? ['.+++.', '++*++', '+***+', '++*++', '.+++.']
      : ['..+..', '.+.+.', '+...+', '.+.+.', '..+..'],
  );
  // A slit of light for its gaze, toward the way it glides.
  if (front) stamp(g, 11, 5 - b, ['+**w']);
  outlineOutside(g);
  return rows(g);
}

export const enemyWeftWarden = defineSprite({
  id: 'enemy.weft_warden',
  size: { w: W, h: H },
  anchor: { x: 11, y: 26 },
  palette: 'aelari',
  // The outline is the weave's own (lattice.ts `outlineOutside`), so the gaps stay see-through.
  outline: 'none',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: {
    walk_se_0: warden('se', 0),
    walk_se_1: warden('se', 1),
    walk_ne_0: warden('ne', 0),
    walk_ne_1: warden('ne', 1),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1'], fps: 3 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1'], fps: 3 },
    walk_nw: { mirrorOf: 'walk_ne' },
  },
});
