// CH_M02 balance-harness builds (Lights Out; T862). The reference profile is the campaign's end
// (FIN's row, campaign.md § 4.9): its one detector is the Lookout Shack (tuned to rank 3 by
// Zibzab's crate), so par sees with two Lookouts at the merge and the yard, and shoots with what
// Sundown taught: Thumpers for the crowds, a Prism on the watchtower (its beam pushes the dark
// back), a Skyhook for the sky.
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos, TowerId } from '../../types.ts';

// A2M6's pads.
/** The wall walk between the gates (lit by its lamps). */
const WALK_W: GridPos = [8, 3];
/** The wall walk east of the east gate (lit). */
const WALL_E: GridPos = [13, 3];
/** The pocket inside the wall between the gates, beside the west gate's road in (lit). */
const POCKET_W: GridPos = [7, 4];
/** The old watchtower (high ground), just inside the wall at the merge. */
const TOWER: GridPos = [9, 6];
/** Either side of the merge. */
const MERGE_W: GridPos = [7, 6];
const MERGE_E: GridPos = [10, 6];
/** The yard: inside its loop, under the watchtower, and by its east end. */
const YARD_MID: GridPos = [5, 8];
const YARD_IN: GridPos = [9, 8];
const YARD_E: GridPos = [12, 8];
/** South of the yard road. */
const SOUTH_MID: GridPos = [10, 10];

/** Build `tower` at `tile`, then take it to tier 3. */
const raise = (wave: number, tower: TowerId, tile: GridPos): BuildStep[] => [
  { wave, build: tower, tile },
  { wave, upgrade: tile },
  { wave, upgrade: tile },
];

function parSteps(): BuildStep[] {
  return [
    // Eyes first: two Lookouts either side of the watchtower, where both roads meet the yard
    // road, then the guns between them.
    ...raise(1, 'lookout', MERGE_E),
    { wave: 1, build: 'zapcoil', tile: TOWER },
    { wave: 1, build: 'lookout', tile: YARD_IN },
    { wave: 1, upgrade: TOWER },
    { wave: 1, build: 'thumper', tile: MERGE_W },
    { wave: 2, upgrade: YARD_IN },
    { wave: 2, upgrade: YARD_IN },
    { wave: 3, upgrade: TOWER },
    { wave: 3, upgrade: MERGE_W },
    { wave: 4, build: 'prism', tile: YARD_E },
    { wave: 5, upgrade: YARD_E },
    { wave: 5, upgrade: MERGE_W },
    ...raise(6, 'zapcoil', SOUTH_MID),
    { wave: 7, specialize: TOWER, spec: 'a' },
    { wave: 8, upgrade: YARD_E },
    ...raise(9, 'thumper', YARD_MID),
    { wave: 10, specialize: MERGE_W, spec: 'a' },
    ...raise(11, 'lookout', POCKET_W),
    ...raise(12, 'zapcoil', WALK_W),
    { wave: 13, build: 'lookout', tile: WALL_E },
  ];
}

/** Par's placements and spending with each tower swapped by `swap` (a no-counter build). */
function swapped(swap: Readonly<Partial<Record<TowerId, TowerId>>>): BuildStep[] {
  return parSteps().flatMap((st): BuildStep[] => {
    if (!('build' in st)) return [st];
    const to = swap[st.build];
    return to === undefined ? [st] : [{ ...st, build: to }];
  });
}

export const builds = defineBuilds({
  referenceProfile: REFERENCE_PROFILES.fin_m01,
  // The challenge maps' band (T862): post-game, judged in 50–70, outside the campaign's curve.
  marginBand: { minPct: 50, maxPct: 70 },
  parBuild: { loadout: ['lookout', 'zapcoil', 'thumper', 'prism'], steps: parSteps() },
  noCounterBuilds: {
    // No Lookout: Rivets in its place (they shoot what they can see, which is nothing).
    detection: {
      loadout: ['rivet', 'zapcoil', 'thumper', 'prism'],
      steps: swapped({ lookout: 'rivet' }),
    },
    // No Zapcoil chain, no Thumper: Rivets and Harpoons in their place.
    splash: {
      loadout: ['lookout', 'rivet', 'harpoon', 'prism'],
      steps: swapped({ zapcoil: 'rivet', thumper: 'harpoon' }),
    },
    // Nothing that hits the sky: Thumpers for the Zapcoils, a Sprinkler for the Prism.
    air: {
      loadout: ['lookout', 'thumper', 'sprinkler'],
      steps: swapped({ zapcoil: 'thumper', prism: 'sprinkler' }),
    },
  },
});
