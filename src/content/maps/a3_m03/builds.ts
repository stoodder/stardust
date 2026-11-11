// A3M3 balance-harness builds: docs/story/campaign/act3.md § A3M3, Par build. A Holdout is judged
// on Evacuated % against its 50% floor (balance/holdout.ts; maps.md § 6.4), outside the monotonic
// chain. The harness runs par through both doors (`flagVariants`: the convoy, the reference's first,
// and the warren), and every build ends by pressing the SEAL (its `scriptInput` step) as W14
// starts. Suppressing Fire goes where par loses people: the east rift's head as W4's Motes come in,
// the W8 cluster at the choke, and the first rift Undertows of W11 and W12.
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos, TowerId } from '../../types.ts';

/** Inside the switchback's bend: both of its runs. */
const BEND: GridPos = [8, 3];
/** East of the cut's top: the switchback's head and the Moths' crossing. */
const NORTH_E: GridPos = [12, 3];
/** The choke's north face, either side of the road. */
const CHOKE_W: GridPos = [8, 5];
const CHOKE_E: GridPos = [12, 5];
/** The rock behind Bricks, either side. */
const BEHIND_W: GridPos = [8, 7];
const BEHIND_E: GridPos = [12, 7];
/** Between each fork and the refugees' road: the fork, its rift's tail, and the road. */
const FORK_W: GridPos = [6, 9];
const FORK_E: GridPos = [14, 9];
/** Beside the east rift's long run down from the north edge. */
const RIFT_E: GridPos = [16, 3];
/** Under the fork, over the refugees' road. */
const MID: GridPos = [10, 10];
/** Where Suppressing Fire goes: the choke, in front of Bricks. */
const CHOKE: GridPos = [10, 5];

/** The SEAL, pressed as W14 starts: every build's last step. */
const SEAL: BuildStep = { wave: 14, scriptInput: 'seal' };

/** Where the doomed waves' first Undertows come down each rift. */
const RIFT_W_RUN: GridPos = [5, 5];
const RIFT_E_RUN: GridPos = [15, 6];
/** The east rift's head, where W4's Motes come in. */
const RIFT_E_HEAD: GridPos = [15, 3];

/** Suppressing Fire `afterSec` into `wave` on `target`: the choke, or a rift's run. */
const suppress = (wave: number, afterSec: number, target: GridPos = CHOKE): BuildStep => ({
  wave,
  ability: 2,
  target,
  when: { afterSec },
});

function parSteps(): BuildStep[] {
  return [
    { wave: 1, build: 'burrow', tile: CHOKE_E },
    { wave: 1, build: 'thumper', tile: BEND },
    { wave: 1, upgrade: BEND },
    { wave: 1, build: 'mindspike', tile: BEHIND_E },
    { wave: 1, build: 'thumper', tile: FORK_E },
    { wave: 2, build: 'prism', tile: MID },
    { wave: 3, build: 'burrow', tile: CHOKE_W },
    suppress(4, 14, RIFT_E_HEAD),
    { wave: 5, upgrade: CHOKE_E },
    { wave: 6, upgrade: MID },
    { wave: 7, upgrade: CHOKE_W },
    suppress(8, 15),
    { wave: 8, upgrade: BEHIND_E },
    { wave: 8, upgrade: FORK_E },
    { wave: 9, build: 'thumper', tile: FORK_W },
    suppress(11, 12, RIFT_W_RUN),
    { wave: 11, upgrade: BEND },
    suppress(12, 14, RIFT_E_RUN),
    { wave: 12, upgrade: FORK_W },
    { wave: 12, upgrade: CHOKE_E },
    SEAL,
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
  // A3M3's reference profile (campaign.md § 4.9): A3M2's without the class its Clean Exit took (the
  // Rivet) and Orbital Strike, Seed Money 2, Head Start back on.
  referenceProfile: REFERENCE_PROFILES.a3_m03,
  parBuild: { loadout: ['burrow', 'mindspike', 'thumper', 'prism'], steps: parSteps() },
  // Air and splash only: the Undertows are intel here (map.ts `softExempt`; the burrowed exam is
  // the finale's), so there is no no-burrowed build.
  noCounterBuilds: {
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
      steps: swapped({ thumper: 'mindspike' }),
    },
  },
  altBuilds: {
    // Scuttle Den, Zapcoil, Skyhook, Lookout: Zapcoils chaining the clusters in the switchback, at
    // the choke, behind Bricks, and beside the east rift; Dens on and behind the choke; Skyhooks
    // under the Moths' crossing. The Lookout stays home (nothing on the map is cloaked).
    coils: {
      loadout: ['burrow', 'zapcoil', 'skyhook', 'lookout'],
      steps: [
        { wave: 1, build: 'zapcoil', tile: BEND },
        { wave: 1, upgrade: BEND },
        { wave: 1, build: 'burrow', tile: CHOKE_E },
        { wave: 1, build: 'zapcoil', tile: CHOKE_W },
        { wave: 2, build: 'zapcoil', tile: BEHIND_E },
        { wave: 3, build: 'zapcoil', tile: RIFT_E },
        suppress(4, 14, RIFT_E_HEAD),
        { wave: 4, upgrade: CHOKE_E },
        { wave: 5, upgrade: CHOKE_W },
        { wave: 6, build: 'skyhook', tile: MID },
        { wave: 7, build: 'burrow', tile: BEHIND_W },
        { wave: 7, upgrade: BEHIND_E },
        suppress(8, 15),
        { wave: 8, upgrade: MID },
        { wave: 8, build: 'skyhook', tile: NORTH_E },
        { wave: 9, upgrade: CHOKE_W },
        suppress(11, 12, RIFT_W_RUN),
        suppress(12, 14, RIFT_E_RUN),
        { wave: 12, specialize: CHOKE_W, spec: 'a' },
        { wave: 12, upgrade: CHOKE_E },
        SEAL,
      ],
    },
    // Scuttle Den, Prism, Harpoon, Zapcoil: no Everglow class at all, so any A3M2 revocation
    // leaves it whole. Zapcoils on the clusters, a Prism behind Bricks, Dens on and behind the
    // choke, a Harpoon under the Moths' crossing.
    no_everglow: {
      loadout: ['burrow', 'prism', 'harpoon', 'zapcoil'],
      steps: [
        { wave: 1, build: 'zapcoil', tile: BEND },
        { wave: 1, upgrade: BEND },
        { wave: 1, build: 'burrow', tile: CHOKE_E },
        { wave: 1, build: 'prism', tile: BEHIND_E },
        { wave: 2, build: 'zapcoil', tile: CHOKE_W },
        { wave: 3, build: 'harpoon', tile: MID },
        suppress(4, 14, RIFT_E_HEAD),
        { wave: 5, upgrade: BEHIND_E },
        { wave: 6, build: 'zapcoil', tile: RIFT_E },
        { wave: 7, build: 'burrow', tile: BEHIND_W },
        { wave: 7, upgrade: CHOKE_E },
        suppress(8, 15),
        { wave: 8, upgrade: CHOKE_W },
        { wave: 8, upgrade: BEND },
        { wave: 9, upgrade: CHOKE_W },
        suppress(11, 12, RIFT_W_RUN),
        suppress(12, 14, RIFT_E_RUN),
        { wave: 12, specialize: CHOKE_W, spec: 'a' },
        { wave: 12, upgrade: MID },
        SEAL,
      ],
    },
  },
  flagVariants: { door_choice: ['convoy', 'warren'] },
});
