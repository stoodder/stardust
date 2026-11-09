// A1M4's layout and facts match docs/story/campaign/act1.md § A1M4.
import { describe, expect, it } from 'vitest';
import { CAMPAIGN } from '../../campaign.ts';
import { compileContent } from '../../compile.ts';
import { RAW_CONTENT } from '../../registry.ts';
import type { TileChar } from '../../types.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a1_m04;
const raw = RAW_CONTENT.maps.a1_m04;
const at = (c: number, r: number): TileChar | undefined => map.tiles[r * map.cols + c];
const tilesOf = (ch: TileChar): [number, number][] =>
  map.tiles.flatMap((t, i) => (t === ch ? [[i % map.cols, Math.floor(i / map.cols)]] : []));

describe('A1M4 · The Audit', () => {
  it('is the fourth campaign map', () => {
    expect(CAMPAIGN[3]).toBe('a1_m04');
  });

  it('has the documented facts', () => {
    expect(map).toMatchObject({
      act: 1,
      env: 'act1',
      objective: 'defend',
      cols: 14,
      rows: 10,
      startCredits: 320,
      coreIntegrity: 20,
      stardust: 150,
      threatIntel: ['fast', 'armored', 'splitting', 'huddle'],
      requiredCounters: ['splash', 'armor'],
    });
    expect(map.waves).toHaveLength(9);
    expect(raw.companion).toEqual({ id: 'zibzab', state: 'present' });
  });

  it('has 12 buildable tiles and 5 wreckage carts, the podium cart hiding a power node', () => {
    expect(tilesOf('o').length + tilesOf('^').length + tilesOf('+').length).toBe(12);
    expect(tilesOf('x')).toHaveLength(5);
    expect(raw.underWreckage?.['4,5']).toBe('+');
    expect(Object.values(raw.underWreckage ?? {}).filter((t) => t === '+')).toHaveLength(1);
    // The node is under the cart nearest the podium.
    const [pc, pr] = map.markers.podium!;
    const nearest = Object.keys(raw.underWreckage ?? {})
      .map((k) => k.split(',').map(Number) as [number, number])
      .toSorted((a, b) => Math.hypot(a[0] - pc, a[1] - pr) - Math.hypot(b[0] - pc, b[1] - pr))[0];
    expect(nearest).toEqual([4, 5]);
  });

  it('runs a U-shaped road around the fountain from a north-west spawn to a south-east gate', () => {
    expect(Object.keys(map.routes)).toEqual(['road']);
    const road = map.routes.road!;
    expect(tilesOf('S')).toEqual([[2, 0]]);
    expect(tilesOf('C')).toEqual([[13, 9]]);
    for (const [i, [c, r]] of road.tiles.entries()) {
      expect(at(c, r)).toBe(i === 0 ? 'S' : i === road.tiles.length - 1 ? 'C' : '#');
    }
    expect(road.lengthTiles).toBe(31);
    // The fountain sits inside the U: road on its west, south, and east.
    const [fc, fr] = map.markers.fountain!;
    expect(at(2, fr)).toBe('#');
    expect(at(fc, 7)).toBe('#');
    expect(at(10, fr)).toBe('#');
  });

  it('marks the landmarks A3M2 revisits on decor', () => {
    for (const m of [
      'billboard_west',
      'billboard_center',
      'billboard_east',
      'fountain',
      'podium',
      'peeker',
    ] as const) {
      const [c, r] = map.markers[m]!;
      expect(at(c, r), m).toBe('.');
    }
  });

  it('introduces the Bunchling and the Elder, each on its teach wave', () => {
    const first = (enemy: string): number =>
      raw.waves.findIndex((w) => w.groups.some((g) => g.enemy === enemy)) + 1;
    expect(first('bunchling')).toBe(2);
    expect(first('elder')).toBe(4);
    expect(raw.waves[1]?.teach).toBe(true);
    expect(raw.waves[3]?.teach).toBe(true);
    expect(raw.waves.flatMap((w) => w.groups).some((g) => g.enemy === 'puffwing')).toBe(false);
  });

  it('has the Asset Recovery Challenge and the Clean Audit objective', () => {
    expect(map.medals?.challenge).toMatchObject({
      id: 'asset_recovery',
      name: 'Asset Recovery',
      condition: { stat: 'wreckageCleared', gte: 5 },
    });
    expect(map.objectives).toEqual([
      {
        id: 'clean_audit',
        name: 'Clean Audit',
        description: 'Sell no turret once a wave has started since you built it.',
        condition: { stat: 'lateSells', lte: 0 },
        intel: 1,
        onComplete: [],
      },
    ]);
  });
});
