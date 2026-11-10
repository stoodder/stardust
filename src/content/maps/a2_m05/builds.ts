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
    { wave: 6, build: 'thumper', tile: GATE_N },
    { wave: 7, upgrade: FLOOR_S },
    { wave: 8, upgrade: GATE_N },
    { wave: 9, upgrade: DROP_W },
    { wave: 10, upgrade: FLOOR_S },
    { wave: 11, upgrade: GATE_N },
    { wave: 12, upgrade: KNOLL },
  ];
}

const PAR_LOADOUT = ['zapcoil', 'lookout', 'rivet', 'thumper'] as const;

export const builds = defineBuilds({
  // A2M5's reference profile (campaign.md § 4.9): A2M4's (C2 Return emptied the bank).
  referenceProfile: REFERENCE_PROFILES.a2_m05,
  parBuild: { loadout: PAR_LOADOUT, steps: parSteps() },
  noCounterBuilds: {
    // No detection: no Lookout, and no Scanner Sweep (slot 1 is the profile's Orbital Strike,
    // never cast). Par's hairpins, blind: a Rivet where the Lookout stood.
    detection: {
      loadout: ['zapcoil', 'rivet', 'thumper', 'sprinkler'],
      steps: [
        { wave: 1, build: 'zapcoil', tile: UPPER_MID },
        { wave: 1, build: 'zapcoil', tile: KNOLL },
        { wave: 1, build: 'zapcoil', tile: FENCE_END },
        { wave: 2, build: 'rivet', tile: VALLEY_W },
        { wave: 2, upgrade: UPPER_MID },
        { wave: 3, upgrade: KNOLL },
        { wave: 3, build: 'zapcoil', tile: UPPER_W },
        { wave: 4, upgrade: FENCE_END },
        { wave: 4, build: 'sprinkler', tile: DROP_W },
        { wave: 5, build: 'zapcoil', tile: VALLEY_MID },
        { wave: 5, upgrade: UPPER_W },
        { wave: 6, build: 'thumper', tile: FLOOR_S },
        { wave: 6, build: 'thumper', tile: GATE_N },
      ],
    },
    // No shield answer: no Energy and no Soaked (Lookout, Rivet, Thumper, Skyhook).
    shield: {
      loadout: ['lookout', 'rivet', 'thumper', 'skyhook'],
      steps: [
        { wave: 1, build: 'rivet', tile: UPPER_MID },
        { wave: 1, build: 'rivet', tile: KNOLL },
        { wave: 1, build: 'thumper', tile: FENCE_END },
        { wave: 2, build: 'lookout', tile: VALLEY_W },
        { wave: 2, upgrade: UPPER_MID },
        { wave: 3, upgrade: KNOLL },
        { wave: 3, build: 'rivet', tile: UPPER_W },
        { wave: 4, upgrade: FENCE_END },
        { wave: 4, build: 'skyhook', tile: VALLEY_MID },
        { wave: 5, upgrade: UPPER_W },
        { wave: 6, build: 'thumper', tile: FLOOR_S },
        { wave: 6, build: 'thumper', tile: GATE_N },
      ],
    },
    // No splash answer: no Zapcoil or Thumper (Lookout, Rivet, Sprinkler with Soaked, Skyhook).
    splash: {
      loadout: ['lookout', 'rivet', 'sprinkler', 'skyhook'],
      steps: [
        { wave: 1, build: 'rivet', tile: UPPER_MID },
        { wave: 1, build: 'sprinkler', tile: KNOLL },
        { wave: 1, build: 'rivet', tile: FENCE_END },
        { wave: 2, build: 'lookout', tile: VALLEY_W },
        { wave: 2, upgrade: KNOLL },
        { wave: 3, upgrade: KNOLL }, // T3: Soaked
        { wave: 3, build: 'rivet', tile: UPPER_W },
        { wave: 4, upgrade: FENCE_END },
        { wave: 4, build: 'skyhook', tile: VALLEY_MID },
        { wave: 5, upgrade: UPPER_MID },
        { wave: 6, build: 'rivet', tile: FLOOR_S },
        { wave: 6, build: 'rivet', tile: GATE_N },
        { wave: 7, upgrade: FLOOR_S },
        { wave: 8, upgrade: GATE_N },
      ],
    },
  },
  altBuilds: {
    // Lookout, Zapcoil, Sprinkler, Skyhook, with a Capacitor Bank on the knoll for the Penitent's
    // shield (T501c) and an Overload Coil over the rig road, where it joins the Preserve Road.
    capacitor: {
      loadout: ['lookout', 'zapcoil', 'sprinkler', 'skyhook'],
      steps: [
        { wave: 1, build: 'zapcoil', tile: UPPER_MID },
        { wave: 1, build: 'zapcoil', tile: KNOLL },
        { wave: 1, build: 'zapcoil', tile: FENCE_END },
        { wave: 2, build: 'lookout', tile: VALLEY_W },
        { wave: 2, upgrade: UPPER_MID },
        { wave: 3, upgrade: KNOLL },
        { wave: 3, build: 'zapcoil', tile: UPPER_W },
        { wave: 4, upgrade: KNOLL },
        { wave: 4, build: 'skyhook', tile: VALLEY_MID },
        { wave: 5, specialize: KNOLL, spec: 'b' }, // Capacitor Bank
        { wave: 6, build: 'sprinkler', tile: RIG_S },
        { wave: 6, build: 'zapcoil', tile: RIG_N },
        { wave: 7, upgrade: RIG_N },
        { wave: 7, upgrade: RIG_S },
        { wave: 8, upgrade: RIG_N },
        { wave: 8, upgrade: UPPER_MID },
        { wave: 9, specialize: RIG_N, spec: 'a' }, // Overload Coil
        { wave: 10, build: 'zapcoil', tile: FLOOR_S },
        { wave: 10, upgrade: FLOOR_S },
        { wave: 11, upgrade: FLOOR_S },
        { wave: 12, build: 'sprinkler', tile: DROP_W },
      ],
    },
    // Lookout, Zapcoil, Skyhook: no Sprinkler and no Thumper, so Zapcoils take the Motes, and
    // from W8 an Overload Coil guards the rig road.
    coil_and_hook: {
      loadout: ['lookout', 'zapcoil', 'skyhook'],
      steps: [
        { wave: 1, build: 'zapcoil', tile: UPPER_MID },
        { wave: 1, build: 'zapcoil', tile: KNOLL },
        { wave: 1, build: 'zapcoil', tile: FENCE_END },
        { wave: 2, build: 'lookout', tile: VALLEY_W },
        { wave: 2, upgrade: UPPER_MID },
        { wave: 3, upgrade: KNOLL },
        { wave: 3, build: 'zapcoil', tile: UPPER_W },
        { wave: 4, upgrade: FENCE_END },
        { wave: 4, build: 'skyhook', tile: VALLEY_MID },
        { wave: 5, upgrade: UPPER_W },
        { wave: 6, build: 'zapcoil', tile: FLOOR_S },
        { wave: 7, upgrade: FLOOR_S },
        { wave: 8, build: 'zapcoil', tile: RIG_S },
        { wave: 8, upgrade: RIG_S },
        { wave: 9, build: 'zapcoil', tile: RIG_N },
        { wave: 9, upgrade: RIG_S },
        { wave: 10, specialize: RIG_S, spec: 'a' }, // Overload Coil
        { wave: 11, upgrade: RIG_N },
        { wave: 12, upgrade: FLOOR_S },
      ],
    },
  },
});
