// dev_mind (T507): the Mindspike Obelisk's and Stillness's dev range, so Unnerved, Echo Spike's
// echo, and Ves'thara's Stillness show in play (smoke/mindspike.spec.ts) before A2M6 brings
// Ves'thara to a real map as its companion. The dev_prism U at dusk: north along row 1, down column
// 9, and east to the core. The high-ground pad (6,4) inside the U reaches both arms. W1 is a
// close-packed Mote cluster (Hollow: Psionic's ×1.5, and the echo's crowd) behind which come
// Blinkstriders (a blink's tell for Dread to interrupt); W2 more Motes, for Stillness to freeze.
// Ves'thara is the companion: Stillness in slot 2. Its own layout and definers, so devBattle.ts
// (which registers it in DEV_CONTENT) imports this file without a cycle: only the DevIds type
// comes back from there.
import { mapDefinersFor } from '../../content/define.ts';
import type { DevIds } from './devBattle.ts';

const dev = mapDefinersFor<DevIds>();

export const mindMap = dev.defineMap({
  id: 'dev_mind',
  act: 2,
  env: 'act2.dusk',
  objective: 'defend',
  size: { cols: 14, rows: 8 },
  // prettier-ignore
  tiles: [
    '..............',
    'S#########....',
    '.o..o..o.#.o..',
    '.........#....',
    '..o..o^o.#..o.',
    '.........#....',
    '..o..o..o####C',
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
        [9, 2],
        [9, 3],
        [9, 4],
        [9, 5],
        [9, 6],
        [10, 6],
        [11, 6],
        [12, 6],
        [13, 6],
      ],
    },
  ],
  startCredits: 2400,
  stardust: 0,
  threatIntel: ['clustered', 'shielded', 'blink'],
  requiredCounters: ['splash', 'shield'],
  markers: {},
  companion: { id: 'vesthara', state: 'present' },
  waves: dev.defineWaves([
    {
      groups: [
        { enemy: 'mote', count: 8, route: 'a', intervalSec: 0.35 },
        { enemy: 'blinkstrider', count: 3, route: 'a', delaySec: 4, intervalSec: 2 },
      ],
    },
    {
      countdownSec: 10,
      groups: [{ enemy: 'mote', count: 10, route: 'a', intervalSec: 0.3 }],
    },
  ]),
  referenceProfile: {
    towers: ['mindspike', 'rivet'],
    specs: ['mindspike'],
    shop: {},
    protocols: [],
    technicianAbility: 'dev_strike',
  },
  parBuild: {
    loadout: ['mindspike', 'rivet'],
    steps: [
      { wave: 1, build: 'mindspike', tile: [6, 4] },
      { wave: 1, build: 'rivet', tile: [7, 2] },
      { wave: 1, upgrade: [6, 4] },
      { wave: 1, upgrade: [6, 4] },
      { wave: 1, specialize: [6, 4], spec: 'a' },
    ],
  },
  noCounterBuilds: {
    splash: { loadout: ['rivet'], steps: [{ wave: 1, build: 'rivet', tile: [7, 2] }] },
    shield: { loadout: ['rivet'], steps: [{ wave: 1, build: 'rivet', tile: [7, 2] }] },
  },
});
