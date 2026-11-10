// M5's dev maps (T500a seams), on dev_act2's layout (devBattle.ts: two roads, west and south-west,
// merging on the east road into the core). Each needs a system whose task hasn't landed, so createSim
// refuses it (FEATURE_GATES `map.escort`, `map.darkness`) and it isn't in DEV_CONTENT yet: the
// battle smoke boots every registered dev map. The task that lifts its gate adds it to
// DEV_CONTENT.maps (devBattle.ts) and writes its smoke flow:
// - `dev_escort` (T305c): an Escort from the start. Two refugee groups (Pebble rides with the first)
//   walk the west road to the gate, the core tile (`safeExit`), while Motes come down the
//   south-west road to the merge and follow the second group in. `maxLost` 6.
// - `dev_dark` (T505): Sundown in two waves, half dark as W1 starts and full dark as W2 does, with
//   two lamps (one on the west road's bend, one by the merge); Rivets inside and outside the light.
import type { MapDef } from '../../content/types.ts';
import { act2Layout, dev, type DevIds } from './devBattle.ts';

const escortMap = dev.defineMap({
  ...act2Layout,
  id: 'dev_escort',
  objective: 'escort',
  meterLabel: 'evacuated',
  maxLost: 6,
  markers: { gate: [17, 10] },
  safeExit: 'gate',
  refugees: { first: { route: 'a', withPebble: true }, second: { route: 'a' } },
  threatIntel: ['clustered'],
  waves: dev.defineWaves([
    { groups: [{ enemy: 'mote', count: 6, route: 'b', delaySec: 6, intervalSec: 0.3 }] },
    {
      countdownSec: 10,
      groups: [{ enemy: 'mote', count: 8, route: 'a', delaySec: 8, intervalSec: 0.3 }],
    },
  ]),
  events: [
    { id: 'first_group', on: { wave: 1, phase: 'start' }, actions: [{ spawnAllies: 'first' }] },
    { id: 'second_group', on: { wave: 2, phase: 'start' }, actions: [{ spawnAllies: 'second' }] },
  ],
  referenceProfile: {
    towers: ['rivet', 'zapcoil'],
    specs: [],
    shop: {},
    protocols: [],
    technicianAbility: 'dev_strike',
  },
  parBuild: {
    loadout: ['rivet', 'zapcoil'],
    steps: [
      { wave: 1, build: 'zapcoil', tile: [14, 4] },
      { wave: 1, build: 'rivet', tile: [16, 8] },
    ],
  },
  noCounterBuilds: {},
});

const darkMap = dev.defineMap({
  ...act2Layout,
  id: 'dev_dark',
  lighting: [
    { wave: 1, env: 'act2.dusk', dark: 0.5 },
    { wave: 2, env: 'act2.dusk', dark: 1 },
  ],
  markers: { lamp_bend: [9, 4], lamp_merge: [16, 6] },
  lights: [
    { marker: 'lamp_bend', radiusTiles: 1.5 },
    { marker: 'lamp_merge', radiusTiles: 1.5 },
  ],
  waves: dev.defineWaves([
    { groups: [{ enemy: 'dev_nibbler', count: 8, route: 'a' }] },
    { countdownSec: 10, groups: [{ enemy: 'dev_nibbler', count: 10, route: 'b' }] },
  ]),
  referenceProfile: {
    towers: ['rivet'],
    specs: [],
    shop: {},
    protocols: [],
    technicianAbility: 'dev_strike',
  },
  parBuild: {
    loadout: ['rivet'],
    steps: [
      // Inside the bend's lamp, and out in the dark.
      { wave: 1, build: 'rivet', tile: [8, 4] },
      { wave: 1, build: 'rivet', tile: [3, 6] },
    ],
  },
  noCounterBuilds: {},
});

/** M5's dev maps, by id, for the tasks that register them (T305c, T505). */
export const DEV_M5_MAPS: { readonly [id: string]: MapDef<DevIds, string> } = {
  dev_escort: escortMap,
  dev_dark: darkMap,
};
