// A3M1 balance-harness builds: docs/story/campaign/act3.md § A3M1, Par build. The map is judged on
// Evacuated % (the Escort chain; maps.md § 6.1). The harness runs par under both values of
// `spared_quiet_wave` (Old Thrum's group walks only when she was spared); the reference, the weaker
// branch (campaign.md § 4.9), is `cleared`, the first value.
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos, TowerId } from '../../types.ts';

/** Between the outer ring (row 2) and the basin's ring (row 4). */
const RING_NW: GridPos = [10, 3];
/** Between the east ring (column 16) and the basin's east side. */
const RING_E: GridPos = [15, 5];
/** Between the west ring (column 8) and the basin's west side. */
const RING_W: GridPos = [9, 6];
/** Between the north rift (column 5) and the west ring. */
const RIFT_NW: GridPos = [6, 4];
const RIFT_SW: GridPos = [6, 8];
/** South of the long run east. */
const SOUTH: GridPos = [13, 9];
/** Inside the south-west corner of the spiral. */
const CORNER: GridPos = [9, 10];
/** Beside the gate. */
const GATE: GridPos = [4, 12];

/** Where each Maw is trapped: on its road, a few tiles in. */
const NORTH_TRAP: GridPos = [9, 2];
const EAST_TRAP: GridPos = [16, 4];

function parSteps(): BuildStep[] {
  return [
    { wave: 1, build: 'thumper', tile: RING_W },
    { wave: 1, upgrade: RING_W },
    { wave: 1, build: 'thumper', tile: RIFT_SW },
    { wave: 1, upgrade: RIFT_SW },
    { wave: 1, build: 'burrow', tile: RIFT_NW },
    { wave: 2, build: 'skyhook', tile: CORNER },
    { wave: 3, build: 'skyhook', tile: SOUTH },
    { wave: 4, ability: 2, target: NORTH_TRAP, when: { afterSec: 10 } },
    { wave: 4, upgrade: CORNER },
    { wave: 5, upgrade: SOUTH },
    { wave: 6, build: 'thumper', tile: RING_NW },
    { wave: 7, ability: 2, target: EAST_TRAP, when: { afterSec: 12 } },
    { wave: 7, build: 'prism', tile: RING_E },
    { wave: 8, upgrade: RING_NW },
    { wave: 8, upgrade: CORNER },
    { wave: 9, ability: 2, target: NORTH_TRAP, when: { afterSec: 13 } },
    { wave: 9, upgrade: RING_W },
    { wave: 10, upgrade: RING_E },
    { wave: 10, upgrade: SOUTH },
    { wave: 12, ability: 2, target: NORTH_TRAP, when: { afterSec: 10 } },
    { wave: 12, upgrade: RIFT_SW },
    { wave: 12, upgrade: RING_NW },
  ];
}

/** Par's placements and spending with each tower swapped by `swap` (a no-counter or alt build). */
function swapped(swap: Readonly<Partial<Record<TowerId, TowerId>>>): BuildStep[] {
  const out: BuildStep[] = [];
  for (const st of parSteps()) {
    const to = 'build' in st ? swap[st.build] : undefined;
    out.push('build' in st && to !== undefined ? { ...st, build: to } : st);
  }
  return out;
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
    // Cloudburst, Lookout: a Lookout where each of par's Skyhooks stands, a Sprinkler for its Prism).
    air: {
      loadout: ['burrow', 'thumper', 'sprinkler', 'lookout'],
      steps: swapped({ skyhook: 'lookout', prism: 'sprinkler' }),
    },
  },
  altBuilds: {
    // Thumper, Rivet, Zapcoil, Lookout: the air held without a Skyhook (T770). Par's Thumpers,
    // Rivets where its Skyhooks and Den stand (a Rivet shoots the Moths too), a Zapcoil where its
    // Prism stands; the Lookout stays home.
    rivet_air: {
      loadout: ['thumper', 'rivet', 'zapcoil', 'lookout'],
      steps: swapped({ burrow: 'rivet', prism: 'zapcoil', skyhook: 'rivet' }),
    },
    // Thumper, Skyhook, Rivet, Lookout: par's Thumpers and Skyhooks, Rivets where its Den and
    // Prism stand. The Lookout stays home (nothing on the map is cloaked).
    rivets: {
      loadout: ['thumper', 'skyhook', 'rivet', 'lookout'],
      steps: swapped({ burrow: 'rivet', prism: 'rivet' }),
    },
    // Thumper, Skyhook, Sprinkler, Zapcoil: no Den and no Prism. Par's Thumpers and Skyhooks, a
    // Sprinkler slowing the north rift's Motes where par's Den stands, a third Skyhook at the
    // gate, and a Zapcoil on the east ring for the Maws' Motes. (No Cloudburst: the Skyhooks carry
    // the air.)
    soak_and_coil: {
      loadout: ['thumper', 'skyhook', 'sprinkler', 'zapcoil'],
      steps: [
        { wave: 1, build: 'thumper', tile: RING_W },
        { wave: 1, upgrade: RING_W },
        { wave: 1, build: 'thumper', tile: RIFT_SW },
        { wave: 1, upgrade: RIFT_SW },
        { wave: 1, build: 'sprinkler', tile: RIFT_NW },
        { wave: 2, build: 'skyhook', tile: CORNER },
        { wave: 3, build: 'skyhook', tile: SOUTH },
        { wave: 4, ability: 2, target: NORTH_TRAP, when: { afterSec: 10 } },
        { wave: 4, upgrade: CORNER },
        { wave: 5, upgrade: SOUTH },
        { wave: 6, build: 'thumper', tile: RING_NW },
        { wave: 7, ability: 2, target: EAST_TRAP, when: { afterSec: 12 } },
        { wave: 7, build: 'skyhook', tile: GATE },
        { wave: 8, upgrade: RING_NW },
        { wave: 8, upgrade: GATE },
        { wave: 9, ability: 2, target: NORTH_TRAP, when: { afterSec: 13 } },
        { wave: 9, upgrade: RING_W },
        { wave: 10, upgrade: CORNER },
        { wave: 10, build: 'zapcoil', tile: RING_E },
        { wave: 11, upgrade: SOUTH },
        { wave: 12, ability: 2, target: NORTH_TRAP, when: { afterSec: 10 } },
        { wave: 12, upgrade: RIFT_SW },
        { wave: 13, upgrade: GATE },
      ],
    },
  },
  flagVariants: { spared_quiet_wave: [false, true] },
});
