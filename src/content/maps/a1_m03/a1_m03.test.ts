// A1M3's layout and facts match docs/story/campaign/act1.md § A1M3.
import { describe, expect, it } from 'vitest';
import { CAMPAIGN } from '../../campaign.ts';
import { compileContent } from '../../compile.ts';
import { RAW_CONTENT } from '../../registry.ts';
import type { TileChar } from '../../types.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a1_m03;
const raw = RAW_CONTENT.maps.a1_m03;
const at = (c: number, r: number): TileChar | undefined => map.tiles[r * map.cols + c];
const tilesOf = (ch: TileChar): [number, number][] =>
  map.tiles.flatMap((t, i) => (t === ch ? [[i % map.cols, Math.floor(i / map.cols)]] : []));

describe('A1M3 · Special Delivery', () => {
  it('is the third campaign map', () => {
    expect(CAMPAIGN[2]).toBe('a1_m03');
  });

  it('has the documented facts', () => {
    expect(map).toMatchObject({
      act: 1,
      env: 'act1',
      objective: 'defend',
      cols: 14,
      rows: 10,
      startCredits: 310,
      coreIntegrity: 20,
      stardust: 140,
      threatIntel: ['fast', 'armored', 'flying'],
      requiredCounters: ['air', 'armor'],
    });
    expect(map.waves).toHaveLength(8);
    expect(raw.companion).toEqual({ id: 'quill', state: 'present' });
    expect(raw.towerUnlockWave).toEqual({ skyhook: 3 });
  });

  it('has 11 buildable tiles and 3 wreckage tiles, one hiding a pad at the hairpin', () => {
    expect(tilesOf('o').length + tilesOf('^').length + tilesOf('+').length).toBe(11);
    expect(tilesOf('x')).toHaveLength(3);
    expect(raw.underWreckage).toEqual({ '1,5': 'o', '12,6': '.', '6,8': '.' });
  });

  it('runs a mail road with one long hairpin from a north spawn to a south-edge gate', () => {
    expect(Object.keys(map.routes).toSorted()).toEqual(['road', 'sky']);
    const road = map.routes.road!;
    expect(tilesOf('S')).toEqual([[11, 0]]);
    expect(tilesOf('C')).toEqual([[10, 9]]);
    for (const [i, [c, r]] of road.tiles.entries()) {
      expect(at(c, r)).toBe(i === 0 ? 'S' : i === road.tiles.length - 1 ? 'C' : '#');
    }
    expect(road.lengthTiles).toBe(26);
  });

  it('cuts the air lane diagonally across the hairpin to the core', () => {
    expect(raw.airLanes).toEqual([
      {
        id: 'sky',
        points: [
          [0, 0],
          [10, 9],
        ],
      },
    ]);
  });

  it('sends Gerald on three passes: W1, W4, and W7', () => {
    const passes = raw.waves.flatMap((w, i) =>
      w.groups.filter((g) => g.enemy === 'gerald').map((g) => ({ wave: i + 1, count: g.count })),
    );
    expect(passes).toEqual([
      { wave: 1, count: 1 },
      { wave: 4, count: 1 },
      { wave: 7, count: 1 },
    ]);
  });

  it('has the Return to Sender Challenge: Gerald is never hit', () => {
    expect(map.medals?.challenge).toMatchObject({
      id: 'return_to_sender',
      name: 'Return to Sender',
      condition: { stat: 'neutralHits', lte: 0 },
    });
  });

  it("puts the Peeker's rock behind the fallen mailbox, and Zibzab's shop patch on decor", () => {
    expect(map.markers.peeker).toEqual([13, 4]);
    expect(map.markers.mailbox).toEqual([13, 5]);
    for (const m of ['peeker', 'mailbox', 'zibzab_shop'] as const) {
      const [c, r] = map.markers[m]!;
      expect(at(c, r)).toBe('.');
    }
  });
});
