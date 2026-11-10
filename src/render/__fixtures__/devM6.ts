// M6's dev maps (T600a seams): each brings one Act III system to a small map of its own, so its
// task can test and smoke it before its campaign map lands. Their own layouts and definers, so
// devBattle.ts (which registers them in DEV_CONTENT) imports this file without a cycle: only the
// DevIds type comes back from there. Each is registered in DEV_CONTENT.maps by the task that lifts
// its gates, with its smoke flow; until then devM6.test.ts checks it compiles and is refused,
// naming its tasks.
// - `dev_maw` (T602): Motes and a Maw down the road (the gather, its tendril tell, its growth),
//   then Motes up a rift lane that opens at W2 (telegraphed as W2's countdown begins).
// - `dev_den` (T604): a Scuttle Den beside the road and Bramble's Underfoot, against Undertows
//   (burrowed: the swarmlings follow them down, the trap reaches them).
// - `dev_revoke` (T603, T606): Compliance Drones with an Expediter (its haste ring), then a W2
//   revocation inside the wave's spawn window: the Everglow class with the most credits invested
//   (100% refund), the slot-1 ability, and QUILL's lockout.
// - `dev_holdout` (T605): a Holdout with two doors; the `door_choice` side's refugees walk to
//   theirs while Hollow come down the choke past Bricks (a blocker, 2 at a time, his health on a
//   three-wave timeline to the 5% floor); W3's start forces the SEAL, and its press ends the map
//   `completed`. Harness: both doors (`flagVariants`), the SEAL pressed by `scriptInput`.
import { mapDefinersFor } from '../../content/define.ts';
import type { MapDef } from '../../content/types.ts';
import type { DevIds } from './devBattle.ts';

const dev = mapDefinersFor<DevIds>();

const PROFILE = {
  specs: [],
  shop: {},
  protocols: [],
  technicianAbility: 'dev_strike',
} as const;

// A road east along row 1, down column 10, and east again into the core (13,6); a rift lane under
// it through the decor of row 6 (never a pad), joining the road's last stretch. Pads on both sides.
const ROAD = dev.defineMapLayout({
  id: 'dev_maw',
  act: 3,
  env: 'act3',
  objective: 'defend',
  size: { cols: 14, rows: 8 },
  // prettier-ignore
  tiles: [
    '..............',
    'S##########...',
    '.o.o.o.o..#.o.',
    '..........#...',
    '.o.o.o.o..#.o.',
    '..........#...',
    '..........###C',
    '..............',
  ],
  paths: [
    {
      id: 'a',
      tiles: [
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
        [4, 1],
        [5, 1],
        [6, 1],
        [7, 1],
        [8, 1],
        [9, 1],
        [10, 1],
        [10, 2],
        [10, 3],
        [10, 4],
        [10, 5],
        [10, 6],
        [11, 6],
        [12, 6],
        [13, 6],
      ],
    },
  ],
  startCredits: 900,
  stardust: 0,
  threatIntel: [],
  requiredCounters: [],
  companion: null,
});

const RIFT = {
  id: 'rift',
  opensAtWave: 2,
  tiles: [
    [0, 6],
    [1, 6],
    [2, 6],
    [3, 6],
    [4, 6],
    [5, 6],
    [6, 6],
    [7, 6],
    [8, 6],
    [9, 6],
    [10, 6],
    [11, 6],
    [12, 6],
    [13, 6],
  ],
} as const;

/** dev_maw (T602): a Maw among Motes, then a rift lane from W2. */
export const mawMap = dev.defineMap({
  ...ROAD,
  riftLanes: [RIFT],
  threatIntel: ['armored', 'gathering', 'clustered'],
  requiredCounters: ['splash', 'armor'],
  waves: dev.defineWaves([
    {
      groups: [
        { enemy: 'mote', count: 6, route: 'a', intervalSec: 0.3 },
        { enemy: 'maw', count: 1, route: 'a', delaySec: 1 },
      ],
    },
    { countdownSec: 10, groups: [{ enemy: 'mote', count: 8, route: 'rift', intervalSec: 0.3 }] },
  ]),
  referenceProfile: { ...PROFILE, towers: ['rivet', 'zapcoil'] },
  parBuild: {
    loadout: ['rivet', 'zapcoil'],
    steps: [
      { wave: 1, build: 'zapcoil', tile: [7, 2] },
      { wave: 1, build: 'rivet', tile: [12, 4] },
      { wave: 1, build: 'zapcoil', tile: [7, 4] },
    ],
  },
  noCounterBuilds: {
    splash: { loadout: ['rivet'], steps: [{ wave: 1, build: 'rivet', tile: [12, 4] }] },
    armor: { loadout: ['zapcoil'], steps: [{ wave: 1, build: 'zapcoil', tile: [7, 2] }] },
  },
});

/** dev_den (T604): the Scuttle Den and Underfoot against Undertows. */
export const denMap = dev.defineMap({
  ...ROAD,
  id: 'dev_den',
  companion: { id: 'bramble', state: 'present' },
  threatIntel: ['armored', 'burrowing'],
  requiredCounters: ['armor', 'burrowed'],
  waves: dev.defineWaves([
    { groups: [{ enemy: 'undertow', count: 3, route: 'a', intervalSec: 2 }] },
  ]),
  referenceProfile: { ...PROFILE, towers: ['burrow', 'rivet'] },
  parBuild: {
    loadout: ['burrow', 'rivet'],
    steps: [
      { wave: 1, build: 'burrow', tile: [5, 2] },
      { wave: 1, build: 'burrow', tile: [12, 4] },
      { wave: 1, build: 'rivet', tile: [7, 2] },
      { wave: 1, ability: 2, target: [10, 3] },
    ],
  },
  noCounterBuilds: {
    armor: { loadout: ['burrow'], steps: [{ wave: 1, build: 'burrow', tile: [5, 2] }] },
    burrowed: { loadout: ['rivet'], steps: [{ wave: 1, build: 'rivet', tile: [7, 2] }] },
  },
});

/** dev_revoke (T603, T606): Everglow Security, then the revocation inside W2's spawn window. */
export const revokeMap = dev.defineMap({
  ...ROAD,
  id: 'dev_revoke',
  threatIntel: ['armored', 'haste_aura'],
  requiredCounters: ['armor'],
  waves: dev.defineWaves([
    {
      groups: [
        { enemy: 'compliance', count: 6, route: 'a' },
        { enemy: 'expediter', count: 1, route: 'a', delaySec: 2 },
      ],
    },
    { countdownSec: 10, groups: [{ enemy: 'compliance', count: 10, route: 'a' }] },
  ]),
  events: [
    {
      id: 'revoke',
      on: { wave: 2, phase: { afterSec: 5 } },
      actions: [
        { cue: 'dev_revoke_cue_revoke' },
        { revokeTowerClass: { select: 'mostInvested', faction: 'everglow' }, refundPct: 100 },
        { revokeAbility: 'dev_strike' },
        { setModifier: 'quillLockout', on: true },
      ],
    },
  ],
  referenceProfile: { ...PROFILE, towers: ['rivet', 'sprinkler', 'zapcoil'] },
  parBuild: {
    loadout: ['rivet', 'sprinkler', 'zapcoil'],
    steps: [
      // Two Rivets out-invest the Sprinkler, so the cue takes the Rivet class.
      { wave: 1, build: 'rivet', tile: [7, 2] },
      { wave: 1, build: 'rivet', tile: [12, 4] },
      { wave: 1, build: 'sprinkler', tile: [7, 4] },
      { wave: 2, build: 'zapcoil', tile: [5, 2] },
    ],
  },
  noCounterBuilds: {
    armor: { loadout: ['zapcoil'], steps: [{ wave: 1, build: 'zapcoil', tile: [7, 2] }] },
  },
});

/** dev_holdout (T605): the Holdout, two doors by `door_choice`, Bricks's block, and the SEAL. */
export const holdoutMap = dev.defineMap({
  id: 'dev_holdout',
  act: 3,
  env: 'act3',
  objective: 'holdout',
  meterLabel: 'evacuated',
  evacuatedFloor: 0.5,
  size: { cols: 14, rows: 8 },
  // prettier-ignore
  tiles: [
    '......S.......',
    '......#.......',
    '.o..o.#.o..o..',
    '......#.......',
    '..#########...',
    '..#.o..o..#...',
    'S##.......###S',
    '..C.......C...',
  ],
  paths: [
    {
      id: 'west',
      tiles: [
        [6, 0],
        [6, 1],
        [6, 2],
        [6, 3],
        [6, 4],
        [5, 4],
        [4, 4],
        [3, 4],
        [2, 4],
        [2, 5],
        [2, 6],
        [2, 7],
      ],
    },
    {
      id: 'east',
      tiles: [
        [6, 0],
        [6, 1],
        [6, 2],
        [6, 3],
        [6, 4],
        [7, 4],
        [8, 4],
        [9, 4],
        [10, 4],
        [10, 5],
        [10, 6],
        [10, 7],
      ],
    },
    {
      id: 'convoy',
      tiles: [
        [0, 6],
        [1, 6],
        [2, 6],
        [2, 7],
      ],
    },
    {
      id: 'warren',
      tiles: [
        [13, 6],
        [12, 6],
        [11, 6],
        [10, 6],
        [10, 7],
      ],
    },
  ],
  markers: { door_west: [2, 7], door_east: [10, 7], bricks_post: [7, 3] },
  safeExit: 'door_west',
  refugees: {
    convoy: {
      route: 'convoy',
      exit: 'door_west',
      when: { flag: 'door_choice', eq: 'convoy' },
    },
    warren: {
      route: 'warren',
      exit: 'door_east',
      when: { flag: 'door_choice', eq: 'warren' },
    },
  },
  allies: [
    {
      kind: 'bricks',
      post: 'bricks_post',
      attack: {
        type: 'kinetic',
        damage: 8,
        ratePerSec: 2,
        rangeTiles: 2,
        targets: { ground: true, air: true },
      },
      block: {
        capacity: 2,
        health: [
          { wave: 2, pct: 0.6 },
          { wave: 3, pct: 0.05 },
        ],
      },
    },
  ],
  startCredits: 900,
  stardust: 0,
  threatIntel: ['clustered'],
  requiredCounters: ['splash'],
  companion: null,
  waves: dev.defineWaves([
    { groups: [{ enemy: 'mote', count: 6, route: 'west', delaySec: 4, intervalSec: 0.3 }] },
    {
      countdownSec: 10,
      noCall: true,
      groups: [{ enemy: 'mote', count: 8, route: 'east', intervalSec: 0.3 }],
    },
    {
      countdownSec: 10,
      noCall: true,
      groups: [{ enemy: 'mote', count: 12, route: 'west', intervalSec: 0.3 }],
    },
  ]),
  events: [
    {
      id: 'groups',
      on: { wave: 1, phase: 'start' },
      actions: [{ spawnAllies: 'convoy' }, { spawnAllies: 'warren' }],
    },
    { id: 'seal', on: { wave: 3, phase: 'start' }, actions: [{ forceInput: { id: 'seal' } }] },
    { id: 'held', on: { forcedInputResolved: 'seal' }, actions: [{ endMap: 'completed' }] },
  ],
  flagVariants: { door_choice: ['convoy', 'warren'] },
  referenceProfile: { ...PROFILE, towers: ['rivet', 'zapcoil'] },
  parBuild: {
    loadout: ['rivet', 'zapcoil'],
    steps: [
      { wave: 1, build: 'zapcoil', tile: [4, 2] },
      { wave: 1, build: 'zapcoil', tile: [8, 2] },
      { wave: 1, build: 'rivet', tile: [4, 5] },
      { wave: 1, build: 'rivet', tile: [7, 5] },
      { wave: 3, scriptInput: 'seal' },
    ],
  },
  noCounterBuilds: {
    splash: {
      loadout: ['rivet'],
      steps: [
        { wave: 1, build: 'rivet', tile: [4, 5] },
        { wave: 3, scriptInput: 'seal' },
      ],
    },
  },
});

/** M6's dev maps, by id (T602–T606): each registered in DEV_CONTENT by the task that lifts it. */
export const DEV_M6_MAPS: { readonly [id: string]: MapDef<DevIds> } = {
  dev_maw: mawMap,
  dev_den: denMap,
  dev_revoke: revokeMap,
  dev_holdout: holdoutMap,
};
