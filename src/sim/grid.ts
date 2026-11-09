// Grid queries on a compiled map (design/maps.md §1 and §3). The sim and render share them:
// render imports them through sim/index.ts. Iso projection lives in render/iso.ts.
import type { TileChar } from '../content/types.ts';

/** The part of a compiled map these queries read; a CompiledMapDef passes as-is. */
export interface MapGrid {
  readonly cols: number;
  readonly rows: number;
  /** Row-major: the tile at (col, row) is `tiles[row * cols + col]`. */
  readonly tiles: readonly TileChar[];
}

/** Whether (col, row) is an integer tile on the map. */
export function isInBounds(map: MapGrid, col: number, row: number): boolean {
  return (
    Number.isInteger(col) &&
    Number.isInteger(row) &&
    col >= 0 &&
    row >= 0 &&
    col < map.cols &&
    row < map.rows
  );
}

/** The row-major index of tile (col, row), or −1 if it isn't an integer tile on the map. */
export function tileIndex(map: MapGrid, col: number, row: number): number {
  return isInBounds(map, col, row) ? row * map.cols + col : -1;
}

/** The tile at (col, row), or null off the map. */
export function tileAt(map: MapGrid, col: number, row: number): TileChar | null {
  const i = tileIndex(map, col, row);
  return i < 0 ? null : map.tiles[i]!; // 0 ≤ i < cols·rows = tiles.length (compile checks it)
}

/** Pads, high ground, and power nodes take towers; paths never do (hard rule). */
export function isBuildableTile(tile: TileChar): boolean {
  return tile === 'o' || tile === '^' || tile === '+';
}

/** Whether a tower may stand on (col, row) by tile type (occupancy is the sim's `towerAtTile`). */
export function isBuildable(map: MapGrid, col: number, row: number): boolean {
  const tile = tileAt(map, col, row);
  return tile !== null && isBuildableTile(tile);
}

/** Tiles enemies walk on: paths, plus the spawn and core at a path's ends. */
export function isWalkableTile(tile: TileChar): boolean {
  return tile === '#' || tile === 'S' || tile === 'C';
}

/** Elevation level: high ground is one step up (art/tech-spec.md § Depth sorting), all else 0. */
export function tileElevation(tile: TileChar): 0 | 1 {
  return tile === '^' ? 1 : 0;
}
