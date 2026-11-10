// A2M3's layout matches docs/story/campaign/act2.md § A2M3. It revisits A1M2 by reference (D114),
// so an edit to A1M2's pads changes this map too: this test pins the pads it composes to, so such a
// change is never silent (design/maps.md § 7).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../compile.ts';
import { RAW_CONTENT } from '../../registry.ts';
import type { TileChar } from '../../types.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a2_m03;
const tilesOf = (ch: TileChar): [number, number][] =>
  map.tiles.flatMap((t, i) => (t === ch ? [[i % map.cols, Math.floor(i / map.cols)]] : []));

describe('A2M3 · Second Look', () => {
  it('composes A1M2 centred at (2, 1) in 18×12, with the facts act2.md gives', () => {
    expect(map).toMatchObject({
      act: 2,
      env: 'act2.gold',
      objective: 'defend',
      cols: 18,
      rows: 12,
      stardust: 210,
      requiredCounters: ['shield', 'air', 'splash'],
    });
    expect(map.waves).toHaveLength(11);
    expect(map.lighting).toEqual([{ wave: 11, env: 'act2.dusk', dark: 0 }]);
  });

  it("keeps A1M2's 11 pads unchanged and adds the strip mine's 4 benches in the band", () => {
    // A1M2's (act1.md § A1M2) moved by (2, 1): Terrace 1, Terrace 2, Terrace 3.
    const a1m2Pads = [
      [7, 2],
      [14, 2],
      [7, 4],
      [10, 4],
      [5, 5],
      [9, 7],
      [8, 8],
      [12, 8],
      [14, 8],
    ];
    const benches = [
      [17, 1],
      [17, 2],
      [17, 8],
      [17, 9],
    ];
    expect(tilesOf('o')).toEqual(
      [...a1m2Pads, ...benches].toSorted(([c1, r1], [c2, r2]) => r1! - r2! || c1! - c2!),
    );
    expect(tilesOf('^')).toEqual([[8, 5]]); // the irrigation tower
    expect(tilesOf('+')).toEqual([[12, 7]]); // the pump station
    expect(tilesOf('x')).toEqual([]);
  });

  it("keeps A1M2's road and markers, and adds the mine road and the air lane over it", () => {
    expect(Object.keys(map.routes)).toEqual(['road', 'mine', 'sky']);
    // The strip mine's head, and the warren mouth (A1M2's spawn, one tile in from the edge).
    expect(tilesOf('S')).toEqual([
      [16, 0],
      [13, 1],
    ]);
    expect(tilesOf('C')).toEqual([[6, 10]]);
    expect(map.routes.road!.tiles[0]).toEqual([13, 1]);
    expect(map.routes.mine!.tiles.at(-1)).toEqual([6, 10]);
    expect(map.markers).toMatchObject({ pump_station: [12, 7], peeker: [15, 5] });
    expect(map.clickables).toEqual({ peeker: { name: "The Peeker's rock" } });
  });
});
