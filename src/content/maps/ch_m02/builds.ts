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
/** The wall walk west of the east gate (lit). */
const MERGE_E_WALL: GridPos = [9, 3];
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
    // Eyes first: a Lookout in the crook of the merge, and the guns either side of it.
    ...raise(1, 'lookout', MERGE_E),
    ...raise(1, 'thumper', MERGE_W),
    ...raise(1, 'zapcoil', TOWER),
    { wave: 1, build: 'lookout', tile: YARD_IN },
    { wave: 2, upgrade: YARD_IN },
    { wave: 2, upgrade: YARD_IN },
    // Then the wall: a Lookout on the walk between the gates, a Skyhook beside it for the sky.
    ...raise(3, 'lookout', WALK_W),
    ...raise(4, 'skyhook', POCKET_W),
    ...raise(5, 'thumper', YARD_MID),
    { wave: 6, specialize: TOWER, spec: 'a' },
    ...raise(7, 'skyhook', YARD_E),
    ...raise(8, 'thumper', MERGE_E_WALL),
    ...raise(9, 'thumper', SOUTH_MID),
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
  parBuild: { loadout: ['lookout', 'zapcoil', 'thumper', 'skyhook'], steps: parSteps() },
  noCounterBuilds: {
    // No Lookout: Rivets in its place (they shoot what they can see, which is nothing).
    detection: {
      loadout: ['rivet', 'zapcoil', 'thumper', 'skyhook'],
      steps: swapped({ lookout: 'rivet' }),
    },
    // No Zapcoil chain, no Thumper: Prisms and Rivets in their place (no spec).
    splash: {
      loadout: ['lookout', 'prism', 'rivet', 'skyhook'],
      steps: swapped({ zapcoil: 'prism', thumper: 'rivet' }).filter((st) => !('specialize' in st)),
    },
    // Nothing that hits the sky: Thumpers for the Zapcoils, Sprinklers for the Skyhooks.
    air: {
      loadout: ['lookout', 'thumper', 'sprinkler'],
      steps: swapped({ zapcoil: 'thumper', skyhook: 'sprinkler' }),
    },
  },
});
