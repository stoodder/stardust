// Thumper Mortar (`thumper`): Everglow TM-4, a squat mount with a fat hazard-striped tube.
// Lobbed shells, so the fire frame is a warm flash plus smoke at the muzzle.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, isoBox, plot, rows } from '../helpers.ts';
import { BASE_ANCHOR, BASE_H, BASE_MOUNT, BASE_W, everglowBase } from './base.ts';

const W = 20;
const H = 20;
const CX = 9;
const CY = 17;

function thumperHead(facing: 'se' | 'ne', fire: boolean): string[] {
  const g = grid(W, H);
  isoBox(g, CX, CY, 7, 3, { top: '3', rim: '4', left: '2', right: '1' });
  // Trunnion cheeks either side of the tube.
  isoBox(g, CX - 4, CY - 3, 2, 3, { top: '2', rim: '3', left: '1', right: '0' });
  // The tube: discs stepped up and toward the facing, shaded lit-left.
  const lean = facing === 'se' ? 1 : 0.6;
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const x = CX + 0.5 + i * 0.4 * lean;
    const y = CY - 4 - i;
    const band = i === 3 || i === 4;
    disc(g, x, y, 3.8, (d, px) => {
      if (band) return (px + i) % 2 === 0 ? 'c' : 'd';
      if (px + 0.5 < x - 1.5) return '4';
      if (px + 0.5 < x + 0.5) return '3';
      return d > 3 ? '1' : '2';
    });
  }
  // The muzzle: a rim ellipse with a dark bore (taller when tilted toward the viewer).
  const mx = CX + 0.5 + steps * 0.4 * lean;
  const my = CY - 4 - steps;
  const ry = facing === 'se' ? 1.6 : 1.1;
  for (let y = Math.floor(my - 3); y <= Math.ceil(my + 3); y++) {
    for (let x = Math.floor(mx - 4); x <= Math.ceil(mx + 4); x++) {
      const e = ((x + 0.5 - mx) / 4) ** 2 + ((y + 0.5 - my) / (ry + 0.9)) ** 2;
      const inner = ((x + 0.5 - mx) / 2.6) ** 2 + ((y + 0.5 - my) / ry) ** 2;
      if (inner <= 1) plot(g, x, y, 'k');
      else if (e <= 1) plot(g, x, y, y + 0.5 < my ? '2' : '4');
    }
  }
  if (fire) {
    disc(g, mx, my - 1.5, 2.6, (d) => (d < 1.2 ? 'w' : 'e'));
    plot(g, Math.round(mx) - 3, Math.round(my) - 3, '4');
    plot(g, Math.round(mx) + 3, Math.round(my) - 3, '4');
  }
  return rows(g);
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
  frames: { t1: everglowBase(1, 'c'), t2: everglowBase(2, 'c'), t3: everglowBase(3, 'c') },
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
  },
  anims: {
    fire_se: { frames: ['se_fire', 'se'], fps: 10, loop: false },
    fire_sw: { mirrorOf: 'fire_se' },
    fire_ne: { frames: ['ne_fire', 'ne'], fps: 10, loop: false },
    fire_nw: { mirrorOf: 'fire_ne' },
  },
});
