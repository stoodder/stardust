// A1M2's layout and facts match docs/story/campaign/act1.md § A1M2.
import { describe, expect, it } from 'vitest';
import { CAMPAIGN } from '../../campaign.ts';
import { compileContent } from '../../compile.ts';
import { RAW_CONTENT } from '../../registry.ts';
import type { TileChar } from '../../types.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a1_m02;
const at = (c: number, r: number): TileChar | undefined => map.tiles[r * map.cols + c];
const tilesOf = (ch: TileChar): [number, number][] =>
  map.tiles.flatMap((t, i) => (t === ch ? [[i % map.cols, Math.floor(i / map.cols)]] : []));

describe('A1M2 · Hatching Season', () => {
  it('is the second campaign map', () => {
    expect(CAMPAIGN[1]).toBe('a1_m02');
  });

  it('has the documented facts', () => {
    expect(map).toMatchObject({
      act: 1,
      env: 'act1',
      objective: 'defend',
      cols: 14,
      rows: 10,
      startCredits: 300,
      coreIntegrity: 20,
      stardust: 130,
      threatIntel: ['fast', 'armored'],
      requiredCounters: ['armor'],
    });
    expect(map.waves).toHaveLength(8);
    expect(map.allies).toEqual([]); // no Bricks post on A1M2 (campaign.md § 2)
  });

  it('has 11 buildable tiles: one high ground (irrigation tower), one power node (pump station)', () => {
    expect(tilesOf('o')).toHaveLength(9);
    expect(tilesOf('^')).toEqual([[6, 4]]);
    expect(tilesOf('+')).toEqual([[10, 6]]);
    expect(map.markers.pump_station).toEqual([10, 6]);
  });

  it('switchbacks down three terraces from a north spawn to a south-edge gate', () => {
    expect(Object.keys(map.routes)).toEqual(['road']);
    const road = map.routes.road!;
    expect(tilesOf('S')).toEqual([[11, 0]]);
    expect(tilesOf('C')).toEqual([[4, 9]]);
    expect(road.tiles[0]).toEqual([11, 0]);
    expect(road.tiles.at(-1)).toEqual([4, 9]);
    for (const [i, [c, r]] of road.tiles.entries()) {
      expect(at(c, r)).toBe(i === 0 ? 'S' : i === road.tiles.length - 1 ? 'C' : '#');
    }
    expect(tilesOf('#')).toHaveLength(road.tiles.length - 2);
    expect(road.lengthTiles).toBe(34); // long and slow, by design
  });

  it("puts the Peeker's rock at a warren mouth halfway down the east side", () => {
    expect(map.markers.peeker).toEqual([13, 4]);
    expect(at(13, 4)).toBe('.');
  });

  it('has the Aim for the Sack! Challenge: no Hauler past the pump station', () => {
    expect(map.medals?.challenge).toMatchObject({
      id: 'aim_for_the_sack',
      name: 'Aim for the Sack!',
    });
  });
});
