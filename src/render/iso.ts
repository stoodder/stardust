// Isometric math (docs/art/tech-spec.md § Grid ↔ screen math): the logical tile grid ↔ screen
// pixels at the 640×360 internal resolution. Pure functions, no Phaser, so they're unit-tested
// (iso.test.ts) and shared by the scene, the views, and pointer picking.
//
// Grid coordinates are the sim's: tile (c, r) covers [c, c+1) × [r, r+1) and its center is
// (c + 0.5, r + 0.5), so an entity's sim `x, y` goes straight in. Grid point (0, 0) is the top
// vertex of tile (0, 0). "Screen" pixels are world pixels before camera scroll; campaign maps
// never scroll, so the two are the same. The origin is the screen position of grid point (0, 0)
// and is whole pixels (mapOrigin() returns whole pixels).
import type { GridPos } from '../content/types.ts';

export const TILE_W = 32;
export const TILE_H = 16;
export const HALF_W = TILE_W / 2;
export const HALF_H = TILE_H / 2;
/** Pixels per elevation level (high ground is level 1). */
export const ELEV_H = 8;
/** Headroom above the top row: 32 px of tower overhang plus one elevation step (tech-spec § Tile and screen). */
export const TOP_OVERHANG_PX = 32 + ELEV_H;

/** A mutable point, for the `out` parameters that keep per-frame callers allocation-free. */
export interface Vec2 {
  x: number;
  y: number;
}

/** The screen position of grid point (0, 0), the top vertex of tile (0, 0). Whole pixels. */
export interface IsoOrigin {
  readonly x: number;
  readonly y: number;
}

/**
 * Grid → screen pixels, rounded to whole pixels (what Phaser gets), written into `out`. `(gx, gy)`
 * is a grid *point*: a tile's center is `(col + 0.5, row + 0.5)`, its top vertex `(col, row)`.
 * `z` is the elevation level (0 = ground plane); depth sorting uses the z = 0 y (footY).
 */
export function gridToScreen(gx: number, gy: number, origin: IsoOrigin, out: Vec2, z = 0): void {
  out.x = Math.round((gx - gy) * HALF_W + origin.x);
  out.y = Math.round((gx + gy) * HALF_H + origin.y - z * ELEV_H);
}

/** Screen pixels → continuous grid coordinates on the plane at elevation `z` (default 0). */
export function screenToGrid(sx: number, sy: number, origin: IsoOrigin, out: Vec2, z = 0): void {
  const u = (sx - origin.x) / HALF_W;
  const v = (sy + z * ELEV_H - origin.y) / HALF_H;
  out.x = (u + v) / 2;
  out.y = (v - u) / 2;
}

/**
 * Where a 32×16 tile image's top-left goes: `(sx − 16, sy)` of the tile's top vertex, at
 * elevation `z` (tech-spec § Grid ↔ screen math).
 */
export function tileImageTopLeft(
  col: number,
  row: number,
  origin: IsoOrigin,
  out: Vec2,
  z = 0,
): void {
  gridToScreen(col, row, origin, out, z);
  out.x -= HALF_W;
}

/** The row-major index of the tile containing grid point (gx, gy), or −1 off the map. */
function indexAt(gx: number, gy: number, cols: number, rows: number): number {
  const col = Math.floor(gx);
  const row = Math.floor(gy);
  if (col < 0 || row < 0 || col >= cols || row >= rows) return -1;
  return row * cols + col;
}

/**
 * The tile drawn under a screen point, as a row-major index (`row * cols + col`), or −1 off the
 * grid. The point snaps to the center of the game pixel it falls in, so picking matches the
 * canonical tile mask exactly: every pixel of a tile's mask picks that tile and no pixel picks
 * two. With `elevation` (a tile's level by index: 1 for high ground), a raised tile's top face,
 * drawn ELEV_H higher, wins over the tiles behind it; its cliff faces lie in its own ground-plane
 * footprint, so they pick it too. Allocation-free.
 */
export function pickTile(
  sx: number,
  sy: number,
  origin: IsoOrigin,
  cols: number,
  rows: number,
  elevation?: (index: number) => number,
): number {
  const px = Math.floor(sx) + 0.5;
  const py = Math.floor(sy) + 0.5;
  const u = (px - origin.x) / HALF_W;
  if (elevation !== undefined) {
    const v1 = (py + ELEV_H - origin.y) / HALF_H;
    const raised = indexAt((u + v1) / 2, (v1 - u) / 2, cols, rows);
    if (raised >= 0 && elevation(raised) >= 1) return raised;
  }
  const v = (py - origin.y) / HALF_H;
  return indexAt((u + v) / 2, (v - u) / 2, cols, rows);
}

/** Splits a row-major tile index into `[col, row]`. */
export function tileOfIndex(index: number, cols: number): GridPos {
  return [index % cols, Math.floor(index / cols)];
}

/**
 * The origin that centers a map in a `viewW × viewH` view (tech-spec § Tile and screen): the
 * ground diamond (`(cols + rows) × 16` by `(cols + rows) × 8`) plus TOP_OVERHANG_PX of headroom
 * above it, centered both ways, in whole pixels. A1M1 (14 × 10) in 640 × 360 gets (288, 104).
 */
export function mapOrigin(cols: number, rows: number, viewW: number, viewH: number): IsoOrigin {
  // The diamond spans x ∈ [origin.x − rows·16, origin.x + cols·16]; center that span.
  const x = Math.round(viewW / 2 - ((cols - rows) * HALF_W) / 2);
  const boxH = (cols + rows) * HALF_H + TOP_OVERHANG_PX;
  const y = Math.round((viewH - boxH) / 2) + TOP_OVERHANG_PX;
  return { x, y };
}

/**
 * A range circle of `radiusTiles` (grid space) as it appears on screen: a 2:1 ellipse with these
 * semi-axes in pixels, centered on the tower's tile center.
 */
export function rangeEllipsePx(radiusTiles: number, out: Vec2): void {
  out.x = radiusTiles * HALF_W * Math.SQRT2;
  out.y = radiusTiles * HALF_H * Math.SQRT2;
}
