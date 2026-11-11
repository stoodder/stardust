// A3M4 balance-harness builds: docs/story/campaign/act3.md § A3M4, Par build. Every build arms Hold
// Fire for Gerald's pass before W1 (`holdFireWhile: 'neutral'`: Hold Fire (all) while he is on the
// field, W7), so par never hits him and earns Signature: Received. Bricks's slot is empty, so slot
// 1 (System Reboot) is the only ability; par casts it on the Silencers' tells.
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES, REFERENCE_VARIANTS } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos, ScriptedBuild, TowerId } from '../../types.ts';

// The pads (map.ts).
/** The hall junction's four corners. */
const J_NW: GridPos = [10, 7];
const J_NE: GridPos = [12, 7];
const J_SW: GridPos = [10, 9];
const J_SE: GridPos = [12, 9];
/** The Hollow's tunnel (west): inside its switchback, north and south, and beside its down run. */
const TW_N: GridPos = [5, 3];
const TW_S: GridPos = [5, 7];
const TW_E: GridPos = [8, 4];
/** Everglow's service tunnel (east), the same. */
const SV_N: GridPos = [16, 3];
const SV_S: GridPos = [16, 7];
const SV_W: GridPos = [13, 4];
/** The outer bays at each tunnel's mouth. */
const MOUTH_W: GridPos = [1, 4];
const MOUTH_E: GridPos = [20, 4];
/** Either side of the generator. */
const HALL_W: GridPos = [9, 11];
const HALL_E: GridPos = [13, 11];
/** Beside each rift's bay. */
const BAY_W: GridPos = [1, 9];
const BAY_E: GridPos = [20, 9];
/** Under the south-west corner, beside the corridor: it touches J_SW (a link pair). */
const J_S: GridPos = [10, 10];
/** Under the Moths' lane, north of the junction. */
const SKY: GridPos = [11, 5];

/** Hold Fire (all) while Gerald is on the field: every build's first step. */
const HOLD_FOR_GERALD: BuildStep = { wave: 1, holdFireWhile: 'neutral' };

/** System Reboot `afterSec` into `wave` (slot 1; no target). */
const reboot = (wave: number, afterSec: number): BuildStep => ({
  wave,
  ability: 1,
  when: { afterSec },
});

/** Par's steps with its Rivets built as `tower` (the warren's Gloop). */
function rivetsAs(steps: readonly BuildStep[], tower: TowerId): BuildStep[] {
  return steps.map((st) => ('build' in st && st.build === 'rivet' ? { ...st, build: tower } : st));
}

function parSteps(): BuildStep[] {
  return [
    HOLD_FOR_GERALD,
    { wave: 1, build: 'harpoon', tile: SV_S },
    { wave: 1, build: 'harpoon', tile: J_SE },
    { wave: 1, build: 'rivet', tile: J_NE },
    { wave: 1, upgrade: J_NE },
    { wave: 1, build: 'mindspike', tile: J_S },
    { wave: 2, upgrade: J_NE }, // T3: pierce
    { wave: 3, build: 'harpoon', tile: SV_N },
    { wave: 4, build: 'choir', tile: J_SW }, // Harmony with the Mindspike below it
    { wave: 5, build: 'rivet', tile: SKY },
    { wave: 5, upgrade: SKY },
    { wave: 6, upgrade: J_SW },
    reboot(6, 14),
    { wave: 6, upgrade: J_SE },
    { wave: 7, upgrade: SV_S },
    { wave: 7, upgrade: J_SW }, // T3: jams in its aura cut by 75%
    { wave: 8, upgrade: J_SE },
    { wave: 8, upgrade: J_S },
    { wave: 9, upgrade: SV_S },
    { wave: 9, upgrade: SKY },
    { wave: 10, upgrade: SV_N },
    reboot(10, 14),
    { wave: 10, build: 'mindspike', tile: HALL_W },
    { wave: 11, upgrade: HALL_W },
    { wave: 11, upgrade: J_S },
    { wave: 12, build: 'harpoon', tile: J_NW },
    reboot(12, 14),
    { wave: 12, upgrade: J_NW },
    { wave: 13, upgrade: SV_N },
    { wave: 13, build: 'harpoon', tile: HALL_E },
    { wave: 14, upgrade: HALL_E },
    { wave: 14, upgrade: J_NW },
    { wave: 15, upgrade: HALL_W },
    { wave: 15, upgrade: HALL_E },
  ];
}

const PAR: ScriptedBuild = {
  loadout: ['choir', 'harpoon', 'mindspike', 'rivet'],
  steps: parSteps(),
};

export const builds = defineBuilds({
  // A3M4's reference profile (campaign.md § 4.9): the jailbreak's Rivet back, the Hum Choir from
  // the shelter elders, System Reboot in slot 1, Emergency Bulkhead on. The warren's cell owns its
  // Gloop Spitter too, and its par builds the Gloop wherever the convoy's builds a Rivet.
  referenceProfile: REFERENCE_PROFILES.a3_m04,
  referenceProfileByFlag: REFERENCE_VARIANTS.a3_m04.map((cell) => ({
    ...cell,
    parBuild: {
      loadout: ['choir', 'harpoon', 'mindspike', 'gloop'],
      steps: rivetsAs(PAR.steps, 'gloop'),
    },
  })),
  parBuild: PAR,
  flagVariants: { door_choice: ['convoy', 'warren'], spared_quiet_wave: [false, true] },
  // The jam exam comes in W10's Hollow surge; the armor and air exams by W11 too (act3.md).
  noCounterLoseByWave: 11,
  noCounterBuilds: {
    jam: {
      loadout: ['harpoon', 'mindspike', 'rivet', 'prism'],
      technicianAbility: 'scanner_sweep',
      steps: [
        HOLD_FOR_GERALD,
        { wave: 1, build: 'harpoon', tile: SV_S },
        { wave: 1, build: 'rivet', tile: J_NE },
        { wave: 1, upgrade: J_NE },
        { wave: 1, build: 'harpoon', tile: SV_N },
        { wave: 2, upgrade: J_NE },
        { wave: 3, build: 'prism', tile: J_NW },
        { wave: 3, build: 'mindspike', tile: J_SW },
      ],
    },
    armor: {
      loadout: ['choir', 'zapcoil', 'skyhook', 'burrow'],
      steps: [
        HOLD_FOR_GERALD,
        { wave: 1, build: 'zapcoil', tile: SV_S },
        { wave: 1, build: 'burrow', tile: J_SW },
        { wave: 1, build: 'zapcoil', tile: J_NE },
        { wave: 2, build: 'choir', tile: J_NW },
        { wave: 3, build: 'skyhook', tile: SKY },
      ],
    },
    air: {
      loadout: ['choir', 'thumper', 'burrow', 'sprinkler'],
      steps: [
        HOLD_FOR_GERALD,
        { wave: 1, build: 'thumper', tile: SV_S },
        { wave: 1, build: 'burrow', tile: J_SW },
        { wave: 1, build: 'thumper', tile: J_NE },
        { wave: 2, build: 'choir', tile: J_NW },
      ],
    },
  },
  altBuilds: {
    beam_and_flak: {
      loadout: ['choir', 'prism', 'skyhook', 'thumper'],
      steps: [
        HOLD_FOR_GERALD,
        { wave: 1, build: 'prism', tile: SV_S },
        { wave: 1, build: 'thumper', tile: J_NE },
        { wave: 1, build: 'skyhook', tile: SKY },
        { wave: 2, build: 'choir', tile: J_NW },
      ],
    },
    den_and_lookout: {
      loadout: ['harpoon', 'mindspike', 'burrow', 'lookout'],
      steps: [
        HOLD_FOR_GERALD,
        { wave: 1, build: 'harpoon', tile: SV_S },
        { wave: 1, build: 'burrow', tile: J_SW },
        { wave: 1, build: 'harpoon', tile: SV_N },
        { wave: 2, build: 'mindspike', tile: J_NE },
        reboot(6, 12),
      ],
    },
  },
});

/** Pads named for the tests (balance/a3m4.test.ts). */
export const PADS = {
  J_NW,
  J_NE,
  J_SW,
  J_SE,
  TW_N,
  TW_S,
  TW_E,
  SV_N,
  SV_S,
  SV_W,
  MOUTH_W,
  MOUTH_E,
  HALL_W,
  HALL_E,
  BAY_W,
  BAY_E,
  J_S,
  SKY,
} as const;
