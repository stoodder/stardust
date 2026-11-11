// A3M1 balance-harness builds: docs/story/campaign/act3.md § A3M1, Par build. The map is judged on
// Evacuated % (the Escort chain; maps.md § 6.1). The harness runs par under both values of
// `spared_quiet_wave` (Old Thrum's group walks only when she was spared); the reference, the weaker
// branch (campaign.md § 4.9), is `cleared`, the first value.
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos, TowerId } from '../../types.ts';

/** North of the outer ring, either side of the north road in. */
const NORTH_W: GridPos = [11, 1];
const NORTH_E: GridPos = [15, 1];
/** Between the outer ring (row 2) and the basin's ring (row 4). */
const RING_NW: GridPos = [10, 3];
const RING_NE: GridPos = [13, 3];
/** Between the east ring (column 16) and the basin's east side. */
const RING_E: GridPos = [15, 5];
/** Between the west ring (column 8) and the basin's west side. */
const RING_W: GridPos = [9, 6];
/** Inside the basin, among the warren homes. */
const BASIN: GridPos = [12, 7];
/** Between the north rift (column 5) and the west ring. */
const RIFT_NW: GridPos = [6, 4];
const RIFT_SW: GridPos = [6, 8];
/** Either side of the east rift, outside the east fence. */
const RIFT_EN: GridPos = [18, 4];
const RIFT_ES: GridPos = [18, 8];
/** By the gate road, west of the north rift. */
const GATE_N: GridPos = [3, 9];
/** South of the long run east. */
const SOUTH: GridPos = [13, 9];
/** Inside the south-west corner of the spiral. */
const CORNER: GridPos = [9, 10];
/** Out in the south-east. */
const FAR_SE: GridPos = [19, 10];
/** Beside the gate. */
const GATE: GridPos = [4, 12];

/** Where each Maw is trapped: on its road, a few tiles in. */
const NORTH_TRAP: GridPos = [9, 2];
const EAST_TRAP: GridPos = [16, 4];

function parSteps(): BuildStep[] {
  return [
    { wave: 1, build: 'thumper', tile: RING_W },
    { wave: 1, build: 'thumper', tile: RIFT_SW },
    { wave: 1, build: 'burrow', tile: RIFT_NW },
    { wave: 1, build: 'prism', tile: SOUTH },
    { wave: 2, upgrade: RING_W },
    { wave: 3, upgrade: RIFT_SW },
    { wave: 4, ability: 2, target: NORTH_TRAP, when: { afterSec: 10 } },
    { wave: 4, build: 'skyhook', tile: CORNER },
    { wave: 5, upgrade: SOUTH },
    { wave: 6, build: 'thumper', tile: RING_NW },
    { wave: 7, ability: 2, target: EAST_TRAP, when: { afterSec: 9 } },
    { wave: 7, upgrade: CORNER },
    { wave: 8, upgrade: RING_W },
    { wave: 8, upgrade: RING_NW },
    { wave: 9, upgrade: SOUTH },
    { wave: 10, upgrade: CORNER },
    { wave: 11, upgrade: RIFT_SW },
    { wave: 12, ability: 2, target: NORTH_TRAP, when: { afterSec: 10 } },
    { wave: 12, upgrade: RING_NW },
  ];
}

/** Par's placements and spending with each tower swapped by `swap` (a no-counter or alt build). */
function swapped(swap: Readonly<Partial<Record<TowerId, TowerId>>>): BuildStep[] {
  return parSteps().map((st) =>
    'build' in st && swap[st.build] !== undefined ? { ...st, build: swap[st.build]! } : st,
  );
}

export const builds = defineBuilds({
  // A3M1's reference profile (campaign.md § 4.9): A2M6's, the Scuttle Den (the briefing's gift)
  // and Ability Coolant 1.
  referenceProfile: REFERENCE_PROFILES.a3_m01,
  parBuild: { loadout: ['burrow', 'thumper', 'prism', 'skyhook'], steps: parSteps() },
  noCounterBuilds: {
    // No splash: no Thumper or Zapcoil, no Rivet Storm (Scuttle Den, Prism, Skyhook, Rivet: a
    // Rivet where par's Thumpers stand). Underfoot still goes on each Maw: a cooldown hit isn't a
    // splash answer.
    splash: {
      loadout: ['burrow', 'prism', 'skyhook', 'rivet'],
      steps: swapped({ thumper: 'rivet' }),
    },
    // No air: nothing in reach of the Moths' lane (Scuttle Den, Thumper, Sprinkler without
    // Cloudburst, Lookout: a Lookout where par's Skyhook stands, a Sprinkler for its Prism).
    air: {
      loadout: ['burrow', 'thumper', 'sprinkler', 'lookout'],
      steps: swapped({ skyhook: 'lookout', prism: 'sprinkler' }),
    },
  },
  altBuilds: {
    // Scuttle Den, Zapcoil, Rivet, Lookout: Zapcoils chaining the clusters where par's Thumpers
    // stand, Rivets for the Moths.
    dens_and_coils: {
      loadout: ['burrow', 'zapcoil', 'rivet', 'lookout'],
      steps: swapped({ thumper: 'zapcoil', skyhook: 'rivet', prism: 'rivet' }),
    },
    // Thumper, Skyhook, Sprinkler, Zapcoil: no Den and no Prism.
    cloudburst: {
      loadout: ['thumper', 'skyhook', 'sprinkler', 'zapcoil'],
      steps: swapped({ burrow: 'zapcoil', prism: 'zapcoil' }),
    },
  },
  flagVariants: { spared_quiet_wave: [false, true] },
});
