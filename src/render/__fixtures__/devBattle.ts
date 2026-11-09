// Development battle content: a small map drawn with the real M1 sprites, so BattleScene, its
// views, and the battle smoke test run before A1M1 and the real towers land (T103, T105c). Not
// game content: ids start with `dev_`, and the numbers are only shaped like design/towers.md and
// design/enemies.md. app/battle.ts picks it until the live registries have a playable map.
// A second dev map, `dev_sky` (T312a), uses the real M3 content (Skyhook, Zapcoil beside a
// Sprinkler for Conductive, Puffwings on an air lane, Gerald on the path, wreckage hiding a power
// node, and QUILL's Time Dilation in slot 2), so the air, chain, and wreckage smoke flows
// (smoke/air.spec.ts, smoke/wreckage.spec.ts) run before A1M3–A1M5 land. A third, `dev_market`
// (T312c), is dev_range with Zibzab's Clearance Sale in slot 2 for the HUD's sale prices
// (smoke/hudAct1.spec.ts) before A1M4 lands. A fourth, `dev_boss` (T312b), brings A1M4–A1M5's
// Skitterkin (Diggers, Bunchlings, an Elder with younglings) and a short Chitterbloom fight, so the
// burrow, split, huddle, and boss smoke flow (smoke/boss.spec.ts) runs before A1M5 lands.
// `dev_protect` (T305a) is dev_act2 as a Protect map, its south road the branch to the rigs.
// `dev_witch` (T404) walks a short Glass Witch (her real phases, pulse, blink, and retreat) down
// dev_act2's north road behind a few Glimmers, so her blink's tell and afterimage show
// (smoke/witch.spec.ts) before A2M2 lands.
import {
  defineAbility,
  defineEnemy,
  defineRegistry,
  defineTower,
  mapDefinersFor,
} from '../../content/define.ts';
import { clearance_sale } from '../../content/abilities/clearance_sale.ts';
import { suppressing_fire } from '../../content/abilities/suppressing_fire.ts';
import { time_dilation } from '../../content/abilities/time_dilation.ts';
import { bunchling } from '../../content/enemies/bunchling.ts';
import { chitterbloom } from '../../content/enemies/chitterbloom.ts';
import { digger } from '../../content/enemies/digger.ts';
import { elder } from '../../content/enemies/elder.ts';
import { gerald } from '../../content/enemies/gerald.ts';
import { glass_witch } from '../../content/enemies/glass_witch.ts';
import { glimmer } from '../../content/enemies/glimmer.ts';
import { lightwing } from '../../content/enemies/lightwing.ts';
import { mote } from '../../content/enemies/mote.ts';
import { nibbler } from '../../content/enemies/nibbler.ts';
import { puffwing } from '../../content/enemies/puffwing.ts';
import { weft_warden } from '../../content/enemies/weft_warden.ts';
import { conductive } from '../../content/links/conductive.ts';
import { rivet } from '../../content/towers/rivet.ts';
import { skyhook } from '../../content/towers/skyhook.ts';
import { sprinkler } from '../../content/towers/sprinkler.ts';
import { zapcoil } from '../../content/towers/zapcoil.ts';
import type { IdsOf, LinkDef, RawContent } from '../../content/types.ts';

const devRivet = defineTower({
  id: 'dev_rivet',
  name: 'Rivet',
  faction: 'everglow',
  role: 'Dev: single target',
  sprites: { base: 'tower.rivet', head: 'tower.rivet_head', icon: 'icon.tower.rivet' },
  tiers: [
    {
      cost: 100,
      targets: { ground: true, air: true },
      defaultPriority: 'first',
      attack: { kind: 'hitscan', type: 'kinetic', damage: 10, ratePerSec: 2, rangeTiles: 3 },
    },
    { cost: 80, attack: { damage: 13 } },
    { cost: 150, attack: { ratePerSec: 2.5, rangeTiles: 3.25, armorPierce: 3 } },
  ],
});

const devThumper = defineTower({
  id: 'dev_thumper',
  name: 'Thumper',
  faction: 'everglow',
  role: 'Dev: splash',
  sprites: { base: 'tower.thumper', head: 'tower.thumper_head', icon: 'icon.tower.thumper' },
  tiers: [
    {
      cost: 125,
      targets: { ground: true, air: false },
      defaultPriority: 'first',
      attack: {
        kind: 'lobbed',
        type: 'explosive',
        damage: 20,
        ratePerSec: 0.5,
        rangeTiles: 3.5,
        minRangeTiles: 1,
        projectile: 'projectile.thumper_shell',
        flightSec: 0.8,
        splashTiles: 0.9,
        lead: true,
      },
    },
    { cost: 100, attack: { damage: 30 } },
    { cost: 190, attack: { splashTiles: 1.2, rangeTiles: 4 } },
  ],
});

const devSprinkler = defineTower({
  id: 'dev_sprinkler',
  name: 'Sprinkler',
  faction: 'everglow',
  role: 'Dev: slow',
  sprites: { base: 'tower.sprinkler', head: 'tower.sprinkler_head', icon: 'icon.tower.sprinkler' },
  tiers: [
    {
      cost: 90,
      targets: { ground: true, air: false },
      defaultPriority: null,
      attack: { kind: 'pulse', type: 'kinetic', damage: 2, ratePerSec: 1, rangeTiles: 2 },
      effects: [{ status: 'chilled', pct: 0.25, durationSec: 1.5 }],
    },
    { cost: 70, attack: { rangeTiles: 2.25 } },
    { cost: 135, attack: { rangeTiles: 2.5 } },
  ],
});

const devNibbler = defineEnemy({
  id: 'dev_nibbler',
  name: 'Nibbler',
  faction: 'skitterkin',
  body: 'organic',
  layer: 'ground',
  hp: 30,
  armor: 0,
  speedTilesPerSec: 1,
  leak: 1,
  bounty: 3,
  spawnIntervalSec: 0.8,
  traits: [],
  tells: [],
  sprites: { body: 'enemy.nibbler', icon: 'icon.enemy.nibbler' },
});

// A short Chitterbloom for dev_boss: her real phases, sneezes, burrows, and driveOff, on a twelfth
// of her HP, so the smoke flow can push her through every phase in a few seconds of fire.
const devChitterbloom = defineEnemy({ ...chitterbloom, id: 'dev_chitterbloom', hp: 200 });

// dev_aelari's pulser (T403): a Glimmer with a quick shield pulse (every 4 s, 1.5 s tell, 40
// shield within 2 tiles), standing in for M5's Aegis Cantor so the pulse's tell and ring show.
const devCantor = defineEnemy({
  ...glimmer,
  id: 'dev_cantor',
  name: 'Dev Cantor',
  hp: 120,
  traits: ['shielded', 'shield_aura'],
  tells: ['shielded', 'regen', 'shield_aura'],
  pulse: { everySec: 4, tellSec: 1.5, radiusTiles: 2, shield: 40 },
});

// dev_witch's (T404): the Glass Witch on a quarter of her HP and a sixth of her shield, her phases, pulse, blink,
// and retreat unchanged, so a few Zapcoils push her through phase 2 in one walk down the road.
const devGlassWitch = defineEnemy({
  ...glass_witch,
  id: 'dev_glass_witch',
  hp: 450,
  shield: { hp: 200, regenPerSec: 30, regenDelaySec: 4 },
});

const devStrike = defineAbility({
  id: 'dev_strike',
  name: 'Dev Strike',
  cooldownSec: 45,
  effect: { kind: 'strike', type: 'explosive', damage: 200, radiusTiles: 1.5, delaySec: 1 },
  sprites: { icon: 'icon.ability.orbital_strike' },
});

const DEV_ENTITIES = {
  towers: defineRegistry({
    dev_rivet: devRivet,
    dev_thumper: devThumper,
    dev_sprinkler: devSprinkler,
    // dev_sky's real M3 towers (T312a).
    rivet,
    skyhook,
    zapcoil,
    sprinkler,
  }),
  enemies: defineRegistry({
    dev_nibbler: devNibbler,
    nibbler,
    puffwing,
    gerald,
    // dev_boss's (T312b).
    digger,
    bunchling,
    elder,
    dev_chitterbloom: devChitterbloom,
    // dev_aelari's (T403).
    glimmer,
    weft_warden,
    lightwing,
    dev_cantor: devCantor,
    // dev_hollow's (T402).
    mote,
    // dev_witch's (T404).
    dev_glass_witch: devGlassWitch,
  }),
  // Bricks's real Suppressing Fire, so slot 2, its aiming, and its sounds run here (T207b), and
  // QUILL's Time Dilation for dev_sky (T312a).
  // QUILL's Time Dilation for dev_sky (T312a), and Zibzab's Clearance Sale for dev_market (T312c).
  abilities: defineRegistry({
    dev_strike: devStrike,
    suppressing_fire,
    time_dilation,
    clearance_sale,
  }),
};
export type DevIds = IdsOf<typeof DEV_ENTITIES, 'dev_range'>;

const dev = mapDefinersFor<DevIds>();

// An S-bend from the spawn (top left) to the core (bottom right), with pads on both sides. Sgt.
// Bricks stands at his post on decor (7,2), beside the bend, with Suppressing Fire in slot 2 (as
// on A1M1, which places his post the same way).
const devLayout = dev.defineMapLayout({
  id: 'dev_range',
  act: 1,
  env: 'act1',
  objective: 'defend',
  size: { cols: 12, rows: 8 },
  // prettier-ignore
  tiles: [
    'S####.......',
    '.o.o#.o.o...',
    '....#.......',
    '..o.######..',
    '.x.....o.#o.',
    '....o....#..',
    '..o..o...###',
    '...........C',
  ],
  paths: [
    {
      id: 'a',
      tiles: [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
        [4, 0],
        [4, 1],
        [4, 2],
        [4, 3],
        [5, 3],
        [6, 3],
        [7, 3],
        [8, 3],
        [9, 3],
        [9, 4],
        [9, 5],
        [9, 6],
        [10, 6],
        [11, 6],
        [11, 7],
      ],
    },
  ],
  underWreckage: { '1,4': 'o' },
  salvage: { '1,4': 40 },
  startCredits: 350,
  stardust: 0,
  threatIntel: [],
  requiredCounters: [],
  medals: {
    challenge: {
      id: 'dev_two_rivets',
      name: 'Rivet Range',
      description: 'Win with two Rivets on the range.',
      condition: { towers: { tower: 'dev_rivet' }, gte: 2 },
    },
  },
  markers: { bricks_post: [7, 2] },
  companion: { id: 'bricks', state: 'present' },
  allies: [
    {
      kind: 'bricks',
      post: 'bricks_post',
      attack: {
        type: 'kinetic',
        damage: 6,
        ratePerSec: 1.5,
        rangeTiles: 2.5,
        targets: { ground: true, air: true },
      },
    },
  ],
});

const devWaves = dev.defineWaves([
  { groups: [{ enemy: 'dev_nibbler', count: 6, route: 'a' }] },
  { countdownSec: 10, groups: [{ enemy: 'dev_nibbler', count: 10, route: 'a' }] },
]);

const devBuilds = dev.defineBuilds({
  referenceProfile: {
    towers: ['dev_rivet', 'dev_thumper'],
    specs: [],
    shop: {},
    protocols: [],
    technicianAbility: 'dev_strike',
  },
  parBuild: {
    loadout: ['dev_rivet', 'dev_thumper'],
    steps: [
      { wave: 1, build: 'dev_rivet', tile: [3, 1] },
      { wave: 1, build: 'dev_rivet', tile: [7, 4] },
    ],
  },
  noCounterBuilds: {},
});

const devMap = dev.defineMap({ ...devLayout, waves: devWaves, ...devBuilds });

// dev_market (T312c): dev_range with Zibzab along instead of Bricks, so Clearance Sale is slot 2
// (no ally post: Bricks stays home).
const marketMap = dev.defineMap({
  ...devLayout,
  id: 'dev_market',
  markers: {},
  allies: [],
  companion: { id: 'zibzab', state: 'present' },
  waves: devWaves,
  ...devBuilds,
});

// dev_sky (T312a): a path from the spawn (top left) to the core (bottom right), an air lane bending
// in from the top-right corner, and three wrecks: one over a hidden power node (1,4), one over high
// ground (4,5), one over a pad (7,2). The pads by the bend let a Zapcoil stand beside a Sprinkler
// (Conductive). Wave 1 sends Nibblers with Gerald overtaking them and a Puffwing flock; QUILL's Time
// Dilation is slot 2.
const skyLayout = dev.defineMapLayout({
  id: 'dev_sky',
  act: 1,
  env: 'act1',
  objective: 'defend',
  size: { cols: 12, rows: 8 },
  // prettier-ignore
  tiles: [
    'S###........',
    '..o#o...o...',
    '.o.#o..x....',
    '...####.o...',
    '.x...o#o.o..',
    '....x.#o....',
    '...o..####o.',
    '.........#C.',
  ],
  paths: [
    {
      id: 'a',
      tiles: [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
        [3, 1],
        [3, 2],
        [3, 3],
        [4, 3],
        [5, 3],
        [6, 3],
        [6, 4],
        [6, 5],
        [6, 6],
        [7, 6],
        [8, 6],
        [9, 6],
        [9, 7],
        [10, 7],
      ],
    },
  ],
  airLanes: [
    {
      id: 'sky',
      points: [
        [11, 0],
        [11, 4],
        [10, 7],
      ],
    },
  ],
  underWreckage: { '1,4': '+', '4,5': '^', '7,2': 'o' },
  salvage: { '1,4': 60, '4,5': 50, '7,2': 40 },
  startCredits: 700,
  stardust: 0,
  threatIntel: ['flying'],
  requiredCounters: ['air'],
  medals: {
    challenge: {
      id: 'dev_sky_rivets',
      name: 'Sky Range',
      description: 'Win with a Skyhook on the sky range.',
      condition: { towers: { tower: 'skyhook' }, gte: 1 },
    },
  },
  companion: { id: 'quill', state: 'present' },
});

const skyWaves = dev.defineWaves([
  {
    groups: [
      { enemy: 'nibbler', count: 6, route: 'a' },
      { enemy: 'gerald', count: 1, route: 'a', delaySec: 1 },
      { enemy: 'puffwing', count: 5, route: 'sky', delaySec: 2 },
    ],
  },
  {
    countdownSec: 10,
    groups: [
      { enemy: 'nibbler', count: 10, route: 'a' },
      { enemy: 'puffwing', count: 8, route: 'sky' },
    ],
  },
]);

const skyBuilds = dev.defineBuilds({
  referenceProfile: {
    towers: ['skyhook', 'zapcoil', 'sprinkler', 'rivet'],
    specs: [],
    shop: {},
    protocols: [],
    technicianAbility: 'dev_strike',
  },
  parBuild: {
    loadout: ['skyhook', 'zapcoil', 'sprinkler', 'rivet'],
    steps: [
      { wave: 1, build: 'skyhook', tile: [8, 3] },
      { wave: 1, build: 'zapcoil', tile: [4, 2] },
    ],
  },
  noCounterBuilds: {
    air: { loadout: ['sprinkler'], steps: [{ wave: 1, build: 'sprinkler', tile: [4, 1] }] },
  },
});

const skyMap = dev.defineMap({ ...skyLayout, waves: skyWaves, ...skyBuilds });

// dev_boss (T312b): an S-road from the spawn (top left) to the core (bottom right), pads along it.
// Wave 1 sends Diggers (the dig tell and the mound), Bunchlings (the split), and an Elder holding
// three younglings back (the huddle); wave 2 is a short Chitterbloom with two Nibblers of her
// brood, for her phases, sneeze, burrows, panic, and driveOff.
const bossLayout = dev.defineMapLayout({
  id: 'dev_boss',
  act: 1,
  env: 'act1',
  objective: 'defend',
  size: { cols: 14, rows: 8 },
  // prettier-ignore
  tiles: [
    'S#####........',
    '.o...#.o..o...',
    '..o..#........',
    '.....####o....',
    '..o.o...#.....',
    '......o.#o..o.',
    '.o......####..',
    '...o......o#C.',
  ],
  paths: [
    {
      id: 'a',
      tiles: [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
        [4, 0],
        [5, 0],
        [5, 1],
        [5, 2],
        [5, 3],
        [6, 3],
        [7, 3],
        [8, 3],
        [8, 4],
        [8, 5],
        [8, 6],
        [9, 6],
        [10, 6],
        [11, 6],
        [11, 7],
        [12, 7],
      ],
    },
  ],
  startCredits: 900,
  stardust: 0,
  threatIntel: ['burrowing', 'armored', 'splitting', 'huddle', 'boss'],
  requiredCounters: ['armor'],
  medals: {
    challenge: {
      id: 'dev_boss_rivets',
      name: 'Boss Range',
      description: 'Win with two Rivets on the boss range.',
      condition: { towers: { tower: 'rivet' }, gte: 2 },
    },
  },
  markers: {},
  companion: { id: 'bricks', state: 'present' },
});

// Both waves teach (dev content: exempt from the soft-trait cap).
const bossWaves = dev.defineWaves([
  {
    teach: true,
    groups: [
      { enemy: 'digger', count: 2, route: 'a', intervalSec: 1.5 },
      { enemy: 'bunchling', count: 2, route: 'a', delaySec: 3, intervalSec: 1.5 },
      { enemy: 'elder', count: 1, route: 'a', delaySec: 7 },
      {
        enemy: 'nibbler',
        count: 3,
        route: 'a',
        delaySec: 8.2,
        intervalSec: 0.5,
        tags: ['youngling'],
      },
    ],
  },
  {
    countdownSec: 15,
    groups: [
      { enemy: 'dev_chitterbloom', count: 1, route: 'a' },
      { enemy: 'nibbler', count: 2, route: 'a', delaySec: 2.5 },
    ],
  },
]);

const bossBuilds = dev.defineBuilds({
  referenceProfile: {
    towers: ['rivet', 'sprinkler'],
    specs: [],
    shop: {},
    protocols: [],
    technicianAbility: 'dev_strike',
  },
  parBuild: {
    loadout: ['rivet', 'sprinkler'],
    steps: [
      { wave: 1, build: 'rivet', tile: [9, 3] },
      { wave: 1, build: 'rivet', tile: [9, 5] },
    ],
  },
  noCounterBuilds: {
    armor: { loadout: ['sprinkler'], steps: [{ wave: 1, build: 'sprinkler', tile: [9, 3] }] },
  },
});

const bossMap = dev.defineMap({ ...bossLayout, waves: bossWaves, ...bossBuilds });

// dev_act2 (T400a): an 18×12 Act II map, the size of A2M1–A2M3, so the camera, the HUD corners,
// the comms panel, and the gallery's budget prove they fit before the Act II maps land (D101). Two
// spawns (west and south-west) merge on the east road into the core; `act2.gold` tiles; plain
// Nibblers on the real Rivet and Sprinkler. `?map=dev_act2`; the battle smoke boots it with every
// dev map.
const act2Layout = dev.defineMapLayout({
  id: 'dev_act2',
  act: 2,
  env: 'act2.gold',
  objective: 'defend',
  size: { cols: 18, rows: 12 },
  // prettier-ignore
  tiles: [
    '..o.........o.....',
    'S######......o....',
    '....o.#....#####..',
    '......#...o#o..#..',
    '.....o#.o..#.^o#..',
    '......######...#o.',
    '...o........o..#..',
    '.......#########..',
    '.....o.#..o..+.#o.',
    'S#######.....o.#..',
    '...o.....o.....##C',
    '................o.',
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
        [6, 2],
        [6, 3],
        [6, 4],
        [6, 5],
        [7, 5],
        [8, 5],
        [9, 5],
        [10, 5],
        [11, 5],
        [11, 4],
        [11, 3],
        [11, 2],
        [12, 2],
        [13, 2],
        [14, 2],
        [15, 2],
        [15, 3],
        [15, 4],
        [15, 5],
        [15, 6],
        [15, 7],
        [15, 8],
        [15, 9],
        [15, 10],
        [16, 10],
        [17, 10],
      ],
    },
    {
      id: 'b',
      tiles: [
        [0, 9],
        [1, 9],
        [2, 9],
        [3, 9],
        [4, 9],
        [5, 9],
        [6, 9],
        [7, 9],
        [7, 8],
        [7, 7],
        [8, 7],
        [9, 7],
        [10, 7],
        [11, 7],
        [12, 7],
        [13, 7],
        [14, 7],
        [15, 7],
        [15, 8],
        [15, 9],
        [15, 10],
        [16, 10],
        [17, 10],
      ],
    },
  ],
  startCredits: 600,
  stardust: 0,
  threatIntel: [],
  requiredCounters: [],
  markers: {},
  companion: null,
});

const act2Waves = dev.defineWaves([
  { groups: [{ enemy: 'dev_nibbler', count: 8, route: 'a' }] },
  {
    countdownSec: 15,
    groups: [
      { enemy: 'dev_nibbler', count: 8, route: 'a' },
      { enemy: 'dev_nibbler', count: 8, route: 'b', delaySec: 2 },
    ],
  },
]);

const act2Builds = dev.defineBuilds({
  referenceProfile: {
    towers: ['rivet', 'sprinkler'],
    specs: [],
    shop: {},
    protocols: [],
    technicianAbility: 'dev_strike',
  },
  parBuild: {
    loadout: ['rivet', 'sprinkler'],
    steps: [
      { wave: 1, build: 'rivet', tile: [8, 4] },
      { wave: 1, build: 'rivet', tile: [14, 4] },
      { wave: 1, build: 'sprinkler', tile: [16, 8] },
    ],
  },
  noCounterBuilds: {},
});

const act2Map = dev.defineMap({ ...act2Layout, waves: act2Waves, ...act2Builds });

// dev_aelari (T403): dev_sky's ground road and air lane in Act II's gold, walked by the Aelari line
// units (Glimmers, a Weft Warden, Lightwings on the lane) and a Dev Cantor pulsing shields among
// the Glimmers, so the shield ripple, the break, and the pulse's tell and ring show
// (smoke/shields.spec.ts) before A2M2 lands. Wave 1 teaches shields.
const aelariMap = dev.defineMap({
  ...skyLayout,
  id: 'dev_aelari',
  act: 2,
  env: 'act2.gold',
  threatIntel: ['shielded', 'shield_aura', 'flying', 'armored'],
  requiredCounters: ['shield'],
  waves: dev.defineWaves([
    {
      teach: true,
      groups: [
        { enemy: 'glimmer', count: 6, route: 'a', intervalSec: 0.8 },
        { enemy: 'dev_cantor', count: 1, route: 'a', delaySec: 1.2 },
        { enemy: 'lightwing', count: 4, route: 'sky', delaySec: 2, intervalSec: 0.7 },
      ],
    },
    {
      countdownSec: 10,
      groups: [
        { enemy: 'weft_warden', count: 2, route: 'a', intervalSec: 2 },
        { enemy: 'glimmer', count: 6, route: 'a', delaySec: 1, intervalSec: 0.8 },
      ],
    },
  ]),
  ...skyBuilds,
  noCounterBuilds: {
    shield: { loadout: ['rivet'], steps: [{ wave: 1, build: 'rivet', tile: [4, 2] }] },
  },
});

// dev_hollow (T402): dev_act2's two roads walked by fleeing Nibblers with Motes 2.5 s behind them
// on each (spaced out on the north road, a packed cluster on the south one), so the hush tell, the
// vanish, Heavy, and Skittish show (smoke/hush.spec.ts) before A2M1 lands. Nothing is built: the
// Motes catch the runners.
const hollowMap = dev.defineMap({
  ...act2Layout,
  id: 'dev_hollow',
  threatIntel: ['skittish', 'clustered'],
  // Motes are a splash problem: without the requirement they'd be soft (enemies.md § 3.1).
  requiredCounters: ['splash'],
  waves: dev.defineWaves([
    {
      groups: [
        { enemy: 'nibbler', count: 3, route: 'a', intervalSec: 1, tags: ['fleeing'] },
        { enemy: 'mote', count: 3, route: 'a', delaySec: 2.5, intervalSec: 1.5 },
        {
          enemy: 'nibbler',
          count: 3,
          route: 'b',
          delaySec: 1,
          intervalSec: 0.6,
          tags: ['fleeing'],
        },
        { enemy: 'mote', count: 4, route: 'b', delaySec: 3.5 },
      ],
    },
  ]),
  ...act2Builds,
  noCounterBuilds: {
    splash: { loadout: ['rivet'], steps: [{ wave: 1, build: 'rivet', tile: [8, 4] }] },
  },
});

// dev_witch (T404): dev_act2's north road, walked by four Glimmers and then a short Glass Witch
// (pulse every 8 s; blink 2.5 tiles every 7 s from 70%; retreat at 40%), so the blink's tell (a
// ghost of her where she will land), the afterimage, and the retreat show (smoke/witch.spec.ts).
// Par lines the road with Zapcoils; the smoke flow builds its own.
const witchMap = dev.defineMap({
  ...act2Layout,
  id: 'dev_witch',
  startCredits: 1500,
  threatIntel: ['shielded', 'boss'],
  requiredCounters: ['shield'],
  waves: dev.defineWaves([
    {
      groups: [
        { enemy: 'glimmer', count: 4, route: 'a', intervalSec: 0.8 },
        { enemy: 'dev_glass_witch', count: 1, route: 'a', delaySec: 2 },
      ],
    },
  ]),
  referenceProfile: {
    towers: ['zapcoil', 'rivet'],
    specs: [],
    shop: {},
    protocols: [],
    technicianAbility: 'dev_strike',
  },
  parBuild: {
    loadout: ['zapcoil', 'rivet'],
    steps: [
      { wave: 1, build: 'zapcoil', tile: [4, 2] },
      { wave: 1, build: 'zapcoil', tile: [5, 4] },
      { wave: 1, build: 'zapcoil', tile: [8, 4] },
      { wave: 1, build: 'zapcoil', tile: [10, 3] },
      { wave: 1, build: 'zapcoil', tile: [12, 3] },
      { wave: 1, build: 'zapcoil', tile: [13, 1] },
      { wave: 1, build: 'zapcoil', tile: [14, 4] },
    ],
  },
  noCounterBuilds: {
    shield: { loadout: ['rivet'], steps: [{ wave: 1, build: 'rivet', tile: [8, 4] }] },
  },
});

// dev_protect (T305a): dev_act2 as a Protect map. The north road still runs to the core; the
// south road is the rig branch, ending on (13,7) beside the rigs on the decor tile (14,7), so its
// leaks cost the rigs' meter (10), not the core. Nibblers on both roads, and fleeing ones on the
// branch that cost the rigs nothing, so the HUD's asset meter, its flash, and its low state show
// (smoke/protect.spec.ts) before A2M2 lands. Nothing is built: W2 takes the rigs to 0.
const protectMap = dev.defineMap({
  ...act2Layout,
  id: 'dev_protect',
  objective: 'protect',
  // prettier-ignore
  tiles: [
    '..o.........o.....',
    'S######......o....',
    '....o.#....#####..',
    '......#...o#o..#..',
    '.....o#.o..#.^o#..',
    '......######...#o.',
    '...o........o..#..',
    '.......#######.#..',
    '.....o.#..o..+.#o.',
    'S#######.....o.#..',
    '...o.....o.....##C',
    '................o.',
  ],
  paths: [
    act2Layout.paths[0]!, // dev_act2 has its north road
    {
      id: 'rigs',
      tiles: [
        [0, 9],
        [1, 9],
        [2, 9],
        [3, 9],
        [4, 9],
        [5, 9],
        [6, 9],
        [7, 9],
        [7, 8],
        [7, 7],
        [8, 7],
        [9, 7],
        [10, 7],
        [11, 7],
        [12, 7],
        [13, 7],
      ],
    },
  ],
  markers: { rigs: [14, 7] },
  // The branch's fleeing runners bring Skittish's intel (validation derives it from the tag).
  threatIntel: ['skittish'],
  asset: { name: 'Rigs', integrity: 10, marker: 'rigs', routes: ['rigs'] },
  waves: dev.defineWaves([
    {
      groups: [
        { enemy: 'dev_nibbler', count: 4, route: 'a' },
        { enemy: 'dev_nibbler', count: 3, route: 'rigs', delaySec: 1 },
        { enemy: 'nibbler', count: 3, route: 'rigs', delaySec: 3, tags: ['fleeing'] },
      ],
    },
    {
      countdownSec: 10,
      groups: [{ enemy: 'dev_nibbler', count: 8, route: 'rigs', intervalSec: 0.6 }],
    },
  ]),
  ...act2Builds,
  parBuild: {
    loadout: ['rivet', 'sprinkler'],
    steps: [
      { wave: 1, build: 'rivet', tile: [8, 4] },
      { wave: 1, build: 'rivet', tile: [10, 8] },
      { wave: 1, build: 'sprinkler', tile: [5, 8] },
    ],
  },
});

/** The dev battle's raw content (compile it with compileContent). */
export const DEV_CONTENT: RawContent<DevIds> = {
  ...DEV_ENTITIES,
  maps: defineRegistry({
    dev_range: devMap,
    dev_sky: skyMap,
    dev_market: marketMap,
    dev_boss: bossMap,
    dev_act2: act2Map,
    dev_aelari: aelariMap,
    dev_hollow: hollowMap,
    dev_witch: witchMap,
    dev_protect: protectMap,
  }),
  // Conductive is the live content's link (its partners are the real Zapcoil and Sprinkler).
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the ids it names are DevIds too
  links: { conductive: conductive as unknown as LinkDef<DevIds> },
  campaign: ['dev_range'],
};
