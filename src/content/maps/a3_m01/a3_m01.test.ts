// A3M1's layout and script match docs/story/campaign/act3.md § A3M1: the spiral from the inner
// basin to the back gate, the north road joining its outer ring, the two rift lanes through the
// fences (never over a pad), the five refugee groups (Old Thrum's only when she was spared), the
// medal and the objective, and Bramble as the companion.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../compile.ts';
import { RAW_CONTENT } from '../../registry.ts';
import type { TileChar } from '../../types.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a3_m01;
const tilesOf = (ch: TileChar): [number, number][] =>
  map.tiles.flatMap((t, i) => (t === ch ? [[i % map.cols, Math.floor(i / map.cols)]] : []));
const key = ([x, y]: readonly [number, number]): string => `${x},${y}`;

describe('A3M1 · The Preserve', () => {
  it('has the facts act3.md gives', () => {
    expect(map).toMatchObject({
      act: 3,
      env: 'act3',
      objective: 'escort',
      cols: 22,
      rows: 14,
      startCredits: 600,
      stardust: 280,
      maxLost: null,
      maxLostPct: 0.53,
      requiredCounters: ['splash', 'air'],
    });
    expect(map.waves).toHaveLength(14);
    expect(map.companion).toEqual({ id: 'bramble', state: 'present' });
    expect(tilesOf('o')).toHaveLength(16);
  });

  it('spirals the refugees out of the basin to the back gate, the north road joining it', () => {
    const spiral = map.routes.spiral!.tiles;
    expect(spiral).toHaveLength(50);
    expect(spiral[0]).toEqual([12, 6]);
    expect(spiral.at(-1)).toEqual([2, 13]);
    expect(tilesOf('C')).toEqual([[2, 13]]);
    expect(map.markers.gate).toEqual([2, 13]);
    const north = map.routes.north!.tiles;
    expect(north[0]).toEqual([12, 0]);
    const join = spiral.findIndex(([x, y]) => x === 12 && y === 2);
    expect(north.slice(2)).toEqual(spiral.slice(join));
  });

  it('cracks two rift lanes through the fences, from W2 and W6, never over a pad', () => {
    const pads = new Set(tilesOf('o').map(key));
    for (const [id, opens, from] of [
      ['rift_n', 2, [5, 0]],
      ['rift_e', 6, [21, 6]],
    ] as const) {
      const r = map.routes[id]!;
      expect(r.kind, id).toBe('rift');
      expect(r.opensAtWave, id).toBe(opens);
      expect(r.tiles[0], id).toEqual(from);
      expect(r.tiles.at(-1), id).toEqual([2, 13]);
      expect(
        r.tiles.filter((t) => pads.has(key(t))),
        id,
      ).toEqual([]);
    }
    // Only the Hollow walk them, and only from their wave on (validateWaves.ts holds it too).
    for (const [i, w] of map.waves.entries()) {
      for (const g of w.groups) {
        const r = map.routes[g.route.id]!;
        if (r.kind !== 'rift') continue;
        expect(g.enemy.faction).toBe('hollow');
        expect(i + 1).toBeGreaterThanOrEqual(r.opensAtWave!);
      }
    }
  });

  it('walks five groups of six as their waves start, Old Thrum’s only if she was spared', () => {
    expect(map.escort?.groups.map((g) => [g.id, g.count, g.when])).toEqual([
      ['first', 6, null],
      ['second', 6, null],
      ['bramble', 6, null],
      ['thrum', 6, { flag: 'spared_quiet_wave', eq: true }],
      ['last', 6, null],
    ]);
    const release = map.events.flatMap((e) =>
      e.actions.flatMap((a) => ('spawnAllies' in a ? [[a.spawnAllies, e.on]] : [])),
    );
    expect(release).toEqual([
      ['first', { wave: 1, phase: 'start' }],
      ['second', { wave: 5, phase: 'start' }],
      ['bramble', { wave: 9, phase: 'start' }],
      ['thrum', { wave: 10, phase: 'start' }],
      ['last', { wave: 14, phase: 'start' }],
    ]);
    expect(map.builds.flagVariants).toEqual({ spared_quiet_wave: [false, true] });
  });

  it('awards Nothing Gathered and The Matriarch’s Young', () => {
    expect(map.medals?.challenge).toMatchObject({
      id: 'nothing_gathered',
      condition: { stat: 'refugeesGathered', lte: 0 },
    });
    expect(map.objectives.map((o) => [o.id, o.intel, o.condition])).toEqual([
      ['matriarchs_young', 1, { groupLost: 'bramble', lte: 0 }],
    ]);
  });

  it('teaches gathering in W4 with one Maw ahead of its Motes, and cues Ves’thara on it', () => {
    const w4 = map.waves[3]!;
    expect(w4.teach).toBe(true);
    expect(w4.groups.map((g) => [g.enemy.id, g.count, g.delayTicks])).toEqual([
      ['maw', 1, 6 * 60],
      ['mote', 12, 8 * 60],
    ]);
    const cue = map.events.find((e) => e.id === 'maw_cue')!;
    expect(cue.on).toEqual({ wave: 4, phase: { afterTicks: 6 * 60 } });
    expect(cue.actions).toEqual([{ cue: 'a3_m01_cue_maw' }]);
  });
});
