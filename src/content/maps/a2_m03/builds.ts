// A2M3 balance-harness builds: docs/story/campaign/act2.md § A2M3, Par build (the step table there
// mirrors these). Tiles are this map's (A1M2's pads moved by its `revisitAt`, (2, 1)).
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos } from '../../types.ts';

/** A1M2's pump station (power node), inside the east switchback. */
const PUMP: GridPos = [12, 7];
/** Below the pump station, at the bottom of the east switchback over Terrace 3's road. */
const PUMP_S: GridPos = [12, 8];
/** Beside the east switchback's foot, over the strip mine's last drop. */
const SWITCH_E: GridPos = [14, 8];
/** Terrace 3, west of the pump station. */
const T3_MID: GridPos = [9, 7];
/** Terrace 3's lip by the gate. */
const GATE: GridPos = [8, 8];
/** A1M2's irrigation tower (high ground), in the middle of Terrace 2. */
const IRRIGATION: GridPos = [8, 5];
/** Terrace 2, beside Rig 3 and beside the housing block. */
const RIG3: GridPos = [10, 4];
const HOUSING: GridPos = [7, 4];
/** Inside the west switchback. */
const WEST: GridPos = [5, 5];
/** Terrace 1: west, and east by the warren mouth. */
const T1_W: GridPos = [7, 2];
const T1_E: GridPos = [14, 2];
/** The strip mine's benches, under the air lane and over the mine road. */
const BENCH_1: GridPos = [17, 1];
const BENCH_2: GridPos = [17, 2];
const BENCH_8: GridPos = [17, 8];
const BENCH_9: GridPos = [17, 9];

function parSteps(): BuildStep[] {
  return [
    { wave: 1, build: 'zapcoil', tile: BENCH_8 },
    { wave: 1, build: 'sprinkler', tile: BENCH_9 }, // Conductive on the foot pair
    { wave: 1, build: 'zapcoil', tile: BENCH_1 },
    { wave: 1, build: 'zapcoil', tile: PUMP }, // the power node: +20% rate
    { wave: 2, upgrade: BENCH_8 },
    { wave: 3, build: 'sprinkler', tile: PUMP_S }, // Conductive with the pump's Zapcoil
    { wave: 4, build: 'zapcoil', tile: SWITCH_E },
    { wave: 5, interact: 'peeker' },
    { wave: 5, build: 'skyhook', tile: GATE },
    { wave: 5, upgrade: BENCH_1 },
    { wave: 6, upgrade: GATE },
    { wave: 6, build: 'rivet', tile: BENCH_2 },
    { wave: 7, upgrade: PUMP },
    { wave: 7, upgrade: SWITCH_E },
    { wave: 8, upgrade: BENCH_9 },
    { wave: 8, upgrade: BENCH_9 },
    { wave: 9, specialize: BENCH_9, spec: 'b' }, // Cloudburst
    { wave: 10, upgrade: BENCH_2 },
    { wave: 10, upgrade: PUMP_S },
    { wave: 11, upgrade: BENCH_8 },
    { wave: 11, upgrade: BENCH_1 },
  ];
}

const PAR_STEPS = parSteps();
const PAR_LOADOUT = ['zapcoil', 'sprinkler', 'rivet', 'skyhook'] as const;

export const builds = defineBuilds({
  // A2M3's reference profile (campaign.md § 4.9): A2M2's, plus Sprinkler tune 2.
  referenceProfile: REFERENCE_PROFILES.a2_m03,
  parBuild: { loadout: PAR_LOADOUT, steps: PAR_STEPS },
  noCounterBuilds: {
    shield: {
      loadout: ['rivet', 'thumper', 'skyhook', 'lookout'],
      steps: [
        { wave: 1, build: 'thumper', tile: PUMP },
        { wave: 1, build: 'rivet', tile: BENCH_8 },
        { wave: 1, build: 'rivet', tile: PUMP_S },
        { wave: 2, build: 'thumper', tile: SWITCH_E },
        { wave: 3, upgrade: PUMP },
        { wave: 4, upgrade: BENCH_8 },
        { wave: 5, build: 'skyhook', tile: GATE },
        { wave: 5, upgrade: PUMP_S },
        { wave: 6, upgrade: SWITCH_E },
        { wave: 6, build: 'lookout', tile: BENCH_9 },
        { wave: 7, upgrade: BENCH_8 },
        { wave: 7, upgrade: GATE },
      ],
    },
    air: {
      loadout: ['zapcoil', 'sprinkler', 'thumper', 'lookout'],
      steps: [
        { wave: 1, build: 'sprinkler', tile: PUMP },
        { wave: 1, build: 'zapcoil', tile: T3_MID },
        { wave: 1, build: 'thumper', tile: BENCH_8 },
        { wave: 2, build: 'sprinkler', tile: BENCH_9 },
        { wave: 3, upgrade: T3_MID },
        { wave: 4, upgrade: PUMP },
        { wave: 4, upgrade: PUMP },
        { wave: 5, upgrade: BENCH_9 },
        { wave: 5, upgrade: BENCH_9 },
        { wave: 6, upgrade: BENCH_8 },
        { wave: 6, build: 'zapcoil', tile: RIG3 },
        { wave: 7, upgrade: T3_MID },
        { wave: 7, build: 'lookout', tile: GATE },
      ],
    },
    splash: {
      loadout: ['rivet', 'sprinkler', 'skyhook', 'lookout'],
      steps: [
        { wave: 1, build: 'sprinkler', tile: PUMP },
        { wave: 1, build: 'rivet', tile: PUMP_S },
        { wave: 1, build: 'rivet', tile: BENCH_8 },
        { wave: 2, build: 'rivet', tile: BENCH_9 },
        { wave: 3, upgrade: PUMP },
        { wave: 3, upgrade: PUMP },
        { wave: 4, upgrade: PUMP_S },
        { wave: 5, build: 'skyhook', tile: GATE },
        { wave: 5, upgrade: BENCH_8 },
        { wave: 6, upgrade: PUMP_S },
        { wave: 6, build: 'lookout', tile: T3_MID },
        { wave: 7, upgrade: BENCH_9 },
      ],
    },
  },
  noCounterLoseByWave: 8,
  runEndFlags: {
    held_fire_second_look: {
      setBy: ['holdFireWhile:fleeing'],
      notSetBy: ['par', 'spareFleeing'],
    },
  },
  parMedals: ['challenge'],
  altBuilds: {
    // Zapcoil, Thumper, Lookout: three Zapcoils for the shields and the air, Thumpers for the
    // clusters.
    coil_and_shell: {
      loadout: ['zapcoil', 'thumper', 'lookout'],
      steps: [
        { wave: 1, build: 'zapcoil', tile: PUMP_S },
        { wave: 1, build: 'thumper', tile: PUMP },
        { wave: 1, build: 'zapcoil', tile: BENCH_8 },
        { wave: 2, upgrade: PUMP_S },
        { wave: 3, upgrade: PUMP },
        { wave: 4, upgrade: BENCH_8 },
        { wave: 5, build: 'zapcoil', tile: BENCH_2 },
        { wave: 6, upgrade: BENCH_2 },
        { wave: 6, build: 'lookout', tile: BENCH_9 },
        { wave: 7, upgrade: PUMP_S },
        { wave: 7, upgrade: BENCH_8 },
        { wave: 8, build: 'thumper', tile: T3_MID },
        { wave: 8, upgrade: BENCH_2 },
        { wave: 9, upgrade: T3_MID },
        { wave: 9, build: 'zapcoil', tile: SWITCH_E },
        { wave: 10, upgrade: SWITCH_E },
        { wave: 10, upgrade: PUMP },
      ],
    },
    // Sprinkler (Soaked), Zapcoil, Thumper, Lookout: one Zapcoil on the Wardens and the
    // Lightwings, Thumpers into Soaked shields.
    soak_and_shell: {
      loadout: ['sprinkler', 'zapcoil', 'thumper', 'lookout'],
      steps: [
        { wave: 1, build: 'sprinkler', tile: PUMP },
        { wave: 1, build: 'thumper', tile: PUMP_S },
        { wave: 1, build: 'zapcoil', tile: BENCH_8 },
        { wave: 2, upgrade: PUMP },
        { wave: 3, upgrade: PUMP },
        { wave: 4, upgrade: PUMP_S },
        { wave: 5, build: 'sprinkler', tile: BENCH_9 },
        { wave: 5, upgrade: BENCH_8 },
        { wave: 6, upgrade: BENCH_9 },
        { wave: 6, upgrade: BENCH_9 },
        { wave: 7, upgrade: BENCH_8 },
        { wave: 7, build: 'lookout', tile: BENCH_2 },
        { wave: 8, build: 'thumper', tile: T3_MID },
        { wave: 9, upgrade: T3_MID },
        { wave: 9, upgrade: PUMP_S },
        { wave: 10, build: 'thumper', tile: SWITCH_E },
        { wave: 10, upgrade: SWITCH_E },
      ],
    },
  },
});

// Tiles named for the alt builds (T422 tunes them).
export const TILES = { GATE, IRRIGATION, HOUSING, WEST, T1_W, T1_E, BENCH_1 } as const;
