// High ground (`^`, design/maps.md §3): a buildable raised block, one elevation step (8 px) up.
// Its top face is a pad (art-direction §8 Tile readability), and its cliff faces are the act's
// clay, lit on the left, shaded on the right, banded with strata, with grass lipping over the
// edge. The renderer draws it in `world` (tech-spec § Depth sorting), its top face `ZH` higher.
import { defineSprite } from '../defineSprite.ts';
import { grid, hash01, inTileMask, plot, rows, TILE_H, TILE_W } from '../helpers.ts';
import { PAD_LEGEND, padGrid } from './pad.ts';
import { ENV_VARIANTS } from './tileGen.ts';

/** One elevation step (tech-spec § Tile and screen: `ZH`). */
export const ELEVATION_PX = 8;

/** The lowest row of the tile mask in column x (−1 outside it). */
function maskBottom(x: number): number {
  for (let y = TILE_H - 1; y >= 0; y--) if (inTileMask(x, y)) return y;
  return -1;
}

function highGroundGrid(): string[] {
  const g = grid(TILE_W, TILE_H + ELEVATION_PX);
  // The top face: a pad, raised one step (it occupies rows 0..15 of the taller frame).
  padGrid().forEach((row, y) => row.forEach((ch, x) => plot(g, x, y, ch)));
  for (let x = 0; x < TILE_W; x++) {
    const e = maskBottom(x);
    if (e < 0) continue;
    const left = x < 16;
    for (let k = 1; k <= ELEVATION_PX; k++) {
      const y = e + k;
      let ch = left ? 'c' : 'b';
      // Strata: two dashed bands following the slope; the left face catches more light.
      if (k === 3 || k === 6) ch = (x + k) % 5 < 3 ? (left ? 'b' : 'a') : ch;
      if (left && k === 1) ch = 'd';
      if (k === ELEVATION_PX) ch = left ? 'b' : 'a'; // the foot, where it meets the ground
      // The outermost columns are the far corners: shade them like the face they turn from.
      if (x === 0 || x === TILE_W - 1) ch = 'a';
      plot(g, x, y, ch);
    }
    // Grass lipping over the edge, here and there.
    if (hash01(x, 3, 11) < 0.35) plot(g, x, e + 1, hash01(x, 4, 11) < 0.5 ? '1' : '2');
  }
  return rows(g);
}

export const tileHighGround = defineSprite({
  id: 'tile.high_ground',
  size: { w: TILE_W, h: TILE_H + ELEVATION_PX },
  // The ground point (the footprint's top vertex) sits one step below the raised top face.
  anchor: { x: 16, y: ELEVATION_PX },
  palette: 'act1',
  variants: ENV_VARIANTS,
  legend: PAD_LEGEND,
  frames: { v0: highGroundGrid() },
});
