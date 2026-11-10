// A2M5's layout and script match docs/story/campaign/act2.md § A2M5: the Preserve Road, the rig road
// that joins it, the gate (the core before the pivot, the safe exit after), the six refugee groups,
// the pivot "whichever comes first" (D137), and the Penitent counted as a capstone boss: its
// Glimmer-shards bring nothing untaught (maps.md § 6.3, rule 2; validateThreats.ts).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../compile.ts';
import { scenes } from '../../dialogue/a2/a2_m05/scenes.ts';
import { RAW_CONTENT } from '../../registry.ts';
import type { RawContent, TileChar } from '../../types.ts';
import { validate } from '../../validate.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a2_m05;
const tilesOf = (ch: TileChar): [number, number][] =>
  map.tiles.flatMap((t, i) => (t === ch ? [[i % map.cols, Math.floor(i / map.cols)]] : []));

/** A2M5's [wave] issues on `r`. */
const waveIssues = (r: RawContent): string[] =>
  validate(r).filter((m) => m.startsWith('[wave] maps.a2_m05'));

/** A2M5's [new-threats] issues on `r`. */
const newThreats = (r: RawContent): string[] =>
  validate(r).filter((m) => m.includes('[new-threats] maps.a2_m05'));

describe('A2M5 · The Long Walk', () => {
  it('has the facts act2.md gives', () => {
    expect(map).toMatchObject({
      act: 2,
      env: 'act2.dusk',
      objective: 'defend',
      cols: 18,
      rows: 12,
      startCredits: 550,
      stardust: 240,
      maxLost: 15,
      requiredCounters: ['shield', 'detection', 'splash'],
    });
    expect(map.waves).toHaveLength(12);
    expect(map.companion).toEqual({ id: 'bricks', state: 'present' });
  });

  it('has 15 buildable tiles (the knoll high ground among them)', () => {
    expect(tilesOf('o')).toHaveLength(14);
    expect(tilesOf('^')).toEqual([[6, 6]]);
  });

  it('runs the Preserve Road to the gate, the rig road joining it at the fencing’s end', () => {
    expect(Object.keys(map.routes)).toEqual(['road', 'rig', 'sky']);
    const road = map.routes.road!.tiles;
    const rig = map.routes.rig!.tiles;
    expect(road).toHaveLength(36);
    expect(road[0]).toEqual([0, 1]);
    expect(road.at(-1)).toEqual([14, 10]);
    // The rig road comes in from the east edge and shares the road from (8,4) to the gate.
    expect(rig[0]).toEqual([17, 4]);
    const join = rig.findIndex(([x, y]) => x === 8 && y === 4);
    expect(rig.slice(join)).toEqual(road.slice(road.findIndex(([x, y]) => x === 8 && y === 4)));
    expect(tilesOf('C')).toEqual([[14, 10]]);
    expect(map.markers.gate).toEqual([14, 10]);
  });

  it('is an Escort from the pivot: six groups of six to the gate', () => {
    expect(map.escort?.groups.map((g) => [g.id, g.count])).toEqual([
      ['first', 6],
      ['second', 6],
      ['third', 6],
      ['fourth', 6],
      ['fifth', 6],
      ['last', 6],
    ]);
  });

  it('pivots at the Penitent’s 50% or as W6 starts, whichever comes first, with one cue', () => {
    const byId = new Map(map.events.map((e) => [e.id, e]));
    const pivot = [
      { cue: 'a2_m05_cue_pivot' },
      { setObjective: 'escort', meterLabel: 'evacuated' },
      { spawnAllies: 'first' },
    ];
    expect(byId.get('pivot_hp')?.on).toEqual({ bossHpPct: 0.5, boss: 'sunderglass_penitent' });
    expect(byId.get('pivot_hp')?.actions).toEqual(pivot);
    expect(byId.get('pivot_surge')?.on).toEqual({ wave: 6, phase: 'start' });
    expect(byId.get('pivot_surge')?.when).toEqual({ stat: 'pivotWave', lte: 0 });
    expect(byId.get('pivot_surge')?.actions).toEqual([{ bossEnd: 'pivot' }, ...pivot]);
    // W5 is the Penitent alone (nothing Aelari spawns after the pivot); W6 an ordinary countdown.
    expect(map.waves[4]!.groups.map((g) => [g.enemy.id, g.count])).toEqual([
      ['sunderglass_penitent', 1],
    ]);
    // Kneel: the pivot forced before W6 starts.
    expect(map.medals?.challenge?.condition).toEqual({ stat: 'pivotWave', gte: 1, lte: 5 });
  });

  it('pauses the battle for the pivot cue, and only for it (the map script plays it)', () => {
    expect(scenes.filter((sc) => sc.pause === true).map((sc) => sc.id)).toEqual([
      'a2_m05_cue_pivot',
    ]);
    const cues = map.events.flatMap((e) => e.actions.flatMap((a) => ('cue' in a ? [a.cue] : [])));
    // The pivot's events first, so her own cues are judged after a pivot on the same tick, and
    // spent unplayed once it has come (D138).
    expect(cues).toEqual([
      'a2_m05_cue_pivot',
      'a2_m05_cue_pivot',
      'a2_m05_cue_penitent',
      'a2_m05_cue_shield',
    ]);
    const byId = new Map(map.events.map((e) => [e.id, e]));
    for (const id of ['penitent_cue', 'shield_cue']) {
      expect(byId.get(id)?.when, id).toEqual({ stat: 'pivotWave', lte: 0 });
    }
  });

  it('counts the Penitent as a capstone: its shards bring only taught traits', () => {
    expect(newThreats(RAW_CONTENT)).toEqual([]);
    // A shard with an untaught trait makes it a new threat: a third one on this map.
    const raw = RAW_CONTENT;
    const shard: (typeof raw.enemies)['glimmer_shard'] = {
      ...raw.enemies.glimmer_shard,
      traits: ['cloaked', 'phasing'],
      tells: ['stealth', 'phasing'],
    };
    const w1 = raw.maps.a2_m05.waves[0]!;
    const withMoth: RawContent = {
      ...raw,
      maps: {
        ...raw.maps,
        a2_m05: {
          ...raw.maps.a2_m05,
          threatIntel: [...raw.maps.a2_m05.threatIntel, 'phasing'],
          waves: [
            { ...w1, groups: [...w1.groups, { enemy: 'riftmoth', count: 1, route: 'sky' }] },
            ...raw.maps.a2_m05.waves.slice(1),
          ],
        },
      },
    };
    expect(newThreats(withMoth)).toEqual([]);
    const untaught = { ...withMoth, enemies: { ...withMoth.enemies, glimmer_shard: shard } };
    expect(newThreats(untaught).join()).toContain('enemy sunderglass_penitent');
  });

  it('sends nothing Aelari after the Penitent pivots her side ([wave], D138)', () => {
    expect(waveIssues(RAW_CONTENT)).toEqual([]);
    const raw = RAW_CONTENT;
    const m = raw.maps.a2_m05;
    const w7 = m.waves[6]!;
    const late: RawContent = {
      ...raw,
      maps: {
        ...raw.maps,
        a2_m05: {
          ...m,
          waves: [
            ...m.waves.slice(0, 6),
            { ...w7, groups: [...w7.groups, { enemy: 'glimmer', count: 2, route: 'road' }] },
            ...m.waves.slice(7),
          ],
        },
      },
    };
    expect(waveIssues(late)).toEqual([
      "[wave] maps.a2_m05.waves[6].groups[2]: 'glimmer' (aelari) spawns after wave 5's boss pivots its side",
    ]);
  });
});
