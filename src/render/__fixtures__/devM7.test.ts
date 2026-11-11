// M7's dev maps (devM7.ts; T700a): they compile and validate, and createSim refuses each until its
// tasks land, naming them (D146). Each task that runs one registers it in DEV_CONTENT, with its
// smoke flow, and moves its assertion here from "refused" to "runs". The map-level seams' validation
// (bearers, script groups, `cleared`, flag gates, jettison plates, flag-variant profiles) is
// exercised here on the dev maps; the unit and tower seams' in sim/m7seams.test.ts.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { IdSpace, MapDef, RawContent } from '../../content/types.ts';
import { validate } from '../../content/validate.ts';
import { createSim, type SimConfig } from '../../sim/index.ts';
import { DEV_CONTENT, type DevIds } from './devBattle.ts';
import { DEV_M7_MAPS, bearersMap } from './devM7.ts';

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

// ── The validators reject each malformed map-level seam shape ─────────────────────────────────

/** DEV_CONTENT's entities with the M7 dev maps only (or `maps`). */
function devRaw(
  maps: { readonly [id: string]: MapDef<DevIds> } = DEV_M7_MAPS,
): RawContent<IdSpace> {
  return { ...DEV_CONTENT, maps: { ...maps } };
}
/** The errors of rule `rule` in `raw`. */
function errors(raw: RawContent<IdSpace>, rule: string): string[] {
  return validate(raw).filter((e) => e.startsWith(`[${rule}] `));
}
function bearers(patch: Partial<MapDef<DevIds>>): RawContent<IdSpace> {
  return devRaw({ dev_bearers: { ...bearersMap, ...patch } });
}

describe('validation of the M7 map seams', () => {
  it('accepts the M7 dev maps', () => {
    expect(validate(devRaw())).toEqual([]);
  });

  it('[bearers], [core]: bearers walk with an asset that has them, home by a door of their own', () => {
    const { bearers: _off, ...asset } = bearersMap.asset!;
    expect(errors(bearers({ asset }), 'bearers')).toEqual([
      '[bearers] maps.dev_bearers.refugees.bearers.kind: bearers walk with an asset that has `bearers`',
    ]);
    // The bearers' door isn't the map's core; as plain refugees it would be a second core.
    const plain = { bearers: { route: 'home', count: 6 } };
    expect(errors(bearers({ refugees: plain, asset }), 'core')).toHaveLength(1);
    expect(errors(bearers({ refugees: plain }), 'bearers')).toEqual([
      "[bearers] maps.dev_bearers.asset.bearers: needs a refugee group of kind 'bearer'",
    ]);
  });

  it('[script-group], [script]: spawnWave names a group; `cleared` names wreckage before a wave', () => {
    const events = bearersMap.events!.map((e) =>
      e.id === 'surge' ? { ...e, actions: [{ spawnWave: 'nope' }] } : e,
    );
    expect(errors(bearers({ events }), 'script-group')).toEqual([
      "[script-group] maps.dev_bearers.events: spawnWave names no script group 'nope'",
      '[script-group] maps.dev_bearers.scriptGroups.surge: no spawnWave action spawns it',
    ]);
    const [cut] = bearersMap.objectives!;
    const objectives = [{ ...cut!, condition: { cleared: ['door', 'door'], byWave: 9 } }];
    expect(errors(bearers({ objectives }), 'script')).toEqual([
      "[script] maps.dev_bearers.objectives[0].condition: marker 'door' is not on a wreckage tile ('x')",
      "[script] maps.dev_bearers.objectives[0].condition: marker 'door' is not on a wreckage tile ('x')",
      "[script] maps.dev_bearers.objectives[0].condition: 'door' is listed twice",
      '[script] maps.dev_bearers.objectives[0].condition: byWave 9 must be a wave of the map from 2 to 3',
    ]);
  });

  it('[flag-gate], [flag-variants]: gates name a script flag and its value', () => {
    const [post] = bearersMap.allies!;
    const allies = [{ ...post!, when: { flag: 'door_choice' as const, eq: 'tunnel' } }];
    expect(errors(bearers({ allies }), 'flag-gate')).toEqual([
      "[flag-gate] maps.dev_bearers.allies[0].when.eq: 'tunnel' is not a value of 'door_choice'",
    ]);
    const { flagVariants: _none, ...noVariants } = bearersMap;
    expect(
      errors(devRaw({ dev_bearers: noVariants }), 'flag-variants').filter((e) =>
        e.includes('allies'),
      ),
    ).toHaveLength(1);
    expect(
      errors(
        bearers({ markerWhen: { nowhere: { flag: 'door_choice', eq: 'convoy' } } }),
        'flag-gate',
      ),
    ).toEqual(["[flag-gate] maps.dev_bearers.markerWhen.nowhere: unknown marker 'nowhere'"]);
  });

  it('[jettison]: a boss in the waves lands its plates on decor markers of the map', () => {
    const takeover = DEV_M7_MAPS.dev_takeover!;
    const markers = { crash_1: [2, 0], crash_2: [3, 2], crash_3: [6, 0] } as const;
    const map: MapDef<DevIds> = { ...takeover, markers };
    expect(errors(devRaw({ dev_takeover: map }), 'jettison')).toEqual([
      "[jettison] maps.dev_takeover.markers: plate marker 'crash_2' (3,2) must sit on decor ('.')",
      "[jettison] maps.dev_takeover.markers: 'shareholder_value' jettisons a plate on 'crash_4', which isn't a marker",
    ]);
  });

  it('[flag-profile]: each cell names flagVariants values once, and its par is owned', () => {
    const cell = {
      when: { door_choice: 'warren' as const },
      profile: { ...bearersMap.referenceProfile, towers: ['zapcoil' as const] },
    };
    const raw = bearers({
      referenceProfileByFlag: [
        cell,
        cell,
        { when: { quill_choice: 'purge' as const }, profile: cell.profile },
      ],
    });
    expect(errors(raw, 'flag-profile')).toEqual([
      '[flag-profile] maps.dev_bearers.referenceProfileByFlag[1].when: another cell names these values',
      "[flag-profile] maps.dev_bearers.referenceProfileByFlag[2].when: flagVariants has no 'quill_choice' entry",
    ]);
    const owned = bearers({
      referenceProfileByFlag: [{ ...cell, parBuild: bearersMap.parBuild }],
    });
    expect(errors(owned, 'loadout')).toEqual([
      "[loadout] maps.dev_bearers.referenceProfileByFlag[0].parBuild.loadout: 'rivet' isn't in the reference profile",
    ]);
  });
});
