// A Dome Row habitat (apron decor, act1.md § A1M1: the road swings east along the domes):
// a white Everglow dome on a steel ring, a teal band, lit window slits, and a round door.
import { defineSprite } from '../defineSprite.ts';
import { grid, isoBox, plot, rows } from '../helpers.ts';

const W = 30;
const H = 24;
const CX = 15;
const FOOT_Y = 18;

function domeGrid(): string[] {
  const g = grid(W, H);
  isoBox(g, CX, FOOT_Y + 1, 14, 0, { top: '_', rim: '_', left: '_', right: '_' });
  isoBox(g, CX, FOOT_Y, 13, 2, { top: '2', rim: '3', left: '1', right: '0' });
  // The shell: a half-ellipse lit from the upper left.
  const rx = 12;
  const ry = 13;
  const by = FOOT_Y - 2;
  for (let y = by - ry; y < by; y++) {
    for (let x = CX - rx; x < CX + rx; x++) {
      const dx = (x + 0.5 - CX) / rx;
      const dy = (y + 0.5 - by) / ry;
      const d = Math.hypot(dx, dy);
      if (d > 1) continue;
      const lit = -0.7 * dx - 0.7 * dy;
      plot(g, x, y, lit > 0.75 && d < 0.8 ? 'w' : lit > 0.35 ? '4' : lit > -0.15 ? '3' : '2');
    }
  }
  // The teal band, then window slits glowing along it.
  for (let x = CX - rx + 1; x < CX + rx - 1; x++) plot(g, x, by - 4, x < CX ? '8' : '7');
  for (const x of [CX - 8, CX - 4, CX + 4, CX + 8]) {
    plot(g, x, by - 6, '+');
    plot(g, x + 1, by - 6, '*');
  }
  // The round door, front and center.
  for (let y = by - 4; y < by; y++) {
    for (let x = CX - 2; x < CX + 2; x++) plot(g, x, y, y === by - 4 ? '1' : '0');
  }
  plot(g, CX + 1, by - 2, 'd');
  return rows(g);
}

export const propDome = defineSprite({
  id: 'prop.dome',
  size: { w: W, h: H },
  anchor: { x: CX, y: FOOT_Y },
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: { v0: domeGrid() },
});
