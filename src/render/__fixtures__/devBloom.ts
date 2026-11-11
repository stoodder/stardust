// dev_bloom (T608): the Stasis Bloom's dev range, so its field, its pulse, Gravity Well's pull, and
// its links (Stillmind with the Mindspike, Pinned Down with the Harpoon) show in play
// (smoke/bloom.spec.ts) before A3M5 brings the Bloom to a real map. A road east along row 1, down
// column 10, and east into the core (13,6). The Bloom's pad (9,2) sits in the road's corner, with
// the Mindspike's (8,2) and the Harpoon's (9,3) beside it. W1 is a Maw with Motes catching it up
// (the pulse's Stasis interrupts its gather), Diggers (it blocks the dig), and Puffwings (the
// field reaches the air); W2 more Nibblers and Motes. Its own layout and definers, so devBattle.ts
// (which registers it in DEV_CONTENT) imports this file without a cycle: only the DevIds type
// comes back from there.
import { mapDefinersFor } from '../../content/define.ts';
import type { DevIds } from './devBattle.ts';

const dev = mapDefinersFor<DevIds>();

export const bloomMap = dev.defineMap({
  id: 'dev_bloom',
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
  startCredits: 3000,
  stardust: 0,
  threatIntel: ['armored', 'gathering', 'clustered', 'burrowing', 'flying'],
  requiredCounters: ['splash', 'armor', 'air'],
  markers: {},
  companion: null,
  waves: dev.defineWaves([
    {
      groups: [
        { enemy: 'maw', count: 1, route: 'a' },
        { enemy: 'mote', count: 6, route: 'a', delaySec: 2, intervalSec: 0.3 },
        { enemy: 'digger', count: 3, route: 'a', delaySec: 4, intervalSec: 1.5 },
        { enemy: 'puffwing', count: 3, route: 'a', delaySec: 6, intervalSec: 1 },
      ],
    },
    {
      countdownSec: 10,
      groups: [
        { enemy: 'nibbler', count: 8, route: 'a', intervalSec: 0.5 },
        { enemy: 'mote', count: 8, route: 'a', delaySec: 2, intervalSec: 0.3 },
      ],
    },
  ]),
  referenceProfile: {
    towers: ['bloom', 'mindspike', 'harpoon', 'rivet'],
    specs: ['bloom'],
    shop: {},
    protocols: [],
    technicianAbility: 'dev_strike',
  },
  parBuild: {
    loadout: ['bloom', 'mindspike', 'harpoon', 'rivet'],
    steps: [
      { wave: 1, build: 'bloom', tile: [9, 2] },
      { wave: 1, upgrade: [9, 2] },
      { wave: 1, upgrade: [9, 2] },
      { wave: 1, specialize: [9, 2], spec: 'a' },
      { wave: 1, build: 'mindspike', tile: [8, 2] },
      { wave: 1, upgrade: [8, 2] },
      { wave: 1, upgrade: [8, 2] },
      { wave: 1, build: 'harpoon', tile: [9, 3] },
      { wave: 1, build: 'rivet', tile: [9, 4] },
      { wave: 1, build: 'rivet', tile: [12, 4] },
      { wave: 1, upgrade: [12, 4] },
      { wave: 1, upgrade: [12, 4] },
    ],
  },
  // The Bloom alone answers none of them: it holds, it never kills.
  noCounterBuilds: {
    splash: { loadout: ['bloom'], steps: [{ wave: 1, build: 'bloom', tile: [9, 2] }] },
    armor: { loadout: ['bloom'], steps: [{ wave: 1, build: 'bloom', tile: [9, 2] }] },
    air: { loadout: ['bloom'], steps: [{ wave: 1, build: 'bloom', tile: [9, 2] }] },
  },
});
