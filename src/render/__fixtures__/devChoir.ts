// dev_choir (T607): the Hum Choir's dev range, so its song ring, a Lullaby's ring, Harmony with the
// Mindspike, and Lulled units show in play (smoke/choir.spec.ts) before A3M1 brings the Choir to
// a real map. A road east along row 1, down column 10, and east into the core (13,6). The pads
// (7,2), (8,2), (9,2) sit beside the bend: a Choir on (9,2) sings over the road's corner, and a
// Mindspike beside it on (8,2) forms Harmony. W1 is a Maw with Motes catching it up (its gather's
// cooldown, Lulled) and Blinkstriders behind (a blink's); W2 more Motes. Its own layout and
// definers, so devBattle.ts (which registers it in DEV_CONTENT) imports this file without a cycle:
// only the DevIds type comes back from there.
import { mapDefinersFor } from '../../content/define.ts';
import type { DevIds } from './devBattle.ts';

const dev = mapDefinersFor<DevIds>();

export const choirMap = dev.defineMap({
  id: 'dev_choir',
  act: 3,
  env: 'act3',
  objective: 'defend',
  size: { cols: 14, rows: 8 },
  // prettier-ignore
  tiles: [
    '..............',
    'S##########...',
    '.o.o.o.ooo#.o.',
    '..........#...',
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
  startCredits: 2400,
  stardust: 0,
  threatIntel: ['armored', 'gathering', 'clustered', 'shielded', 'blink'],
  requiredCounters: ['splash', 'shield', 'armor'],
  markers: {},
  companion: null,
  waves: dev.defineWaves([
    {
      groups: [
        { enemy: 'maw', count: 1, route: 'a' },
        { enemy: 'mote', count: 6, route: 'a', delaySec: 2, intervalSec: 0.3 },
        { enemy: 'blinkstrider', count: 3, route: 'a', delaySec: 5, intervalSec: 2 },
      ],
    },
    { countdownSec: 10, groups: [{ enemy: 'mote', count: 10, route: 'a', intervalSec: 0.3 }] },
  ]),
  referenceProfile: {
    towers: ['choir', 'mindspike', 'rivet'],
    specs: ['choir', 'mindspike'],
    shop: {},
    protocols: [],
    technicianAbility: 'dev_strike',
  },
  parBuild: {
    loadout: ['choir', 'mindspike', 'rivet'],
    steps: [
      { wave: 1, build: 'choir', tile: [9, 2] },
      { wave: 1, upgrade: [9, 2] },
      { wave: 1, upgrade: [9, 2] },
      { wave: 1, specialize: [9, 2], spec: 'a' },
      { wave: 1, build: 'mindspike', tile: [8, 2] },
      { wave: 1, upgrade: [8, 2] },
      { wave: 1, upgrade: [8, 2] },
      { wave: 1, build: 'rivet', tile: [9, 4] },
      { wave: 1, build: 'rivet', tile: [12, 4] },
    ],
  },
  noCounterBuilds: {
    splash: { loadout: ['rivet'], steps: [{ wave: 1, build: 'rivet', tile: [9, 4] }] },
    shield: { loadout: ['rivet'], steps: [{ wave: 1, build: 'rivet', tile: [9, 4] }] },
    armor: { loadout: ['rivet'], steps: [{ wave: 1, build: 'rivet', tile: [9, 4] }] },
  },
});
