// T304a's content rules: an air lane ends on the core (compile), flyers take air lanes while a
// neutral flyer (Gerald) may also fly a ground path ([route-walk]), and a neutral unit brings no
// trait, threat, or novelty to a map ([threat-intel], [soft-traits], [new-threats]).
import { describe, expect, it } from 'vitest';
import { FIXTURE, fxMap } from './__fixtures__/content.ts';
import { ContentCompileError, compileContent } from './compile.ts';
import { mapDefinersFor } from './define.ts';
import type { EnemyDef, IdSpace, MapDef, RawContent } from './types.ts';
import { validate } from './validate.ts';

const loose = mapDefinersFor<IdSpace>();
const walker = FIXTURE.enemies.fx_walker;
const flyer: EnemyDef = {
  ...walker,
  id: 'fx_flyer',
  layer: 'air',
  traits: ['flying'],
  tells: ['flying'],
};
const drone: EnemyDef = { ...flyer, id: 'fx_drone', leak: 0, bounty: 0, neutral: true };

function withMap(patch: Partial<MapDef<IdSpace>>): RawContent<IdSpace> {
  return {
    ...FIXTURE,
    enemies: { ...FIXTURE.enemies, fx_flyer: flyer, fx_drone: drone },
    maps: { fx_map: loose.defineMap({ ...fxMap, ...patch }) },
  };
}

/** Wave 1 with one extra group of `enemy` on `route`. */
function withGroup(enemy: string, route: string): RawContent<IdSpace> {
  const w1 = fxMap.waves[0]!;
  return withMap({
    waves: [{ ...w1, groups: [...w1.groups, { enemy, count: 1, route }] }, ...fxMap.waves.slice(1)],
  });
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

describe('air lanes (compile)', () => {
  it('end on the core and stay on the map', () => {
    expect(compileErrors(withMap({}))).toEqual([]);
    const errors = compileErrors(
      withMap({
        airLanes: [
          {
            id: 'sky',
            points: [
              [9, 0],
              [3, 4],
            ],
          },
        ],
      }),
    );
    expect(errors).toEqual([
      'maps.fx_map.airLanes[0].points[0] (9,0): not a tile on the map',
      "maps.fx_map.airLanes[0].points[1] (3,4): is '#', but an air lane ends on the core 'C'",
    ]);
  });
});

describe('flyers and neutral units in the waves (validate)', () => {
  it('[route-walk] flyers take air lanes; a neutral flyer may also fly a path', () => {
    expect(
      validate(withGroup('fx_flyer', 'sky')).filter((e) => e.startsWith('[route-walk]')),
    ).toEqual([]);
    expect(validate(withGroup('fx_flyer', 'a'))).toContainEqual(
      expect.stringMatching(/^\[route-walk\] .*air unit 'fx_flyer' can't walk path route 'a'/),
    );
    expect(
      validate(withGroup('fx_drone', 'a')).filter((e) => e.startsWith('[route-walk]')),
    ).toEqual([]);
    expect(
      validate(withGroup('fx_drone', 'sky')).filter((e) => e.startsWith('[route-walk]')),
    ).toEqual([]);
  });

  it('a neutral unit brings no trait, threat, or novelty', () => {
    // fx_map's intel is ['fast', 'shielded']: a flyer adds 'flying' (and is a new threat); Gerald
    // adds nothing at all.
    expect(validate(withGroup('fx_flyer', 'sky'))).toContainEqual(
      expect.stringMatching(/^\[threat-intel\] .*missing flying/),
    );
    expect(validate(withGroup('fx_drone', 'a'))).toEqual([]);
  });
});
