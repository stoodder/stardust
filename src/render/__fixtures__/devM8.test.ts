// The finale's dev maps (devM8.ts; T800a): they compile and validate, and createSim refuses each
// until its tasks land, naming them (D154). Each task that runs one registers it in DEV_CONTENT,
// with its smoke flow, and moves its assertion here from "refused" to "runs".
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { IdSpace } from '../../content/types.ts';
import { validate } from '../../content/validate.ts';
import { createSim, type SimConfig } from '../../sim/index.ts';
import { DEV_CONTENT } from './devBattle.ts';
import { DEV_M8_MAPS } from './devM8.ts';

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
  it('validate with the dev content', () => {
    expect(validate(raw)).toEqual([]);
  });

  it('dev_voices: the choir alone, refused until T804', () => {
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
    expect(refused('dev_voices')).toEqual(['the choir (Voices) is not simulated until T804']);
  });

  it('dev_song: the song, Phase 2 from wave 1, Dawn (T805, T806)', () => {
    const map = maps.dev_song!;
    expect(map.song).toEqual({
      baseRadius: 2.5,
      silentPct: 0.6,
      restTarget: 40,
      restPerTick: 0.2 / 60,
      restPerBossHp: 0.001,
      multipliers: [
        { flag: 'quill_choice', value: 'rewrite', mul: 1.5 },
        { flag: 'quill_choice', value: 'keep', mul: 1.25 },
        { flag: 'quill_choice', value: 'purge', mul: 1 },
      ],
      scatter: { reformTicks: 240, hpPct: 0.5 },
    });
    expect(refused('dev_song')).toEqual([
      'the choir (Voices) is not simulated until T804',
      'the Leaving Song is not simulated until T805',
      "event 'song': action setPhase is not simulated until T806",
      "event 'dawn': trigger restProgressPct is not simulated until T805",
      "event 'dawn': action restAll is not simulated until T805",
    ]);
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
      'the choir (Voices) is not simulated until T804',
      'the Leaving Song is not simulated until T805',
      'secondary timers (deep_bore) is not simulated until T806',
      "event 'bore': action startTimer is not simulated until T806",
      "event 'bore_purge': action setTimerRate is not simulated until T806",
      "event 'breakthrough': trigger timerFull is not simulated until T806",
      "event 'halls': trigger choirAt is not simulated until T806",
      "event 'halls': action setPhase is not simulated until T806",
      "event 'halls': action checkpoint is not simulated until T806",
      "event 'halls': action setTimerRate is not simulated until T806",
      "event 'directive0': trigger phase is not simulated until T806",
      "event 'directive0': action lockAbility is not simulated until T807",
      "event 'not_everglow': action restoreTowerClass is not simulated until T807",
      "event 'echo': trigger restProgressPct is not simulated until T805",
      "event 'echo': action spawnEcho is not simulated until T807",
      "event 'dawn': trigger restProgressPct is not simulated until T805",
      "event 'dawn': action restAll is not simulated until T805",
      "event 'dawn': action setPhase is not simulated until T806",
      "event 'dawn': action setLighting is not simulated until T806",
      "event 'won': trigger phase is not simulated until T806",
    ]);
  });

  it('are not in DEV_CONTENT until their tasks register them', () => {
    for (const id of Object.keys(DEV_M8_MAPS)) {
      expect(Object.hasOwn(DEV_CONTENT.maps, id), id).toBe(false);
    }
  });
});
