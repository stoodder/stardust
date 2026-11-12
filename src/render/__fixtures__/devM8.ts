// The finale's dev maps (T800a seams; design/maps.md § 5.5): each brings one finale system to a
// small map of its own, so its task can test and smoke it before `fin_m01` lands. They share one
// layout: the Hollow's road runs south from the Halls (the spawn, top) to the colony (the core,
// bottom), and the choir walks it the other way, from the core end north to the `halls` marker.
// Their own definers, so devBattle.ts imports this file without a cycle (only the DevIds type
// comes back). Each is registered in DEV_CONTENT.maps by the task that lifts its gates, with its
// smoke flow; until then devM8.test.ts checks it compiles and is refused, naming its tasks.
// - `dev_voices` (T804): the choir alone (Phase 1): 10 singers behind Pebble, +4 under `warren`,
//   −2 under `convoy`, Thrum beside her if spared, the Returned under `returned`; Motes come down
//   the road at it, so it halts; Voices floor 40% of the run's choir.
// - `dev_song` (T805, T806): the choir and its song in a Phase 2 from wave 1: Hollow killed inside
//   the circle are laid to rest, outside they scatter and re-form once; C4's multipliers; at
//   p = 1 every Hollow unit is laid to rest and the map is won.
// - `dev_phases` (T806, T807, T808): the finale's whole script in miniature: the Deep Bore (Purge
//   slows it; full, a breakthrough surge), Phase 2 when the choir reaches the Halls (checkpoint
//   `halls`, the Bore stopped, the Unsung), Directive 0 20 s in under Keep (a revocation, "Who's
//   there?", the restore, Time Dilation locked), Thrum's echo at p = 50% if cleared, and Dawn.
//   The Unsung (W3; T808) is held at the Halls by the song, cues each of its four forms
//   (`bossPhase` 1–4), and is laid to rest at Dawn.
import { mapDefinersFor } from '../../content/define.ts';
import type { MapDef } from '../../content/types.ts';
import type { DevIds } from './devBattle.ts';

const dev = mapDefinersFor<DevIds>();

const PROFILE = {
  towers: ['rivet', 'zapcoil'],
  specs: [],
  shop: {},
  protocols: [],
  technicianAbility: 'dev_strike',
} as const;

/** The road: from the Halls (6,0) south to the colony's gate (6,7). */
const ROAD_TILES = [
  [6, 0],
  [6, 1],
  [6, 2],
  [6, 3],
  [6, 4],
  [6, 5],
  [6, 6],
  [6, 7],
] as const;

const LONG_WALK = dev.defineMapLayout({
  id: 'dev_voices',
  act: 'finale',
  env: 'finale',
  objective: 'choir',
  meterLabel: 'voices',
  minVoicesPct: 0.4,
  size: { cols: 14, rows: 8 },
  // prettier-ignore
  tiles: [
    '......S.......',
    '.o..o.#.o..o..',
    '......#.......',
    '.o..o.#.o..o..',
    '......#.......',
    '.o..o.#.o..o..',
    '......#.......',
    '......C.......',
  ],
  paths: [{ id: 'a', tiles: ROAD_TILES }],
  markers: { halls: [7, 1] },
  startCredits: 900,
  stardust: 0,
  threatIntel: ['clustered'],
  requiredCounters: ['splash'],
  companion: null,
});

/** The choir (D154's numbers): the Long Walk's road, stopping at the Halls. */
const CHOIR = {
  leader: 'pebble',
  route: 'a',
  stopAt: 'halls',
  singers: 10,
  pace: 0.35,
  haltTiles: 1.5,
  groups: [
    { when: { flag: 'door_choice', eq: 'warren' }, singers: 4 },
    { when: { flag: 'door_choice', eq: 'convoy' }, singers: -2 },
  ],
  thrum: { when: { flag: 'spared_quiet_wave', eq: true }, radiusBonus: 0.5 },
  returned: { when: { flag: 'stardust_choice', eq: 'returned' }, count: 2, auraRadius: 1 },
} as const;

/** The song (maps.md § 5.5; numbers T805 and T821 tune). */
const SONG = {
  baseRadius: 2.5,
  restTarget: 40,
  restPerSec: 0.2,
  restPerBossHp: 0.001,
  multipliers: [
    { flag: 'quill_choice', value: 'rewrite', mul: 1.5 },
    { flag: 'quill_choice', value: 'keep', mul: 1.25 },
    { flag: 'quill_choice', value: 'purge', mul: 1 },
  ],
  scatter: { reformSec: 4, hpPct: 0.5 },
} as const;

/** The choir's story flags (each changes the sim, so each has its harness runs). */
const CHOIR_FLAGS = {
  door_choice: ['warren', 'convoy'],
  spared_quiet_wave: [true, false],
  stardust_choice: ['returned', 'none'],
} as const;

const PAR = {
  loadout: ['rivet', 'zapcoil'],
  steps: [
    { wave: 1, build: 'zapcoil', tile: [4, 3] },
    { wave: 1, build: 'rivet', tile: [8, 3] },
    { wave: 1, build: 'rivet', tile: [4, 1] },
  ],
} as const;

/** Without the Zapcoil's chains, the Motes' clusters walk through (the one required counter). */
const NO_SPLASH = {
  splash: { loadout: ['rivet'], steps: [{ wave: 1, build: 'rivet', tile: [8, 3] }] },
} as const;

/** dev_voices (T804): the choir walks north into Motes, halting while they're close ahead. */
export const voicesMap = dev.defineMap({
  ...LONG_WALK,
  choir: CHOIR,
  waves: dev.defineWaves([
    { groups: [{ enemy: 'mote', count: 6, route: 'a', intervalSec: 0.8 }] },
    { countdownSec: 8, groups: [{ enemy: 'mote', count: 10, route: 'a', intervalSec: 0.5 }] },
  ]),
  referenceProfile: PROFILE,
  parBuild: PAR,
  noCounterBuilds: NO_SPLASH,
  flagVariants: CHOIR_FLAGS,
});

/** dev_song (T805, T806): Phase 2 from wave 1: rest inside the song, scatter outside, Dawn. */
export const songMap = dev.defineMap({
  ...LONG_WALK,
  id: 'dev_song',
  choir: CHOIR,
  // T805: a small target, so every C4 answer reaches Dawn (p = 1) before W2's Motes run out.
  song: { ...SONG, restTarget: 12 },
  waves: dev.defineWaves([
    { groups: [{ enemy: 'mote', count: 8, route: 'a', intervalSec: 0.8 }] },
    { countdownSec: 6, groups: [{ enemy: 'mote', count: 12, route: 'a', intervalSec: 0.5 }] },
  ]),
  events: [
    { id: 'song', on: { wave: 1, phase: 'start' }, actions: [{ setPhase: 2 }] },
    { id: 'dawn', on: { restProgressPct: 1 }, actions: [{ restAll: true }, { endMap: 'won' }] },
  ],
  referenceProfile: PROFILE,
  parBuild: PAR,
  noCounterBuilds: NO_SPLASH,
  flagVariants: { ...CHOIR_FLAGS, quill_choice: ['keep', 'purge', 'rewrite'] },
});

/** dev_phases (T806, T807, T808): the finale's script in miniature, the Unsung at wave 3. */
export const phasesMap = dev.defineMap({
  ...LONG_WALK,
  id: 'dev_phases',
  threatIntel: ['clustered', 'boss'],
  choir: CHOIR,
  song: SONG,
  timers: { deep_bore: { fillSec: 60, bossHpPerTenth: 0.05 } },
  scriptGroups: { breakthrough: { enemy: 'mote', count: 8, route: 'a', intervalSec: 0.3 } },
  waves: dev.defineWaves([
    { groups: [{ enemy: 'mote', count: 6, route: 'a', intervalSec: 0.8 }] },
    { countdownSec: 8, groups: [{ enemy: 'mote', count: 10, route: 'a', intervalSec: 0.5 }] },
    { countdownSec: 8, groups: [{ enemy: 'unsung', count: 1, route: 'a' }] },
  ]),
  events: [
    // Phase 1: the Deep Bore fills (Purge slows it); full, it breaks through.
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
    // Phase 2 as the choir reaches the Halls: the checkpoint, the Bore stopped.
    {
      id: 'halls',
      on: { choirAt: 'halls' },
      actions: [
        { setPhase: 2 },
        { checkpoint: 'halls' },
        { setTimerRate: { timer: 'deep_bore', pct: 0 } },
        { cue: 'dev_phases_cue_phase2' },
      ],
    },
    // Directive 0 (Keep), 20 s into Phase 2.
    {
      id: 'directive0',
      on: { phase: 2, afterSec: 20 },
      when: { flag: 'quill_choice', eq: 'keep' },
      actions: [
        // An Everglow class (the Rivet here), so the Zapcoil's splash stays.
        { revokeTowerClass: { select: 'mostInvested', faction: 'everglow' }, refundPct: 100 },
        { lockAbility: 'time_dilation', on: true },
        { forceInput: { id: 'whos_there' } },
      ],
    },
    {
      id: 'not_everglow',
      on: { forcedInputResolved: 'whos_there' },
      actions: [{ restoreTowerClass: 'lastRevoked' }],
    },
    // Thrum's echo at p = 50%, if she was cleared.
    {
      id: 'echo',
      on: { restProgressPct: 0.5 },
      when: { flag: 'spared_quiet_wave', eq: false },
      actions: [{ spawnEcho: 'thrum' }],
    },
    // Dawn at p = 1; the map is won 8 s later.
    {
      id: 'dawn',
      on: { restProgressPct: 1 },
      actions: [{ restAll: true }, { setPhase: 3 }, { setLighting: 'dawn' }],
    },
    { id: 'won', on: { phase: 3, afterSec: 8 }, actions: [{ endMap: 'won' }] },
    // The Unsung's cues, one per form (T808): each the tick after its phase begins (the rise is
    // phase 3's: BossPhase 3 comes with it).
    { id: 'unsung_rises', on: { bossPhase: 1 }, actions: [{ cue: 'dev_phases_cue_unsung_1' }] },
    { id: 'unsung_splits', on: { bossPhase: 2 }, actions: [{ cue: 'dev_phases_cue_unsung_2' }] },
    { id: 'unsung_burrows', on: { bossPhase: 3 }, actions: [{ cue: 'dev_phases_cue_unsung_3' }] },
    { id: 'unsung_song', on: { bossPhase: 4 }, actions: [{ cue: 'dev_phases_cue_unsung_4' }] },
  ],
  referenceProfile: PROFILE,
  parBuild: {
    ...PAR,
    steps: [...PAR.steps, { wave: 3, scriptInput: 'whos_there' }],
  },
  noCounterBuilds: {
    splash: {
      ...NO_SPLASH.splash,
      steps: [...NO_SPLASH.splash.steps, { wave: 3, scriptInput: 'whos_there' }],
    },
  },
  flagVariants: { ...CHOIR_FLAGS, quill_choice: ['keep', 'purge', 'rewrite'] },
});

/** The finale's dev maps by id (not in DEV_CONTENT until their tasks register them). */
export const DEV_M8_MAPS: { readonly [id: string]: MapDef<DevIds> } = {
  dev_voices: voicesMap,
  dev_song: songMap,
  dev_phases: phasesMap,
};
