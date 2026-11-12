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
    // Eyes first: a Lookout in the crook of the merge, then the guns round it.
    { wave: 1, build: 'lookout', tile: MERGE_E },
    { wave: 1, build: 'thumper', tile: MERGE_W },
    { wave: 1, build: 'prism', tile: TOWER },
    { wave: 1, upgrade: MERGE_E },
    { wave: 2, build: 'lookout', tile: YARD_IN },
    { wave: 2, build: 'thumper', tile: YARD_MID },
    { wave: 3, upgrade: MERGE_W },
    { wave: 3, upgrade: YARD_IN },
    { wave: 4, build: 'skyhook', tile: YARD_E },
    { wave: 4, upgrade: TOWER },
    { wave: 5, upgrade: MERGE_E },
    { wave: 5, upgrade: YARD_MID },
    { wave: 6, upgrade: YARD_E },
    { wave: 6, upgrade: YARD_IN },
    { wave: 7, build: 'thumper', tile: SOUTH_MID },
    { wave: 7, upgrade: MERGE_W },
    { wave: 8, upgrade: TOWER },
    { wave: 8, upgrade: SOUTH_MID },
    ...raise(9, 'skyhook', POCKET_W),
    { wave: 10, upgrade: YARD_E },
    { wave: 10, upgrade: YARD_MID },
    { wave: 11, specialize: MERGE_W, spec: 'a' },
    ...raise(12, 'thumper', WALK_W),
    { wave: 13, upgrade: SOUTH_MID },
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
  parBuild: { loadout: ['lookout', 'thumper', 'prism', 'skyhook'], steps: parSteps() },
  noCounterBuilds: {
    // No Lookout: Rivets in its place (they shoot what they can see, which is nothing).
    detection: {
      loadout: ['rivet', 'thumper', 'prism', 'skyhook'],
      steps: swapped({ lookout: 'rivet' }),
    },
    // No Thumper: Rivets in its place.
    splash: {
      loadout: ['lookout', 'rivet', 'prism', 'skyhook'],
      steps: swapped({ thumper: 'rivet' }),
    },
    // Nothing that hits the sky: Sprinklers for the Skyhooks, Thumpers for the Prism.
    air: {
      loadout: ['lookout', 'thumper', 'sprinkler'],
      steps: swapped({ skyhook: 'sprinkler', prism: 'thumper' }),
    },
  },
});
