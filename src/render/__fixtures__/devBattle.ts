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
import { nibbler } from '../../content/enemies/nibbler.ts';
import { puffwing } from '../../content/enemies/puffwing.ts';
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
  threatIntel: ['burrowing', 'armored', 'splitting', 'huddle'],
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

/** The dev battle's raw content (compile it with compileContent). */
export const DEV_CONTENT: RawContent<DevIds> = {
  ...DEV_ENTITIES,
  maps: defineRegistry({
    dev_range: devMap,
    dev_sky: skyMap,
    dev_market: marketMap,
    dev_boss: bossMap,
  }),
  // Conductive is the live content's link (its partners are the real Zapcoil and Sprinkler).
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the ids it names are DevIds too
  links: { conductive: conductive as unknown as LinkDef<DevIds> },
  campaign: ['dev_range'],
};
