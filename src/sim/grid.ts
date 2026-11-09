// Grid lookups on the compiled map (design/maps.md §3). The minimum the build command needs;
// T103 owns the rest (path following, iso math lives in render/).
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace, TileChar } from '../content/types.ts';

/** The row-major index of tile (col, row), or −1 if it isn't an integer tile on the map. */
export function tileIndex(map: CompiledMapDef<IdSpace>, col: number, row: number): number {
  if (!Number.isInteger(col) || !Number.isInteger(row)) return -1;
  if (col < 0 || row < 0 || col >= map.cols || row >= map.rows) return -1;
  return row * map.cols + col;
}

/** Pads, high ground, and power nodes take towers; paths never do (hard rule). */
export function isBuildableTile(tile: TileChar): boolean {
  return tile === 'o' || tile === '^' || tile === '+';
}
