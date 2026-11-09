// Frostline Sprinkler (`sprinkler`): an AquaGuard irrigation head, creatively repurposed. A teal
// tank with a spinning three-arm nozzle that flicks frost. It pulses, so it has no facings.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, isoBox, line, plot, rows } from '../helpers.ts';
import { BASE_ANCHOR, BASE_H, BASE_MOUNT, BASE_W, everglowBase } from './base.ts';

const W = 20;
const H = 18;
const CX = 10;
const CY = 15;
const ARM_RX = 7;
const ARM_RY = 3.5;

/** Spin frame `k` of 3: the arms are 120° apart, so 3 × 40° steps loop seamlessly. */
function sprinklerHead(k: number): string[] {
  const g = grid(W, H);
  isoBox(g, CX, CY, 6, 2, { top: '3', rim: '4', left: '2', right: '1' });
  // The tank: a teal dome with a frosty highlight.
  disc(g, CX, CY - 5, 4.5, (d, x, y) =>
    d > 3.7 ? '6' : x < CX - 1 && y < CY - 6 ? 'B' : x < CX + 1 ? '8' : '7',
  );
  plot(g, CX - 2, CY - 8, 'w');
  // Riser pipe and hub.
  line(g, CX, CY - 9, CX, CY - 12, '2');
  line(g, CX - 1, CY - 9, CX - 1, CY - 12, '3');
  const hubY = CY - 13;
  for (let a = 0; a < 3; a++) {
    const t = ((k * 40 + a * 120) * Math.PI) / 180;
    const ex = Math.round(CX - 0.5 + Math.cos(t) * ARM_RX);
    const ey = Math.round(hubY + Math.sin(t) * ARM_RY);
    line(g, CX - 1, hubY, ex, ey, '1');
    plot(g, ex, ey, 'B');
    plot(g, ex, ey - 1, 'C');
  }
  plot(g, CX - 1, hubY, '4');
  plot(g, CX, hubY, '3');
  return rows(g);
}

export const towerSprinkler = defineSprite({
  id: 'tower.sprinkler',
  size: { w: BASE_W, h: BASE_H },
  anchor: BASE_ANCHOR,
  mount: BASE_MOUNT,
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: { t1: everglowBase(1, '8'), t2: everglowBase(2, '8'), t3: everglowBase(3, '8') },
});

export const towerSprinklerHead = defineSprite({
  id: 'tower.sprinkler_head',
  size: { w: W, h: H },
  anchor: { x: CX, y: CY },
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  // Frost: the one non-Everglow hue on it, fixed across palettes.
  legend: { B: 'blue.4', C: 'white.1' },
  frames: { spin_0: sprinklerHead(0), spin_1: sprinklerHead(1), spin_2: sprinklerHead(2) },
  anims: { spin: { frames: ['spin_0', 'spin_1', 'spin_2'], fps: 8 } },
});
