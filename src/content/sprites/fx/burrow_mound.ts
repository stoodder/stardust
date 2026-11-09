// A burrower underground (design/enemies.md § 2.6; art-direction §8, the `burrower` tell): the
// generic travelling mound a unit without its own `under` anim draws while burrowed (the Digger;
// Chitterbloom has her own, crown and all). A low hump of turned earth in the `grime` ramp, lit on
// top, with crumbs tumbling off it and a 1 px ripple of disturbed ground spreading either side, so
// it reads as "something is moving under there" (shape and motion, not color). Two frames, the
// crumbs and ripple shifting, 6 fps. Drawn at the unit's ground point, on whatever ground it's on.
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows } from '../helpers.ts';

const W = 16;
const H = 8;
/** The hump's center (pixel edges) and size. */
const CX = 8;
const BASE_Y = 6;
const RX = 4.6;
const RY = 3.4;

function mound(k: 0 | 1): string[] {
  const g = grid(W, H);
  // The ripple: dashes of dark disturbed ground either side, spreading out a pixel on frame 1.
  const reach = 6 + k;
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 3; i++) {
      const x = Math.round(CX + side * (reach - i * 0.5)) - (side < 0 ? 1 : 0);
      if ((i + k) % 2 === 0) plot(g, x, BASE_Y + (i === 0 ? 0 : 1), 'M');
    }
  }
  // The hump: an upper half-ellipse, lit `grime.4` on its crown, `grime.3` body, `grime.2` foot.
  for (let y = 0; y <= BASE_Y; y++) {
    for (let x = 0; x < W; x++) {
      const nx = (x + 0.5 - CX) / RX;
      const ny = (y + 0.5 - BASE_Y) / RY;
      if (nx * nx + ny * ny > 1 || y > BASE_Y) continue;
      const h = BASE_Y - y;
      plot(g, x, y, h >= 3 ? 'O' : h >= 1 ? 'N' : 'M');
    }
  }
  // Clods in the body, then crumbs tumbling off the crown (they hop between frames).
  plot(g, 6 + k, 4, 'M');
  plot(g, 10 - k, 5, 'M');
  plot(g, k === 0 ? 5 : 11, k === 0 ? 1 : 2, 'N');
  plot(g, k === 0 ? 11 : 4, k === 0 ? 2 : 1, 'O');
  // Its contact shadow.
  for (let x = 4; x < 12; x++) plot(g, x, BASE_Y + 1, '_');
  return rows(g);
}

export const fxBurrowMound = defineSprite({
  id: 'fx.burrow_mound',
  size: { w: W, h: H },
  anchor: { x: CX, y: BASE_Y + 1 },
  palette: 'skitterkin',
  outline: 'auto',
  legend: { M: 'grime.2', N: 'grime.3', O: 'grime.4' },
  frames: { mound_0: mound(0), mound_1: mound(1) },
  anims: { mound: { frames: ['mound_0', 'mound_1'], fps: 6 } },
});
