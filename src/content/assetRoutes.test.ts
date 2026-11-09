// A Protect map's asset routes (T305a; AssetDef): a path to the asset ends on a path tile next to
// its marker, an air lane on the marker itself, and a rift lane never leads there (compile); the
// asset's marker sits on decor ([marker]).
import { describe, expect, it } from 'vitest';
import { FIXTURE, fxMap } from './__fixtures__/content.ts';
import { ContentCompileError, compileContent } from './compile.ts';
import { mapDefinersFor } from './define.ts';
import type { GridPos, IdSpace, MapDef, RawContent } from './types.ts';
import { validate } from './validate.ts';

const loose = mapDefinersFor<IdSpace>();

// fx_map (6×5): path `a` runs (0,0) … (3,3), (3,4), (4,4) to the core (5,4); (2,4) is decor.
const A = fxMap.paths[0]!; // fx_map has path a
/** A branch of `a` that stops `short` tiles before the core. */
const branch = (short: number) => ({ id: 'rigs', tiles: A.tiles.slice(0, -short) });

/** fx_map as a Protect map: the asset on `rig`, taking the leaks of `routes`. */
function protect(
  rig: GridPos,
  routes: string[],
  patch: Partial<MapDef<IdSpace>> = {},
): RawContent<IdSpace> {
  return {
    ...FIXTURE,
    maps: {
      fx_map: loose.defineMap({
        ...fxMap,
        objective: 'protect',
        markers: { ...fxMap.markers, rig },
        asset: { name: 'Rig', integrity: 10, marker: 'rig', routes },
        ...patch,
      }),
    },
  };
}

function compileErrors(raw: RawContent<IdSpace>): readonly string[] {
  try {
    compileContent(raw);
  } catch (e) {
    if (e instanceof ContentCompileError) return e.errors;
    throw e;
  }
  return [];
}

describe('asset routes (compile)', () => {
  it('a path to the asset ends on a path tile next to it', () => {
    // Two short of the core: (3,4), beside the decor tile (2,4).
    expect(compileErrors(protect([2, 4], ['rigs'], { paths: [A, branch(2)] }))).toEqual([]);
    // Three short: (3,3), two steps away.
    expect(compileErrors(protect([2, 4], ['rigs'], { paths: [A, branch(3)] }))).toEqual([
      'maps.fx_map.paths[1].tiles[6] (3,3): a path to the asset ends next to it (2,4)',
    ]);
    // A path to the asset never ends on the core.
    expect(compileErrors(protect([2, 4], ['a']))).toEqual([
      "maps.fx_map.paths[0].tiles[9] (5,4): is 'C', but a path's last tile must be '#'",
      'maps.fx_map.paths[0].tiles[9] (5,4): a path to the asset ends next to it (2,4)',
    ]);
  });

  it('an air lane to the asset ends on it; a rift lane never leads there', () => {
    expect(compileErrors(protect([2, 4], ['sky']))).toEqual([
      'maps.fx_map.airLanes[0].points[1] (5,4): an air lane to the asset ends on it (2,4)',
    ]);
    const sky = { id: 'sky', points: [[2, 0] as const, [2, 4] as const] };
    expect(compileErrors(protect([2, 4], ['sky'], { airLanes: [sky] }))).toEqual([]);
    const rift = { id: 'rift', tiles: [[0, 4] as const, [1, 4] as const], opensAtWave: 1 };
    expect(compileErrors(protect([2, 4], ['rift'], { riftLanes: [rift] }))).toEqual([
      "maps.fx_map.riftLanes[0]: a rift lane can't lead to the asset",
    ]);
  });
});

describe('the asset marker (validate)', () => {
  it('[marker] sits on decor', () => {
    const sky = { id: 'sky', points: [[2, 0] as const, [3, 2] as const] };
    const onHighGround = protect([3, 2], ['sky'], { airLanes: [sky] });
    expect(validate(onHighGround).filter((e) => e.startsWith('[marker]'))).toHaveLength(1);
  });
});
