// A2M6's layout matches docs/story/campaign/act2.md § A2M6: the wall, its two gates and the merge
// inside them, the watchtower, the lamps along the wall (what they light and what they don't), the
// diagonal air lane, and the Sundown schedule. A change is never silent.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../compile.ts';
import { RAW_CONTENT } from '../../registry.ts';
import type { TileChar } from '../../types.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a2_m06;
const tilesOf = (ch: TileChar): [number, number][] =>
  map.tiles.flatMap((t, i) => (t === ch ? [[i % map.cols, Math.floor(i / map.cols)]] : []));
/** Whether a lamp lights the tile's centre (the sim's rule, sim/darkness.ts `isLitAt`). */
const lit = ([c, r]: [number, number]): boolean =>
  map.lights.some((l) => (c + 0.5 - l.x) ** 2 + (r + 0.5 - l.y) ** 2 <= l.radiusSq);

describe('A2M6 · Sundown', () => {
  it('has the facts act2.md gives', () => {
    expect(map).toMatchObject({
      act: 2,
      env: 'act2.dusk',
      objective: 'defend',
      cols: 18,
      rows: 12,
      startCredits: 550,
      stardust: 260,
      requiredCounters: ['splash', 'air'],
    });
    expect(map.waves).toHaveLength(14);
    expect(map.companion).toEqual({ id: 'vesthara', state: 'present' });
    expect(map.allies.map((a) => a.kind)).toEqual(['bricks']);
    expect(map.markers.bricks_post).toEqual([15, 3]);
  });

  it('has 16 buildable tiles, the watchtower the one high ground', () => {
    expect(tilesOf('o')).toHaveLength(15);
    expect(tilesOf('^')).toEqual([[9, 6]]);
    expect(tilesOf('+')).toEqual([]);
    expect(tilesOf('x')).toEqual([]);
  });

  it('brings two roads through two gates to one merge, and the air lane over it', () => {
    expect(Object.keys(map.routes)).toEqual(['west', 'east', 'sky']);
    expect(tilesOf('S')).toEqual([
      [3, 0],
      [14, 0],
    ]);
    expect(tilesOf('C')).toEqual([[13, 11]]);
    const west = map.routes.west!.tiles;
    const east = map.routes.east!.tiles;
    expect([west.length, east.length]).toEqual([32, 33]);
    // The gates on the wall's row, then the merge, and one road from there to the domes.
    expect(west).toContainEqual([6, 3]);
    expect(east).toContainEqual([11, 3]);
    expect(west.slice(10)).toEqual(east.slice(11));
    expect(west[10]).toEqual([8, 5]);
  });

  it('lights the wall walk and the pocket with its lamps, never the yard', () => {
    expect(map.lights.map((l) => l.radiusSq)).toEqual([2.25, 2.25, 2.25, 2.25]);
    for (const pad of [
      [4, 3],
      [8, 3],
      [9, 3],
      [13, 3],
      [7, 4],
      [10, 4],
    ] as [number, number][]) {
      expect(lit(pad), pad.join(',')).toBe(true);
    }
    for (const pad of [
      [9, 6],
      [7, 6],
      [10, 6],
      [2, 8],
      [5, 8],
      [9, 8],
      [12, 8],
      [6, 10],
      [10, 10],
      [14, 10],
    ] as [number, number][]) {
      expect(lit(pad), pad.join(',')).toBe(false);
    }
  });

  it('darkens from W4 to full Long Night darkness as W11 starts (balance/a2m6.test.ts plays it)', () => {
    expect(map.lighting.map((k) => [k.wave, k.env, k.dark])).toEqual([
      [3, 'act2.dusk', 0],
      [11, 'act2.dusk', 1],
    ]);
  });

  it('awards Before the Dark for no leaks in the last three waves', () => {
    expect(map.medals?.challenge).toMatchObject({
      id: 'before_the_dark',
      condition: { leaks: { waves: [12, 14] }, lte: 0 },
    });
  });
});
