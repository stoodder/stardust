// The apron: non-playable ground drawn around a map's grid so it doesn't float in the void
// (art-direction §3). Rings 1–4 step away from the map: the env's darker ramp steps, dithered to
// `ink.0` with a 4×4 ordered pattern that thickens ring by ring. Road frames carry the path on
// past the map's edge (the road out through the gate). Never picked: it lies outside the grid.
import { defineSprite } from '../defineSprite.ts';
import { fromRows, inTileMask, plot, recolor, rows, TILE_H, TILE_W } from '../helpers.ts';
import { ENV_VARIANTS, grassGrid, pathWithTreads, TILE_ANCHOR } from './tileGen.ts';

/** Apron rings drawn around a map (ring 1 touches the grid). */
export const APRON_RINGS = 4;

// prettier-ignore
const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

/** How many of 16 ordered-dither cells turn to ink, per ring (1–4). */
const INK_PER_RING = [0, 4, 9, 14] as const;

/** One ramp step darker: grass `p`, path `s` (the apron sits a step below the playfield). */
const DARKER_GRASS = { '1': '0', '2': '1', '3': '2', '4': '3' } as const;
const DARKER_PATH = { '6': '5', '7': '6', '8': '7', '9': '8' } as const;

function dithered(src: readonly string[], ring: number): string[] {
  const g = fromRows(src);
  const ink = INK_PER_RING[ring - 1] ?? 16;
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      // Tile origins step by (16, 8), multiples of 4, so the pattern is seamless across tiles.
      if (inTileMask(x, y) && (BAYER4[y % 4]?.[x % 4] ?? 0) < ink) plot(g, x, y, 'k');
    }
  }
  return rows(g);
}

const frames: Record<string, string[]> = {};
for (let ring = 1; ring <= APRON_RINGS; ring++) {
  frames[`r${ring}`] = dithered(recolor(rows(grassGrid(20 + ring)), DARKER_GRASS), ring);
  for (const axis of ['x', 'y'] as const) {
    frames[`road_${axis}_r${ring}`] = dithered(
      recolor(pathWithTreads(30 + ring, axis), DARKER_PATH),
      ring,
    );
  }
}

export const tileApron = defineSprite({
  id: 'tile.apron',
  size: { w: TILE_W, h: TILE_H },
  anchor: TILE_ANCHOR,
  palette: 'act1',
  variants: ENV_VARIANTS,
  frames,
});
