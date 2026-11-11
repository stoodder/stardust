// T703's dev map, `dev_heal` (Everglow Security, part two: no jammers): Compliance Drones walk
// the road with a Maintenance Associate among them, mending each drone in its 1.5-tile ring (the
// `green.3` pulse ring and a ✚ on each, HealAuraView), a Liability-Class Enforcer behind them; then
// Asset Recovery Gunships on the air lane and two Black Budget Operatives cloaked on the road
// under a Lookout Shack. Rivets at T3 answer the armor and the air. Its own file (devM7.ts's maps
// wait on other tasks' gates), registered in DEV_CONTENT; smoke/everglowHeal.spec.ts plays it.
import { mapDefinersFor } from '../../content/define.ts';
import type { DevIds } from './devBattle.ts';

const dev = mapDefinersFor<DevIds>();

/** The road east along row 1, down column 10, east into the core (13,6) (devM7.ts's). */
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

export const healMap = dev.defineMap({
  id: 'dev_heal',
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
  airLanes: [
    {
      id: 'sky',
      points: [
        [0, 7],
        [13, 6],
      ],
    },
  ],
  startCredits: 1200,
  stardust: 0,
  threatIntel: ['armored', 'healer_aura', 'flying', 'cloaked'],
  requiredCounters: ['armor', 'air', 'detection'],
  companion: null,
  waves: dev.defineWaves([
    {
      groups: [
        { enemy: 'compliance', count: 5, route: 'a' },
        { enemy: 'associate', count: 1, route: 'a', delaySec: 2 },
        { enemy: 'liability', count: 1, route: 'a', delaySec: 4 },
      ],
    },
    {
      countdownSec: 10,
      groups: [
        { enemy: 'gunship', count: 2, route: 'sky' },
        { enemy: 'blackbudget', count: 2, route: 'a', delaySec: 1 },
      ],
    },
  ]),
  referenceProfile: {
    specs: [],
    shop: {},
    protocols: [],
    technicianAbility: 'dev_strike',
    towers: ['rivet', 'lookout'],
  },
  parBuild: {
    loadout: ['rivet', 'lookout'],
    steps: [
      { wave: 1, build: 'rivet', tile: [3, 2] },
      { wave: 1, build: 'rivet', tile: [7, 2] },
      { wave: 1, build: 'rivet', tile: [12, 4] },
      { wave: 1, build: 'lookout', tile: [5, 2] },
      { wave: 1, upgrade: [3, 2] },
      { wave: 1, upgrade: [3, 2] },
      { wave: 1, upgrade: [7, 2] },
      { wave: 1, upgrade: [7, 2] },
      { wave: 1, upgrade: [12, 4] },
      { wave: 1, upgrade: [12, 4] },
    ],
  },
  noCounterBuilds: {
    armor: {
      loadout: ['rivet', 'lookout'],
      steps: [
        { wave: 1, build: 'rivet', tile: [12, 4] },
        { wave: 1, build: 'lookout', tile: [5, 2] },
      ],
    },
    air: { loadout: ['lookout'], steps: [{ wave: 1, build: 'lookout', tile: [5, 2] }] },
    detection: {
      loadout: ['rivet'],
      steps: [
        { wave: 1, build: 'rivet', tile: [12, 4] },
        { wave: 1, upgrade: [12, 4] },
        { wave: 1, upgrade: [12, 4] },
      ],
    },
  },
});
