// Contact shadows under ground actors (art-direction §1: actors sit in their own value band).
// Drawn in the `decal` layer at the actor's anchor; `shadows.ts` picks the size and alpha.
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows } from '../helpers.ts';

const W = 18;
const H = 6;

/** A 2:1 ellipse of half-width `rx` and half-height `ry`, centered on the anchor. */
function blob(rx: number, ry: number): string[] {
  const g = grid(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (((x + 0.5 - W / 2) / rx) ** 2 + ((y + 0.5 - H / 2) / ry) ** 2 <= 1) plot(g, x, y, '_');
    }
  }
  return rows(g);
}

export const fxGroundShadow = defineSprite({
  id: 'fx.ground_shadow',
  size: { w: W, h: H },
  anchor: { x: W / 2, y: H / 2 },
  palette: 'everglow',
  frames: { small: blob(5, 2), medium: blob(6.5, 2.5), large: blob(9, 3) },
});
