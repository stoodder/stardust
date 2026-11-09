// Revisits by reference (T410a; design/maps.md § 7): the original's layout composed into the
// revisit unchanged, the band added, and the layout rules. One source (A1M2 → a revisit) is
// render/__fixtures__/devRevisit.test.ts's.
import { describe, expect, it } from 'vitest';
import { FIXTURE, fxMap } from './__fixtures__/content.ts';
import { compileContent, ContentCompileError } from './compile.ts';
import { composeRevisit, composeRevisits, REVISIT_TILE } from './compileRevisit.ts';
import type { IdSpace, MapDef, RawContent } from './types.ts';

type Map_ = MapDef<IdSpace>;

/** fx_map (6×5) revisited in 8×7 at (1, 1), with one bench pad and its own air lane. */
const revisit: Map_ = {
  ...fxMap,
  id: 'fx_revisit',
  revisitOf: 'fx_map',
  revisitAt: [1, 1],
  size: { cols: 8, rows: 7 },
  // prettier-ignore
  tiles: [
    '........',
    '.******.',
    '.******o',
    '.******.',
    '.******.',
    '.******.',
    '........',
  ],
  paths: [],
  airLanes: [
    {
      id: 'mine',
      points: [
        [7, 0],
        [6, 5],
      ],
    },
  ],
  markers: { bench: [7, 3] },
  underWreckage: {},
  salvage: {},
};

function compose(
  over: Partial<Map_> = {},
  original: Map_ = fxMap,
): { map: Map_; errors: string[] } {
  const errors: string[] = [];
  const def = { ...revisit, ...over };
  const map = composeRevisit(original, def, def.revisitAt ?? [1, 1], errors);
  return { map, errors };
}

describe('composeRevisit (T410a)', () => {
  it("places the original's tiles, routes, markers, and wreckage at revisitAt, unchanged", () => {
    const { map, errors } = compose();
    expect(errors).toEqual([]);
    // prettier-ignore
    expect(map.tiles).toEqual([
      '........',
      '.S##....',
      '..o#o..o',
      '...#^o..',
      '..o##x..',
      '....##C.',
      '........',
    ]);
    expect(map.paths.map((p) => [p.id, p.tiles[0], p.tiles.at(-1)])).toEqual([
      ['a', [1, 1], [6, 5]],
    ]);
    expect(map.airLanes?.map((l) => [l.id, l.points])).toEqual([
      [
        'sky',
        [
          [3, 1],
          [6, 5],
        ],
      ],
      [
        'mine',
        [
          [7, 0],
          [6, 5],
        ],
      ],
    ]);
    expect(map.markers).toEqual({ rock: [1, 3], bench: [7, 3] });
    expect(map.underWreckage).toEqual({ '5,4': 'o' });
    expect(map.salvage).toEqual({ '5,4': 40 });
    // The rest is the revisit's own.
    expect(map.size).toEqual({ cols: 8, rows: 7 });
    expect(map.revisitOf).toBe('fx_map');
  });

  it('is by reference: an edit to the original flows into the revisit', () => {
    const moved: Map_ = { ...fxMap, tiles: ['S##...', '.o#...', '..#^oo', '.o##x.', '...##C'] };
    const { map, errors } = compose({}, moved);
    expect(errors).toEqual([]);
    expect(map.tiles[2]).toBe('..o#...o');
    expect(map.tiles[3]).toBe('...#^oo.');
  });

  it('composes terraces: the original over the footprint, the band its own or flat', () => {
    const terraced: Map_ = {
      ...fxMap,
      terraces: ['111111', '111111', '000000', '000000', '000000'],
    };
    expect(compose({}, terraced).map.terraces).toEqual([
      '00000000',
      '01111110',
      '01111110',
      '00000000',
      '00000000',
      '00000000',
      '00000000',
    ]);
    const own = [
      '22222222',
      '2******2',
      '2******2',
      '1******1',
      '1******1',
      '1******1',
      '11111111',
    ];
    const { map, errors } = compose({ terraces: own }, terraced);
    expect(errors).toEqual([]);
    expect(map.terraces?.[1]).toBe('21111112');
  });

  it('refuses a revisit that is not centred', () => {
    const { errors } = compose({ revisitAt: [0, 1] });
    expect(errors).toEqual([
      "[revisit] maps.fx_revisit.revisitAt: (0,1) doesn't centre 'fx_map' (6×5) in 8×7; centred is (1,1)",
    ]);
    // An odd margin (9 − 6 = 3) may lean either way: (1, 1) and (2, 1) both centre it.
    const wide = { size: { cols: 9, rows: 7 }, tiles: revisit.tiles.map((r) => `${r}.`) };
    expect(compose({ ...wide, revisitAt: [1, 1] }).errors).toEqual([]);
    const right = { size: wide.size, tiles: revisit.tiles.map((r) => `.${r}`) };
    expect(compose({ ...right, revisitAt: [2, 1] }).errors).toEqual([]);
    expect(compose({ ...right, revisitAt: [3, 1] }).errors).toEqual([
      expect.stringContaining('.revisitAt: (3,1)'),
    ]);
  });

  it("refuses a band tile over the footprint and a footprint tile out in the band (pads stay the original's)", () => {
    const tiles = [...revisit.tiles];
    tiles[2] = '.**o***o';
    tiles[6] = '...*....';
    expect(compose({ tiles }).errors).toEqual([
      "[revisit] maps.fx_revisit.tiles[2][3]: is 'o', but the original's footprint is '*'",
      `[revisit] maps.fx_revisit.tiles[6][3]: '${REVISIT_TILE}' outside the original's footprint`,
    ]);
  });

  it("refuses a route, marker, or wreckage key that is the original's", () => {
    const { errors } = compose({
      airLanes: [
        {
          id: 'sky',
          points: [
            [7, 0],
            [6, 5],
          ],
        },
      ],
      markers: { rock: [7, 3] },
      underWreckage: { '5,4': 'o' },
    });
    expect(errors).toEqual([
      "[revisit] maps.fx_revisit.airLanes[0]: route id 'sky' is the original's",
      "[revisit] maps.fx_revisit.markers.rock: the original's marker",
      "[revisit] maps.fx_revisit.underWreckage.5,4: the original's tile",
    ]);
  });

  it('composes every revisit in a registry, and refuses a revisit of a revisit', () => {
    const raw: RawContent<IdSpace> = {
      ...FIXTURE,
      maps: {
        fx_map: fxMap,
        fx_revisit: revisit,
        fx_again: { ...revisit, id: 'fx_again', revisitOf: 'fx_revisit' },
      },
    };
    const out = composeRevisits(raw);
    expect(out.errors).toEqual([
      "[revisit] maps.fx_again.revisitOf: 'fx_revisit' is itself a revisit",
    ]);
    expect((out.raw.maps as Record<string, Map_>)['fx_revisit']!.tiles[1]).toBe('.S##....');
    // Content without revisits comes back as it was.
    expect(composeRevisits(FIXTURE).raw).toBe(FIXTURE);
  });

  it('fails compileContent on a layout error', () => {
    const bad = { ...revisit, revisitAt: [0, 0] as const };
    const raw: RawContent<IdSpace> = { ...FIXTURE, maps: { fx_map: fxMap, fx_revisit: bad } };
    expect(() => compileContent(raw)).toThrow(ContentCompileError);
  });
});
