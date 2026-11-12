// FIN balance-harness builds: docs/story/campaign/finale.md § FIN, Par build. The map is judged on
// Voices % (the Escort chain's end; maps.md § 6.1). Phase 1 (W1–18) is T820's; T821 extends
// each build into Phase 2 (its steps after W18) and tunes the whole map to par 48.
//
// The flags: the convoy first (a run with no door set mans the militia's posts and walks the
// smaller choir), then the warren; C1, C2, and C4 each change the choir, the song, or the Bore, so
// each has its harness runs (#14). The reference profile is the same in every cell
// (reference.ts: `REFERENCE_VARIANTS.fin_m01` is empty; FIN_CHOIR_CELLS names the weakest and
// strongest choir).
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES, REFERENCE_VARIANTS } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos, TowerId } from '../../types.ts';
import { WAYMARKS } from './map.ts';

// The pads, from the Halls down to the gate.
/** The Halls mouth: west of the descent, and its two ledges (high ground). */
const HALLS_W: GridPos = [9, 1];
const LEDGE_W: GridPos = [10, 2];
const LEDGE_E: GridPos = [12, 2];
/** East of the descent, and below its corner (where the choir stops). */
const HALLS_E: GridPos = [14, 3];
const CORNER: GridPos = [12, 5];
/** Above the row-4 run, west. */
const RUN_N: GridPos = [6, 3];
/** The west bend: beside the rift field's mouth, inside the bend. */
const WEST_IN: GridPos = [1, 4];
const BEND: GridPos = [5, 5];
/** Between the row-4 run and the Gap's row 7, and the west gold seam (a power node). */
const MID_N: GridPos = [8, 5];
const SEAM_W: GridPos = [10, 6];
/** Above the Gap's east end. */
const GAP_E: GridPos = [15, 6];
/** Below the Gap: west, middle, and the ridge by the memorial. */
const WEST_S: GridPos = [2, 8];
const GAP_W: GridPos = [6, 8];
const RIDGE: GridPos = [13, 8];
/** Between the Gap and row 10, and inside the east bend. */
const INNER: GridPos = [11, 9];
const EAST_BEND: GridPos = [16, 9];
/** The east gold seam above the Bore road (a power node), and below the Bore road. */
const SEAM_E: GridPos = [19, 8];
const BORE_S: GridPos = [18, 11];
/** Below row 10, and either side of the colony's lane to the gate. */
const LOW_MID: GridPos = [13, 11];
const GATE_W: GridPos = [7, 11];
const GATE_E: GridPos = [9, 12];

/** The waymark lanterns' wreckage tiles (map.ts markers), in the choir's walking order. */
const LANTERNS: readonly GridPos[] = [
  [10, 11],
  [14, 9],
  [4, 6],
  [9, 3],
];
/** Relight all four in the opening build phase (Waymarks; the drone takes 6 s each). */
const RELIGHT: readonly BuildStep[] = LANTERNS.map((tile) => ({ wave: 1, clear: tile }));

/** Suppressing Fire (slot 1) on the road at `target`, `afterSec` into `wave`. */
const fire = (wave: number, afterSec: number, target: GridPos): BuildStep => ({
  wave,
  ability: 1,
  target,
  when: { afterSec },
});
/** The companion's ability (slot 2) at `target`, `afterSec` into `wave`. */
const companion = (wave: number, afterSec: number, target: GridPos): BuildStep => ({
  wave,
  ability: 2,
  target,
  when: { afterSec },
});

/** System Reboot (slot 1) a little into each wave that sends a jammer (the reboot alt). */
const REBOOTS: readonly BuildStep[] = [4, 7, 12, 14, 17, 18].map((wave) => ({
  wave,
  ability: 1,
  when: { afterSec: 12 },
}));

/** Par's Phase 1 (finale.md § FIN, Par build). */
function parSteps(): BuildStep[] {
  return [
    ...RELIGHT,
    { wave: 1, build: 'sproing', tile: GATE_E },
    { wave: 1, build: 'mindspike', tile: INNER },
    { wave: 1, build: 'mindspike', tile: SEAM_W },
    { wave: 1, build: 'burrow', tile: GAP_W },
    { wave: 2, upgrade: INNER },
    { wave: 3, build: 'sproing', tile: GATE_W },
    { wave: 4, upgrade: SEAM_W },
    { wave: 4, build: 'choir', tile: MID_N },
    { wave: 5, upgrade: INNER },
    { wave: 6, upgrade: GATE_E },
    { wave: 6, upgrade: SEAM_W },
    { wave: 7, upgrade: GATE_W },
    { wave: 7, specialize: INNER, spec: 'a' },
    { wave: 8, upgrade: GATE_E },
    { wave: 9, build: 'mindspike', tile: CORNER },
    { wave: 10, specialize: SEAM_W, spec: 'a' },
    { wave: 11, build: 'choir', tile: LEDGE_E },
    { wave: 11, upgrade: CORNER },
    { wave: 12, build: 'burrow', tile: HALLS_E },
    { wave: 12, upgrade: CORNER },
    { wave: 13, build: 'sproing', tile: LOW_MID },
    { wave: 13, upgrade: GAP_W },
    { wave: 14, build: 'mindspike', tile: LEDGE_W },
    { wave: 14, upgrade: LEDGE_W },
    { wave: 15, specialize: CORNER, spec: 'b' },
    { wave: 15, upgrade: LEDGE_E },
    { wave: 16, upgrade: LEDGE_W },
    { wave: 16, upgrade: HALLS_E },
    { wave: 17, specialize: LEDGE_W, spec: 'a' },
    { wave: 17, upgrade: LOW_MID },
    { wave: 18, upgrade: HALLS_E },
  ];
}

/** Par's placements and spending with each tower swapped by `swap` (a no-counter build). */
function swapped(swap: Readonly<Partial<Record<TowerId, TowerId>>>): BuildStep[] {
  return parSteps().flatMap((st): BuildStep[] => {
    if (!('build' in st)) return [st];
    const to = swap[st.build];
    return [to === undefined ? st : { ...st, build: to }];
  });
}

export const builds = defineBuilds({
  // FIN's reference profile (campaign.md § 4.9): A3M6's, and the Mindspike's specs.
  referenceProfile: REFERENCE_PROFILES.fin_m01,
  referenceProfileByFlag: REFERENCE_VARIANTS.fin_m01,
  parBuild: { loadout: ['mindspike', 'choir', 'sproing', 'burrow'], steps: parSteps() },
  // The finale's no-counter builds must lose in Phase 1 (finale.md § FIN): by W17, the harness's
  // ⌊⅔ × 26⌋ once Phase 2's waves land (T821).
  noCounterLoseByWave: 17,
  flagVariants: {
    door_choice: ['convoy', 'warren'],
    spared_quiet_wave: [true, false],
    stardust_choice: ['returned', 'sold'],
    quill_choice: ['keep', 'purge', 'rewrite'],
  },
  noCounterBuilds: {
    // No air: Hum Choir, Gloop, Scuttle Den, Thumper; nothing in reach of the air lanes.
    air: {
      loadout: ['choir', 'gloop', 'burrow', 'thumper'],
      steps: swapped({ mindspike: 'thumper', sproing: 'gloop' }).filter(
        (st) => !('specialize' in st),
      ),
    },
    // No jam: Sproing, Mindspike (Echo Spike only), Gloop, Scuttle Den; Zibzab walks with them.
    jam: {
      loadout: ['sproing', 'mindspike', 'gloop', 'burrow'],
      companion: 'zibzab',
      steps: swapped({ choir: 'gloop' }).map((st) =>
        'specialize' in st ? { ...st, spec: 'a' as const } : st,
      ),
    },
    // No splash: Hum Choir, Mindspike (Dread only), Sproing, Prism.
    splash: {
      loadout: ['choir', 'mindspike', 'sproing', 'prism'],
      steps: swapped({ burrow: 'prism' }).map((st) =>
        'specialize' in st ? { ...st, spec: 'b' as const } : st,
      ),
    },
  },
  altBuilds: {
    // Hum Choir, Thumper (Cluster), Skyhook, Stasis Bloom (finale.md § FIN).
    cluster: {
      loadout: ['choir', 'thumper', 'skyhook', 'bloom'],
      steps: swapped({ mindspike: 'thumper', sproing: 'skyhook', burrow: 'bloom' }),
    },
    // Sproing, Scuttle Den, Gloop, Prism; System Reboot carries the jam (finale.md § FIN).
    reboot: {
      loadout: ['sproing', 'burrow', 'gloop', 'prism'],
      technicianAbility: 'system_reboot',
      steps: [
        ...swapped({ mindspike: 'prism', choir: 'gloop' }).filter((st) => !('specialize' in st)),
        ...REBOOTS,
      ].toSorted((a, b) => a.wave - b.wave),
    },
  },
});

/** Pads named for the tests (balance/finM01*.test.ts) and Phase 2's builds (T821). */
export const PADS = {
  HALLS_W,
  LEDGE_W,
  LEDGE_E,
  HALLS_E,
  CORNER,
  RUN_N,
  WEST_IN,
  BEND,
  MID_N,
  SEAM_W,
  GAP_E,
  WEST_S,
  GAP_W,
  RIDGE,
  INNER,
  EAST_BEND,
  SEAM_E,
  BORE_S,
  LOW_MID,
  GATE_W,
  GATE_E,
} as const;

export { WAYMARKS, fire, companion };
