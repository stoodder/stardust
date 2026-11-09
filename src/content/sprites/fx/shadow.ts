import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows } from '../helpers.ts';

/** A 2:1 ground-shadow blob of half-width `hw`, centered in an 8×4 canvas. */
function shadowBlob(hw: number): string[] {
  const g = grid(8, 4);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 8; x++) {
      if (((x + 0.5 - 4) / hw) ** 2 + ((y + 0.5 - 2) / (hw / 2)) ** 2 <= 1) plot(g, x, y, '_');
    }
  }
  return rows(g);
}

/** Ground shadow under lobbed shells and flyers; it shrinks toward the arc's apex. */
export const fxShadow = defineSprite({
  id: 'fx.shadow',
  size: { w: 8, h: 4 },
  anchor: { x: 4, y: 2 },
  palette: 'everglow',
  frames: { large: shadowBlob(4), medium: shadowBlob(3), small: shadowBlob(2) },
});
