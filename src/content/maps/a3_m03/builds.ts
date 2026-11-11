// A3M3 balance-harness builds: docs/story/campaign/act3.md § A3M3, Par build. A Holdout is judged
// on Evacuated % against its 50% floor (balance/holdout.ts; maps.md § 6.4), outside the monotonic
// chain. The harness runs par through both doors (`flagVariants`: the convoy, the reference's first,
// and the warren), and every build ends by pressing the SEAL (its `scriptInput` step) as W14
// starts. Suppressing Fire goes on the choke as its cooldown allows.
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos, TowerId } from '../../types.ts';

/** Inside the switchback's bend: both of its runs. */
const BEND: GridPos = [8, 3];
/** The choke's north face, either side of the road. */
const CHOKE_W: GridPos = [8, 5];
const CHOKE_E: GridPos = [12, 5];
/** The rock behind Bricks, either side. */
const BEHIND_W: GridPos = [8, 7];
const BEHIND_E: GridPos = [12, 7];
/** Between each fork and the refugees' road. */
const FORK_W: GridPos = [6, 9];
const FORK_E: GridPos = [14, 9];
/** Under the fork, over the refugees' road. */
const MID: GridPos = [10, 10];
/** On each door's approach. */
const DOOR_W: GridPos = [5, 12];
const DOOR_E: GridPos = [15, 12];
/** Where Suppressing Fire goes: the choke, in front of Bricks. */
const CHOKE: GridPos = [10, 5];

/** The SEAL, pressed as W14 starts: every build's last step. */
const SEAL: BuildStep = { wave: 14, scriptInput: 'seal' };

/** Suppressing Fire on the choke, on the waves its cooldown allows. */
const suppress = (wave: number): BuildStep => ({
  wave,
  ability: 2,
  target: CHOKE,
  when: { afterSec: 8 },
});

function parSteps(): BuildStep[] {
  return [
    { wave: 1, build: 'thumper', tile: BEND },
    { wave: 1, upgrade: BEND },
    { wave: 1, build: 'burrow', tile: CHOKE_E },
    { wave: 1, build: 'mindspike', tile: BEHIND_E },
    { wave: 2, build: 'prism', tile: MID },
    { wave: 3, build: 'burrow', tile: CHOKE_W },
    { wave: 4, build: 'thumper', tile: FORK_E },
    suppress(5),
    { wave: 5, upgrade: MID },
    { wave: 6, upgrade: BEHIND_E },
    { wave: 7, upgrade: CHOKE_E },
    { wave: 7, upgrade: FORK_E },
    suppress(8),
    { wave: 8, upgrade: CHOKE_W },
    { wave: 9, upgrade: BEND },
    { wave: 9, build: 'prism', tile: BEHIND_W },
    suppress(10),
    { wave: 10, upgrade: MID },
    { wave: 11, upgrade: BEHIND_E },
    { wave: 11, build: 'thumper', tile: FORK_W },
    suppress(12),
    { wave: 12, upgrade: FORK_E },
    { wave: 13, upgrade: BEHIND_W },
    SEAL,
  ];
}

/** Par's placements and spending with each tower swapped by `swap` (a no-counter or alt build). */
function swapped(swap: Readonly<Partial<Record<TowerId, TowerId>>>): BuildStep[] {
  return parSteps().map((st) => {
    const to = 'build' in st ? swap[st.build] : undefined;
    return 'build' in st && to !== undefined ? { ...st, build: to } : st;
  });
}

export const builds = defineBuilds({
  // A3M3's reference profile (campaign.md § 4.9): A3M2's without the class its Clean Exit took (the
  // Rivet) and Orbital Strike, Seed Money 2, Head Start back on.
  referenceProfile: REFERENCE_PROFILES.a3_m03,
  parBuild: { loadout: ['burrow', 'mindspike', 'thumper', 'prism'], steps: parSteps() },
  noCounterBuilds: {
    // No burrowed answer: no Den, Underfoot, Bloom, Truthlight, or Dread (Mindspike, Thumper,
    // Prism, Harpoon: a Harpoon where each of par's Dens stands).
    burrowed: {
      loadout: ['mindspike', 'thumper', 'prism', 'harpoon'],
      steps: swapped({ burrow: 'harpoon' }),
    },
    // No air: nothing in reach of the Moths' lanes (Scuttle Den, Thumper, Sprinkler, Lookout: a
    // Sprinkler where each of par's Prisms stands, a Lookout for its Mindspike).
    air: {
      loadout: ['burrow', 'thumper', 'sprinkler', 'lookout'],
      steps: swapped({ prism: 'sprinkler', mindspike: 'lookout' }),
    },
    // No splash: no Thumper or Zapcoil (Scuttle Den, Mindspike, Prism, Harpoon: a Harpoon where
    // each of par's Thumpers stands).
    splash: {
      loadout: ['burrow', 'mindspike', 'prism', 'harpoon'],
      steps: swapped({ thumper: 'harpoon' }),
    },
  },
  altBuilds: {
    // Scuttle Den, Zapcoil, Skyhook, Lookout: Zapcoils for par's Thumpers and Prisms, a Skyhook
    // behind Bricks for the Moths, the Lookout home (nothing on the map is cloaked).
    coils: {
      loadout: ['burrow', 'zapcoil', 'skyhook', 'lookout'],
      steps: swapped({ thumper: 'zapcoil', prism: 'zapcoil', mindspike: 'skyhook' }),
    },
    // Scuttle Den, Prism, Harpoon, Zapcoil: no Everglow class at all (any A3M2 revocation leaves it
    // whole). Zapcoils for par's Thumpers, a Harpoon behind Bricks.
    no_everglow: {
      loadout: ['burrow', 'prism', 'harpoon', 'zapcoil'],
      steps: swapped({ thumper: 'zapcoil', mindspike: 'harpoon' }),
    },
  },
  flagVariants: { door_choice: ['convoy', 'warren'] },
});

