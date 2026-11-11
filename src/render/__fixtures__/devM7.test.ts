// M7's dev maps (devM7.ts; T700a): they compile and validate, and createSim refuses each until its
// tasks land, naming them (D146). Each task that runs one registers it in DEV_CONTENT, with its
// smoke flow, and moves its assertion here from "refused" to "runs".
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { IdSpace } from '../../content/types.ts';
import { createSim, type SimConfig } from '../../sim/index.ts';
import { DEV_CONTENT } from './devBattle.ts';
import { DEV_M7_MAPS } from './devM7.ts';

const dev = compileContent({ ...DEV_CONTENT, maps: { ...DEV_CONTENT.maps, ...DEV_M7_MAPS } });
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
    scriptFlags: { door_choice: 'convoy' },
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

describe('the M7 dev maps', () => {
  it('dev_jam: the tendril, the rings, the healer, System Reboot (T702, T703, T707)', () => {
    expect(maps.dev_jam?.builds.referenceProfile.technicianAbility).toBe('system_reboot');
    expect(refused('dev_jam')).toEqual([
      "the 'reboot' ability (system_reboot) is not simulated until T702",
      "a 'tendril' jam (silencer) is not simulated until T702",
      'a healer aura (associate) is not simulated until T703',
      "a 'ring' jam (auditor) is not simulated until T707",
    ]);
  });

  it('dev_takeover: Shareholder Value’s phases and its four crash markers (T707)', () => {
    const map = maps.dev_takeover!;
    expect(Object.keys(map.markers)).toEqual(['crash_1', 'crash_2', 'crash_3', 'crash_4']);
    // Its jams need the Jammed state (T702) as well as the Takeover itself (T707).
    expect(refused('dev_takeover')).toEqual([
      "the 'reboot' ability (system_reboot) is not simulated until T702",
      "a 'ring' jam (auditor) is not simulated until T707",
      'a hangar (shareholder_value) is not simulated until T707',
      "Hostile Takeover's jam (shareholder_value) is not simulated until T702",
      'Hostile Takeover (shareholder_value) is not simulated until T707',
      'a jettison (shareholder_value) is not simulated until T707',
    ]);
  });

  it('dev_gmaw: the Gathering Maw’s gather, split, and merge (T708)', () => {
    expect(refused('dev_gmaw')).toEqual([
      "a boss's gather (gathering_maw) is not simulated until T708",
      'a boss split (gathering_maw) is not simulated until T708',
    ]);
  });

  it('dev_bearers: bearers, Cut the Feed, the surge, convoy’s militia (T706)', () => {
    const map = maps.dev_bearers!;
    expect(map.escort?.groups.map((g) => [g.id, g.kind, g.exit])).toEqual([
      ['bearers', 'bearer', 'door'],
    ]);
    expect(map.allies[0]?.when).toEqual({ flag: 'door_choice', eq: 'convoy' });
    expect(map.markerWhen).toEqual({ banner: { flag: 'door_choice', eq: 'convoy' } });
    expect(map.dressing[0]?.when).toEqual({ flag: 'door_choice', eq: 'convoy' });
    expect(map.scriptGroups.surge).toMatchObject({ count: 6, route: { id: 'a' } });
    expect(refused('dev_bearers')).toEqual([
      "a flag-gated post ('militia' at 'militia_post') is not simulated until T706",
      'bearers (bearers) is not simulated until T706',
      "event 'surge': action spawnWave is not simulated until T706",
      "event 'feed_cut': trigger objectiveCompleted is not simulated until T706",
      "objective 'cut_the_feed': condition: condition cleared is not simulated until T706",
    ]);
  });

  it('dev_sproing: the Sproing Pad and the Gloop Spitter are stubs (T704, T705)', () => {
    expect(refused('dev_sproing')).toEqual([
      "the 'sproing' tower is not simulated until T704",
      "the 'gloop' tower is not simulated until T705",
      "a 'leaper' attack (sproing) is not simulated until T704",
    ]);
  });

  it('are not in DEV_CONTENT until their tasks register them', () => {
    for (const id of Object.keys(DEV_M7_MAPS)) {
      expect(Object.hasOwn(DEV_CONTENT.maps, id), id).toBe(false);
    }
  });
});
