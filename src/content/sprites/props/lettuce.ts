// A lettuce patch (apron decor on Act I maps: the colony grows lettuce, and Bricks calls the
// player "Sprout" for it). Rows of bright heads on tilled soil, following the iso grid.
import { defineSprite } from '../defineSprite.ts';
import { diamond, grid, plot, rows, stamp, TILE_W } from '../helpers.ts';
import { ENV_VARIANTS } from '../tiles/tileGen.ts';

const H = 16;

function patch(): string[] {
  const g = grid(TILE_W, H);
  // Tilled soil (the path's sand, a step darker) with furrows running along the grid's x axis.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      const d = diamond(x, y);
      if (d > 6.5) continue;
      plot(g, x, y, d > 5.5 ? '_' : (x - 2 * y + 64) % 6 < 2 ? '6' : '7');
    }
  }
  // Heads: two shades of leaf with a pale heart, in rows along the furrows.
  const head = ['.LL.', 'LNNM', 'LMMM', '.MM.'];
  for (const [x, y] of [
    [9, 3],
    [14, 5.5],
    [19, 8],
    [5, 6],
    [10, 8.5],
    [15, 11],
    [21, 4],
  ] as const) {
    stamp(g, x, Math.round(y), head);
  }
  return rows(g);
}

export const propLettuce = defineSprite({
  id: 'prop.lettuce',
  size: { w: TILE_W, h: H },
  anchor: { x: 16, y: 8 },
  palette: 'act1',
  variants: ENV_VARIANTS,
  outline: 'auto',
  legend: { L: 'green.3', M: 'green.2', N: 'green.4' },
  frames: { v0: patch() },
});
