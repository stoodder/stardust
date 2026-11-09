// Procedural helpers for sprite definitions (tech-spec § Format rules: helpers are allowed).
// They build ordinary grids, so everything downstream sees plain data. Deterministic: no Math.random.

/** A mutable character grid, row-major. */
export type CharGrid = string[][];

/** A `w`×`h` grid filled with `fill` (default transparent). */
export function grid(w: number, h: number, fill = '.'): CharGrid {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
}

/** The grid as rows of strings (a GridFrame). */
export function rows(g: CharGrid): string[] {
  return g.map((r) => r.join(''));
}

/** Parses rows into a mutable grid. */
export function fromRows(src: readonly string[]): CharGrid {
  return src.map((r) => r.split(''));
}

/** Sets one pixel if it is inside the grid. */
export function plot(g: CharGrid, x: number, y: number, ch: string): void {
  const row = g[y];
  if (row !== undefined && x >= 0 && x < row.length) row[x] = ch;
}

/** The pixel at (x, y), or `.` outside the grid. */
export function at(g: CharGrid, x: number, y: number): string {
  return g[y]?.[x] ?? '.';
}

/** Draws `src` rows at (x, y); `.` in `src` is skipped, so stamps overlay. */
export function stamp(g: CharGrid, x: number, y: number, src: readonly string[]): void {
  src.forEach((r, dy) => {
    for (let dx = 0; dx < r.length; dx++) {
      const ch = r.charAt(dx);
      if (ch !== '.') plot(g, x + dx, y + dy, ch);
    }
  });
}

/** Rows mirrored left to right. */
export function mirrorRows(src: readonly string[]): string[] {
  return src.map((r) => r.split('').toReversed().join(''));
}

/** Replaces characters by a map (`recolor(rows, { '2': '3' })`). */
export function recolor(src: readonly string[], map: Readonly<Record<string, string>>): string[] {
  return src.map((r) =>
    r
      .split('')
      .map((ch) => map[ch] ?? ch)
      .join(''),
  );
}

/** Tile footprint (art/tech-spec.md § Tile and screen). */
export const TILE_W = 32;
export const TILE_H = 16;

/**
 * The canonical tile mask: row r (0..7) covers x from 15−2r to 16+2r; rows 8..15 mirror.
 * Tiles drawn with it tile seamlessly at a (16, 8) step.
 */
export function inTileMask(x: number, y: number): boolean {
  if (y < 0 || y >= TILE_H) return false;
  const r = y < 8 ? y : 15 - y;
  return x >= 15 - 2 * r && x <= 16 + 2 * r;
}

/**
 * Diamond distance from the tile center in tile-mask units: 0 at the center, ≤ 7.75 on the mask.
 * Insets are `diamond(x, y) <= k` for smaller k.
 */
export function diamond(x: number, y: number): number {
  return Math.abs(x - 15.5) / 2 + Math.abs(y - 7.5);
}

/** A deterministic hash of (x, y, seed) in [0, 1). */
export function hash01(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Colors for an iso box: top face, its lit rim, and the left and right side faces. */
export interface BoxColors {
  readonly top: string;
  readonly rim: string;
  readonly left: string;
  readonly right: string;
}

/**
 * Draws an iso box (a 2:1 diamond footprint extruded upward): footprint centered on the pixel
 * edge point (cx, cy) with half-width `hw` (half-height `hw / 2`), `height` px tall.
 */
export function isoBox(
  g: CharGrid,
  cx: number,
  cy: number,
  hw: number,
  height: number,
  c: BoxColors,
): void {
  const hh = hw / 2;
  const inside = (x: number, y: number): boolean =>
    Math.abs(x + 0.5 - cx) / hw + Math.abs(y + 0.5 - cy) / hh <= 1;
  const onTop = (x: number, y: number): boolean => inside(x, y + height);
  for (let y = Math.floor(cy - hh - height) - 1; y <= Math.ceil(cy + hh) + 1; y++) {
    for (let x = Math.floor(cx - hw) - 1; x <= Math.ceil(cx + hw) + 1; x++) {
      if (onTop(x, y)) {
        const rim = !onTop(x, y - 1) || !onTop(x - 1, y) || !onTop(x + 1, y);
        plot(g, x, y, rim && y + 0.5 < cy - height ? c.rim : c.top);
        continue;
      }
      let side = false;
      for (let t = 0; t < height && !side; t++) side = inside(x, y + t);
      if (side) plot(g, x, y, x + 0.5 < cx ? c.left : c.right);
    }
  }
}

/** Fills a disc of radius `r` around the pixel-edge point (cx, cy) with `pick(distance)`. */
export function disc(
  g: CharGrid,
  cx: number,
  cy: number,
  r: number,
  pick: (d: number, x: number, y: number) => string,
): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= r) plot(g, x, y, pick(d, x, y));
    }
  }
}

/** Plots a 1 px line from (x0, y0) to (x1, y1) (Bresenham). */
export function line(
  g: CharGrid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  ch: string,
): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    plot(g, x, y, ch);
    if (x === x1 && y === y1) return;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}
