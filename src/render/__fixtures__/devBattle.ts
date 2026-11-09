// Development battle content: a small map drawn with the real M1 sprites, so BattleScene, its
// views, and the battle smoke test run before A1M1 and the real towers land (T103, T105c). Not
// game content: ids start with `dev_`, and the numbers are only shaped like design/towers.md and
// design/enemies.md. app/battle.ts picks it until the live registries have a playable map.
import {
  defineAbility,
  defineEnemy,
  defineRegistry,
  defineTower,
  mapDefinersFor,
} from '../../content/define.ts';
import { suppressing_fire } from '../../content/abilities/suppressing_fire.ts';
import type { IdsOf, RawContent } from '../../content/types.ts';

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
  }),
  enemies: defineRegistry({ dev_nibbler: devNibbler }),
  // Bricks's real Suppressing Fire, so slot 2, its aiming, and its sounds run here (T207b).
  abilities: defineRegistry({ dev_strike: devStrike, suppressing_fire }),
};
export type DevIds = IdsOf<typeof DEV_ENTITIES, 'dev_range'>;

const dev = mapDefinersFor<DevIds>();

// An S-bend from the spawn (top left) to the core (bottom right), with pads on both sides. Sgt.
// Bricks stands at his post on decor (7,2), beside the bend, with Suppressing Fire in slot 2 (the
// dev stand-in for A1M1's post until T125 places it there).
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

/** The dev battle's raw content (compile it with compileContent). */
export const DEV_CONTENT: RawContent<DevIds> = {
  ...DEV_ENTITIES,
  maps: defineRegistry({ dev_range: devMap }),
  campaign: ['dev_range'],
};
