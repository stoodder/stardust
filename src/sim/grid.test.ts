import { describe, expect, it } from 'vitest';
import type { TileChar } from '../content/types.ts';
import { FIXTURE_CONTENT } from './__fixtures__/sim.ts';
import {
  isBuildable,
  isBuildableTile,
  isInBounds,
  isWalkableTile,
  tileAt,
  tileElevation,
  tileIndex,
} from './grid.ts';

const map = FIXTURE_CONTENT.maps.fx_map; // 6 × 5; see sim/__fixtures__/sim.ts
const ALL: readonly TileChar[] = ['#', 'o', '^', '+', 'x', '.', 'S', 'C'];

describe('grid queries', () => {
  it('bounds-checks integer tiles only', () => {
    expect(isInBounds(map, 0, 0)).toBe(true);
    expect(isInBounds(map, 5, 4)).toBe(true);
    for (const [c, r] of [
      [-1, 0],
      [0, -1],
      [6, 0],
      [0, 5],
      [0.5, 0],
      [Number.NaN, 0],
    ] as const) {
      expect(isInBounds(map, c, r)).toBe(false);
      expect(tileIndex(map, c, r)).toBe(-1);
      expect(tileAt(map, c, r)).toBeNull();
      expect(isBuildable(map, c, r)).toBe(false);
    }
  });

  it('indexes row-major and reads tiles', () => {
    expect(tileIndex(map, 3, 2)).toBe(2 * 6 + 3);
    expect(tileAt(map, 0, 0)).toBe('S');
    expect(tileAt(map, 3, 2)).toBe('^');
    expect(tileAt(map, 5, 4)).toBe('C');
    expect(tileAt(map, 4, 3)).toBe('x');
  });

  it('builds only on pads, high ground, and power nodes; never on a path', () => {
    expect(ALL.filter(isBuildableTile)).toEqual(['o', '^', '+']);
    expect(isBuildable(map, 1, 1)).toBe(true);
    expect(isBuildable(map, 3, 2)).toBe(true);
    expect(isBuildable(map, 2, 1)).toBe(false); // path
    expect(isBuildable(map, 4, 3)).toBe(false); // wreckage until cleared
  });

  it('walks paths, spawns, and cores; only high ground is raised', () => {
    expect(ALL.filter(isWalkableTile)).toEqual(['#', 'S', 'C']);
    expect(ALL.filter((t) => tileElevation(t) === 1)).toEqual(['^']);
  });
});
