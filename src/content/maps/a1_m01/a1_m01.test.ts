// A1M1's layout matches docs/story/campaign/act1.md § A1M1.
import { describe, expect, it } from 'vitest';
import { CAMPAIGN } from '../../campaign.ts';
import { compileContent } from '../../compile.ts';
import { RAW_CONTENT } from '../../registry.ts';
import type { TileChar } from '../../types.ts';

const map = compileContent(RAW_CONTENT).maps.a1_m01;
const at = (c: number, r: number): TileChar | undefined => map.tiles[r * map.cols + c];
const tilesOf = (ch: TileChar): [number, number][] =>
  map.tiles.flatMap((t, i) => (t === ch ? [[i % map.cols, Math.floor(i / map.cols)]] : []));

describe('A1M1 · Orientation Day', () => {
  it('is the first campaign map', () => {
    expect(CAMPAIGN[0]).toBe('a1_m01');
  });

  it('has the documented facts', () => {
    expect(map).toMatchObject({
      act: 1,
      env: 'act1',
      objective: 'defend',
      cols: 14,
      rows: 10,
      startCredits: 350,
      coreIntegrity: 20,
      stardust: 0,
      threatIntel: ['fast'],
      requiredCounters: [],
      companion: null,
      medals: null,
    });
    expect(map.cols + map.rows).toBeLessThanOrEqual(36); // one screen
    expect(map.briefing).toContain("Today's forecast: Nibblers, with a chance of Zoomers!");
  });

  it('has 10 buildable tiles, one of them high ground, at the documented spots', () => {
    expect(tilesOf('o')).toEqual([
      [6, 1],
      [2, 2],
      [6, 2],
      [3, 4],
      [10, 4],
      [3, 5],
      [10, 5],
      [2, 7],
      [6, 7],
    ]);
    expect(tilesOf('^')).toEqual([[7, 2]]); // the greenhouse roof
    expect(tilesOf('+')).toEqual([]);
    expect(tilesOf('x')).toEqual([]);
    // The par build's tiles are all buildable.
    for (const [c, r] of [
      [7, 2],
      [10, 4],
      [10, 5],
      [3, 5],
    ] as const) {
      expect(['o', '^']).toContain(at(c, r));
    }
  });

  it('has one road from the north-edge spawn to the south-edge core, never over a pad', () => {
    expect(Object.keys(map.routes)).toEqual(['road']);
    const road = map.routes.road!;
    expect(road.kind).toBe('path');
    expect(road.tiles[0]).toEqual([4, 0]);
    expect(road.tiles.at(-1)).toEqual([4, 9]);
    expect(tilesOf('S')).toEqual([[4, 0]]);
    expect(tilesOf('C')).toEqual([[4, 9]]);
    for (const [i, [c, r]] of road.tiles.entries()) {
      expect(at(c, r)).toBe(i === 0 ? 'S' : i === road.tiles.length - 1 ? 'C' : '#');
    }
    // Every step is one tile, and the road covers every drawn path tile exactly once.
    expect(road.lengthTiles).toBe(road.tiles.length - 1);
    const onRoad = new Set(road.tiles.map(([c, r]) => `${c},${r}`));
    expect(onRoad.size).toBe(road.tiles.length);
    expect(tilesOf('#').every(([c, r]) => onRoad.has(`${c},${r}`))).toBe(true);
    expect(tilesOf('#')).toHaveLength(road.tiles.length - 2);
  });

  it("puts the Peeker's rock in the brush beside the spawn road", () => {
    expect(map.markers.peeker).toEqual([3, 1]);
    expect(at(3, 1)).toBe('.');
  });
});
