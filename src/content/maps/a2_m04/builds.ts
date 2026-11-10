// A2M4 balance-harness builds: docs/story/campaign/act2.md § A2M4, Par build (the step table there
// mirrors these). The Crane alt runs in balance/a2m4.test.ts (D137): the reference profile never
// owns the Crane, so it can't be an `altBuilds` entry.
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos, ScriptedBuild } from '../../types.ts';

/** The yard entrance, inside the road's turn down into the intake yard. */
const YARD_N: GridPos = [4, 3];
/** Below it, beside the road's run west round Intake B. */
const YARD_S: GridPos = [4, 4];
/** West of the road's drop past Intake B. */
const INTAKE_W: GridPos = [0, 6];
/** The intake hoppers (wreckage over pads), beside Intake B. */
const HOPPER_N: GridPos = [3, 6];
const HOPPER_S: GridPos = [3, 7];
/** The east catwalk, beside the vats' drain hatch (high ground). */
const CATWALK_E: GridPos = [10, 7];
/** Beside the vats' east end, over the road's turn down. */
const VAT_E: GridPos = [12, 7];
/** Under the road's run east, below the yard's exit and mid-way along. */
const ROW9_W: GridPos = [4, 9];
const ROW9_MID: GridPos = [7, 9];
/** Inside the road's last bend, beside the conduit. */
const BEND: GridPos = [10, 9];
/** The conduit (power node), inside the road's last bend. */
const CONDUIT: GridPos = [11, 9];
/** Beside the control core. */
const CORE_W: GridPos = [8, 10];

function parSteps(): BuildStep[] {
  return [
    { wave: 1, build: 'zapcoil', tile: YARD_S },
    { wave: 1, build: 'sprinkler', tile: YARD_N }, // Conductive at the yard's entrance
    { wave: 1, build: 'zapcoil', tile: CATWALK_E },
    { wave: 1, clear: HOPPER_N },
    { wave: 1, clear: HOPPER_S },
    { wave: 2, build: 'lookout', tile: HOPPER_N },
    { wave: 2, build: 'rivet', tile: HOPPER_S }, // Overwatch with the Lookout
    { wave: 3, upgrade: YARD_S },
    { wave: 4, build: 'zapcoil', tile: INTAKE_W },
    { wave: 5, upgrade: HOPPER_N },
    { wave: 5, upgrade: HOPPER_S },
    { wave: 6, build: 'rivet', tile: CORE_W },
    { wave: 6, build: 'zapcoil', tile: BEND },
    { wave: 7, upgrade: CATWALK_E },
    { wave: 8, upgrade: CATWALK_E },
    { wave: 8, upgrade: YARD_S },
    { wave: 8, upgrade: CORE_W },
    { wave: 9, specialize: CATWALK_E, spec: 'a' }, // Overload Coil
    { wave: 10, upgrade: BEND },
    { wave: 10, upgrade: HOPPER_N },
    { wave: 11, upgrade: INTAKE_W },
    { wave: 12, build: 'zapcoil', tile: VAT_E },
  ];
}

const PAR_STEPS = parSteps();
const PAR_LOADOUT = ['lookout', 'rivet', 'zapcoil', 'sprinkler'] as const;

export const builds = defineBuilds({
  // A2M4's reference profile (campaign.md § 4.9): A2M3's, plus Zapcoil specs and the Zapcoil and
  // Rivet tune 2.
  referenceProfile: REFERENCE_PROFILES.a2_m04,
  parBuild: { loadout: PAR_LOADOUT, steps: PAR_STEPS },
  noCounterBuilds: {
    // No detection: no Lookout, and no Scanner Sweep (slot 1 is the profile's Orbital Strike, never
    // cast). The same kill zone in the intake yard, blind: the Veilwalkers walk through it.
    detection: {
      loadout: ['rivet', 'zapcoil', 'sprinkler', 'thumper'],
      steps: [
        { wave: 1, build: 'zapcoil', tile: YARD_S },
        { wave: 1, build: 'sprinkler', tile: YARD_N },
        { wave: 1, build: 'zapcoil', tile: CATWALK_E },
        { wave: 1, clear: HOPPER_N },
        { wave: 1, clear: HOPPER_S },
        { wave: 2, build: 'rivet', tile: HOPPER_N },
        { wave: 2, build: 'thumper', tile: HOPPER_S },
        { wave: 3, upgrade: YARD_S },
        { wave: 4, build: 'zapcoil', tile: INTAKE_W },
        { wave: 5, upgrade: HOPPER_N },
        { wave: 5, upgrade: HOPPER_S },
        { wave: 6, build: 'rivet', tile: CORE_W },
        { wave: 6, build: 'zapcoil', tile: BEND },
        { wave: 7, upgrade: CATWALK_E },
        { wave: 7, build: 'zapcoil', tile: VAT_E },
        { wave: 8, upgrade: YARD_S },
      ],
    },
    // No shield answer: no Energy and no Soaked (Lookout, Rivet, Thumper, Skyhook).
    shield: {
      loadout: ['lookout', 'rivet', 'thumper', 'skyhook'],
      steps: [
        { wave: 1, build: 'rivet', tile: YARD_S },
        { wave: 1, build: 'thumper', tile: CATWALK_E },
        { wave: 1, build: 'thumper', tile: ROW9_W },
        { wave: 1, clear: HOPPER_N },
        { wave: 1, clear: HOPPER_S },
        { wave: 2, build: 'lookout', tile: HOPPER_N },
        { wave: 2, build: 'rivet', tile: HOPPER_S },
        { wave: 3, upgrade: YARD_S },
        { wave: 4, build: 'rivet', tile: INTAKE_W },
        { wave: 5, upgrade: HOPPER_N },
        { wave: 5, upgrade: HOPPER_S },
        { wave: 6, build: 'rivet', tile: CORE_W },
        { wave: 6, upgrade: CATWALK_E },
        { wave: 7, build: 'skyhook', tile: VAT_E },
        { wave: 7, upgrade: INTAKE_W },
        { wave: 8, upgrade: YARD_S },
      ],
    },
    // No splash answer: no Zapcoil or Thumper (Rivets into the Soaking Sprinklers' shields).
    splash: {
      loadout: ['lookout', 'rivet', 'sprinkler', 'skyhook'],
      steps: [
        { wave: 1, build: 'rivet', tile: YARD_S },
        { wave: 1, build: 'sprinkler', tile: YARD_N },
        { wave: 1, build: 'rivet', tile: CATWALK_E },
        { wave: 1, clear: HOPPER_N },
        { wave: 1, clear: HOPPER_S },
        { wave: 2, build: 'lookout', tile: HOPPER_N },
        { wave: 2, build: 'rivet', tile: HOPPER_S },
        { wave: 3, upgrade: YARD_S },
        { wave: 4, build: 'rivet', tile: INTAKE_W },
        { wave: 5, upgrade: HOPPER_S },
        { wave: 5, upgrade: YARD_N },
        { wave: 6, build: 'rivet', tile: CORE_W },
        { wave: 6, upgrade: YARD_N }, // T3: Soaked
        { wave: 7, build: 'skyhook', tile: VAT_E },
        { wave: 7, upgrade: CATWALK_E },
        { wave: 8, upgrade: INTAKE_W },
      ],
    },
  },
  // The three tests all come by W8: the cloak (W3, W7, W8), the shields (W3, W6–W8), and the
  // clusters (W2, W4, W5). Detection is new here (the teach map), but its loss comes by W8 too.
  noCounterLoseByWave: 8,
  teachMap: true,
  altBuilds: {
    // Lookout, Zapcoil, Skyhook, Thumper: the Lookout's kill zone round Intake B with Zapcoils on
    // the shields, Thumpers on the clusters, a Skyhook for the Lightwings over the vats.
    watch_and_shell: {
      loadout: ['lookout', 'zapcoil', 'skyhook', 'thumper'],
      steps: [
        { wave: 1, build: 'zapcoil', tile: YARD_S },
        { wave: 1, build: 'zapcoil', tile: CATWALK_E },
        { wave: 1, build: 'thumper', tile: YARD_N },
        { wave: 1, clear: HOPPER_N },
        { wave: 1, clear: HOPPER_S },
        { wave: 2, build: 'lookout', tile: HOPPER_N },
        { wave: 2, build: 'zapcoil', tile: HOPPER_S },
        { wave: 3, upgrade: YARD_S },
        { wave: 4, build: 'zapcoil', tile: INTAKE_W },
        { wave: 5, upgrade: HOPPER_N },
        { wave: 5, upgrade: HOPPER_S },
        { wave: 6, build: 'zapcoil', tile: CONDUIT },
        { wave: 6, build: 'thumper', tile: ROW9_MID },
        { wave: 7, upgrade: CATWALK_E },
        { wave: 7, build: 'skyhook', tile: CORE_W },
        { wave: 8, ability: 2 }, // Clearance Sale
        { wave: 8, upgrade: YARD_S },
        { wave: 8, upgrade: CONDUIT },
        { wave: 8, upgrade: CORE_W },
        { wave: 9, upgrade: CATWALK_E },
        { wave: 9, specialize: CATWALK_E, spec: 'a' }, // Overload Coil
        { wave: 10, build: 'skyhook', tile: BEND },
        { wave: 11, upgrade: CONDUIT },
        { wave: 11, upgrade: BEND },
      ],
    },
    // Lookout, Zapcoil, Thumper: no Skyhook, so the Zapcoils under the vats take the Lightwings
    // too; Thumpers on the clusters at the yard's entrance and under the vats.
    coil_and_shell: {
      loadout: ['lookout', 'zapcoil', 'thumper'],
      steps: [
        { wave: 1, build: 'zapcoil', tile: YARD_S },
        { wave: 1, build: 'zapcoil', tile: CATWALK_E },
        { wave: 1, build: 'thumper', tile: YARD_N },
        { wave: 1, clear: HOPPER_N },
        { wave: 1, clear: HOPPER_S },
        { wave: 2, build: 'lookout', tile: HOPPER_N },
        { wave: 2, build: 'zapcoil', tile: HOPPER_S },
        { wave: 3, upgrade: YARD_S },
        { wave: 4, build: 'zapcoil', tile: INTAKE_W },
        { wave: 5, upgrade: HOPPER_N },
        { wave: 5, upgrade: HOPPER_S },
        { wave: 6, build: 'zapcoil', tile: CONDUIT },
        { wave: 6, build: 'thumper', tile: ROW9_MID },
        { wave: 7, upgrade: CATWALK_E },
        { wave: 7, build: 'zapcoil', tile: CORE_W },
        { wave: 8, ability: 2 }, // Clearance Sale
        { wave: 8, upgrade: YARD_S },
        { wave: 8, upgrade: CONDUIT },
        { wave: 8, upgrade: CORE_W },
        { wave: 9, upgrade: CATWALK_E },
        { wave: 9, specialize: CATWALK_E, spec: 'a' }, // Overload Coil
        { wave: 10, build: 'zapcoil', tile: BEND },
        { wave: 11, upgrade: CONDUIT },
        { wave: 11, upgrade: BEND },
      ],
    },
  },
});

/**
 * The Crane alt (D137; T501c): Lookout, Zapcoil, Thumper, and a Salvage Crane by the intake
 * hoppers, so the drone clears the south one at double speed for +25% salvage and the Crane pays
 * every wave. The reference profile never owns the Crane (campaign.md § 4.9), so it isn't an
 * `altBuilds` entry: balance/a2m4.test.ts runs it on the reference profile plus the Crane's
 * license.
 */
export const CRANE_ALT: ScriptedBuild = {
  loadout: ['lookout', 'zapcoil', 'thumper', 'crane'],
  steps: [
    { wave: 1, build: 'crane', tile: ROW9_W },
    { wave: 1, build: 'zapcoil', tile: YARD_S },
    { wave: 1, build: 'zapcoil', tile: CATWALK_E },
    { wave: 1, clear: HOPPER_S },
    { wave: 1, clear: HOPPER_N },
    { wave: 2, build: 'lookout', tile: HOPPER_N },
    { wave: 2, build: 'thumper', tile: YARD_N },
    { wave: 3, build: 'zapcoil', tile: HOPPER_S },
    { wave: 4, upgrade: YARD_S },
    { wave: 4, build: 'zapcoil', tile: INTAKE_W },
    { wave: 5, upgrade: HOPPER_N },
    { wave: 5, upgrade: HOPPER_S },
    { wave: 6, build: 'zapcoil', tile: CONDUIT },
    { wave: 6, upgrade: ROW9_W },
    { wave: 7, upgrade: CATWALK_E },
    { wave: 7, build: 'thumper', tile: ROW9_MID },
    { wave: 8, ability: 2 }, // Clearance Sale
    { wave: 8, upgrade: YARD_S },
    { wave: 8, upgrade: CONDUIT },
    { wave: 8, build: 'zapcoil', tile: CORE_W },
    { wave: 9, upgrade: CATWALK_E },
    { wave: 9, specialize: CATWALK_E, spec: 'a' }, // Overload Coil
    { wave: 10, upgrade: CORE_W },
    { wave: 10, build: 'zapcoil', tile: BEND },
    { wave: 11, upgrade: CONDUIT },
    { wave: 11, upgrade: BEND },
  ],
};
