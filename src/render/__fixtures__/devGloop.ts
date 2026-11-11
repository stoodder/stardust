// dev_gloop (T705): the Gloop Spitter's dev range, so its spit, its Corroded, Big Glorp's
// puddles, and Sticky Flak (with a Skyhook) show in play (smoke/gloop.spec.ts) before A3M4 brings
// the Gloop to a real map. dev_bloom's road: east along row 1, down column 10, east into the core
// (13,6). The Gloop's pad (9,2) sits in the road's corner, a second (8,2) beside it, and the
// Skyhook's (9,3) beside both. W1 is a clump of Compliance Officers (light armor) with a
// Liability-Class Enforcer (heavy armor) behind them, and Puffwings on an air lane over the corner
// for the Skyhook; W2 more Officers. Its own layout and definers, so devBattle.ts (which registers
// it in DEV_CONTENT) imports this file without a cycle: only the DevIds type comes back.
import { mapDefinersFor } from '../../content/define.ts';
import type { DevIds } from './devBattle.ts';

const dev = mapDefinersFor<DevIds>();

export const gloopMap = dev.defineMap({
  id: 'dev_gloop',
  act: 3,
  env: 'act3',
  objective: 'defend',
  size: { cols: 14, rows: 8 },
  // prettier-ignore
  tiles: [
    '..............',
    'S##########...',
    '.o.o.o.ooo#.o.',
    '.........o#...',
    '.o.o.o.o.o#.o.',
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
  // The Puffwings fly in over the corner, for the Skyhook (Sticky Flak's partner).
  airLanes: [
    {
      id: 'sky',
      points: [
        [8, 0],
        [9, 3],
        [13, 6],
      ],
    },
  ],
  startCredits: 3000,
  stardust: 0,
  threatIntel: ['armored', 'flying'],
  requiredCounters: ['armor', 'air'],
  markers: {},
  companion: null,
  waves: dev.defineWaves([
    {
      groups: [
        { enemy: 'compliance', count: 5, route: 'a', intervalSec: 0.4 },
        { enemy: 'liability', count: 1, route: 'a', delaySec: 3 },
        { enemy: 'puffwing', count: 3, route: 'sky', delaySec: 4, intervalSec: 1 },
      ],
    },
    {
      countdownSec: 10,
      groups: [{ enemy: 'compliance', count: 8, route: 'a', intervalSec: 0.4 }],
    },
  ]),
  referenceProfile: {
    towers: ['gloop', 'skyhook', 'rivet', 'harpoon'],
    specs: ['gloop'],
    shop: {},
    protocols: [],
    technicianAbility: 'dev_strike',
  },
  parBuild: {
    loadout: ['gloop', 'skyhook', 'rivet', 'harpoon'],
    steps: [
      { wave: 1, build: 'gloop', tile: [9, 2] },
      { wave: 1, upgrade: [9, 2] },
      { wave: 1, upgrade: [9, 2] },
      { wave: 1, specialize: [9, 2], spec: 'a' },
      { wave: 1, build: 'skyhook', tile: [9, 3] },
      { wave: 1, build: 'gloop', tile: [8, 2] },
      { wave: 1, build: 'rivet', tile: [9, 4] },
      { wave: 1, build: 'harpoon', tile: [12, 4] },
    ],
  },
  // A Skyhook alone answers air only; a Gloop, armor only.
  noCounterBuilds: {
    armor: { loadout: ['skyhook'], steps: [{ wave: 1, build: 'skyhook', tile: [9, 3] }] },
    air: { loadout: ['gloop'], steps: [{ wave: 1, build: 'gloop', tile: [9, 2] }] },
  },
});
