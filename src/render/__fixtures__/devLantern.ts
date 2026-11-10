// dev_lantern (T508): the Seer's Lantern's dev range, so its Mark, All-Seeing's area Mark,
// Truthlight's no-evade, and the Lightsong link show in play (smoke/lantern.spec.ts) before the
// Lantern reaches a real map (its first designed use is A3M6). The dev_prism U at dusk (north along
// row 1, down column 9, east to the core) with an air lane across row 3 to the core, past the
// high-ground pad (6,4), which reaches both road arms and the lane. W1: Veilwalkers (cloaked: the
// Lantern detects them, and Truthlight keeps one seen), Rift Moths on the lane (phasing), and
// Blinkstriders (blink); W2: more Veilwalkers and a Digger (burrowing). Par: a Truthlight Lantern
// on (6,4) beside a Prism on (7,4) (Lightsong), an All-Seeing Lantern on (4,2), and Rivets. Its own
// layout and definers, so devBattle.ts (which registers it in DEV_CONTENT) imports this file
// without a cycle: only the DevIds type comes back from there.
import { mapDefinersFor } from '../../content/define.ts';
import type { DevIds } from './devBattle.ts';

const dev = mapDefinersFor<DevIds>();

/** The par build's tiles (the dev test and the smoke flow use them). */
export const LANTERN_TILES = {
  truthlight: [6, 4],
  allSeeing: [4, 2],
  prism: [7, 4],
  rivets: [
    [7, 2],
    [11, 2],
  ],
} as const;

export const lanternMap = dev.defineMap({
  id: 'dev_lantern',
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
  airLanes: [
    {
      id: 'sky',
      points: [
        [0, 3],
        [8, 3],
        [13, 6],
      ],
    },
  ],
  startCredits: 3200,
  stardust: 0,
  threatIntel: ['cloaked', 'shielded', 'flying', 'phasing', 'blink', 'burrowing', 'armored'],
  requiredCounters: ['detection', 'air', 'shield'],
  markers: {},
  companion: null,
  waves: dev.defineWaves([
    {
      groups: [
        { enemy: 'veilwalker', count: 3, route: 'a', intervalSec: 1.5 },
        { enemy: 'riftmoth', count: 3, route: 'sky', delaySec: 2, intervalSec: 2 },
        { enemy: 'blinkstrider', count: 2, route: 'a', delaySec: 5, intervalSec: 2.5 },
      ],
    },
    {
      countdownSec: 10,
      groups: [
        { enemy: 'veilwalker', count: 4, route: 'a', intervalSec: 1.2 },
        { enemy: 'digger', count: 1, route: 'a', delaySec: 2 },
      ],
    },
  ]),
  referenceProfile: {
    towers: ['lantern', 'prism', 'rivet', 'sprinkler'],
    specs: ['lantern'],
    shop: {},
    protocols: [],
    technicianAbility: 'dev_strike',
  },
  parBuild: {
    loadout: ['lantern', 'prism', 'rivet'],
    steps: [
      { wave: 1, build: 'lantern', tile: [6, 4] },
      { wave: 1, upgrade: [6, 4] },
      { wave: 1, upgrade: [6, 4] },
      { wave: 1, specialize: [6, 4], spec: 'b' },
      { wave: 1, build: 'prism', tile: [7, 4] },
      { wave: 1, build: 'lantern', tile: [4, 2] },
      { wave: 1, upgrade: [4, 2] },
      { wave: 1, upgrade: [4, 2] },
      { wave: 1, specialize: [4, 2], spec: 'a' },
      { wave: 1, build: 'rivet', tile: [7, 2] },
      { wave: 1, build: 'rivet', tile: [11, 2] },
    ],
  },
  noCounterBuilds: {
    detection: { loadout: ['rivet'], steps: [{ wave: 1, build: 'rivet', tile: [7, 2] }] },
    air: { loadout: ['sprinkler'], steps: [{ wave: 1, build: 'sprinkler', tile: [7, 2] }] },
    shield: { loadout: ['rivet'], steps: [{ wave: 1, build: 'rivet', tile: [7, 2] }] },
  },
});
