import { describe, expect, it } from 'vitest';
import {
  ELEV_H,
  HALF_H,
  HALF_W,
  TILE_H,
  TILE_W,
  TOP_OVERHANG_PX,
  gridToScreen,
  mapOrigin,
  pickTile,
  rangeEllipsePx,
  screenToGrid,
  tileImageTopLeft,
  tileOfIndex,
  type Vec2,
} from './iso.ts';

const O = { x: 288, y: 104 };
const COLS = 14;
const ROWS = 10;

/** The canonical tile mask (tech-spec § The canonical tile mask): is pixel (x, y) of a 32×16 tile image inside? */
function inMask(x: number, y: number): boolean {
  const r = y < 8 ? y : 15 - y;
  return x >= 15 - 2 * r && x <= 16 + 2 * r;
}

describe('iso constants', () => {
  it('matches the tech spec', () => {
    expect([TILE_W, TILE_H, HALF_W, HALF_H, ELEV_H, TOP_OVERHANG_PX]).toEqual([
      32, 16, 16, 8, 8, 40,
    ]);
  });
});

describe('gridToScreen / screenToGrid', () => {
  it('projects the tile corners and centers per the spec', () => {
    const out: Vec2 = { x: 0, y: 0 };
    gridToScreen(0, 0, O, out);
    expect(out).toEqual(O);
    gridToScreen(1, 0, O, out);
    expect(out).toEqual({ x: O.x + 16, y: O.y + 8 });
    gridToScreen(0, 1, O, out);
    expect(out).toEqual({ x: O.x - 16, y: O.y + 8 });
    gridToScreen(2.5, 3.5, O, out); // center of tile (2, 3)
    expect(out).toEqual({ x: O.x - 16, y: O.y + 48 });
    gridToScreen(2.5, 3.5, O, out, 1); // raised one level
    expect(out).toEqual({ x: O.x - 16, y: O.y + 48 - ELEV_H });
  });

  it('rounds to whole pixels', () => {
    const out: Vec2 = { x: 0, y: 0 };
    gridToScreen(0.53, 0.11, O, out);
    expect(Number.isInteger(out.x) && Number.isInteger(out.y)).toBe(true);
  });

  it('round-trips grid → screen → grid on whole-pixel points', () => {
    const s: Vec2 = { x: 0, y: 0 };
    const g: Vec2 = { x: 0, y: 0 };
    for (let gy = 0; gy <= ROWS; gy += 0.25) {
      for (let gx = 0; gx <= COLS; gx += 0.25) {
        // Quarter-tile points land on whole pixels (16·0.25 = 4, 8·0.25 = 2), so rounding is exact.
        gridToScreen(gx, gy, O, s);
        screenToGrid(s.x, s.y, O, g);
        expect(g.x).toBeCloseTo(gx, 12);
        expect(g.y).toBeCloseTo(gy, 12);
      }
    }
  });

  it('round-trips at elevation', () => {
    const s: Vec2 = { x: 0, y: 0 };
    const g: Vec2 = { x: 0, y: 0 };
    gridToScreen(7.5, 2.5, O, s, 1);
    screenToGrid(s.x, s.y, O, g, 1);
    expect(g).toEqual({ x: 7.5, y: 2.5 });
  });
});

describe('tileImageTopLeft', () => {
  it('puts the image top-left at (sx − 16, sy) of the top vertex', () => {
    const out: Vec2 = { x: 0, y: 0 };
    tileImageTopLeft(3, 2, O, out);
    expect(out).toEqual({ x: O.x + (3 - 2) * 16 - 16, y: O.y + (3 + 2) * 8 });
    tileImageTopLeft(3, 2, O, out, 1);
    expect(out.y).toBe(O.y + 40 - ELEV_H);
  });
});

describe('pickTile', () => {
  it('picks exactly the canonical mask: every mask pixel picks its tile, none picks a neighbor', () => {
    const tl: Vec2 = { x: 0, y: 0 };
    for (const [c, r] of [
      [0, 0],
      [5, 4],
      [13, 9],
      [6, 7],
    ] as const) {
      tileImageTopLeft(c, r, O, tl);
      const self = r * COLS + c;
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 32; x++) {
          // Anywhere inside the game pixel, including its far edges.
          for (const [fx, fy] of [
            [0, 0],
            [0.5, 0.5],
            [0.999, 0.999],
          ] as const) {
            const picked = pickTile(tl.x + x + fx, tl.y + y + fy, O, COLS, ROWS);
            if (inMask(x, y)) expect(picked).toBe(self);
            else expect(picked).not.toBe(self);
          }
        }
      }
    }
  });

  it('returns −1 off the grid and at the outer corners', () => {
    expect(pickTile(0, 0, O, COLS, ROWS)).toBe(-1);
    expect(pickTile(O.x, O.y - 1, O, COLS, ROWS)).toBe(-1); // just above tile (0, 0)'s top vertex
    expect(pickTile(O.x, O.y, O, COLS, ROWS)).toBe(0);
    const out: Vec2 = { x: 0, y: 0 };
    gridToScreen(COLS, ROWS, O, out); // the bottom vertex of the last tile
    expect(pickTile(out.x, out.y - 1, O, COLS, ROWS)).toBe(ROWS * COLS - 1);
    expect(pickTile(out.x, out.y, O, COLS, ROWS)).toBe(-1);
  });

  it('prefers a raised tile’s top face, and its cliff faces pick it too', () => {
    const raised = 2 * COLS + 7; // A1M1's high ground (7, 2)
    const elevation = (i: number): number => (i === raised ? 1 : 0);
    const c: Vec2 = { x: 0, y: 0 };
    // The back of the raised top face lies over the ground tile behind it, (6, 1).
    gridToScreen(7.25, 2.25, O, c, 1);
    expect(pickTile(c.x, c.y, O, COLS, ROWS)).toBe(1 * COLS + 6);
    expect(pickTile(c.x, c.y, O, COLS, ROWS, elevation)).toBe(raised);
    // Just above the bottom vertex of the ground footprint: the front cliff face.
    gridToScreen(8, 3, O, c);
    expect(pickTile(c.x, c.y - 2, O, COLS, ROWS, elevation)).toBe(raised);
    // Ground tiles elsewhere pick normally.
    gridToScreen(2.5, 5.5, O, c);
    expect(pickTile(c.x, c.y, O, COLS, ROWS, elevation)).toBe(5 * COLS + 2);
  });

  it('tileOfIndex inverts the row-major index', () => {
    expect(tileOfIndex(2 * COLS + 7, COLS)).toEqual([7, 2]);
    expect(tileOfIndex(0, COLS)).toEqual([0, 0]);
  });
});

describe('mapOrigin', () => {
  it('centers A1M1 (14 × 10) in the 640 × 360 view', () => {
    expect(mapOrigin(14, 10, 640, 360)).toEqual({ x: 288, y: 104 });
  });

  it('fits the largest campaign map (22 × 14) with its headroom', () => {
    const o = mapOrigin(22, 14, 640, 360);
    const left = o.x - 14 * HALF_W;
    const right = o.x + 22 * HALF_W;
    const top = o.y - TOP_OVERHANG_PX;
    const bottom = o.y + (22 + 14) * HALF_H;
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThanOrEqual(640);
    expect(left + right).toBe(640); // centered horizontally
    expect(top).toBeGreaterThanOrEqual(0);
    expect(bottom).toBeLessThanOrEqual(360);
    expect(Number.isInteger(o.x) && Number.isInteger(o.y)).toBe(true);
  });
});

describe('rangeEllipsePx', () => {
  it('is a 2:1 ellipse through the projected circle', () => {
    const out: Vec2 = { x: 0, y: 0 };
    rangeEllipsePx(3, out);
    expect(out.x / out.y).toBeCloseTo(2, 12);
    // The circle point (r/√2, −r/√2) from the center projects straight right by rx.
    const r = 3;
    expect((r / Math.SQRT2) * 2 * HALF_W).toBeCloseTo(out.x, 9);
  });
});
