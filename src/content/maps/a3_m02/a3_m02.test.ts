// A3M2's layout matches docs/story/campaign/act3.md § A3M2. It revisits A1M4 by reference with its
// wreckage carts gone (`revisitWreckage: 'gone'`), so an edit to A1M4's pads changes this map too:
// this test pins the pads it composes to, so such a change is never silent (design/maps.md § 7).
// The Clean Exit and the lockout leaks are the map script's (balance/a3m2.test.ts lands them).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../compile.ts';
import { RAW_CONTENT } from '../../registry.ts';
import type { TileChar } from '../../types.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a3_m02;
const tilesOf = (ch: TileChar): [number, number][] =>
  map.tiles.flatMap((t, i) => (t === ch ? [[i % map.cols, Math.floor(i / map.cols)]] : []));
const byRow = ([c1, r1]: readonly number[], [c2, r2]: readonly number[]): number =>
  r1! - r2! || c1! - c2!;

describe('A3M2 · License Revoked', () => {
  it('composes A1M4 centred at (4, 2) in 22×14, with the facts act3.md gives', () => {
    expect(map).toMatchObject({
      act: 3,
      env: 'act3',
      objective: 'defend',
      cols: 22,
      rows: 14,
      startCredits: 650,
      stardust: 300,
      requiredCounters: ['armor', 'splash'],
    });
    expect(map.waves).toHaveLength(15);
    expect(map.companion).toEqual({ id: 'bricks', state: 'present' });
  });

  it("keeps A1M4's 12 pads, drops its carts, and adds the band's 5: 17 buildable", () => {
    // A1M4's (act1.md § A1M4) moved by (4, 2).
    const a1m4Pads = [
      [17, 3],
      [7, 4],
      [13, 4],
      [5, 5],
      [15, 6],
      [15, 7],
      [16, 7],
      [5, 8],
      [13, 8],
      [15, 9],
      [8, 10],
      [11, 10],
    ];
    const band = [
      [2, 3],
      [19, 6],
      [19, 9],
      [11, 12],
      [16, 12],
    ];
    expect(tilesOf('o')).toEqual([...a1m4Pads, ...band].toSorted(byRow));
    // The carts are gone: no wreckage, no salvage, no power node under the podium cart.
    expect(tilesOf('x')).toEqual([]);
    expect(tilesOf('+')).toEqual([]);
    expect([map.underWreckage, map.salvage]).toEqual([{}, {}]);
  });

  it("keeps A1M4's road and landmarks, and adds the two rifts and the band's markers", () => {
    expect(Object.keys(map.routes)).toEqual(['road', 'rift_w', 'rift_e']);
    expect(tilesOf('S')).toEqual([[6, 2]]);
    expect(tilesOf('C')).toEqual([[17, 11]]);
    expect(map.routes.road!.tiles).toHaveLength(31);
    expect(map.routes.rift_w!.tiles[0]).toEqual([0, 4]);
    expect(map.routes.rift_e!.tiles[0]).toEqual([21, 13]);
    for (const id of ['rift_w', 'rift_e']) expect(map.routes[id]!.tiles.at(-1)).toEqual([17, 11]);
    expect(map.markers).toMatchObject({
      billboard_west: [9, 2],
      billboard_center: [12, 2],
      billboard_east: [15, 2],
      fountain: [10, 6],
      podium: [7, 7],
      shuttle_pad: [20, 3],
      dead_turret_1: [1, 11],
      dead_turret_2: [20, 12],
    });
  });
});
