// A3M5 balance-harness builds: docs/story/campaign/act3.md § A3M5, Par build.
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES, REFERENCE_VARIANTS } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos, ScriptedBuild, TowerId } from '../../types.ts';

// The pads (A2M4's, at its offset (2, 1), and the band's).
/** Beside the road's way in at the north-east, west and east of it. */
const GATE_W: GridPos = [15, 2];
const GATE_E: GridPos = [17, 2];
/** Above the cliff road, under the west seam. */
const SEAM: GridPos = [10, 2];
/** The intake yard's entrance and below it (A2M4's YARD_N, YARD_S). */
const YARD_N: GridPos = [6, 4];
const YARD_S: GridPos = [6, 5];
/** West of the road's drop past Intake B, beside the bearers' route. */
const INTAKE_W: GridPos = [2, 7];
/** The intake hoppers (wreckage over pads). */
const HOPPER_N: GridPos = [5, 7];
const HOPPER_S: GridPos = [5, 8];
/** The catwalks either side of the vats' drain hatch (high ground). */
const CATWALK_W: GridPos = [8, 8];
const CATWALK_E: GridPos = [12, 8];
/** Beside the vats' east end, over the road's turn down. */
const VAT_E: GridPos = [14, 8];
/** Under the road's run east. */
const ROW10_W: GridPos = [6, 10];
const ROW10_MID: GridPos = [9, 10];
/** Inside the road's last bend, beside the conduit, and the conduit (power node). */
const BEND: GridPos = [12, 10];
const CONDUIT: GridPos = [13, 10];
/** East of the road's turn down. */
const BEND_E: GridPos = [15, 10];
/** Beside the control core. */
const CORE_W: GridPos = [10, 11];
/** The band: under the sluice, beside the bearers' route (a link pair), and the south gate. */
const SLUICE_N: GridPos = [0, 5];
const SLUICE_S: GridPos = [0, 6];
const SOUTH: GridPos = [13, 13];
/** The feed lines (wreckage over decor). */
const FEEDS: readonly GridPos[] = [
  [8, 0],
  [10, 0],
  [12, 0],
];

/** Slot 1's cast `afterSec` into `wave` (no target). */
const slot1 = (wave: number, afterSec: number): BuildStep => ({
  wave,
  ability: 1,
  when: { afterSec },
});
/** Stillness (slot 2) on `target`, `afterSec` into `wave`. */
const still = (wave: number, afterSec: number, target: GridPos): BuildStep => ({
  wave,
  ability: 2,
  target,
  when: { afterSec },
});

/** Clears the feed lines in W1's build phase (Cut the Feed). */
const CUT_FEED: readonly BuildStep[] = FEEDS.map((tile) => ({ wave: 1, clear: tile }));
/** Clears the intake hoppers (their pads), after the feeds. */
const CLEAR_HOPPERS: readonly BuildStep[] = [
  { wave: 1, clear: HOPPER_N },
  { wave: 1, clear: HOPPER_S },
];

/** `steps` with each tower `swap` names built as its swap instead (same tile, same upgrades). */
export function swapped(
  steps: readonly BuildStep[],
  swap: Partial<Record<TowerId, TowerId>>,
  casts = true,
): BuildStep[] {
  return steps.flatMap((st): BuildStep[] => {
    if ('ability' in st) return casts ? [st] : [];
    if (!('build' in st)) return [st];
    const to = swap[st.build];
    return [to === undefined ? st : { ...st, build: to }];
  });
}

function parSteps(): BuildStep[] {
  return [
    ...CUT_FEED,
    ...CLEAR_HOPPERS,
    { wave: 1, build: 'thumper', tile: INTAKE_W },
    { wave: 1, build: 'thumper', tile: YARD_S },
    { wave: 1, build: 'harpoon', tile: YARD_N },
    { wave: 2, upgrade: INTAKE_W },
    { wave: 3, build: 'bloom', tile: SLUICE_N },
    { wave: 4, build: 'choir', tile: HOPPER_N },
    { wave: 4, build: 'harpoon', tile: SLUICE_S },
    { wave: 5, upgrade: YARD_S },
    { wave: 6, upgrade: YARD_N },
    { wave: 6, upgrade: HOPPER_N },
    { wave: 7, build: 'thumper', tile: CONDUIT },
    { wave: 8, upgrade: INTAKE_W },
    { wave: 8, upgrade: SLUICE_S },
    { wave: 9, build: 'thumper', tile: CATWALK_E },
    { wave: 9, upgrade: CONDUIT },
    { wave: 10, upgrade: YARD_S },
    { wave: 10, upgrade: HOPPER_N },
    { wave: 11, upgrade: CATWALK_E },
    { wave: 11, upgrade: YARD_N },
    { wave: 12, upgrade: CONDUIT },
    { wave: 12, specialize: INTAKE_W, spec: 'a' },
    { wave: 13, upgrade: SLUICE_N },
    { wave: 13, upgrade: SLUICE_S },
    { wave: 14, build: 'harpoon', tile: VAT_E },
    { wave: 15, upgrade: CATWALK_E },
    { wave: 15, upgrade: VAT_E },
  ];
}

const PAR: ScriptedBuild = {
  loadout: ['choir', 'harpoon', 'bloom', 'thumper'],
  steps: parSteps(),
};

export const builds = defineBuilds({
  referenceProfile: REFERENCE_PROFILES.a3_m05,
  referenceProfileByFlag: REFERENCE_VARIANTS.a3_m05.map((cell) => ({ ...cell })),
  parBuild: PAR,
  flagVariants: { door_choice: ['convoy', 'warren'], quill_choice: ['keep', 'purge', 'rewrite'] },
  noCounterBuilds: {
    jam: {
      loadout: ['harpoon', 'prism', 'thumper', 'sproing'],
      technicianAbility: 'scanner_sweep',
      steps: swapped(PAR.steps, { choir: 'prism', bloom: 'sproing' }, false),
    },
    armor: {
      loadout: ['choir', 'sproing', 'thumper', 'bloom'],
      steps: swapped(PAR.steps, { harpoon: 'sproing' }),
    },
    splash: {
      loadout: ['choir', 'harpoon', 'prism', 'bloom'],
      steps: swapped(PAR.steps, { thumper: 'prism' }).filter(
        (s) => !('specialize' in s),
      ),
    },
  },
  altBuilds: {
    rivet_sproing: {
      loadout: ['choir', 'rivet', 'thumper', 'sproing'],
      steps: swapped(PAR.steps, { harpoon: 'rivet', bloom: 'sproing' }),
    },
    beams: {
      loadout: ['harpoon', 'prism', 'zapcoil', 'bloom'],
      steps: swapped(PAR.steps, { choir: 'prism', thumper: 'zapcoil' }),
    },
  },
});

/** Pads named for the tests (balance/a3m5*.test.ts). */
export const PADS = {
  GATE_W,
  GATE_E,
  SEAM,
  YARD_N,
  YARD_S,
  INTAKE_W,
  HOPPER_N,
  HOPPER_S,
  CATWALK_W,
  CATWALK_E,
  VAT_E,
  ROW10_W,
  ROW10_MID,
  BEND,
  CONDUIT,
  BEND_E,
  CORE_W,
  SLUICE_N,
  SLUICE_S,
  SOUTH,
} as const;

export { slot1, still };
