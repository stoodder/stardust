// A2M1 balance-harness builds: docs/story/campaign/act2.md § A2M1, Par build (the step table there
// mirrors these). No build uses the pads at (3,4) inside the Spires road's first bend or (4,7) by
// row 6's west run: a player who wants to meet the Motes before they catch the runners builds there.
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos } from '../../types.ts';
import { CUT_DELAY, OPEN } from './waves.ts';

/** The west canyon ledge, over the Spires road's first bend. */
const LEDGE_W: GridPos = [4, 2];
/** The east canyon ledge, between the bore road's drop and the yard cut. */
const LEDGE_E: GridPos = [13, 4];
/** The stardust conduit (power node), beside the merged road just south of the merge. */
const NODE: GridPos = [9, 7];
/** Between the Spires road's drop and the merge. */
const MID_W: GridPos = [6, 4];
/** Just north of the merge, over row 6. */
const MERGE_N: GridPos = [7, 5];
/** Between the roads, over row 6's east run. */
const MID_E: GridPos = [10, 5];
/** Inside the bore road's bend, west of its drop. */
const BEND_E: GridPos = [11, 4];
/** South-west of the merge, beside the merged road. */
const MERGE_SW: GridPos = [7, 7];
/** The rig yard, inside the merged road's bend. */
const YARD: GridPos = [9, 9];
/** Beside the lift road's last stretch, two tiles from the yard cut's fence run. */
const LIFT: GridPos = [12, 9];
/** Beside the yard cut, west of it. */
const CUT_E: GridPos = [14, 8];
/** The crew-log rigs (wreckage over pads). */
const LOG_BORE: GridPos = [13, 5];
const LOG_YARD: GridPos = [10, 10];
/** Strike points: the merge, the bore road's drop, and the yard cut. */
const MERGE: GridPos = [8, 6];
const BORE_DROP: GridPos = [12, 5];
const CUT: GridPos = [15, 8];

function parSteps(): BuildStep[] {
  return [
    { wave: 1, build: 'rivet', tile: LEDGE_W },
    { wave: 1, build: 'thumper', tile: NODE },
    { wave: 1, build: 'sprinkler', tile: MERGE_SW },
    { wave: 1, clear: LOG_BORE },
    { wave: 1, clear: LOG_YARD },
    { wave: 2, build: 'thumper', tile: MERGE_N },
    { wave: 3, build: 'zapcoil', tile: MID_E },
    { wave: 4, upgrade: NODE },
    { wave: 4, upgrade: MERGE_N },
    { wave: 5, upgrade: MID_E },
    { wave: 5, upgrade: LEDGE_W },
    { wave: 6, ability: 1, target: BORE_DROP, when: { afterSec: OPEN + 3 } },
    // W8's preview shows the yard cut: cover it.
    { wave: 8, build: 'zapcoil', tile: CUT_E },
    { wave: 8, build: 'rivet', tile: LEDGE_E },
    { wave: 8, ability: 1, target: CUT, when: { afterSec: OPEN + 16 } },
    { wave: 9, upgrade: CUT_E },
    { wave: 9, upgrade: LEDGE_E },
    { wave: 9, ability: 1, target: CUT, when: { afterSec: OPEN + 16 } },
    { wave: 9, ability: 2, target: MERGE, when: { afterSec: OPEN + 16 } },
    { wave: 10, upgrade: CUT_E },
    { wave: 10, upgrade: NODE },
    { wave: 10, ability: 1, target: CUT, when: { afterSec: OPEN + CUT_DELAY + 4.6 } },
  ];
}

const PAR_STEPS = parSteps();
const PAR_LOADOUT = ['rivet', 'thumper', 'sprinkler', 'zapcoil'] as const;

export const builds = defineBuilds({
  // A2M1's reference profile (campaign.md § 4.9): A1M5's, plus the Lookout Shack's license.
  referenceProfile: REFERENCE_PROFILES.a2_m01,
  // The first map after Act I's boss: judged against Act II's band, and the chain restarts here.
  rebaseline: true,
  parBuild: { loadout: PAR_LOADOUT, steps: PAR_STEPS },
  noCounterBuilds: {
    // No splash answer: Rivets, a Sprinkler, a Skyhook, and a Lookout (no Thumper or Zapcoil).
    splash: {
      loadout: ['rivet', 'sprinkler', 'skyhook', 'lookout'],
      steps: [
        { wave: 1, build: 'rivet', tile: LEDGE_W },
        { wave: 1, build: 'rivet', tile: NODE },
        { wave: 1, build: 'sprinkler', tile: MERGE_SW },
        { wave: 1, clear: LOG_BORE },
        { wave: 1, clear: LOG_YARD },
        { wave: 2, build: 'rivet', tile: MERGE_N },
        { wave: 3, build: 'rivet', tile: MID_E },
        { wave: 3, build: 'lookout', tile: MID_W },
        { wave: 4, upgrade: NODE },
        { wave: 4, upgrade: MERGE_N },
        { wave: 5, upgrade: MID_E },
        { wave: 5, upgrade: LEDGE_W },
        { wave: 6, build: 'rivet', tile: BEND_E },
        { wave: 6, ability: 1, target: BORE_DROP, when: { afterSec: OPEN + 3 } },
        { wave: 7, upgrade: NODE },
        { wave: 7, upgrade: MERGE_N },
        { wave: 7, build: 'skyhook', tile: YARD },
      ],
    },
  },
  // The splash test is W6's clusters, so the no-splash build must lose by W7 (act2.md § A2M1).
  noCounterLoseByWave: 7,
  altBuilds: {
    // Thumper, Zapcoil, Skyhook, Lookout.
    shell_and_scope: {
      loadout: ['thumper', 'zapcoil', 'skyhook', 'lookout'],
      steps: [
        { wave: 1, build: 'thumper', tile: NODE },
        { wave: 1, build: 'zapcoil', tile: MERGE_N },
        { wave: 1, clear: LOG_BORE },
        { wave: 1, clear: LOG_YARD },
        { wave: 2, build: 'lookout', tile: MERGE_SW },
        { wave: 3, build: 'thumper', tile: MID_W },
        { wave: 4, upgrade: NODE },
        { wave: 4, upgrade: MERGE_N },
        { wave: 5, build: 'zapcoil', tile: MID_E },
        { wave: 6, upgrade: MID_W },
        { wave: 6, ability: 1, target: BORE_DROP, when: { afterSec: OPEN + 3 } },
        { wave: 7, upgrade: MID_E },
        { wave: 7, upgrade: NODE },
        { wave: 8, build: 'zapcoil', tile: CUT_E },
        { wave: 8, build: 'zapcoil', tile: LEDGE_E },
        { wave: 8, ability: 1, target: CUT, when: { afterSec: OPEN + 16 } },
        { wave: 9, upgrade: CUT_E },
        { wave: 9, upgrade: LEDGE_E },
        { wave: 9, build: 'skyhook', tile: YARD },
        { wave: 9, ability: 1, target: CUT, when: { afterSec: OPEN + 16 } },
        { wave: 9, ability: 2, target: MERGE, when: { afterSec: OPEN + 16 } },
        { wave: 10, upgrade: CUT_E },
        { wave: 10, build: 'thumper', tile: LIFT },
        { wave: 10, ability: 1, target: CUT, when: { afterSec: OPEN + CUT_DELAY + 4.6 } },
      ],
    },
    // Thumper, Rivet, Skyhook, Lookout.
    shell_and_rivet: {
      loadout: ['thumper', 'rivet', 'skyhook', 'lookout'],
      steps: [
        { wave: 1, build: 'rivet', tile: LEDGE_W },
        { wave: 1, build: 'thumper', tile: NODE },
        { wave: 1, clear: LOG_BORE },
        { wave: 1, clear: LOG_YARD },
        { wave: 2, build: 'thumper', tile: MERGE_N },
        { wave: 3, build: 'lookout', tile: MERGE_SW },
        { wave: 4, upgrade: NODE },
        { wave: 4, upgrade: MERGE_N },
        { wave: 5, build: 'thumper', tile: MID_E },
        { wave: 6, upgrade: LEDGE_W },
        { wave: 6, ability: 1, target: BORE_DROP, when: { afterSec: OPEN + 3 } },
        { wave: 7, upgrade: MID_E },
        { wave: 7, upgrade: NODE },
        { wave: 8, build: 'thumper', tile: CUT_E },
        { wave: 8, targeting: CUT_E, mode: 'close' }, // the cut, not the merged road
        { wave: 8, build: 'rivet', tile: LEDGE_E },
        { wave: 8, ability: 1, target: CUT, when: { afterSec: OPEN + 16 } },
        { wave: 9, upgrade: CUT_E },
        { wave: 9, upgrade: LEDGE_E },
        { wave: 9, build: 'skyhook', tile: YARD },
        { wave: 9, ability: 1, target: CUT, when: { afterSec: OPEN + 16 } },
        { wave: 9, ability: 2, target: MERGE, when: { afterSec: OPEN + 16 } },
        { wave: 10, ability: 1, target: CUT, when: { afterSec: OPEN + CUT_DELAY + 4.6 } },
        { wave: 10, upgrade: CUT_E },
        { wave: 10, build: 'rivet', tile: LIFT },
        { wave: 10, upgrade: LIFT },
      ],
    },
  },
  // Hiccup Contained (D113): par's merge kills every Mote that hushed a runner on the Spires road,
  // so none reaches the lift Heavy; its leaks are plain Motes down the yard cut (T460).
  parMedals: ['challenge'],
});
