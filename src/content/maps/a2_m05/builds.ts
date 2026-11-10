// A2M5 balance-harness builds: docs/story/campaign/act2.md § A2M5, Par build (the step table there
// mirrors these). The map is judged on Evacuated % (the Escort chain; maps.md § 6.1).
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos } from '../../types.ts';

/** Inside the road's first turn, over its run east under the fencing and its run back west. */
const UPPER_W: GridPos = [2, 2];
const UPPER_MID: GridPos = [5, 3];
/** By the fencing's end, where the road turns down and the rig road joins it. */
const FENCE_END: GridPos = [7, 2];
/** Above and below the rig road. */
const RIG_N: GridPos = [11, 2];
const RIG_E: GridPos = [15, 3];
const RIG_S: GridPos = [12, 5];
/** West of the road's drop to the valley floor. */
const DROP_W: GridPos = [1, 5];
/** Between the road's run back west and the valley floor. */
const VALLEY_W: GridPos = [4, 5];
/** The knoll over the valley (high ground). */
const KNOLL: GridPos = [6, 6];
const VALLEY_MID: GridPos = [8, 6];
/** By the valley floor's east end, under the air lane. */
const VALLEY_E: GridPos = [13, 6];
/** South of the valley floor. */
const FLOOR_S: GridPos = [9, 8];
/** Beside the road's drop to the gate. */
const GATE_N: GridPos = [13, 8];
const GATE_W: GridPos = [9, 10];
const GATE_S: GridPos = [10, 11];

function parSteps(): BuildStep[] {
  return [
    { wave: 1, build: 'zapcoil', tile: UPPER_MID },
    { wave: 1, build: 'zapcoil', tile: KNOLL },
    { wave: 1, build: 'zapcoil', tile: FENCE_END },
    { wave: 2, build: 'lookout', tile: VALLEY_W },
    { wave: 2, upgrade: UPPER_MID },
    { wave: 3, upgrade: KNOLL },
    { wave: 3, build: 'zapcoil', tile: UPPER_W },
    { wave: 4, upgrade: FENCE_END },
    { wave: 4, build: 'rivet', tile: DROP_W },
    { wave: 5, build: 'zapcoil', tile: VALLEY_MID },
    { wave: 5, upgrade: UPPER_W },
    { wave: 6, build: 'thumper', tile: FLOOR_S },
    { wave: 6, build: 'thumper', tile: VALLEY_E },
    { wave: 7, upgrade: FLOOR_S },
    { wave: 8, build: 'thumper', tile: GATE_N },
    { wave: 9, upgrade: VALLEY_E },
    { wave: 10, upgrade: GATE_N },
    { wave: 11, upgrade: FLOOR_S },
    { wave: 12, build: 'thumper', tile: RIG_S },
  ];
}

const PAR_LOADOUT = ['zapcoil', 'lookout', 'rivet', 'thumper'] as const;

export const builds = defineBuilds({
  // A2M5's reference profile (campaign.md § 4.9): A2M4's (C2 Return emptied the bank).
  referenceProfile: REFERENCE_PROFILES.a2_m05,
  parBuild: { loadout: PAR_LOADOUT, steps: parSteps() },
  noCounterBuilds: {
    // No detection: no Lookout, and no Scanner Sweep (slot 1 is the profile's Orbital Strike).
    detection: {
      loadout: ['zapcoil', 'rivet', 'thumper', 'sprinkler'],
      steps: [
        { wave: 1, build: 'zapcoil', tile: UPPER_MID },
        { wave: 1, build: 'zapcoil', tile: FENCE_END },
        { wave: 1, build: 'rivet', tile: VALLEY_W },
        { wave: 2, build: 'zapcoil', tile: KNOLL },
        { wave: 2, upgrade: UPPER_MID },
        { wave: 3, build: 'rivet', tile: UPPER_W },
        { wave: 3, upgrade: FENCE_END },
        { wave: 4, build: 'zapcoil', tile: VALLEY_E },
        { wave: 4, upgrade: KNOLL },
        { wave: 5, upgrade: UPPER_MID },
        { wave: 6, build: 'thumper', tile: VALLEY_MID },
        { wave: 6, build: 'thumper', tile: FLOOR_S },
      ],
    },
    // No shield answer: no Energy and no Soaked (Lookout, Rivet, Thumper, Skyhook).
    shield: {
      loadout: ['lookout', 'rivet', 'thumper', 'skyhook'],
      steps: [
        { wave: 1, build: 'rivet', tile: UPPER_MID },
        { wave: 1, build: 'rivet', tile: FENCE_END },
        { wave: 1, build: 'thumper', tile: VALLEY_W },
        { wave: 2, build: 'rivet', tile: KNOLL },
        { wave: 2, upgrade: UPPER_MID },
        { wave: 3, build: 'lookout', tile: UPPER_W },
        { wave: 3, upgrade: FENCE_END },
        { wave: 4, build: 'skyhook', tile: VALLEY_E },
        { wave: 4, upgrade: KNOLL },
        { wave: 5, upgrade: UPPER_MID },
        { wave: 6, build: 'thumper', tile: VALLEY_MID },
        { wave: 6, build: 'thumper', tile: FLOOR_S },
      ],
    },
    // No splash answer: no Zapcoil or Thumper (Lookout, Rivet, Sprinkler with Soaked, Skyhook).
    splash: {
      loadout: ['lookout', 'rivet', 'sprinkler', 'skyhook'],
      steps: [
        { wave: 1, build: 'rivet', tile: UPPER_MID },
        { wave: 1, build: 'sprinkler', tile: FENCE_END },
        { wave: 1, build: 'rivet', tile: VALLEY_W },
        { wave: 2, build: 'rivet', tile: KNOLL },
        { wave: 2, upgrade: FENCE_END },
        { wave: 3, build: 'lookout', tile: UPPER_W },
        { wave: 3, upgrade: FENCE_END }, // T3: Soaked
        { wave: 4, build: 'skyhook', tile: VALLEY_E },
        { wave: 4, upgrade: KNOLL },
        { wave: 5, upgrade: UPPER_MID },
        { wave: 6, build: 'rivet', tile: VALLEY_MID },
        { wave: 6, build: 'rivet', tile: FLOOR_S },
        { wave: 7, upgrade: VALLEY_MID },
        { wave: 8, upgrade: FLOOR_S },
      ],
    },
  },
  altBuilds: {
    // Lookout, Zapcoil (Capacitor Bank), Sprinkler, Skyhook (T501c): the Capacitor breaks the
    // Penitent's shield in a few discharges.
    capacitor: {
      loadout: ['lookout', 'zapcoil', 'sprinkler', 'skyhook'],
      steps: [
        { wave: 1, build: 'zapcoil', tile: UPPER_MID },
        { wave: 1, build: 'zapcoil', tile: FENCE_END },
        { wave: 1, build: 'sprinkler', tile: VALLEY_W },
        { wave: 2, build: 'zapcoil', tile: KNOLL },
        { wave: 2, upgrade: UPPER_MID },
        { wave: 3, build: 'lookout', tile: UPPER_W },
        { wave: 3, upgrade: FENCE_END },
        { wave: 4, build: 'skyhook', tile: VALLEY_E },
        { wave: 4, upgrade: UPPER_MID },
        { wave: 5, specialize: UPPER_MID, spec: 'b' }, // Capacitor Bank
        { wave: 6, build: 'sprinkler', tile: VALLEY_MID },
        { wave: 6, build: 'zapcoil', tile: FLOOR_S },
        { wave: 7, upgrade: VALLEY_MID },
        { wave: 8, upgrade: FLOOR_S },
        { wave: 9, build: 'zapcoil', tile: GATE_N },
        { wave: 10, upgrade: KNOLL },
        { wave: 11, upgrade: GATE_N },
      ],
    },
    // Lookout, Sprinkler (Soaked), Thumper, Skyhook: the Soak lets the shells bite the shields.
    soak_and_shell: {
      loadout: ['lookout', 'sprinkler', 'thumper', 'skyhook'],
      steps: [
        { wave: 1, build: 'sprinkler', tile: UPPER_MID },
        { wave: 1, build: 'thumper', tile: FENCE_END },
        { wave: 1, build: 'skyhook', tile: VALLEY_W },
        { wave: 2, upgrade: UPPER_MID },
        { wave: 2, build: 'thumper', tile: KNOLL },
        { wave: 3, build: 'lookout', tile: UPPER_W },
        { wave: 3, upgrade: UPPER_MID }, // T3: Soaked
        { wave: 4, build: 'skyhook', tile: VALLEY_E },
        { wave: 4, upgrade: FENCE_END },
        { wave: 5, upgrade: KNOLL },
        { wave: 6, build: 'thumper', tile: VALLEY_MID },
        { wave: 6, build: 'thumper', tile: FLOOR_S },
        { wave: 7, upgrade: VALLEY_MID },
        { wave: 8, upgrade: FLOOR_S },
        { wave: 9, build: 'thumper', tile: GATE_N },
        { wave: 10, upgrade: GATE_N },
      ],
    },
  },
});

/** Unused tiles, named for the step tables (and so the tile list stays one home). */
export const TILES = { RIG_N, RIG_E, DROP_W, GATE_W, GATE_S } as const;
