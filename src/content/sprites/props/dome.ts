// A Dome Row habitat (apron decor, act1.md § A1M1: the road swings east along the domes):
// a white Everglow dome on a steel ring, a teal band, lit window slits, and a round door.
// `window` (A2M6's `dome_window`, act2.md § A2M6; T540c): Dome 3, an orange "3" on its band and a
// round window on its lit side, warm inside, where rows of butterhead lettuce grow and a small
// coral shape sleeps curled among them (Pebble; T530b lights it in the dark).
import { defineSprite } from '../defineSprite.ts';
import { grid, isoBox, plot, rows } from '../helpers.ts';

const W = 30;
const H = 24;
const CX = 15;
const FOOT_Y = 18;

function domeGrid(look: 'v0' | 'window' = 'v0'): string[] {
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
  if (look === 'window') {
    // The round window on the lit side: warm light, two rows of lettuce, Pebble asleep in them.
    // prettier-ignore
    const win = [
      '..1111..',
      '.1GGGG1.',
      '1GLGGLG1',
      '1MLPQLM1',
      '1LMPPML1',
      '.1LMML1.',
      '..1111..',
    ];
    win.forEach((r, j) =>
      [...r].forEach((ch, i) => ch !== '.' && plot(g, CX - 10 + i, by - 12 + j, ch)),
    );
    // "3" on the band's shaded side.
    // prettier-ignore
    const three = ['cc.', '..c', '.c.', '..c', 'cc.'];
    three.forEach((r, j) =>
      [...r].forEach((ch, i) => ch !== '.' && plot(g, CX + 5 + i, by - 11 + j, ch)),
    );
  }
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
  legend: { G: 'gold.4', L: 'green.3', M: 'green.2', P: 'coral.3', Q: 'coral.4' },
  frames: { v0: domeGrid(), window: domeGrid('window') },
});
