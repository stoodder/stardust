// Test fixture content for the content pipeline's tests. Not real game content: ids start with
// `fx_` and the numbers are only shaped like the design's (real content is T105c / T103 / T107).
// Sprites are real registered ids (content may only name registered sprites).
// It covers each M1 shape: a hitscan tower, a lobbed lead-targeting tower, a pulse (chill aura)
// tower, two enemies, a strike ability, two companions' abilities (a segment for Bricks, a strike
// for QUILL), and a map with a towerUnlockWave, events, and builds.
import {
  defineAbility,
  defineEnemy,
  defineRegistry,
  defineTower,
  mapDefinersFor,
} from '../define.ts';
import type { IdsOf, RawContent } from '../types.ts';

const fxGun = defineTower({
  id: 'fx_gun',
  name: 'Fx Gun',
  faction: 'everglow',
  role: 'Fixture: single target',
  sprites: { base: 'tower.rivet', head: 'tower.rivet_head', icon: 'icon.tower.rivet' },
  tiers: [
    {
      cost: 100,
      targets: { ground: true, air: true },
      defaultPriority: 'first',
      attack: { kind: 'hitscan', type: 'kinetic', damage: 10, ratePerSec: 2, rangeTiles: 3 },
    },
    { cost: 80, attack: { damage: 12 } },
    { cost: 150, attack: { ratePerSec: 2.5, armorPierce: 3 } },
  ],
  specs: {
    a: {
      name: 'Fx Storm',
      cost: 300,
      attack: { damage: 9, ratePerSec: 7.5, armorPierce: 0, spinUpSec: 1 },
    },
    b: {
      name: 'Fx Rail',
      cost: 300,
      defaultPriority: 'strong',
      attack: { damage: 120, ratePerSec: 0.5, rangeTiles: 6, ignoresArmor: true },
    },
  },
});

const fxMortar = defineTower({
  id: 'fx_mortar',
  name: 'Fx Mortar',
  faction: 'everglow',
  role: 'Fixture: splash',
  sprites: { base: 'tower.thumper', head: 'tower.thumper_head', icon: 'icon.tower.thumper' },
  tiers: [
    {
      cost: 120,
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
    { cost: 190, attack: { splashTiles: 1.2, ratePerSec: 0.6 } },
  ],
  specs: {
    // A spec that changes delivery: the attack is replaced, so it must be complete.
    a: {
      name: 'Fx Rocket',
      cost: 375,
      attack: {
        kind: 'projectile',
        type: 'explosive',
        damage: 50,
        ratePerSec: 1,
        rangeTiles: 4,
        projectile: 'projectile.rivet_tracer',
        speedTilesPerSec: 6,
      },
    },
    b: { name: 'Fx Buster', cost: 375, effects: [{ status: 'corroded', stacks: 3, maxStacks: 3 }] },
  },
});

const fxSprinkler = defineTower({
  id: 'fx_sprinkler',
  name: 'Fx Sprinkler',
  faction: 'everglow',
  role: 'Fixture: slow',
  sprites: { base: 'tower.sprinkler', icon: 'icon.tower.sprinkler' },
  tiers: [
    {
      cost: 90,
      targets: { ground: true, air: false },
      defaultPriority: null,
      attack: { kind: 'pulse', type: 'kinetic', damage: 2, ratePerSec: 1, rangeTiles: 2 },
      effects: [{ status: 'chilled', pct: 0.25, durationSec: 1.5 }],
    },
    {
      cost: 70,
      attack: { rangeTiles: 2.3 },
      effects: [{ status: 'chilled', pct: 0.3, durationSec: 1.5 }],
    },
    {
      cost: 135,
      effects: [
        { status: 'chilled', pct: 0.35, durationSec: 1.5 },
        { status: 'soaked', durationSec: 3 },
      ],
    },
  ],
});

const fxWalker = defineEnemy({
  id: 'fx_walker',
  name: 'Fx Walker',
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

const fxRunner = defineEnemy({
  id: 'fx_runner',
  name: 'Fx Runner',
  faction: 'skitterkin',
  body: 'organic',
  layer: 'ground',
  hp: 20,
  armor: 0,
  shield: { hp: 10, regenPerSec: 3, regenDelaySec: 2 },
  speedTilesPerSec: 2,
  leak: 1,
  bounty: 4,
  spawnIntervalSec: 0.5,
  traits: ['fast', 'shielded'],
  tells: ['fast', 'shielded', 'regen'],
  sprites: { body: 'enemy.zoomer', icon: 'icon.enemy.zoomer' },
});

const fxStrike = defineAbility({
  id: 'fx_strike',
  name: 'Fixture Strike',
  cooldownSec: 45,
  effect: { kind: 'strike', type: 'explosive', damage: 200, radiusTiles: 1.5, delaySec: 1 },
  sprites: { icon: 'icon.ability.orbital_strike' },
});

/** A companion's segment ability (Suppressing Fire's shape): Bricks's slot 2 in fixtures. */
const fxSuppress = defineAbility({
  id: 'fx_suppress',
  name: 'Fixture Suppress',
  cooldownSec: 50,
  effect: {
    kind: 'segment',
    type: 'kinetic',
    damagePerSec: 20,
    slowPct: 0.5,
    durationSec: 5,
    lengthTiles: 3,
  },
  companion: 'bricks',
  sprites: { icon: 'icon.ability.suppressing_fire' },
});

/** A second companion's ability (a strike), so a pick list has two companions to run. */
const fxChime = defineAbility({
  id: 'fx_chime',
  name: 'Fixture Chime',
  cooldownSec: 30,
  effect: { kind: 'strike', type: 'energy', damage: 50, radiusTiles: 1, delaySec: 0.5 },
  companion: 'quill',
  sprites: { icon: 'icon.ability.orbital_strike' },
});

/** The fixture's entity registries. */
export const FIXTURE_ENTITIES = {
  towers: defineRegistry({ fx_gun: fxGun, fx_mortar: fxMortar, fx_sprinkler: fxSprinkler }),
  enemies: defineRegistry({ fx_walker: fxWalker, fx_runner: fxRunner }),
  abilities: defineRegistry({ fx_strike: fxStrike, fx_suppress: fxSuppress, fx_chime: fxChime }),
};
export type FixtureIds = IdsOf<typeof FIXTURE_ENTITIES, 'fx_map'>;

export const fx = mapDefinersFor<FixtureIds>();

export const fxLayout = fx.defineMapLayout({
  id: 'fx_map',
  act: 1,
  env: 'act1',
  objective: 'defend',
  size: { cols: 6, rows: 5 },
  // prettier-ignore
  tiles: [
    'S##...',
    '.o#o..',
    '..#^o.',
    '.o##x.',
    '...##C',
  ],
  paths: [
    {
      id: 'a',
      tiles: [
        [0, 0],
        [1, 0],
        [2, 0],
        [2, 1],
        [2, 2],
        [2, 3],
        [3, 3],
        [3, 4],
        [4, 4],
        [5, 4],
      ],
    },
  ],
  airLanes: [
    {
      id: 'sky',
      // An air lane ends on the core (compileMap.ts); a 3-4-5 diagonal over the path and pads.
      points: [
        [2, 0],
        [5, 4],
      ],
    },
  ],
  markers: { rock: [0, 2] },
  clickables: { rock: { name: 'A suspicious rock' } },
  underWreckage: { '4,3': 'o' },
  salvage: { '4,3': 40 },
  startCredits: 200,
  stardust: 0,
  briefing: 'Fixture briefing.',
  towerUnlockWave: { fx_sprinkler: 2, fx_mortar: 2 },
  // W2's fleeing runners bring Skittish (D101).
  threatIntel: ['fast', 'shielded', 'skittish'],
  requiredCounters: [],
  medals: {
    challenge: {
      id: 'fx_one_gun',
      name: 'Gun Show',
      description: 'Win with a gun on the field.',
      condition: { towers: { tower: 'fx_gun' }, gte: 1 },
    },
  },
  companion: null,
  events: [
    { id: 'w02_radio', on: { wave: 2, phase: 'countdown' }, actions: [{ cue: 'fx_map_w02' }] },
    {
      id: 'late_gift',
      on: { wave: 2, phase: { afterSec: 1.5 } },
      actions: [
        { grantCredits: 10 },
        { setClickable: { marker: 'rock', on: true, fallback: { tick: 600 } } },
      ],
      once: false,
    },
  ],
});

export const fxWaves = fx.defineWaves([
  { groups: [{ enemy: 'fx_walker', count: 3, route: 'a' }] },
  {
    countdownSec: 10,
    groups: [
      { enemy: 'fx_walker', count: 2, intervalSec: 0.25, route: 'a' },
      {
        enemy: 'fx_runner',
        count: 4,
        intervalSec: 0.5,
        delaySec: 1,
        route: 'a',
        tags: ['fleeing'],
      },
    ],
  },
]);

export const fxBuilds = fx.defineBuilds({
  referenceProfile: {
    towers: ['fx_gun', 'fx_mortar'],
    specs: [],
    shop: {},
    protocols: [],
    technicianAbility: 'fx_strike',
  },
  parBuild: {
    loadout: ['fx_gun', 'fx_mortar'],
    steps: [
      { wave: 1, build: 'fx_gun', tile: [1, 1] },
      { wave: 1, upgrade: [1, 1] },
      { wave: 2, build: 'fx_mortar', tile: [3, 1] },
      { wave: 2, ability: 1, target: [2, 2], when: { afterSec: 2 } },
      { wave: 2, targeting: [1, 1], mode: 'strong' },
    ],
  },
  noCounterBuilds: {},
  altBuilds: {
    gun_only: {
      loadout: ['fx_gun'],
      callEarly: true,
      steps: [{ wave: 1, build: 'fx_gun', tile: [1, 1] }],
    },
  },
});

export const fxMap = fx.defineMap({ ...fxLayout, waves: fxWaves, ...fxBuilds });

/** The whole fixture content set. */
export const FIXTURE: RawContent<FixtureIds> = {
  ...FIXTURE_ENTITIES,
  maps: defineRegistry({ fx_map: fxMap }),
  campaign: ['fx_map'],
};
