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
/** The band: beside the bearers' route either side of the old intake (each touches INTAKE_W). */
const SLUICE_N: GridPos = [1, 6];
const SLUICE_S: GridPos = [1, 8];
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
    { wave: 1, build: 'thumper', tile: YARD_S },
    { wave: 1, build: 'harpoon', tile: YARD_N },
    { wave: 1, build: 'thumper', tile: SLUICE_S },
    { wave: 2, upgrade: YARD_S },
    { wave: 3, build: 'bloom', tile: INTAKE_W },
    { wave: 4, build: 'harpoon', tile: SLUICE_N },
    { wave: 5, build: 'choir', tile: BEND },
    { wave: 5, upgrade: SLUICE_S },
    { wave: 6, build: 'thumper', tile: CONDUIT },
    { wave: 7, build: 'harpoon', tile: CATWALK_E },
    { wave: 7, upgrade: BEND },
    { wave: 8, upgrade: CONDUIT },
    { wave: 8, build: 'harpoon', tile: CATWALK_W },
    { wave: 9, upgrade: YARD_N },
    { wave: 10, upgrade: CONDUIT },
    { wave: 11, upgrade: CATWALK_E },
    { wave: 11, upgrade: CATWALK_W },
    { wave: 12, upgrade: YARD_N },
    { wave: 13, upgrade: SLUICE_S },
    still(13, HUNT_STILL_SEC, HUNT_STILL),
    { wave: 13, upgrade: CATWALK_E },
    { wave: 13, upgrade: BEND },
    slot1(14, TAKEOVER_SEC),
    still(14, BOSS_STILL_SEC, [14, 10]),
    slot1(14, TAKEOVER_SEC + 45),
    { wave: 14, upgrade: CATWALK_W },
    { wave: 15, build: 'thumper', tile: VAT_E },
    { wave: 15, upgrade: VAT_E },
    { wave: 16, build: 'thumper', tile: SOUTH },
    { wave: 16, upgrade: VAT_E },
    { wave: 17, upgrade: SOUTH },
  ];
}

/** W13: Stillness on the hunt as it catches the biggest bearer group by the old intake. */
const HUNT_STILL_SEC = 19;
const HUNT_STILL: GridPos = [0, 6];

/** W14 under Rewrite: Suppressing Fire on the vats' row, then on the turn down to the core. */
const SUPPRESS_1: GridPos = [12, 9];
const SUPPRESS_2: GridPos = [14, 10];

/** W14: System Reboot as Hostile Takeover's first jams land (phase 2's laser ends). */
const TAKEOVER_SEC = 91;
/** W14: Stillness on the platform as it turns into the vats' row (a boss takes Chilled 50%). */
const BOSS_STILL_SEC = 116;

const PAR: ScriptedBuild = {
  loadout: ['choir', 'harpoon', 'bloom', 'thumper'],
  steps: parSteps(),
};

/**
 * Par under C4 Rewrite (core-loop.md § 6.11): QUILL is offline, so System Reboot is locked and
 * slot 1 is Suppressing Fire (inherited in A3M4's mail); the Choir carries the jam. Its casts go
 * on the platform where the Reboots went: the vats' row as Hostile Takeover begins, and the turn
 * down to the core in the jettison.
 */
const REWRITE_PAR: ScriptedBuild = {
  loadout: PAR.loadout,
  technicianAbility: 'suppressing_fire',
  steps: PAR.steps.map((st) =>
    'ability' in st && st.ability === 1
      ? {
          ...st,
          target:
            st === PAR.steps.find((x) => 'ability' in x && x.ability === 1)
              ? SUPPRESS_1
              : SUPPRESS_2,
        }
      : st,
  ),
};

export const builds = defineBuilds({
  referenceProfile: REFERENCE_PROFILES.a3_m05,
  referenceProfileByFlag: REFERENCE_VARIANTS.a3_m05.map((cell) =>
    'quill_choice' in cell.when ? { ...cell, parBuild: REWRITE_PAR } : { ...cell },
  ),
  parBuild: PAR,
  // Jam stays required (the no-jam build carries no answer), but the harness doesn't hold it to a
  // loss: a jam is at most 4 s on a tower, and A3M5's jammers die in its kill zones before they
  // tell twice, so the reference no-jam build ends below par rather than losing (D146 addendum;
  // T760 retunes jamming to retire this). balance/a3m5Jam.test.ts pins what jam costs instead.
  counterExemptions: [{ counter: 'jam', reason: "jam exam is W14's Takeover (D146)" }],
  // The armor exam is the W11 Liability column (it walks the 39-tile road for ~80 s, so it lands
  // in W12) and then the platform at W14.
  noCounterLoseByWave: 14,
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
      steps: swapped(PAR.steps, { thumper: 'prism' }).filter((s) => !('specialize' in s)),
    },
  },
  altBuilds: {
    // Hum Choir, Rivet, Thumper (Bunker Buster), Sproing Pad (act3.md § A3M5): the Bunker
    // Busters carry the armor (the Liabilities and the platform), the Rivets the drones, the
    // Sproing Pad bonks the hunters off the bearers, the Choir and System Reboot the jams.
    rivet_sproing: {
      loadout: ['choir', 'rivet', 'thumper', 'sproing'],
      steps: [
        ...CUT_FEED,
        ...CLEAR_HOPPERS,
        { wave: 1, build: 'thumper', tile: YARD_S },
        { wave: 1, build: 'rivet', tile: YARD_N },
        { wave: 1, build: 'thumper', tile: SLUICE_S },
        { wave: 2, upgrade: YARD_S },
        { wave: 3, build: 'sproing', tile: INTAKE_W },
        { wave: 4, build: 'rivet', tile: SLUICE_N },
        { wave: 4, upgrade: YARD_S },
        { wave: 5, specialize: YARD_S, spec: 'b' },
        { wave: 6, build: 'choir', tile: BEND },
        { wave: 6, upgrade: SLUICE_S },
        { wave: 7, build: 'thumper', tile: CONDUIT },
        { wave: 8, upgrade: CONDUIT },
        { wave: 8, upgrade: BEND },
        { wave: 9, build: 'rivet', tile: CATWALK_E },
        { wave: 9, upgrade: CONDUIT },
        { wave: 10, upgrade: CATWALK_E },
        { wave: 10, upgrade: YARD_N },
        { wave: 11, specialize: CONDUIT, spec: 'b' },
        { wave: 12, upgrade: CATWALK_E },
        { wave: 12, upgrade: INTAKE_W },
        still(13, HUNT_STILL_SEC, HUNT_STILL),
        { wave: 13, build: 'thumper', tile: VAT_E },
        { wave: 13, upgrade: BEND },
        slot1(14, TAKEOVER_SEC),
        { wave: 14, upgrade: VAT_E },
        { wave: 15, upgrade: VAT_E },
        { wave: 15, build: 'thumper', tile: SOUTH },
        { wave: 16, upgrade: SOUTH },
        { wave: 16, upgrade: YARD_N },
      ],
    },
    // Harpoon, Prism, Zapcoil, Stasis Bloom (act3.md § A3M5): the Zapcoils chain the clusters,
    // the Prism's beam and the Harpoons carry the armor, the Bloom and Stillness interrupt the
    // Auditors, System Reboot the rest.
    beams: {
      loadout: ['harpoon', 'prism', 'zapcoil', 'bloom'],
      steps: [
        ...CUT_FEED,
        ...CLEAR_HOPPERS,
        { wave: 1, build: 'zapcoil', tile: YARD_S },
        { wave: 1, build: 'prism', tile: YARD_N },
        { wave: 1, build: 'zapcoil', tile: SLUICE_S },
        { wave: 2, upgrade: YARD_S },
        { wave: 2, upgrade: SLUICE_S },
        { wave: 3, build: 'bloom', tile: INTAKE_W },
        { wave: 4, build: 'harpoon', tile: SLUICE_N },
        { wave: 4, upgrade: YARD_N },
        { wave: 5, build: 'zapcoil', tile: CONDUIT },
        { wave: 6, build: 'harpoon', tile: CATWALK_E },
        { wave: 6, upgrade: CONDUIT },
        { wave: 7, build: 'zapcoil', tile: BEND },
        { wave: 7, upgrade: YARD_S },
        { wave: 8, build: 'harpoon', tile: CATWALK_W },
        { wave: 8, upgrade: CATWALK_E },
        { wave: 9, upgrade: YARD_N },
        { wave: 9, upgrade: CONDUIT },
        { wave: 9, upgrade: BEND },
        { wave: 10, upgrade: CATWALK_E },
        { wave: 10, upgrade: SLUICE_S },
        { wave: 11, upgrade: CATWALK_W },
        { wave: 12, upgrade: BEND },
        { wave: 12, upgrade: CATWALK_W },
        { wave: 13, build: 'zapcoil', tile: VAT_E },
        { wave: 13, upgrade: VAT_E },
        slot1(14, TAKEOVER_SEC),
        still(14, BOSS_STILL_SEC, [14, 10]),
        { wave: 14, upgrade: VAT_E },
        { wave: 15, build: 'zapcoil', tile: SOUTH },
        { wave: 16, upgrade: SOUTH },
      ],
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
