// A2M2 balance-harness builds: docs/story/campaign/act2.md § A2M2, Par build (the step table there
// mirrors these).
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos } from '../../types.ts';
import { OPEN, WITCH_DELAY } from './waves.ts';

/** Par's first Time Dilation in W11, on the rush down the road as the Witch steps out. */
const TD_FIRST = OPEN + 2;
/** The gap to par's second: inside [51, 60) s, so only QUILL's Rapport (51 s) has it ready. */
const TD_GAP = 52;

/** The west thread-glass outcrop (high ground), in the fork's pocket: the fork and both roads. */
const FORK_HG: GridPos = [5, 3];
/** The stardust conduit (power node), over the main road's drop and its east run. */
const NODE: GridPos = [5, 5];
/** Between the outcrop and the conduit, beside the main road's drop. */
const POCKET: GridPos = [4, 4];
/** Inside the main road's south bend. */
const BEND: GridPos = [6, 8];
/** By the relay. */
const RELAY: GridPos = [4, 10];
/** The branch's ledge, between its ledge run and its back run (the outcrop in the middle). */
const LEDGE_W: GridPos = [12, 3];
const OUTCROP: GridPos = [13, 3];
const LEDGE_E: GridPos = [14, 3];
/** The rig pocket, between the branch's back run and its last run to the rigs. */
const RIG_W: GridPos = [10, 6];
const RIG_C: GridPos = [11, 6];
const RIG_E: GridPos = [12, 6];
const RIG_END: GridPos = [13, 6];
/** Beside the branch's last drop, the rigs' doorstep. */
const TAIL: GridPos = [16, 11];
/** The strike point: the branch's hairpin, where she turns back for the rigs. */
const HAIRPIN: GridPos = [10, 5];

function parSteps(): BuildStep[] {
  return [
    { wave: 1, build: 'thumper', tile: NODE },
    { wave: 1, build: 'rivet', tile: POCKET }, // Crossfire with the node's Thumper
    { wave: 1, build: 'zapcoil', tile: LEDGE_W },
    { wave: 1, build: 'sprinkler', tile: OUTCROP }, // Conductive with the Zapcoil
    { wave: 2, upgrade: NODE },
    { wave: 3, build: 'zapcoil', tile: LEDGE_E }, // Conductive too
    { wave: 4, upgrade: LEDGE_W },
    { wave: 5, build: 'thumper', tile: BEND },
    { wave: 5, upgrade: LEDGE_E },
    { wave: 6, upgrade: OUTCROP },
    { wave: 6, upgrade: OUTCROP }, // T3: Soaked
    { wave: 6, upgrade: BEND },
    { wave: 7, upgrade: LEDGE_W },
    { wave: 7, upgrade: LEDGE_E },
    { wave: 8, build: 'zapcoil', tile: RIG_END },
    { wave: 8, upgrade: POCKET },
    { wave: 9, upgrade: RIG_END },
    { wave: 9, upgrade: RIG_END },
    { wave: 10, specialize: OUTCROP, spec: 'b' }, // Cloudburst
    { wave: 10, build: 'rivet', tile: RIG_C },
    // The first Time Dilation slows the rush down the road as she steps out; the strike waits for
    // her second phase at the hairpin; the second Time Dilation is ready 51 s after the first only
    // with QUILL's Rapport (60 s without), for the surge and her second phase.
    { wave: 11, ability: 2, when: { afterSec: TD_FIRST } },
    { wave: 11, upgrade: RIG_C },
    { wave: 11, build: 'rivet', tile: TAIL },
    { wave: 11, ability: 1, target: HAIRPIN, when: { afterSec: WITCH_DELAY + 54 } },
    { wave: 11, ability: 2, when: { afterSec: TD_FIRST + TD_GAP } },
  ];
}

const PAR_STEPS = parSteps();
const PAR_LOADOUT = ['zapcoil', 'sprinkler', 'thumper', 'rivet'] as const;

export const builds = defineBuilds({
  // A2M2's reference profile (campaign.md § 4.9): A2M1's, plus the Sprinkler's specs, Seed Money 1
  // and Zapcoil tune 1.
  referenceProfile: REFERENCE_PROFILES.a2_m02,
  parBuild: { loadout: PAR_LOADOUT, steps: PAR_STEPS },
  noCounterBuilds: {
    // No shield answer: no Energy and no Soaked (Thumper, Rivet, Skyhook, Lookout).
    shield: {
      loadout: ['thumper', 'rivet', 'skyhook', 'lookout'],
      steps: [
        { wave: 1, build: 'thumper', tile: NODE },
        { wave: 1, build: 'rivet', tile: FORK_HG },
        { wave: 1, build: 'rivet', tile: RIG_W },
        { wave: 2, build: 'rivet', tile: RIG_E },
        { wave: 3, build: 'lookout', tile: RIG_C },
        { wave: 4, upgrade: NODE },
        { wave: 4, upgrade: RIG_W },
        { wave: 5, upgrade: RIG_E },
        { wave: 5, build: 'thumper', tile: OUTCROP },
        { wave: 6, build: 'thumper', tile: BEND },
        { wave: 6, upgrade: OUTCROP },
        { wave: 7, upgrade: RIG_W },
        { wave: 7, upgrade: RIG_E },
        { wave: 7, build: 'skyhook', tile: RELAY },
      ],
    },
    // No splash answer: Rivets into a Soaking Sprinkler's shields on the branch, Rivets on the
    // road, a Skyhook, and a Lookout (no Thumper or Zapcoil). It holds the rigs and drowns in the
    // clusters.
    splash: {
      loadout: ['rivet', 'sprinkler', 'skyhook', 'lookout'],
      steps: [
        { wave: 1, build: 'rivet', tile: NODE },
        { wave: 1, build: 'sprinkler', tile: OUTCROP },
        { wave: 1, build: 'rivet', tile: LEDGE_W },
        { wave: 1, build: 'rivet', tile: POCKET },
        { wave: 2, upgrade: OUTCROP },
        { wave: 2, upgrade: OUTCROP }, // T3: Soaked
        { wave: 3, build: 'rivet', tile: LEDGE_E },
        { wave: 3, upgrade: NODE },
        { wave: 4, upgrade: LEDGE_W },
        { wave: 4, upgrade: LEDGE_E },
        { wave: 4, build: 'rivet', tile: BEND },
        { wave: 5, upgrade: POCKET },
        { wave: 5, upgrade: BEND },
        { wave: 5, build: 'lookout', tile: FORK_HG },
        { wave: 6, upgrade: NODE },
        { wave: 6, upgrade: LEDGE_W },
        { wave: 7, upgrade: LEDGE_E },
        { wave: 7, upgrade: BEND },
        { wave: 7, build: 'skyhook', tile: RELAY },
      ],
    },
  },
  // Both tests come to a head in W8 (mixed, both routes): the full-catalog no-shield run, its
  // asset unguarded by the core's protocols, outlasts W7's Glimmer column by one wave.
  noCounterLoseByWave: 8,
  altBuilds: {
    // Zapcoil, Thumper, Skyhook, Lookout: Thumpers hold the road, a Zapcoil pair strips the
    // branch's shields, and a Bunker Buster on the outcrop answers her.
    shell_and_coil: {
      loadout: ['zapcoil', 'thumper', 'skyhook', 'lookout'],
      steps: [
        { wave: 1, build: 'thumper', tile: NODE },
        { wave: 1, build: 'zapcoil', tile: LEDGE_W },
        { wave: 1, build: 'zapcoil', tile: LEDGE_E },
        { wave: 2, upgrade: NODE },
        { wave: 3, upgrade: LEDGE_W },
        { wave: 4, build: 'thumper', tile: BEND },
        { wave: 4, upgrade: LEDGE_E },
        { wave: 5, upgrade: BEND },
        { wave: 5, build: 'thumper', tile: OUTCROP },
        { wave: 6, upgrade: LEDGE_W },
        { wave: 6, upgrade: OUTCROP },
        { wave: 7, upgrade: LEDGE_E },
        { wave: 7, build: 'lookout', tile: POCKET },
        { wave: 8, upgrade: OUTCROP },
        { wave: 8, build: 'zapcoil', tile: RIG_END },
        { wave: 9, upgrade: RIG_END },
        { wave: 9, specialize: OUTCROP, spec: 'b' }, // Bunker Buster
        { wave: 10, upgrade: RIG_END },
        { wave: 11, ability: 2, when: { afterSec: TD_FIRST } },
        { wave: 11, ability: 1, target: HAIRPIN, when: { afterSec: WITCH_DELAY + 54 } },
        { wave: 11, ability: 2, when: { afterSec: TD_FIRST + TD_GAP } },
      ],
    },
    // Sprinkler (Soaked), Thumper, Skyhook, Lookout: Explosive into Soaked shields (a Bunker Buster
    // over the switchback for her), the Thumpers' shells for the clusters.
    soak_and_shell: {
      loadout: ['sprinkler', 'thumper', 'skyhook', 'lookout'],
      steps: [
        { wave: 1, build: 'thumper', tile: NODE },
        { wave: 1, build: 'sprinkler', tile: OUTCROP },
        { wave: 1, build: 'thumper', tile: LEDGE_W },
        { wave: 2, upgrade: OUTCROP },
        { wave: 3, upgrade: OUTCROP }, // T3: Soaked
        { wave: 3, upgrade: NODE },
        { wave: 4, build: 'thumper', tile: LEDGE_E },
        { wave: 4, upgrade: LEDGE_W },
        { wave: 5, build: 'thumper', tile: BEND },
        { wave: 5, upgrade: LEDGE_E },
        { wave: 6, upgrade: BEND },
        { wave: 6, build: 'lookout', tile: POCKET },
        { wave: 7, upgrade: LEDGE_W },
        { wave: 7, upgrade: LEDGE_E },
        { wave: 8, build: 'sprinkler', tile: RIG_C },
        { wave: 8, build: 'thumper', tile: RIG_END },
        { wave: 9, upgrade: RIG_C },
        { wave: 9, upgrade: RIG_C },
        { wave: 9, upgrade: RIG_END },
        { wave: 10, specialize: LEDGE_E, spec: 'b' }, // Bunker Buster
        { wave: 11, ability: 2, when: { afterSec: TD_FIRST } },
        { wave: 11, ability: 1, target: HAIRPIN, when: { afterSec: WITCH_DELAY + 54 } },
        { wave: 11, ability: 2, when: { afterSec: TD_FIRST + TD_GAP } },
      ],
    },
  },
  // The spawn cue reads C1 (the variant line): a cue changes nothing in the sim, but the harness
  // runs par under it all the same.
  flagVariants: { spared_quiet_wave: [true] },
  // Par drives her off before her third blink on every seed (with its casts; without them she
  // reaches the rigs).
  parMedals: ['challenge'],
  // T401: QUILL's Rapport (Time Dilation 60 s → 51 s) changes a par result here.
  rndPickChanges: ['rapport_quill'],
});
