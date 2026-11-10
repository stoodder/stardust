// A2M3 balance-harness builds: docs/story/campaign/act2.md § A2M3, Par build (the step table there
// mirrors these). Tiles are this map's (A1M2's pads moved by its `revisitAt`, (2, 1)).
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos } from '../../types.ts';

/** A1M2's pump station (power node), inside the east switchback. */
const PUMP: GridPos = [12, 7];
/** Below the pump station, at the bottom of the east switchback over Terrace 3's road. */
const PUMP_S: GridPos = [12, 8];
/** At the east switchback's foot, two tiles from the strip mine: the road and the mine road. */
const SWITCH_E: GridPos = [14, 8];
/** Terrace 3, west of the pump station. */
const T3_MID: GridPos = [9, 7];
/** Terrace 3's lip by the gate: the road's last run and, 3 tiles down, the foot of the terraces. */
const GATE: GridPos = [8, 8];
/** Terrace 2, beside Rig 3. */
const RIG3: GridPos = [10, 4];
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
    { wave: 5, interact: 'peeker' }, // the click that pulls Pebble off the rock (non-blocking)
    { wave: 5, build: 'skyhook', tile: GATE },
    { wave: 5, build: 'zapcoil', tile: T3_MID },
    { wave: 6, upgrade: PUMP },
    { wave: 6, upgrade: BENCH_1 },
    { wave: 7, upgrade: GATE },
    { wave: 8, upgrade: BENCH_9 },
    { wave: 9, upgrade: BENCH_9 },
    { wave: 10, specialize: BENCH_9, spec: 'b' }, // Cloudburst
    { wave: 11, build: 'skyhook', tile: BENCH_2 },
  ];
}

const PAR_STEPS = parSteps();
const PAR_LOADOUT = ['zapcoil', 'sprinkler', 'skyhook'] as const;

export const builds = defineBuilds({
  // A2M3's reference profile (campaign.md § 4.9): A2M2's, plus Sprinkler tune 2.
  referenceProfile: REFERENCE_PROFILES.a2_m03,
  parBuild: { loadout: PAR_LOADOUT, steps: PAR_STEPS },
  noCounterBuilds: {
    // No shield answer: no Energy and no Soaked (Rivet, Thumper, Skyhook, Lookout).
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
    // No air answer: no Zapcoil in reach of the air lane (the Sprinklers, never a Cloudburst, and
    // the Thumper hold the strip mine; neither hits air).
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
    // No splash answer: no Zapcoil or Thumper (Rivets into the Soaking Sprinkler's shields).
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
  // The three tests all come by W8: the Warden and Glimmers (W4), the Lightwings (W6–W7), and the
  // mine road's clusters (W5, W7, W8).
  noCounterLoseByWave: 8,
  // A player who holds fire on every runner group (plain Hold Fire) sets it; par never holds fire,
  // and the Spare runners filter alone doesn't count (core-loop.md § 2.7).
  runEndFlags: {
    held_fire_second_look: {
      setBy: ['holdFireWhile:fleeing'],
      notSetBy: ['par', 'spareFleeing'],
    },
  },
  altBuilds: {
    // Zapcoil, Thumper, Lookout: Zapcoils on all four benches for the mine and the air and three
    // on the road for the Wardens; a Thumper over the gate for the clusters.
    coil_and_shell: {
      loadout: ['zapcoil', 'thumper', 'lookout'],
      steps: [
        { wave: 1, build: 'zapcoil', tile: BENCH_8 },
        { wave: 1, build: 'zapcoil', tile: BENCH_1 },
        { wave: 1, build: 'zapcoil', tile: PUMP },
        { wave: 1, build: 'zapcoil', tile: SWITCH_E },
        { wave: 2, upgrade: BENCH_8 },
        { wave: 3, build: 'thumper', tile: GATE },
        { wave: 4, build: 'zapcoil', tile: T3_MID },
        { wave: 5, build: 'zapcoil', tile: BENCH_9 },
        { wave: 6, upgrade: BENCH_1 },
        { wave: 6, upgrade: PUMP },
        { wave: 7, build: 'zapcoil', tile: BENCH_2 },
        { wave: 8, build: 'lookout', tile: PUMP_S },
        { wave: 9, upgrade: BENCH_9 },
        { wave: 9, upgrade: BENCH_2 },
        { wave: 10, upgrade: SWITCH_E },
        { wave: 10, upgrade: T3_MID },
      ],
    },
    // Sprinkler (Soaked), Zapcoil, Thumper, Lookout: Thumpers into Soaked shields on the road, the
    // Zapcoils and a Cloudburst on the benches for the mine and the air.
    soak_and_shell: {
      loadout: ['sprinkler', 'zapcoil', 'thumper', 'lookout'],
      steps: [
        { wave: 1, build: 'zapcoil', tile: BENCH_8 },
        { wave: 1, build: 'sprinkler', tile: BENCH_9 },
        { wave: 1, build: 'thumper', tile: PUMP },
        { wave: 1, build: 'zapcoil', tile: BENCH_1 },
        { wave: 2, build: 'zapcoil', tile: SWITCH_E },
        { wave: 3, build: 'sprinkler', tile: PUMP_S }, // Sitting Ducks with the pump's Thumper
        { wave: 4, upgrade: BENCH_8 },
        { wave: 4, upgrade: PUMP_S },
        { wave: 5, upgrade: PUMP_S }, // T3: Soaked
        { wave: 6, upgrade: BENCH_1 },
        { wave: 6, upgrade: BENCH_9 },
        { wave: 7, build: 'thumper', tile: T3_MID },
        { wave: 8, upgrade: BENCH_9 },
        { wave: 9, specialize: BENCH_9, spec: 'b' }, // Cloudburst
        { wave: 10, upgrade: PUMP },
        { wave: 10, build: 'lookout', tile: BENCH_2 },
      ],
    },
  },
});
