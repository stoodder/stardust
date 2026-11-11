// The finale's dev maps (devM8.ts; T800a): they compile and validate, and createSim refuses each
// until its tasks land, naming them (D154). Each task that runs one registers it in DEV_CONTENT,
// with its smoke flow, and moves its assertion here from "refused" to "runs".
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { IdSpace, MapDef, RawContent } from '../../content/types.ts';
import { validate } from '../../content/validate.ts';
import { createSim, type SimConfig } from '../../sim/index.ts';
import { DEV_CONTENT, type DevIds } from './devBattle.ts';
import { DEV_M8_MAPS, phasesMap, songMap, voicesMap } from './devM8.ts';

const raw = { ...DEV_CONTENT, maps: { ...DEV_CONTENT.maps, ...DEV_M8_MAPS } };
const dev = compileContent(raw);
const maps: Readonly<Record<string, (typeof dev.maps)[keyof typeof dev.maps]>> = dev.maps;

function config(mapId: string): SimConfig<IdSpace> {
  const map = maps[mapId]!;
  return {
    content: dev,
    mapId,
    seed: 1,
    loadout: map.builds.parBuild.loadout,
    companion: null,
    modifiers: [],
    difficulty: 'standard',
    abilities: {
      slot1: map.builds.referenceProfile.technicianAbility,
      slot2: null,
      slot2State: 'none',
    },
    specsUnlocked: [],
    scriptFlags: { quill_choice: 'keep' },
  };
}

/** Everything createSim refuses on `mapId` (its RangeError's lines): gates, then script parts. */
function refused(mapId: string): string[] {
  try {
    createSim(config(mapId));
  } catch (err) {
    const lines = (err instanceof Error ? err.message : String(err)).split('\n');
    return lines.filter((l) => l.startsWith('- ')).map((l) => l.slice(2));
  }
  return [];
}

describe('the finale dev maps', () => {
  it('dev_voices: the choir alone, runs since T804', () => {
    const map = maps.dev_voices!;
    expect(map.objective).toBe('choir');
    expect(map.minVoicesPct).toBe(0.4);
    expect(map.choir).toMatchObject({
      leader: 'pebble',
      stopAt: 'halls',
      stopTile: [7, 1],
      singers: 10,
      haltTiles: 1.5,
      groups: [
        { when: { flag: 'door_choice', eq: 'warren' }, singers: 4 },
        { when: { flag: 'door_choice', eq: 'convoy' }, singers: -2 },
      ],
      thrum: { radiusBonus: 0.5 },
      returned: { count: 2, auraRadius: 1 },
    });
    expect(map.choir?.route.id).toBe('a');
    expect(map.choir?.paceTilesPerTick).toBeCloseTo(0.35 / 60);
    expect(map.song).toBeNull();
    expect(map.timers).toEqual([]);
    expect(refused('dev_voices')).toEqual([]); // T804 (tools/devVoices.test.ts)
  });

  it('dev_song: the song, Phase 2 from wave 1, Dawn (T805, T806)', () => {
    const map = maps.dev_song!;
    expect(map.song).toEqual({
      baseRadius: 2.5,
      silentPct: 0.6,
      restTarget: 12,
      restPerTick: 0.2 / 60,
      restPerBossHp: 0.001,
      multipliers: [
        { flag: 'quill_choice', value: 'rewrite', mul: 1.5 },
        { flag: 'quill_choice', value: 'keep', mul: 1.25 },
        { flag: 'quill_choice', value: 'purge', mul: 1 },
      ],
      scatter: { reformTicks: 240, hpPct: 0.5 },
    });
    expect(refused('dev_song')).toEqual([]);
  });

  it('dev_phases: the Bore, the Halls, Directive 0, the echo, the Unsung, Dawn (T804–T808)', () => {
    const map = maps.dev_phases!;
    expect(map.timers).toEqual([{ id: 'deep_bore', fillTicks: 3600, bossHpPerTenth: 0.05 }]);
    expect(map.events.find((e) => e.id === 'directive0')?.on).toEqual({
      phase: 2,
      afterTicks: 1200,
    });
    expect(map.events.find((e) => e.id === 'won')?.on).toEqual({ phase: 3, afterTicks: 480 });
    expect(refused('dev_phases')).toEqual([
      "a boss ending 'layToRest' (unsung) is not simulated until T808",
      "a phase's HP floor (unsung) is not simulated until T808",
      'a burrow toward the choir (unsung) is not simulated until T808',
      "a phase's adds (unsung) is not simulated until T808",
    ]);
  });

  it('are not in DEV_CONTENT until their tasks register them', () => {
    const registry: Readonly<Record<string, unknown>> = DEV_CONTENT.maps;
    expect(registry.dev_song).toBe(songMap); // T805
    expect(registry.dev_voices).toBe(voicesMap); // T804
    const registered = new Set(['dev_song', 'dev_voices']);
    for (const id of Object.keys(DEV_M8_MAPS).filter((m) => !registered.has(m))) {
      expect(Object.hasOwn(DEV_CONTENT.maps, id), id).toBe(false);
    }
  });
});

// ── The validators reject each malformed finale seam shape ──────────────────────────────────────

/** DEV_CONTENT's entities with the finale's dev maps only (or `only`). */
function devRaw(
  only: { readonly [id: string]: MapDef<DevIds> } = DEV_M8_MAPS,
): RawContent<IdSpace> {
  return { ...DEV_CONTENT, maps: { ...only } };
}
/** The errors of rule `rule` in `raw`. */
function errors(content: RawContent<IdSpace>, rule: string): string[] {
  return validate(content).filter((e) => e.startsWith(`[${rule}] `));
}
const voices = (patch: Partial<MapDef<DevIds>>): RawContent<IdSpace> =>
  devRaw({ dev_voices: { ...voicesMap, ...patch } });
const song = (patch: Partial<MapDef<DevIds>>): RawContent<IdSpace> =>
  devRaw({ dev_song: { ...songMap, ...patch } });
const phases = (patch: Partial<MapDef<DevIds>>): RawContent<IdSpace> =>
  devRaw({ dev_phases: { ...phasesMap, ...patch } });

describe('validation of the finale seams', () => {
  it('accepts the finale dev maps', () => {
    expect(validate(devRaw())).toEqual([]);
  });

  it('[choir]: a choir map has a choir and one Voices floor; a choir only there', () => {
    const { choir: _gone, ...noChoir } = voicesMap;
    expect(errors(devRaw({ dev_voices: noChoir }), 'choir')).toEqual([
      "[choir] maps.dev_voices.choir: a 'choir' map needs a choir",
    ]);
    expect(errors(voices({ minVoices: 4 }), 'choir')).toEqual([
      '[choir] maps.dev_voices.minVoices: a choir map gives one of minVoices or minVoicesPct',
    ]);
    expect(errors(voices({ minVoicesPct: 1.5, meterLabel: 'evacuated' }), 'choir')).toEqual([
      '[choir] maps.dev_voices.minVoicesPct: 1.5 must be in (0, 1]',
      "[choir] maps.dev_voices.meterLabel: a choir's meter reads 'voices'",
    ]);
    const defend = voices({ objective: 'defend', meterLabel: 'integrity' });
    expect(errors(defend, 'choir')).toEqual([
      "[choir] maps.dev_voices.choir: only a 'choir' map has a choir",
      "[choir] maps.dev_voices.minVoices: only a 'choir' map has one",
    ]);
  });

  it('[choir]: the road, the stop, the numbers, the flag groups', () => {
    const c = voicesMap.choir!;
    const bad = {
      ...c,
      route: 'nowhere',
      singers: 0,
      pace: 0,
      haltTiles: -1,
      groups: [{ when: { flag: 'door_choice', eq: 'tunnel' }, singers: 0 }],
      returned: { ...c.returned!, count: 1.5, auraRadius: 0 },
    } as const;
    expect(errors(voices({ choir: bad }), 'choir')).toEqual([
      "[choir] maps.dev_voices.choir.route: 'nowhere' is not a ground path of the map",
      '[choir] maps.dev_voices.choir.singers: must be a whole number ≥ 1',
      '[choir] maps.dev_voices.choir.pace: must be > 0',
      '[choir] maps.dev_voices.choir.haltTiles: must be > 0',
      '[choir] maps.dev_voices.choir.groups[0].singers: must be a whole number, not 0',
      '[choir] maps.dev_voices.choir.returned.count: must be a whole number ≥ 1',
      '[choir] maps.dev_voices.choir.returned.auraRadius: must be > 0',
    ]);
    expect(errors(voices({ choir: bad }), 'flag-gate')).toEqual([
      "[flag-gate] maps.dev_voices.choir.groups[0].when.eq: 'tunnel' is not a value of 'door_choice'",
    ]);
    const far = { ...voicesMap.markers, halls: [12, 1] } as const;
    expect(errors(voices({ markers: far }), 'choir')).toEqual([
      "[choir] maps.dev_voices.choir.stopAt: marker 'halls' is more than 1 tile from its road",
    ]);
    const tiny = { ...c, singers: 2 };
    expect(errors(voices({ choir: tiny }), 'choir')).toEqual([
      '[choir] maps.dev_voices.choir.groups: the smallest choir the flags allow has 0 singers',
    ]);
    expect(errors(voices({ flagVariants: {} }), 'flag-variants')).toEqual([
      "[flag-variants] maps.dev_voices.choir.groups[0].when: reads flag 'door_choice', so flagVariants needs a 'door_choice' entry",
      "[flag-variants] maps.dev_voices.choir.groups[1].when: reads flag 'door_choice', so flagVariants needs a 'door_choice' entry",
      "[flag-variants] maps.dev_voices.choir.thrum.when: reads flag 'spared_quiet_wave', so flagVariants needs a 'spared_quiet_wave' entry",
      "[flag-variants] maps.dev_voices.choir.returned.when: reads flag 'stardust_choice', so flagVariants needs a 'stardust_choice' entry",
    ]);
  });

  it('[song]: a song needs a choir; its numbers and multipliers', () => {
    const s = songMap.song!;
    const bad = {
      ...s,
      baseRadius: 0,
      silentPct: 2,
      restTarget: 0,
      restPerSec: 0,
      multipliers: [
        { flag: 'quill_choice', value: 'keep', mul: 0 },
        { flag: 'quill_choice', value: 'keep', mul: 1 },
      ],
      scatter: { reformSec: 0, hpPct: 0 },
    } as const;
    expect(errors(song({ song: bad }), 'song')).toEqual([
      '[song] maps.dev_song.song.baseRadius: must be > 0',
      '[song] maps.dev_song.song.silentPct: 2 must be in [0, 1]',
      '[song] maps.dev_song.song.restTarget: must be > 0',
      '[song] maps.dev_song.song.restPerSec: must be > 0 (the trickle: Phase 2 never stalls)',
      '[song] maps.dev_song.song.multipliers[0].mul: must be > 0',
      "[song] maps.dev_song.song.multipliers: 'quill_choice=keep' is listed twice",
      '[song] maps.dev_song.song.scatter.reformSec: must be > 0',
      '[song] maps.dev_song.song.scatter.hpPct: 0 must be in (0, 1]',
    ]);
    const { choir: _c, ...unsung } = songMap;
    const plain = devRaw({ dev_song: { ...unsung, objective: 'defend', meterLabel: 'integrity' } });
    expect(errors(plain, 'song')).toContain(
      "[song] maps.dev_song.song: a song needs a choir (it's round the leader)",
    );
  });

  it('[timers]: ids, fill, started, and the actions and trigger that name them', () => {
    const events = phasesMap.events!.map((e) =>
      e.id === 'bore_purge'
        ? { ...e, actions: [{ setTimerRate: { timer: 'deep_bore', pct: 1.5 } }] }
        : e.id === 'bore'
          ? { ...e, actions: [{ startTimer: 'the_bore' }] }
          : e,
    );
    expect(
      errors(
        phases({ timers: { deep_bore: { fillSec: 0, bossHpPerTenth: -1 } }, events }),
        'timers',
      ),
    ).toEqual([
      '[timers] maps.dev_phases.timers.deep_bore.fillSec: must be > 0',
      '[timers] maps.dev_phases.timers.deep_bore.bossHpPerTenth: must be ≥ 0',
      "[timers] maps.dev_phases.events[0].actions[0]: names no timer 'the_bore' of the map",
      '[timers] maps.dev_phases.events[1].actions[0].pct: 1.5 must be in [0, 1]',
      '[timers] maps.dev_phases.timers.deep_bore: no startTimer starts it',
    ]);
    expect(errors(phases({ timers: { DeepBore: { fillSec: 60 } } }), 'timers')).toContain(
      "[timers] maps.dev_phases.timers.DeepBore: timer id 'DeepBore' must be snake_case",
    );
  });

  it('[script]: the finale triggers and actions', () => {
    const events = [
      { id: 'a', on: { choirAt: 'gate' }, actions: [{ setPhase: 1 }] },
      { id: 'b', on: { phase: 4 }, actions: [{ checkpoint: 'Halls' }] },
      { id: 'c', on: { restProgressPct: 1.5 }, actions: [{ spawnEcho: 'Thrum' }] },
      { id: 'd', on: { phase: 2, afterSec: -1 }, actions: [{ setLighting: ' ' }] },
      {
        id: 'e',
        on: { tick: 1 },
        actions: [{ setPhase: 2 }, { restoreTowerClass: 'lastRevoked' }],
      },
      { id: 'f', on: { tick: 2 }, when: { phaseAtLeast: 5 }, actions: [] },
    ] as const;
    expect(errors(phases({ events }), 'script')).toEqual([
      '[script] maps.dev_phases.events[0].actions[0]: setPhase 1 must be a whole phase ≥ 2',
      "[script] maps.dev_phases.events[1].actions[0]: checkpoint label 'Halls' must be snake_case",
      "[script] maps.dev_phases.events[2].actions[0]: echo id 'Thrum' must be snake_case",
      "[script] maps.dev_phases.events[3].actions[0]: setLighting ' ' names no lighting set (dawn)",
      '[script] maps.dev_phases.events[4].actions[1]: restoreTowerClass needs a revokeTowerClass on the map',
      "[script] maps.dev_phases.events[0].on: unknown marker 'gate'",
      '[script] maps.dev_phases.events[1].on: no setPhase action reaches phase 4',
      '[script] maps.dev_phases.events[2].on: restProgressPct 1.5 must be in (0, 1]',
      '[script] maps.dev_phases.events[3].on.afterSec: must be ≥ 0',
      '[script] maps.dev_phases.events[5].when: no setPhase action reaches phase 5',
    ]);
    // A song's parts need a song; `choirAt` a choir.
    const { song: _s, ...noSong } = phasesMap;
    expect(errors(devRaw({ dev_phases: noSong }), 'script')).toEqual([
      '[script] maps.dev_phases.events[6].actions[0]: spawnEcho needs a song (MapDef.song)',
      '[script] maps.dev_phases.events[7].actions[0]: restAll needs a song (MapDef.song)',
      '[script] maps.dev_phases.events[6].on: restProgressPct needs a song (MapDef.song)',
      '[script] maps.dev_phases.events[7].on: restProgressPct needs a song (MapDef.song)',
    ]);
  });
});
