import { describe, expect, it } from 'vitest';
import { MAPS } from '../../content/maps/index.ts';
import type { TileChar } from '../../content/types.ts';
import { DEV_CONTENT } from '../__fixtures__/devBattle.ts';
import { isBuildableTile } from '../../sim/index.ts';
import type { CursorNav } from './BattleInteraction.ts';
import { cursorStart, cursorStep, type CursorDir } from './cursor.ts';

const TILE_CHARS: ReadonlySet<string> = new Set(['#', 'o', '^', '+', 'x', '.', 'S', 'C']);
const isTileChar = (ch: string): ch is TileChar => TILE_CHARS.has(ch);
const COLS = 10;
const ROWS = 10;
const idx = (c: number, r: number): number => r * COLS + c;
const all = (): boolean => true;
const DIRS: readonly CursorDir[] = ['up', 'down', 'left', 'right'];

/** Presses `dir` n times from (c, r) over `isTarget`; returns the tiles visited. */
function walk(
  c: number,
  r: number,
  dir: CursorDir,
  n: number,
  isTarget: (i: number) => boolean = all,
): [number, number][] {
  let at = idx(c, r);
  let nav: CursorNav | null = null;
  const out: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    const m = cursorStep(COLS, COLS * ROWS, at, dir, isTarget, nav);
    at = m.index;
    nav = { axis: m.axis, anchor: m.anchor };
    out.push([at % COLS, Math.floor(at / COLS)]);
  }
  return out;
}

describe('cursorStep on a full grid (an aimed ability: every tile)', () => {
  it('first presses follow a grid axis: Up/Down the rows, Left/Right the columns', () => {
    expect(walk(5, 5, 'up', 1)).toEqual([[5, 4]]);
    expect(walk(5, 5, 'down', 1)).toEqual([[5, 6]]);
    expect(walk(5, 5, 'left', 1)).toEqual([[4, 5]]);
    expect(walk(5, 5, 'right', 1)).toEqual([[6, 5]]);
  });

  it('repeated presses zig-zag along a straight screen line instead of drifting', () => {
    // Right: one screen row, every tile on it (x grows, y wobbles by half a tile).
    expect(walk(2, 5, 'right', 4)).toEqual([
      [3, 5],
      [3, 4],
      [4, 4],
      [4, 3],
    ]);
    // Up: one screen column.
    expect(walk(5, 5, 'up', 4)).toEqual([
      [5, 4],
      [4, 4],
      [4, 3],
      [3, 3],
    ]);
  });

  it('stays put at the edge', () => {
    expect(walk(0, 0, 'up', 1)).toEqual([[0, 0]]);
    expect(walk(9, 9, 'down', 1)).toEqual([[9, 9]]);
  });
});

describe('cursorStep over sparse pads', () => {
  it('hops to the nearest pad that way, skipping the tiles between', () => {
    const pads = new Set([idx(2, 2), idx(6, 2), idx(2, 7)]);
    const isPad = (i: number): boolean => pads.has(i);
    // (6, 2) is 4 columns on: straight down-right on screen, inside Right's 45° cone.
    expect(walk(2, 2, 'right', 1, isPad)).toEqual([[6, 2]]);
    // (2, 7) is down-left on screen, (6, 2) down-right: Down takes the nearer; Left reaches (2, 7).
    expect(walk(2, 2, 'down', 1, isPad)).toEqual([[6, 2]]);
    expect(walk(2, 2, 'left', 1, isPad)).toEqual([[2, 7]]);
    expect(walk(2, 7, 'up', 1, isPad)).toEqual([[2, 2]]);
  });

  it('prefers a pad in the cone over a nearer one far off to the side', () => {
    // From (5, 5), Up: (4, 4) is straight up (in the cone); (2, 5) is nearer-ish but mostly left.
    const pads = new Set([idx(5, 5), idx(3, 3), idx(2, 5)]);
    expect(walk(5, 5, 'up', 1, (i) => pads.has(i))).toEqual([[3, 3]]);
  });
});

const cornerPads = (i: number): boolean => i === idx(1, 1) || i === idx(8, 8);

describe('cursorStart', () => {
  const isPad = cornerPads;
  it('keeps a target tile, else snaps to the nearest target, else to the middle', () => {
    expect(cursorStart(COLS, ROWS, idx(8, 8), isPad)).toBe(idx(8, 8));
    expect(cursorStart(COLS, ROWS, idx(7, 8), isPad)).toBe(idx(8, 8));
    expect(cursorStart(COLS, ROWS, idx(2, 1), isPad)).toBe(idx(1, 1));
    expect(cursorStart(COLS, ROWS, -1, all)).toBe(idx(4, 4));
    expect(cursorStart(COLS, ROWS, -1, () => false)).toBe(-1);
  });
});

describe('every buildable tile is reachable with the arrows', () => {
  const maps = [...Object.values(MAPS), ...Object.values(DEV_CONTENT.maps)];
  it.each(maps.map((m) => [m.id, m] as const))('%s', (_id, map) => {
    const cols = map.size.cols;
    const tiles: TileChar[] = map.tiles.flatMap((row) => row.split('').filter(isTileChar));
    const isTarget = (i: number): boolean => {
      const t = tiles[i];
      return t !== undefined && isBuildableTile(t);
    };
    const targets = tiles.flatMap((_, i) => (isTarget(i) ? [i] : []));
    // Arrow moves form a graph; from the first pad, every pad must be reachable (no axis memory).
    const seen = new Set([targets[0]!]);
    const queue = [targets[0]!];
    while (queue.length > 0) {
      const at = queue.shift()!;
      for (const d of DIRS) {
        const next = cursorStep(cols, tiles.length, at, d, isTarget).index;
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    expect([...seen].toSorted((a, b) => a - b)).toEqual(targets);
  });
});
