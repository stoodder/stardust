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
import { WHOS_THERE_INPUT } from '../../forcedInputs.ts';
import { WAYMARKS } from './map.ts';

// The pads, from the Halls down to the gate.
/** The Halls mouth: its two ledges (high ground), east of the descent, and below its corner. */
const LEDGE_W: GridPos = [10, 2];
const LEDGE_E: GridPos = [12, 2];
const HALLS_E: GridPos = [13, 2];
const CORNER: GridPos = [12, 5];
/** Above the row-4 run, west, and beside the rift field's mouth. */
const RUN_N: GridPos = [6, 3];
const WEST_IN: GridPos = [1, 4];
/** Inside the west bend: a pair over the rift field's mouth, row 4, and the Gap's west end. */
const BEND: GridPos = [5, 5];
const BEND_E: GridPos = [6, 5];
/** Between the row-4 run and the Gap (row 7): a pair and the west gold seam (a power node). */
const MID_N: GridPos = [9, 5];
const MID_S: GridPos = [9, 6];
const SEAM_W: GridPos = [10, 6];
/** Above the Gap's east end. */
const GAP_E: GridPos = [15, 6];
/** The ridge by the memorial, between the Gap and row 10: three in a row. */
const INNER: GridPos = [11, 9];
const RIDGE_W: GridPos = [12, 8];
const RIDGE: GridPos = [13, 8];
/** Inside the east bend. */
const EAST_BEND: GridPos = [16, 9];
/** The Bore road: the east gold seam below it (a power node), and a pad above it by the rig. */
const SEAM_E: GridPos = [15, 4];
const BORE_N: GridPos = [18, 2];
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
/**
 * "Who's there?" (Keep: Directive 0's forced input, 20 s into Phase 2): every build's last step
 * presses it the tick it is asked (the map forces an input, so validation wants the press last;
 * under the other answers it is never asked and never issued).
 */
const WHOS_THERE: BuildStep = { wave: 26, scriptInput: WHOS_THERE_INPUT };

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

/** `steps` in wave order (the executor plays them in order). */
const byWave = (steps: readonly BuildStep[]): BuildStep[] =>
  steps.toSorted((a, b) => a.wave - b.wave);

/**
 * The alts' air at the gate (every air lane ends there): two Skyhooks either side of the colony's
 * lane, the first in W3 (the first Rift Moths), the second before W14's gunships.
 */
const GATE_SKYHOOKS: readonly BuildStep[] = [
  { wave: 3, build: 'skyhook', tile: GATE_E },
  { wave: 5, upgrade: GATE_E },
  { wave: 8, upgrade: GATE_E },
  { wave: 12, build: 'skyhook', tile: GATE_W },
  { wave: 13, upgrade: GATE_W },
  { wave: 15, upgrade: GATE_W },
];

/** The alts' last Mindspike, on the east gold seam under the Bore road (W15–W17: the Halls' run). */
const SEAM_SPIKE: readonly BuildStep[] = [
  { wave: 15, build: 'mindspike', tile: SEAM_E },
  { wave: 16, upgrade: SEAM_E },
  { wave: 17, upgrade: SEAM_E },
];

/** Par's Phase 1 (finale.md § FIN, Par build). */
function parSteps(): BuildStep[] {
  return [
    ...RELIGHT,
    { wave: 1, build: 'mindspike', tile: BEND },
    { wave: 1, build: 'mindspike', tile: SEAM_W },
    { wave: 1, build: 'burrow', tile: INNER },
    { wave: 1, build: 'sproing', tile: RIDGE },
    { wave: 2, build: 'mindspike', tile: MID_N },
    { wave: 3, upgrade: BEND },
    { wave: 4, upgrade: BEND },
    { wave: 5, specialize: BEND, spec: 'a' },
    { wave: 6, build: 'sproing', tile: RIDGE_W },
    { wave: 6, upgrade: SEAM_W },
    { wave: 7, build: 'choir', tile: BEND_E },
    { wave: 8, upgrade: RIDGE },
    { wave: 8, upgrade: RIDGE_W },
    { wave: 9, build: 'choir', tile: MID_S },
    { wave: 9, upgrade: SEAM_W },
    { wave: 10, upgrade: MID_N },
    { wave: 11, build: 'mindspike', tile: LEDGE_E },
    { wave: 12, upgrade: LEDGE_E },
    { wave: 12, build: 'choir', tile: HALLS_E },
    { wave: 13, upgrade: LEDGE_E },
    { wave: 14, specialize: SEAM_W, spec: 'a' },
    { wave: 15, specialize: LEDGE_E, spec: 'b' },
    { wave: 16, build: 'burrow', tile: CORNER },
    { wave: 16, build: 'mindspike', tile: LEDGE_W },
    { wave: 17, upgrade: LEDGE_W },
    // Phase 2: the Halls ring
    { wave: 19, upgrade: LEDGE_W },
    { wave: 19, upgrade: CORNER },
    { wave: 20, specialize: LEDGE_W, spec: 'a' },
    { wave: 21, upgrade: HALLS_E },
    { wave: 22, upgrade: HALLS_E },
    WHOS_THERE,
  ];
}

/** Par's Phase 1 (its Halls ring's last upgrades in Phase 2 are par's alone). */
const parPhase1 = (): BuildStep[] => parSteps().filter((st) => st.wave < 21 || 'scriptInput' in st);

/** Par's placements and spending with each tower swapped by `swap` (a no-counter build). */
function swapped(
  swap: Readonly<Partial<Record<TowerId, TowerId>>>,
  steps: readonly BuildStep[] = parSteps(),
): BuildStep[] {
  return steps.flatMap((st): BuildStep[] => {
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
    // Mindspike (Echo Spike on the road, Dread at the Halls), Hum Choir, Skyhook, Thumper (T821;
    // finale.md § FIN, Alt builds): par's placements with the Skyhooks on the ridge and at the gate
    // for the air, and Thumpers where par digs its Dens (no burrow answer but Dread's tell).
    cluster: {
      loadout: ['mindspike', 'choir', 'skyhook', 'thumper'],
      steps: byWave([
        ...swapped({ sproing: 'skyhook', burrow: 'thumper' }, parPhase1()),
        ...GATE_SKYHOOKS,
        ...SEAM_SPIKE,
      ]),
    },
    // Mindspike, Hum Choir, Skyhook, Stasis Bloom: the same road, with Blooms holding the Silencers'
    // and the Unsung's tells where par digs its Dens.
    stasis: {
      loadout: ['mindspike', 'choir', 'skyhook', 'bloom'],
      steps: byWave([
        ...swapped({ sproing: 'skyhook', burrow: 'bloom' }, parPhase1()),
        ...GATE_SKYHOOKS,
        ...SEAM_SPIKE,
      ]),
    },
  },
});

/** Pads named for the tests (balance/finM01*.test.ts) and Phase 2's builds (T821). */
export const PADS = {
  LEDGE_W,
  LEDGE_E,
  HALLS_E,
  CORNER,
  RUN_N,
  WEST_IN,
  BEND,
  BEND_E,
  MID_N,
  MID_S,
  SEAM_W,
  GAP_E,
  INNER,
  RIDGE_W,
  RIDGE,
  EAST_BEND,
  SEAM_E,
  BORE_N,
  LOW_MID,
  GATE_W,
  GATE_E,
} as const;

export { WAYMARKS, fire, companion };
