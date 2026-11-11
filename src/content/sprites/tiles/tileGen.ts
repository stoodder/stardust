// Procedural ground-tile generators, shared by the tile sprites: the tile mask, the environment
// ramps, and seeded noise (tech-spec § Format rules). Tiles are baked once per environment palette.
import {
  at,
  diamond,
  grid,
  hash01,
  inTileMask,
  plot,
  rows,
  TILE_H,
  TILE_W,
  type CharGrid,
} from '../helpers.ts';
import type { EnvPaletteId } from '../types.ts';
/** Every environment palette after the default (`act1`). */
export const ENV_VARIANTS: readonly EnvPaletteId[] = ['act2.gold', 'act2.dusk', 'act3', 'finale'];

export const TILE_ANCHOR = { x: 16, y: 0 }; // top vertex: a tile's top-left sits at (sx − 16, sy)

/** Grass: base `2`, thin speckle, tufts (`3` over `1`), rare bright blades, soft edge shading. */
export function grassGrid(seed: number): CharGrid {
  const g = grid(TILE_W, TILE_H);
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (!inTileMask(x, y)) continue;
      const h = hash01(x, y, seed);
      plot(g, x, y, h < 0.07 ? '1' : h < 0.13 ? '3' : '2');
    }
  }
  // Mid-dark clumps: two soft patches of `1` (solid heart, dithered rim), so the playfield has
  // mid-darks between the lit ground and the deep apron, and the grass doesn't read flat (D029).
  for (let i = 0; i < 2; i++) {
    const cx = 6 + hash01(i, 8, seed) * 20;
    const cy = 4 + hash01(i, 9, seed) * 8;
    for (let y = Math.floor(cy - 2); y <= Math.ceil(cy + 2); y++) {
      for (let x = Math.floor(cx - 4); x <= Math.ceil(cx + 4); x++) {
        if (!inTileMask(x, y)) continue;
        const d = Math.hypot((x + 0.5 - cx) / 3.5, (y + 0.5 - cy) / 1.8);
        if (d < 0.6 || (d < 1 && (x + y) % 2 === 0)) plot(g, x, y, '1');
      }
    }
  }
  // Tufts: a bright blade with a dark root below it.
  for (let i = 0; i < 9; i++) {
    const x = 4 + Math.floor(hash01(i, 1, seed) * 24);
    const y = 2 + Math.floor(hash01(i, 2, seed) * 11);
    if (!inTileMask(x, y) || !inTileMask(x, y + 1)) continue;
    plot(g, x, y, hash01(i, 3, seed) < 0.15 ? '4' : '3');
    plot(g, x, y + 1, '1');
  }
  shadeEdges(g, '1', '3');
  return g;
}

/** A tile's four edges, named as verge.ts names them (`nw` top-left … `sw` bottom-left). */
export type TileEdge = 'nw' | 'ne' | 'se' | 'sw';

/** Which edge an edge pixel (x, y) of the mask lies on. */
function edgeOf(x: number, y: number): TileEdge {
  if (y < 8) return x < 16 ? 'nw' : 'ne';
  return x < 16 ? 'sw' : 'se';
}

/**
 * Darkens the lower edges and lightens the upper edges of the mask (gentle tile read), leaving
 * `skip` unshaded (a 2-wide lane's shared edge, so its two tiles read as one road).
 */
function shadeEdges(g: CharGrid, dark: string, light: string, skip?: TileEdge): void {
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (!inTileMask(x, y) || edgeOf(x, y) === skip) continue;
      const edge =
        !inTileMask(x - 1, y) ||
        !inTileMask(x + 1, y) ||
        !inTileMask(x, y + 1) ||
        !inTileMask(x, y - 1);
      if (!edge) continue;
      if (y >= 8 && (x + y) % 2 === 0) plot(g, x, y, dark);
      else if (y < 8 && (x + y) % 3 === 0) plot(g, x, y, light);
    }
  }
}

/** Sand path: base `8`, speckle `7`, pebbles (`6` with a `9` top), a worn rim (none on `skip`). */
export function pathGrid(seed: number, skip?: TileEdge): CharGrid {
  const g = grid(TILE_W, TILE_H);
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (!inTileMask(x, y)) continue;
      const h = hash01(x, y, seed + 100);
      plot(g, x, y, h < 0.12 ? '7' : h > 0.95 ? '9' : '8');
    }
  }
  for (let i = 0; i < 4; i++) {
    const x = 5 + Math.floor(hash01(i, 5, seed) * 22);
    const y = 3 + Math.floor(hash01(i, 6, seed) * 10);
    if (!inTileMask(x, y) || !inTileMask(x + 1, y + 1)) continue;
    plot(g, x, y, '9');
    plot(g, x, y + 1, '6');
    if (hash01(i, 7, seed) < 0.5) plot(g, x + 1, y + 1, '6');
  }
  shadeEdges(g, '7', '9', skip);
  return g;
}

/**
 * Tread marks along one grid axis: `x` runs down-right on screen (slope ½), `y` down-left.
 * Two dashed grooves (`6` with a `9` lip below).
 */
function treads(g: CharGrid, axis: 'x' | 'y'): void {
  for (const off of [-3, 3]) {
    for (let x = 0; x < TILE_W; x++) {
      if (x % 6 >= 4) continue;
      const dx = x - 15.5;
      const y = Math.round(7.5 + (axis === 'x' ? dx / 2 : -dx / 2) + off);
      if (!inTileMask(x, y) || diamond(x, y) > 6.5) continue;
      plot(g, x, y, '6');
      if (inTileMask(x, y + 1) && at(g, x, y + 1) !== '6') plot(g, x, y + 1, '9');
    }
  }
}

export function pathWithTreads(seed: number, axis: 'x' | 'y'): string[] {
  const g = pathGrid(seed);
  treads(g, axis);
  return rows(g);
}

/**
 * One tile of a 2-wide lane (A3M6's road through the band, where the refugees walk two abreast):
 * the treaded path along `axis` with no worn rim on `inner`, the edge it shares with the lane's
 * other tile, so the two read as one wide road (`inner` is `sw` or `ne` along x, `se` or `nw`
 * along y).
 */
export function wideLane(seed: number, axis: 'x' | 'y', inner: TileEdge): string[] {
  const g = pathGrid(seed, inner);
  treads(g, axis);
  return rows(g);
}
