// M6's dev maps (devM6.ts; T600a): they compile and validate, and createSim refuses each until its
// tasks land, naming them (D141). Each task that runs one registers it in DEV_CONTENT, with its
// smoke flow, and moves its assertion here from "refused" to "runs".
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { IdSpace } from '../../content/types.ts';
import { gateRefusals } from '../../sim/gates.ts';
import type { SimConfig } from '../../sim/index.ts';
import { unsupportedScript } from '../../sim/systems/triggers.ts';
import { DEV_CONTENT } from './devBattle.ts';
import { DEV_M6_MAPS } from './devM6.ts';

const dev = compileContent({ ...DEV_CONTENT, maps: { ...DEV_CONTENT.maps, ...DEV_M6_MAPS } });
const maps: Readonly<Record<string, (typeof dev.maps)[keyof typeof dev.maps]>> = dev.maps;

function config(mapId: string, slot2: string | null = null): SimConfig<IdSpace> {
  return {
    content: dev,
    mapId,
    seed: 1,
    loadout: maps[mapId]!.builds.parBuild.loadout,
    companion: slot2 === null ? null : 'bramble',
    modifiers: [],
    difficulty: 'standard',
    abilities: { slot1: 'dev_strike', slot2, slot2State: slot2 === null ? 'none' : 'equipped' },
    specsUnlocked: [],
    scriptFlags: { door_choice: 'convoy' },
  };
}

/** Everything createSim would refuse on `mapId`: gates, then script parts. */
function refused(mapId: string, slot2: string | null = null): string[] {
  return [...gateRefusals(config(mapId, slot2)), ...unsupportedScript(maps[mapId]!)];
}

describe('the M6 dev maps', () => {
  it('dev_maw: a Maw among Motes, a rift lane open from W2 (T602)', () => {
    expect(maps.dev_maw?.routes.rift).toMatchObject({ kind: 'rift', opensAtWave: 2 });
    expect(refused('dev_maw')).toEqual([
      'gathering (maw) is not simulated until T602',
      'rift lanes (rift) is not simulated until T602',
    ]);
  });

  it('dev_den: the Scuttle Den and Underfoot against Undertows (T604)', () => {
    expect(refused('dev_den', 'underfoot')).toEqual([
      "the 'burrow' tower is not simulated until T604",
      "a 'spawner' attack (burrow) is not simulated until T604",
      "the 'pathTrap' ability (underfoot) is not simulated until T604",
    ]);
  });

  it('dev_revoke: Everglow Security, then the revocation inside W2 (T603, T606)', () => {
    expect(refused('dev_revoke')).toEqual([
      'a haste aura (expediter) is not simulated until T603',
      "event 'revoke': action revokeTowerClass/refundPct is not simulated until T606",
      "event 'revoke': action revokeAbility is not simulated until T606",
      "event 'revoke': action setModifier/on is not simulated until T606",
    ]);
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
    for (const id of Object.keys(DEV_M6_MAPS)) {
      expect(Object.hasOwn(DEV_CONTENT.maps, id), id).toBe(false);
    }
  });
});
