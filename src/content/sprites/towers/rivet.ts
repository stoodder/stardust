// Rivet Autoturret (`rivet`): Everglow RV-1, a white housing with long twin barrels and a teal
// sensor. Hitscan, so its fire frame is a muzzle flash.
import { defineSprite } from '../defineSprite.ts';
import { grid, isoBox, line, plot, rows } from '../helpers.ts';
import { BASE_ANCHOR, BASE_H, BASE_MOUNT, BASE_W, everglowBase } from './base.ts';

const W = 22;
const H = 17;
const CX = 8;
const CY = 14;

function barrels(g: string[][], facing: 'se' | 'ne', fire: boolean): void {
  // Two barrels 2 px apart, each a dark line with a lit top edge, ending in a white muzzle.
  const dir = facing === 'se' ? 1 : -1;
  for (const off of [0, 3]) {
    const x0 = CX + 3;
    const y0 = (facing === 'se' ? CY - 6 : CY - 9) + off;
    const x1 = x0 + 9;
    const y1 = y0 + dir * 4;
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
  // Recoil shroud where the barrels leave the housing.
  isoBox(g, CX + 4.5, facing === 'se' ? CY - 3 : CY - 6, 2, 4, {
    top: '1',
    rim: '2',
    left: '1',
    right: '0',
  });
}

function rivetHead(facing: 'se' | 'ne', fire: boolean): string[] {
  const g = grid(W, H);
  if (facing === 'ne') barrels(g, facing, fire);
  isoBox(g, CX, CY, 6, 1, { top: '7', rim: '8', left: '7', right: '6' });
  isoBox(g, CX, CY - 1, 6, 6, { top: '4', rim: '4', left: '3', right: '2' });
  isoBox(g, CX, CY - 7, 3.5, 1, { top: '3', rim: '4', left: '2', right: '1' });
  if (facing === 'se') {
    // The teal sensor on the front face, then the barrels over the housing.
    plot(g, CX + 1, CY - 4, '+');
    plot(g, CX + 2, CY - 4, '*');
    plot(g, CX + 2, CY - 5, '+');
    barrels(g, facing, fire);
  } else {
    plot(g, CX - 3, CY - 4, '1'); // vents on the back face
    plot(g, CX - 2, CY - 4, '1');
  }
  return rows(g);
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
  frames: { t1: everglowBase(1, '7'), t2: everglowBase(2, '7'), t3: everglowBase(3, '7') },
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
  },
  anims: {
    fire_se: { frames: ['se_fire', 'se'], fps: 12, loop: false },
    fire_sw: { mirrorOf: 'fire_se' },
    fire_ne: { frames: ['ne_fire', 'ne'], fps: 12, loop: false },
    fire_nw: { mirrorOf: 'fire_ne' },
  },
});
