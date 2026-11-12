// The hush (`tile.hush`; A2M1's dark north-east edge, act2.md § A2M1: "the north-east edge, toward
// the Halls, is visibly darker than the rest"): an overlay drawn over a tile's ground (and its
// apron) near a map's `halls_dark` marker, so the edge sinks toward the deep dark without a hard
// line. `d1`–`d3` dither `ink.1` over the tile at 4, 8, and 12 of 16 cells of a 4×4 ordered
// pattern (the apron's), deepening toward the marker; each drifts cold violet motes, one, two and
// three (drill spoil's unsung violet: the Hollow is near), a bright point over a dim tail, so the
// edge reads at 1× on dark ground. Master colors, so it reads the same in
// every env. Render-only; never on a pad, the road, or a block (groundTiles `hushFrame`).
import { defineSprite } from '../defineSprite.ts';
import { grid, hash01, inTileMask, plot, rows, TILE_H, TILE_W } from '../helpers.ts';
import { TILE_ANCHOR } from './tileGen.ts';

/** 4×4 Bayer order: a cell is inked when its rank is under the density (of 16). */
// prettier-ignore
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export const HUSH_LEVELS = 3;

function hushGrid(level: 1 | 2 | 3): string[] {
  const g = grid(TILE_W, TILE_H);
  const density = level * 4;
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (!inTileMask(x, y)) continue;
      if ((BAYER[y % 4]?.[x % 4] ?? 16) < density) plot(g, x, y, 'K');
    }
  }
  // Cold violet motes adrift, one more each step deeper: a bright point with a dim tail under it
  // (M8 R5: the ink dither alone vanishes on dark ground at 1×; the motes say the Hollow is near).
  for (let i = 0; i < level; i++) {
    const x = 6 + Math.floor(hash01(i, level, 7) * 20);
    const y = 3 + Math.floor(hash01(level, i, 8) * 9);
    if (!inTileMask(x, y) || !inTileMask(x, y + 1)) continue;
    plot(g, x, y, i === 0 ? 'W' : 'U');
    plot(g, x, y + 1, 'V');
  }
  return rows(g);
}

export const tileHush = defineSprite({
  id: 'tile.hush',
  size: { w: TILE_W, h: TILE_H },
  anchor: TILE_ANCHOR,
  palette: 'act1',
  legend: { K: 'ink.1', U: 'violet.3', V: 'violet.2', W: 'violet.4' },
  frames: { d1: hushGrid(1), d2: hushGrid(2), d3: hushGrid(3) },
});
