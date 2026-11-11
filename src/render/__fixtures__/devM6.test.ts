// M6's dev maps (devM6.ts; T600a): they compile and validate, and createSim refuses each until its
// tasks land, naming them (D141). Each task that runs one registers it in DEV_CONTENT, with its
// smoke flow, and moves its assertion here from "refused" to "runs".
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { IdSpace } from '../../content/types.ts';
import { createSim, type SimConfig } from '../../sim/index.ts';
import { DEV_CONTENT } from './devBattle.ts';
import { DEV_M6_MAPS } from './devM6.ts';

const dev = compileContent({ ...DEV_CONTENT, maps: { ...DEV_CONTENT.maps, ...DEV_M6_MAPS } });
const maps: Readonly<Record<string, (typeof dev.maps)[keyof typeof dev.maps]>> = dev.maps;
/** DEV_CONTENT's maps by any id (its type names only dev_range). */
const devMaps: Readonly<Record<string, unknown>> = DEV_CONTENT.maps;

function config(mapId: string, slot2: string | null = null): SimConfig<IdSpace> {
  return {
    content: dev,
    mapId,
    seed: 1,
    loadout: maps[mapId]!.builds.parBuild.loadout,
    companion: slot2 === null ? null : 'bramble',
    modifiers: [],
    difficulty: 'standard',
    abilities: { slot1: 'dev_strike', slot2, slot2State: slot2 === null ? 'none' : 'present' },
    specsUnlocked: [],
    scriptFlags: { door_choice: 'convoy' },
  };
}

/** Everything createSim refuses on `mapId` (its RangeError's lines): gates, then script parts. */
function refused(mapId: string, slot2: string | null = null): string[] {
  try {
    createSim(config(mapId, slot2));
  } catch (err) {
    const lines = (err instanceof Error ? err.message : String(err)).split('\n');
    return lines.filter((l) => l.startsWith('- ')).map((l) => l.slice(2));
  }
  return [];
}

describe('the M6 dev maps', () => {
  it('dev_maw: a Maw among Motes, a rift lane open from W2 (T602, registered)', () => {
    expect(maps.dev_maw?.routes.rift).toMatchObject({ kind: 'rift', opensAtWave: 2 });
    expect(refused('dev_maw')).toEqual([]);
    expect(devMaps['dev_maw']).toBe(DEV_M6_MAPS.dev_maw);
  });

  it('dev_den: the Scuttle Den and Underfoot against Undertows (T604, registered)', () => {
    expect(refused('dev_den', 'underfoot')).toEqual([]);
    expect(devMaps['dev_den']).toBe(DEV_M6_MAPS.dev_den);
  });

  it('dev_revoke: Everglow Security runs (T603, registered); T606 adds the revocation', () => {
    expect(refused('dev_revoke')).toEqual([]);
    expect(devMaps['dev_revoke']).toBe(DEV_M6_MAPS.dev_revoke);
  });

  it('dev_holdout: two doors by door_choice, Bricks blocking on a timeline, the SEAL (T605)', () => {
    const map = maps.dev_holdout!;
    expect(map.objective).toBe('holdout');
    expect(map.escort?.groups.map((g) => [g.id, g.exit, g.exitTile, g.when])).toEqual([
      ['convoy', 'door_west', [2, 7], { flag: 'door_choice', eq: 'convoy' }],
      ['warren', 'door_east', [10, 7], { flag: 'door_choice', eq: 'warren' }],
    ]);
    expect(map.allies[0]?.block).toEqual({
      capacity: 2,
      health: [
        { wave: 2, pct: 0.6 },
        { wave: 3, pct: 0.05 },
      ],
    });
    expect(refused('dev_holdout')).toEqual([
      'a Holdout is not simulated until T605',
      "a blocker ('bricks' at 'bricks_post') is not simulated until T605",
      "event 'seal': action forceInput is not simulated until T605",
      "event 'held': trigger forcedInputResolved is not simulated until T605",
      "event 'held': action endMap is not simulated until T605",
    ]);
  });

  it('are not in DEV_CONTENT until their tasks register them', () => {
    const registered = new Set(['dev_revoke', 'dev_maw', 'dev_den']); // T603, T602, T604
    for (const id of Object.keys(DEV_M6_MAPS)) {
      expect(Object.hasOwn(DEV_CONTENT.maps, id), id).toBe(registered.has(id));
    }
  });
});
