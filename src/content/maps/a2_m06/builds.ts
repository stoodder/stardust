// A2M6 balance-harness builds: docs/story/campaign/act2.md § A2M6, Par build (the step table there
// mirrors these). The Seeker Swarm alt and the Sunlance/Resonance probe run in balance/a2m6.test.ts
// (D137): the reference profile owns no Skyhook or Prism specs, so neither can be an `altBuilds`
// entry.
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos, ScriptedBuild } from '../../types.ts';

/** The wall walk between the gates (lit by its lamps). */
const WALK_W: GridPos = [8, 3];
/** The wall walk east of the east gate (lit). */
const WALL_E: GridPos = [13, 3];
/** The pocket inside the wall between the gates, beside the west gate's road in (lit). */
const POCKET_W: GridPos = [7, 4];
/** The old watchtower (high ground), just inside the wall at the merge. */
const TOWER: GridPos = [9, 6];
/** Either side of the merge, in the crook of each road in (within a Prism's light on the tower). */
const MERGE_W: GridPos = [7, 6];
const MERGE_E: GridPos = [10, 6];
/** The yard: inside its loop, under the watchtower, and by its east end. */
const YARD_MID: GridPos = [5, 8];
const YARD_IN: GridPos = [9, 8];
const YARD_E: GridPos = [12, 8];
/** South of the yard road. */
const SOUTH_W: GridPos = [6, 10];
const SOUTH_MID: GridPos = [10, 10];

/** The merge, where the Rift Moths' lane crosses the roads in. */
const MERGE: GridPos = [8, 5];
/** Ves'thara's Stillness on W9's Rift Moth flock as it crosses the merge. */
const STILL_W9: BuildStep = { wave: 9, ability: 2, target: MERGE, when: { afterSec: 16 } };
/** ...and on W14's, the biggest flock. */
const STILL_W14: BuildStep = { wave: 14, ability: 2, target: MERGE, when: { afterSec: 27 } };

function parSteps(): BuildStep[] {
  return [
    { wave: 1, build: 'thumper', tile: MERGE_W },
    { wave: 1, build: 'prism', tile: TOWER },
    { wave: 1, build: 'thumper', tile: YARD_MID },
    { wave: 1, build: 'thumper', tile: SOUTH_MID },
    { wave: 2, upgrade: MERGE_W },
    { wave: 3, upgrade: SOUTH_MID },
    { wave: 4, build: 'skyhook', tile: YARD_IN },
    { wave: 5, build: 'skyhook', tile: WALL_E },
    { wave: 5, upgrade: TOWER },
    { wave: 6, upgrade: YARD_IN },
    { wave: 6, upgrade: YARD_MID },
    { wave: 7, upgrade: WALL_E },
    { wave: 7, build: 'rivet', tile: POCKET_W },
    STILL_W9,
    { wave: 9, upgrade: TOWER },
    { wave: 9, upgrade: MERGE_W },
    { wave: 10, upgrade: YARD_IN },
    // The east wall's Skyhook stays at tier 2 (T560): par trims its air defence, so the last
    // flock costs it 6 in the dark.
    { wave: 10, upgrade: POCKET_W },
    { wave: 11, specialize: MERGE_W, spec: 'a' }, // Cluster Thumper
    { wave: 12, upgrade: SOUTH_MID },
  ];
}

const PAR_LOADOUT = ['prism', 'thumper', 'skyhook', 'rivet'] as const;

export const builds = defineBuilds({
  // A2M6's reference profile (campaign.md § 4.9): A2M5's, plus Ves'thara's Prism Spire (A2M5's
  // gift) and Reinforced Core 2.
  referenceProfile: REFERENCE_PROFILES.a2_m06,
  parBuild: { loadout: PAR_LOADOUT, steps: parSteps() },
  noCounterBuilds: {
    // No splash: no Thumper or Zapcoil (Prism, Rivet, Skyhook, Sprinkler). Par's yard with Rivets
    // where its Thumpers stand and a Sprinkler slowing the west road in.
    splash: {
      loadout: ['prism', 'rivet', 'skyhook', 'sprinkler'],
      steps: [
        { wave: 1, build: 'rivet', tile: MERGE_W },
        { wave: 1, build: 'prism', tile: TOWER },
        { wave: 1, build: 'rivet', tile: YARD_MID },
        { wave: 1, build: 'rivet', tile: SOUTH_MID },
        { wave: 2, upgrade: MERGE_W },
        { wave: 3, upgrade: SOUTH_MID },
        { wave: 4, build: 'skyhook', tile: YARD_IN },
        { wave: 5, build: 'skyhook', tile: WALL_E },
        { wave: 5, upgrade: TOWER },
        { wave: 6, upgrade: YARD_IN },
        { wave: 6, upgrade: YARD_MID },
        { wave: 7, upgrade: WALL_E },
        { wave: 7, build: 'sprinkler', tile: POCKET_W },
        STILL_W9,
        { wave: 9, upgrade: TOWER },
        { wave: 9, upgrade: MERGE_W },
      ],
    },
    // No air answer: Thumper (Cluster), Sprinkler (no Cloudburst), Lookout; nothing reaches the
    // air lane.
    air: {
      loadout: ['thumper', 'sprinkler', 'lookout'],
      steps: [
        { wave: 1, build: 'thumper', tile: MERGE_W },
        { wave: 1, build: 'sprinkler', tile: POCKET_W },
        { wave: 1, build: 'thumper', tile: YARD_MID },
        { wave: 2, build: 'lookout', tile: WALK_W },
        { wave: 3, upgrade: MERGE_W },
        { wave: 4, build: 'thumper', tile: MERGE_E },
        { wave: 5, upgrade: YARD_MID },
        { wave: 6, upgrade: MERGE_W },
        { wave: 7, upgrade: MERGE_E },
        { wave: 8, specialize: MERGE_W, spec: 'a' }, // Cluster Thumper
        { wave: 9, upgrade: YARD_MID },
      ],
    },
  },
  noCounterLoseByWave: 10,
  altBuilds: {
    // Zapcoil, Sprinkler, Skyhook, Thumper: no Prism. A Zapcoil on the watchtower beside a
    // Sprinkler at the merge (Conductive: Soaked Hollow take +25% Energy, the chain jumps twice
    // more) on the Fractures, par's Thumpers on their splits and the clusters, par's Skyhooks.
    coil_and_soak: {
      loadout: ['zapcoil', 'sprinkler', 'skyhook', 'thumper'],
      steps: [
        { wave: 1, build: 'thumper', tile: MERGE_W },
        { wave: 1, build: 'zapcoil', tile: TOWER },
        { wave: 1, build: 'sprinkler', tile: MERGE_E }, // Conductive with the watchtower's Zapcoil
        { wave: 1, build: 'thumper', tile: SOUTH_MID },
        { wave: 2, upgrade: MERGE_W },
        { wave: 3, upgrade: TOWER },
        { wave: 3, upgrade: SOUTH_MID },
        { wave: 4, build: 'skyhook', tile: YARD_IN },
        { wave: 4, upgrade: MERGE_E },
        { wave: 5, build: 'skyhook', tile: WALL_E },
        { wave: 5, upgrade: MERGE_E },
        { wave: 6, upgrade: YARD_IN },
        { wave: 6, upgrade: TOWER },
        { wave: 6, build: 'thumper', tile: YARD_MID },
        { wave: 7, upgrade: WALL_E },
        { wave: 7, upgrade: MERGE_W },
        { wave: 8, upgrade: YARD_MID },
        STILL_W9,
        { wave: 9, upgrade: SOUTH_MID },
        { wave: 10, upgrade: YARD_IN },
        { wave: 10, upgrade: WALL_E },
        { wave: 11, specialize: TOWER, spec: 'a' }, // Overload Coil
        { wave: 12, upgrade: YARD_MID },
        STILL_W14,
      ],
    },
    // Thumper, Sprinkler, Skyhook: no Prism and no Rivet. Four Thumpers on the roads in, the yard
    // and the domes, a Sprinkler slowing everything through the merge, par's Skyhooks.
    shells_and_slow: {
      loadout: ['thumper', 'sprinkler', 'skyhook'],
      steps: [
        { wave: 1, build: 'thumper', tile: MERGE_W },
        { wave: 1, build: 'sprinkler', tile: MERGE_E },
        { wave: 1, build: 'thumper', tile: YARD_MID },
        { wave: 1, build: 'thumper', tile: SOUTH_MID },
        { wave: 2, upgrade: MERGE_W },
        { wave: 3, build: 'skyhook', tile: YARD_IN },
        { wave: 4, build: 'skyhook', tile: WALL_E },
        { wave: 4, upgrade: YARD_IN },
        { wave: 5, upgrade: SOUTH_MID },
        { wave: 5, upgrade: WALL_E },
        { wave: 6, upgrade: YARD_MID },
        { wave: 6, upgrade: MERGE_E },
        { wave: 7, build: 'skyhook', tile: SOUTH_W },
        { wave: 7, upgrade: YARD_IN },
        STILL_W9,
        { wave: 9, upgrade: WALL_E },
        { wave: 9, upgrade: SOUTH_W },
        { wave: 10, upgrade: MERGE_W },
        { wave: 10, upgrade: SOUTH_W },
        { wave: 11, build: 'thumper', tile: YARD_E },
        { wave: 11, upgrade: MERGE_E },
        { wave: 12, specialize: MERGE_W, spec: 'a' }, // Cluster Thumper
        STILL_W14,
      ],
    },
  },
});

/**
 * The Seeker Swarm alt (D137; T501c): Skyhook (Seeker Swarm), Thumper, Zapcoil, Sprinkler. The
 * reference profile owns no Skyhook specs (campaign.md § 4.9), so it isn't an `altBuilds` entry:
 * balance/a2m6.test.ts runs it on the reference profile plus the Skyhook's specs.
 */
export const SEEKER_ALT: ScriptedBuild = {
  loadout: ['skyhook', 'thumper', 'zapcoil', 'sprinkler'],
  steps: [
    { wave: 1, build: 'thumper', tile: MERGE_W },
    { wave: 1, build: 'zapcoil', tile: TOWER },
    { wave: 1, build: 'thumper', tile: YARD_MID },
    { wave: 1, build: 'thumper', tile: SOUTH_MID },
    { wave: 2, build: 'sprinkler', tile: MERGE_E }, // Conductive with the watchtower's Zapcoil
    { wave: 2, upgrade: MERGE_W },
    { wave: 3, build: 'skyhook', tile: YARD_IN },
    { wave: 4, build: 'skyhook', tile: WALL_E },
    { wave: 4, upgrade: YARD_IN },
    { wave: 5, upgrade: TOWER },
    { wave: 5, upgrade: SOUTH_MID },
    { wave: 6, upgrade: YARD_IN },
    { wave: 6, upgrade: YARD_MID },
    { wave: 7, specialize: YARD_IN, spec: 'b' }, // Seeker Swarm
    STILL_W9,
    { wave: 9, upgrade: WALL_E },
    { wave: 9, upgrade: MERGE_E },
    { wave: 10, build: 'skyhook', tile: SOUTH_W },
    { wave: 10, upgrade: WALL_E },
    { wave: 11, upgrade: SOUTH_W },
    { wave: 11, upgrade: YARD_MID },
    { wave: 12, upgrade: SOUTH_W },
    { wave: 12, upgrade: MERGE_W },
    STILL_W14,
  ],
};

/**
 * The Sunlance/Resonance probe (T522; act2.md § A2M6): par with a Zapcoil beside the watchtower for
 * the Rivet (Resonance with the Prism) and the Prism specialized as a Sunlance (×10 ramp) for the
 * Thumper's Cluster. Its margin is reported, not banded: it must not trivialize the late surges.
 * The Hollow carry no shields, so Resonance adds nothing here, and a Sunlance spends its ramp on one
 * target at a time while the surges come as crowds. It runs on the reference profile plus the
 * Prism's specs (balance/a2m6.test.ts).
 */
export const SUNLANCE_PROBE: ScriptedBuild = {
  loadout: ['prism', 'thumper', 'skyhook', 'zapcoil'],
  steps: [
    { wave: 1, build: 'thumper', tile: MERGE_W },
    { wave: 1, build: 'prism', tile: TOWER },
    { wave: 1, build: 'thumper', tile: YARD_MID },
    { wave: 1, build: 'thumper', tile: SOUTH_MID },
    { wave: 2, upgrade: MERGE_W },
    { wave: 3, upgrade: SOUTH_MID },
    { wave: 4, build: 'skyhook', tile: YARD_IN },
    { wave: 5, build: 'skyhook', tile: WALL_E },
    { wave: 5, upgrade: TOWER },
    { wave: 6, upgrade: YARD_IN },
    { wave: 6, upgrade: YARD_MID },
    { wave: 7, upgrade: WALL_E },
    { wave: 7, build: 'zapcoil', tile: MERGE_E }, // Resonance with the Prism
    STILL_W9,
    { wave: 9, upgrade: TOWER },
    { wave: 9, upgrade: MERGE_W },
    { wave: 10, upgrade: YARD_IN },
    { wave: 10, upgrade: MERGE_E },
    { wave: 11, specialize: TOWER, spec: 'b' }, // Sunlance
    { wave: 12, upgrade: SOUTH_MID },
  ],
};
