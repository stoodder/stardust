// Route geometry checks in compileMap (design/maps.md §4: the route format).
import { describe, expect, it } from 'vitest';
import { FIXTURE, fxMap } from './__fixtures__/content.ts';
import { ContentCompileError, compileContent } from './compile.ts';
import { mapDefinersFor } from './define.ts';
import type { GridPos, IdSpace, MapDef, RawContent } from './types.ts';

const loose = mapDefinersFor<IdSpace>();
function withMap(patch: Partial<MapDef<IdSpace>>): RawContent<IdSpace> {
  return { ...FIXTURE, maps: { fx_map: loose.defineMap({ ...fxMap, ...patch }) } };
}
function errorsFor(raw: RawContent<IdSpace>): readonly string[] {
  try {
    compileContent(raw);
  } catch (e) {
    if (e instanceof ContentCompileError) return e.errors;
    throw e;
  }
  return [];
}

// fx_map:  S##... / .o#o.. / ..#^o. / .o##x. / ...##C
const ROAD: readonly GridPos[] = [
  [0, 0],
  [1, 0],
  [2, 0],
  [2, 1],
  [2, 2],
  [2, 3],
  [3, 3],
  [3, 4],
  [4, 4],
  [5, 4],
];
const W = 'maps.fx_map.paths[0]';

describe('compileMap: path geometry', () => {
  it('accepts a path that lists S, every # tile, and C, one orthogonal step at a time', () => {
    expect(errorsFor(withMap({ paths: [{ id: 'a', tiles: ROAD }] }))).toEqual([]);
  });

  it('requires the spawn first and the core last', () => {
    const errors = errorsFor(withMap({ paths: [{ id: 'a', tiles: ROAD.slice(1, -1) }] }));
    expect(errors).toEqual([
      `${W}.tiles[0] (1,0): is '#', but a path's first tile must be 'S'`,
      `${W}.tiles[7] (4,4): is '#', but a path's last tile must be 'C'`,
      "maps.fx_map.tiles: 'S' at (0,0) is on no path",
    ]);
  });

  it('rejects a path over a pad or off the map, and diagonal or skipping steps', () => {
    const tiles: GridPos[] = [...ROAD];
    tiles[3] = [3, 1]; // a pad, and not adjacent to (2,0) or (2,2)
    tiles.splice(7, 0, [9, 9]);
    const errors = errorsFor(withMap({ paths: [{ id: 'a', tiles }] }));
    expect(errors).toEqual([
      `${W}.tiles[3] (3,1): is 'o', but a path's middle tiles must be '#'`,
      `${W}.tiles[3] (3,1): not one orthogonal step from the tile before`,
      `${W}.tiles[4] (2,2): not one orthogonal step from the tile before`,
      `${W}.tiles[7] (9,9): not a tile on the map`,
      `${W}.tiles[8] (3,4): not one orthogonal step from the tile before`,
      "maps.fx_map.tiles: '#' at (2,1) is on no path",
    ]);
  });

  it('rejects drawn path tiles that no path walks', () => {
    const errors = errorsFor(
      withMap({ tiles: ['S##...', '.o#o..', '..#^o.', '.o##x#', '...##C'] }),
    );
    expect(errors).toEqual(["maps.fx_map.tiles: '#' at (5,3) is on no path"]);
  });

  it('keeps rift lanes off buildable tiles', () => {
    const errors = errorsFor(
      withMap({
        riftLanes: [
          {
            id: 'rift',
            opensAtWave: 2,
            tiles: [
              [0, 1],
              [1, 1],
              [1, 2],
            ],
          },
        ],
      }),
    );
    expect(errors).toEqual([
      "maps.fx_map.riftLanes[0].tiles[1] (1,1): a rift lane never crosses a buildable tile ('o')",
    ]);
  });

  it('skips geometry checks when the grid itself is malformed', () => {
    const errors = errorsFor(withMap({ tiles: ['S##...'] }));
    expect(errors).toEqual(['maps.fx_map.tiles: 1 rows, but size.rows is 5']);
  });
});
