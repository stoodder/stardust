// dev_prism (T504): the Prism Spire's dev range, so its beam, its ramp, Refractor's split, and the
// Resonance link show in play (smoke/prism.spec.ts) before A2M6 brings the Prism to a real map.
// A U-shaped road in Act II's gold: north along row 1, down column 9, and east to the core. The
// high-ground pad (6,4) inside the U reaches both arms; the pad beside it (7,4) is the Zapcoil's,
// for Resonance. Glimmers in W1 (shields: Resonance's +20%), Weft Wardens among Glimmers in W2
// (slow, armored, and shielded: the beam ramps on them, and armor blunts it only per second).
// Its own layout and definers, so devBattle.ts (which registers it in DEV_CONTENT) imports this
// file without a cycle: only the DevIds type comes back from there.
import { mapDefinersFor } from '../../content/define.ts';
import type { DevIds } from './devBattle.ts';

const dev = mapDefinersFor<DevIds>();

export const prismMap = dev.defineMap({
  id: 'dev_prism',
  act: 2,
  env: 'act2.gold',
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
  startCredits: 900,
  stardust: 0,
  threatIntel: ['shielded', 'armored'],
  requiredCounters: ['shield'],
  markers: {},
  companion: null,
  waves: dev.defineWaves([
    { groups: [{ enemy: 'glimmer', count: 6, route: 'a', intervalSec: 0.8 }] },
    {
      countdownSec: 10,
      groups: [
        { enemy: 'weft_warden', count: 2, route: 'a', intervalSec: 2 },
        { enemy: 'glimmer', count: 6, route: 'a', delaySec: 1, intervalSec: 0.8 },
      ],
    },
  ]),
  referenceProfile: {
    towers: ['prism', 'zapcoil', 'rivet'],
    specs: ['prism'],
    shop: {},
    protocols: [],
    technicianAbility: 'dev_strike',
  },
  parBuild: {
    loadout: ['prism', 'zapcoil', 'rivet'],
    steps: [
      { wave: 1, build: 'prism', tile: [6, 4] },
      { wave: 1, build: 'zapcoil', tile: [7, 4] },
      { wave: 1, build: 'rivet', tile: [7, 2] },
      { wave: 2, upgrade: [6, 4] },
    ],
  },
  noCounterBuilds: {
    shield: { loadout: ['rivet'], steps: [{ wave: 1, build: 'rivet', tile: [7, 2] }] },
  },
});
