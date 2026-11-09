// The verge: darker grass clumps along a grass tile's edge where it meets the road, drawn over
// the grass (art-direction §3: mid-darks inside the playfield, between the lit ground and the
// deep apron). One overlay frame per tile edge, two noise variants each, so a straight run of
// road doesn't repeat every tile. Frames `<edge>_<k>`: `nw` faces the tile at (col − 1, row),
// `ne` (col, row − 1), `se` (col + 1, row), and `sw` (col, row + 1).
import { defineSprite } from '../defineSprite.ts';
import { grid, hash01, inTileMask, plot, rows, TILE_H, TILE_W } from '../helpers.ts';
import { ENV_VARIANTS, TILE_ANCHOR } from './tileGen.ts';

export const VERGE_EDGES = ['nw', 'ne', 'se', 'sw'] as const;
export type VergeEdge = (typeof VERGE_EDGES)[number];
export const VERGE_VARIANTS = 2;

/** Distance from (x, y) to `edge` of the tile mask, in rows (0 on the edge, 7.75 at the center). */
function edgeDistance(x: number, y: number, edge: VergeEdge): number {
  const u = (x - 15.5) / 2;
  const v = y - 7.5;
  if (edge === 'nw') return 7.75 + u + v;
  if (edge === 'ne') return 7.75 - u + v;
  if (edge === 'se') return 7.75 - u - v;
  return 7.75 + u - v;
}

/** Clumps of `1` with dithered rims and a few `0` roots right at the road's edge. */
function vergeGrid(edge: VergeEdge, seed: number): string[] {
  const g = grid(TILE_W, TILE_H);
  // Position along the edge (constant across it): clumps are ~3 px runs of varying depth.
  const along = (x: number, y: number): number =>
    edge === 'nw' || edge === 'se' ? x - 2 * y : x + 2 * y;
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (!inTileMask(x, y)) continue;
      const d = edgeDistance(x, y, edge);
      const run = Math.floor((along(x, y) + 64) / 6);
      const depth = 1 + 2.5 * hash01(run, seed, 31);
      if (d < 0.6 && hash01(x, y, seed + 7) < 0.35) plot(g, x, y, '0');
      else if (d < depth) plot(g, x, y, '1');
      else if (d < depth + 1 && (x + y) % 2 === 0) plot(g, x, y, '1');
    }
  }
  return rows(g);
}

const frames: Record<string, string[]> = {};
for (const edge of VERGE_EDGES) {
  for (let k = 0; k < VERGE_VARIANTS; k++) frames[`${edge}_${k}`] = vergeGrid(edge, 11 + k * 5);
}

export const tileVerge = defineSprite({
  id: 'tile.verge',
  size: { w: TILE_W, h: TILE_H },
  anchor: TILE_ANCHOR,
  palette: 'act1',
  variants: ENV_VARIANTS,
  frames,
});
