// M7's dev maps (T700a seams): each brings one Act III part-two system to a small map of its own,
// so its task can test and smoke it before its campaign map lands. Their own layouts and definers,
// so devBattle.ts (which registers them in DEV_CONTENT) imports this file without a cycle: only the
// DevIds type comes back from there. Each is registered in DEV_CONTENT.maps by the task that lifts
// its gates, with its smoke flow; until then devM7.test.ts checks it compiles and is refused,
// naming its tasks.
// - `dev_jam` (T702, T703, T707): a Silencer's tendril on a Hum Choir beside the road, then
//   Auditors' rings in a column of Compliance Drones healed by a Maintenance Associate. Slot 1 is
//   System Reboot.
// - `dev_takeover` (T707): Auditors, then "Shareholder Value": its hangar's drones, Hostile
//   Takeover at 66%, the jettison at 33% onto four `crash_*` decor markers off the road.
// - `dev_gmaw` (T708): Motes catching up the Gathering Maw (its wide gather), its split at 50%
//   and the merge 12 s later.
// - `dev_bearers` (T706): a Protect map whose asset is the bearers: as W2 starts a bearer group
//   walks home to the west-edge door while Motes come down the road and three come out of the
//   vats behind the bearers to hunt them (each hushed costs the asset 1); Cut the Feed (two `feed_*` wreckage markers
//   cleared before W3) or W3's surge script group walks in; a militia post and a dressing layer
//   and a banner marker under `door_choice = convoy`.
// - `dev_sproing` (T704): the Sproing Pad against Puffwings on an air lane, grounding them for a
//   ground-only Thumper, with a Choir and a Lantern beside it (its links).
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

/** The road east along row 1, down column 10, east into the core (13,6) (devM6.ts's dev_maw's). */
const ROAD_TILES = [
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
] as const;

const ROAD = dev.defineMapLayout({
  id: 'dev_jam',
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
  paths: [{ id: 'a', tiles: ROAD_TILES }],
  startCredits: 900,
  stardust: 0,
  threatIntel: [],
  requiredCounters: [],
  companion: null,
});

/** dev_jam (T702, T703, T707): the tendril on a Choir, then rings among healed drones. */
export const jamMap = dev.defineMap({
  ...ROAD,
  threatIntel: ['armored', 'jammer', 'healer_aura'],
  requiredCounters: ['armor', 'jam'],
  waves: dev.defineWaves([
    // One Silencer, alone (the teach): its tendril picks the Choir at (5,2).
    { groups: [{ enemy: 'silencer', count: 1, route: 'a' }] },
    {
      countdownSec: 10,
      groups: [
        { enemy: 'compliance', count: 6, route: 'a' },
        { enemy: 'associate', count: 1, route: 'a', delaySec: 2 },
        { enemy: 'auditor', count: 2, route: 'a', delaySec: 3 },
      ],
    },
  ]),
  referenceProfile: { ...PROFILE, towers: ['rivet', 'choir'], technicianAbility: 'system_reboot' },
  parBuild: {
    loadout: ['rivet', 'choir'],
    steps: [
      { wave: 1, build: 'choir', tile: [5, 2] },
      { wave: 1, build: 'rivet', tile: [3, 2] },
      { wave: 1, build: 'rivet', tile: [7, 2] },
      { wave: 1, upgrade: [7, 2] },
      { wave: 1, upgrade: [7, 2] },
      // T707: a fourth tower out of every jammer's reach, so one jam at a time is 25% (#10).
      { wave: 1, build: 'rivet', tile: [3, 4] },
      { wave: 2, ability: 1, when: { afterSec: 8 } },
    ],
  },
  noCounterBuilds: {
    armor: { loadout: ['choir'], steps: [{ wave: 1, build: 'choir', tile: [5, 2] }] },
    jam: { loadout: ['rivet'], steps: [{ wave: 1, build: 'rivet', tile: [7, 2] }] },
  },
});

/**
 * dev_takeover (T707): Auditors, then "Shareholder Value"'s three phases and its plates. Par is
 * four Railspikes (armor-ignoring) round a Hum Choir, and a tier-3 Rivet by the column for the
 * hangar's drones; with six towers placed each Hostile Takeover takes one (≤ 25%). Sterling's three cues bind to the boss's phases
 * (`bossPhase` 1–3: the worked example for A3M5's, T721).
 */
export const takeoverMap = dev.defineMap({
  ...ROAD,
  id: 'dev_takeover',
  startCredits: 3400,
  // The jettison's plates land on decor off the road (D146: never a pad).
  markers: { crash_1: [2, 0], crash_2: [4, 0], crash_3: [6, 0], crash_4: [8, 0] },
  threatIntel: ['armored', 'jammer', 'boss'],
  requiredCounters: ['armor', 'jam'],
  waves: dev.defineWaves([
    { groups: [{ enemy: 'auditor', count: 2, route: 'a' }] },
    { countdownSec: 10, groups: [{ enemy: 'shareholder_value', count: 1, route: 'a' }] },
  ]),
  events: [
    { id: 'sv_spawn', on: { bossPhase: 1 }, actions: [{ cue: 'dev_takeover_cue_sv_spawn' }] },
    { id: 'takeover', on: { bossPhase: 2 }, actions: [{ cue: 'dev_takeover_cue_takeover' }] },
    { id: 'jettison', on: { bossPhase: 3 }, actions: [{ cue: 'dev_takeover_cue_jettison' }] },
  ],
  referenceProfile: {
    ...PROFILE,
    towers: ['rivet', 'choir'],
    specs: ['rivet'],
    technicianAbility: 'system_reboot',
  },
  parBuild: {
    loadout: ['rivet', 'choir'],
    steps: [
      { wave: 1, build: 'choir', tile: [7, 2] },
      { wave: 1, build: 'rivet', tile: [5, 2] },
      { wave: 1, build: 'rivet', tile: [7, 4] },
      { wave: 1, build: 'rivet', tile: [3, 2] },
      { wave: 1, build: 'rivet', tile: [12, 4] },
      { wave: 1, build: 'rivet', tile: [12, 2] },
      { wave: 1, upgrade: [12, 4] },
      { wave: 1, upgrade: [12, 4] },
      ...[[5, 2] as const, [7, 4] as const, [3, 2] as const, [12, 2] as const].flatMap((tile) => [
        { wave: 1, upgrade: tile },
        { wave: 1, upgrade: tile },
        { wave: 1, specialize: tile, spec: 'b' as const }, // Railspike
      ]),
    ],
  },
  noCounterBuilds: {
    armor: { loadout: ['choir'], steps: [{ wave: 1, build: 'choir', tile: [5, 2] }] },
    jam: { loadout: ['rivet'], steps: [{ wave: 1, build: 'rivet', tile: [7, 2] }] },
  },
});

/** dev_gmaw (T708): Motes ahead of the Gathering Maw: its gather, the split, the merge. */
export const gmawMap = dev.defineMap({
  ...ROAD,
  id: 'dev_gmaw',
  threatIntel: ['clustered', 'armored', 'boss'],
  requiredCounters: ['splash', 'armor'],
  waves: dev.defineWaves([
    {
      groups: [
        // Motes first, the Maw 3 s behind: its 2-tile reach catches the stragglers.
        { enemy: 'mote', count: 8, route: 'a', intervalSec: 0.6 },
        { enemy: 'gathering_maw', count: 1, route: 'a', delaySec: 3 },
      ],
    },
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

/** dev_bearers (T706): the bearers walk home; Cut the Feed or W3's surge; convoy's militia. */
export const bearersMap = dev.defineMap({
  id: 'dev_bearers',
  act: 3,
  env: 'act3',
  objective: 'protect',
  size: { cols: 14, rows: 8 },
  // The bearers walk from the vats' spawn (9,3) west to the door home (0,3), a second core tile:
  // a bearer's exit ([escort], [core]). Two feed lines lie in wreckage at (11,0) and (11,7).
  // prettier-ignore
  tiles: [
    '...........x..',
    'S##########...',
    '.o.o.o.o..#.o.',
    'C########S#...',
    '.o.o.o.o..#.o.',
    '..........#...',
    '..........###C',
    '...........x..',
  ],
  underWreckage: { '11,0': '.', '11,7': '.' },
  salvage: { '11,0': 40, '11,7': 40 },
  paths: [
    { id: 'a', tiles: ROAD_TILES },
    {
      id: 'home',
      tiles: [
        [9, 3],
        [8, 3],
        [7, 3],
        [6, 3],
        [5, 3],
        [4, 3],
        [3, 3],
        [2, 3],
        [1, 3],
        [0, 3],
      ],
    },
  ],
  // The Hollow's flyers would cross to the vats; none fly here, but the asset needs its route.
  airLanes: [
    {
      id: 'sky',
      points: [
        [13, 0],
        [12, 5],
      ],
    },
  ],
  markers: {
    door: [0, 3],
    vats: [12, 5],
    feed_1: [11, 0],
    feed_2: [11, 7],
    militia_post: [9, 2],
    banner: [5, 0],
  },
  markerWhen: { banner: { flag: 'door_choice', eq: 'convoy' } },
  dressing: [{ kind: 'greySoil', area: 'all', when: { flag: 'door_choice', eq: 'convoy' } }],
  asset: { name: 'Bearers', integrity: 6, marker: 'vats', routes: ['sky'], bearers: true },
  safeExit: 'door',
  refugees: { bearers: { route: 'home', count: 6, kind: 'bearer' } },
  allies: [
    {
      kind: 'militia',
      post: 'militia_post',
      when: { flag: 'door_choice', eq: 'convoy' },
      attack: {
        type: 'kinetic',
        damage: 6,
        ratePerSec: 2,
        rangeTiles: 2.5,
        targets: { ground: true, air: false },
      },
    },
  ],
  scriptGroups: { surge: { enemy: 'mote', count: 6, route: 'a', intervalSec: 0.3 } },
  objectives: [
    {
      id: 'cut_the_feed',
      name: 'Cut the Feed',
      description: 'Clear both feed lines before wave 3.',
      condition: { cleared: ['feed_1', 'feed_2'], byWave: 3 },
      intel: 1,
    },
  ],
  events: [
    { id: 'walk', on: { wave: 2, phase: 'start' }, actions: [{ spawnAllies: 'bearers' }] },
    {
      id: 'surge',
      on: { wave: 3, phase: 'start' },
      when: { not: { objectiveDone: 'cut_the_feed' } },
      actions: [{ spawnWave: 'surge' }],
    },
    {
      id: 'feed_cut',
      on: { objectiveCompleted: 'cut_the_feed' },
      actions: [{ cue: 'dev_bearers_feed_cut' }],
    },
  ],
  startCredits: 900,
  stardust: 0,
  threatIntel: ['clustered'],
  requiredCounters: ['splash'],
  companion: null,
  waves: dev.defineWaves([
    { groups: [{ enemy: 'mote', count: 6, route: 'a', delaySec: 4, intervalSec: 0.3 }] },
    {
      countdownSec: 10,
      groups: [
        { enemy: 'mote', count: 8, route: 'a', intervalSec: 0.3 },
        // T706: three Motes come out of the vats behind the bearers and hunt them.
        { enemy: 'mote', count: 3, route: 'home', delaySec: 5, intervalSec: 1 },
      ],
    },
    { countdownSec: 10, groups: [{ enemy: 'mote', count: 10, route: 'a', intervalSec: 0.3 }] },
  ]),
  flagVariants: { door_choice: ['convoy', 'warren'] },
  referenceProfile: { ...PROFILE, towers: ['rivet', 'zapcoil'] },
  parBuild: {
    loadout: ['rivet', 'zapcoil'],
    steps: [
      { wave: 1, clear: [11, 0] },
      { wave: 1, clear: [11, 7] },
      { wave: 1, build: 'zapcoil', tile: [7, 2] },
      { wave: 1, build: 'zapcoil', tile: [7, 4] },
      { wave: 1, build: 'rivet', tile: [12, 4] },
    ],
  },
  noCounterBuilds: {
    splash: { loadout: ['rivet'], steps: [{ wave: 1, build: 'rivet', tile: [12, 4] }] },
  },
});

/**
 * dev_sproing (T704): the Sproing Pad against Puffwings on an air lane along the bottom (Nibblers
 * on the road), a ground-only Thumper beside it that reaches a flyer only once a leaper has
 * grounded it, and its two links: a Hum Choir beside it (Bounce Chorus) and a Seer's Lantern
 * (Lookie Here). Its own tiles: a row of four pads on row 4 and two under them, so the links form.
 */
export const sproingMap = dev.defineMap({
  ...ROAD,
  id: 'dev_sproing',
  // prettier-ignore
  tiles: [
    '..............',
    'S##########...',
    '.o.o.o.o..#.o.',
    '..........#...',
    '.o.o.oooo.#.o.',
    '.....oo...#...',
    '..........###C',
    '..............',
  ],
  airLanes: [
    {
      id: 'sky',
      points: [
        [0, 7],
        [13, 6],
      ],
    },
  ],
  threatIntel: ['flying'],
  requiredCounters: ['air'],
  waves: dev.defineWaves([
    {
      groups: [
        { enemy: 'puffwing', count: 5, route: 'sky', intervalSec: 1.2 },
        { enemy: 'nibbler', count: 4, route: 'a', delaySec: 2 },
      ],
    },
    {
      countdownSec: 10,
      groups: [
        { enemy: 'puffwing', count: 8, route: 'sky', intervalSec: 0.8 },
        { enemy: 'nibbler', count: 6, route: 'a', delaySec: 3 },
      ],
    },
  ]),
  referenceProfile: {
    ...PROFILE,
    towers: ['sproing', 'dev_thumper', 'choir', 'lantern'],
    specs: ['sproing'],
  },
  parBuild: {
    loadout: ['sproing', 'dev_thumper', 'choir', 'lantern'],
    steps: [
      { wave: 1, build: 'sproing', tile: [6, 4] },
      { wave: 1, build: 'dev_thumper', tile: [7, 4] },
      { wave: 1, build: 'choir', tile: [5, 4] },
      { wave: 1, build: 'lantern', tile: [6, 5] },
    ],
  },
  // A ground-only Thumper never touches a flyer by itself.
  noCounterBuilds: {
    air: { loadout: ['dev_thumper'], steps: [{ wave: 1, build: 'dev_thumper', tile: [7, 4] }] },
  },
});

/** M7's dev maps, by id (T702–T708): each registered in DEV_CONTENT by the task that lifts it. */
export const DEV_M7_MAPS: { readonly [id: string]: MapDef<DevIds> } = {
  dev_jam: jamMap,
  dev_takeover: takeoverMap,
  dev_gmaw: gmawMap,
  dev_bearers: bearersMap,
  dev_sproing: sproingMap,
};
