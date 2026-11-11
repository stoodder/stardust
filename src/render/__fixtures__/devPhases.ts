// dev_bore (T806; design/maps.md § 5.5): the finale's phases, timer, checkpoint, and light on a
// small range of their own, runnable before the choir, the song, and the Unsung land (dev_phases,
// devM8.ts, needs T804–T808). A Hollow road runs west to east into the core under an Act III night
// (a Sundown dark of 0.6 from W1, so Dawn's lift shows), and the sky warms by a sky-only key at W2
// (the T701 ruling: the world stays dark). The script in miniature:
// - W1 starts the Deep Bore (24 s to fill; under `quill_choice = purge` at 75%); full, it breaks
//   through: the `breakthrough` script group walks in.
// - W2 cleared is the Halls: Phase 2, the 'halls' checkpoint, the Bore stopped (its boss bonus
//   fixed: +5% HP per whole 10%). W3's boss (the short Chitterbloom) spawns with that bonus.
//   Phase 2's own clock: 5 s in, a 50-credit grant (Directive 0's slot in the real map).
// - W3 cleared is Dawn: Phase 3 and `setLighting: 'dawn'`; 8 s later the map is won (W4's long
//   countdown never runs out).
// Its own definers, so devBattle.ts imports this file without a cycle (only DevIds comes back).
// `?map=dev_bore`; smoke/phases.spec.ts walks it.
import { mapDefinersFor } from '../../content/define.ts';
import type { DevIds } from './devBattle.ts';

const dev = mapDefinersFor<DevIds>();

/** The road: west edge (0,3) east to the core (11,3). */
const ROAD = Array.from({ length: 12 }, (_, c) => [c, 3] as const);

export const boreMap = dev.defineMap({
  id: 'dev_bore',
  act: 3,
  env: 'act3',
  objective: 'defend',
  size: { cols: 12, rows: 7 },
  // prettier-ignore
  tiles: [
    '............',
    '..o..o..o...',
    '............',
    'S##########C',
    '............',
    '..o..o..o...',
    '............',
  ],
  paths: [{ id: 'a', tiles: ROAD }],
  lighting: [
    { wave: 1, env: 'act3', dark: 0.6 },
    { wave: 2, env: 'finale', skyOnly: true },
  ],
  startCredits: 900,
  stardust: 0,
  threatIntel: ['clustered', 'armored', 'boss'],
  requiredCounters: ['splash'],
  companion: null,
  timers: { deep_bore: { fillSec: 24, bossHpPerTenth: 0.05 } },
  scriptGroups: { breakthrough: { enemy: 'mote', count: 6, route: 'a', intervalSec: 0.3 } },
  waves: dev.defineWaves([
    { groups: [{ enemy: 'mote', count: 6, route: 'a', intervalSec: 0.8 }] },
    { countdownSec: 8, groups: [{ enemy: 'mote', count: 8, route: 'a', intervalSec: 0.6 }] },
    {
      countdownSec: 8,
      teach: true,
      groups: [{ enemy: 'dev_chitterbloom', count: 1, route: 'a' }],
    },
    { countdownSec: 60, groups: [{ enemy: 'nibbler', count: 2, route: 'a' }] },
  ]),
  events: [
    { id: 'bore', on: { wave: 1, phase: 'start' }, actions: [{ startTimer: 'deep_bore' }] },
    {
      id: 'bore_purge',
      on: { wave: 1, phase: 'start' },
      when: { flag: 'quill_choice', eq: 'purge' },
      actions: [{ setTimerRate: { timer: 'deep_bore', pct: 0.75 } }],
    },
    {
      id: 'breakthrough',
      on: { timerFull: 'deep_bore' },
      actions: [{ spawnWave: 'breakthrough' }],
    },
    {
      id: 'halls',
      on: { wave: 2, phase: 'cleared' },
      actions: [
        { setPhase: 2 },
        { checkpoint: 'halls' },
        { setTimerRate: { timer: 'deep_bore', pct: 0 } },
      ],
    },
    { id: 'phase2_clock', on: { phase: 2, afterSec: 5 }, actions: [{ grantCredits: 50 }] },
    {
      id: 'dawn',
      on: { wave: 3, phase: 'cleared' },
      actions: [{ setPhase: 3 }, { setLighting: 'dawn' }],
    },
    { id: 'won', on: { phase: 3, afterSec: 8 }, actions: [{ endMap: 'won' }] },
  ],
  referenceProfile: {
    towers: ['rivet', 'zapcoil'],
    specs: [],
    shop: {},
    protocols: [],
    technicianAbility: 'dev_strike',
  },
  parBuild: {
    loadout: ['rivet', 'zapcoil'],
    steps: [
      { wave: 1, build: 'zapcoil', tile: [2, 1] },
      { wave: 1, build: 'zapcoil', tile: [5, 5] },
      { wave: 1, build: 'rivet', tile: [8, 1] },
      { wave: 1, build: 'rivet', tile: [8, 5] },
      { wave: 2, build: 'rivet', tile: [5, 1] },
      { wave: 2, build: 'rivet', tile: [2, 5] },
      { wave: 3, upgrade: [8, 1] },
      { wave: 3, upgrade: [8, 5] },
      { wave: 3, upgrade: [8, 1] },
      { wave: 3, upgrade: [8, 5] },
    ],
  },
  noCounterBuilds: {
    splash: { loadout: ['rivet'], steps: [{ wave: 1, build: 'rivet', tile: [8, 1] }] },
  },
  flagVariants: { quill_choice: ['keep', 'purge', 'rewrite'] },
});
