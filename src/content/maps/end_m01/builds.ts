// END_M01's builds. Endless isn't a campaign map, so the balance harness doesn't judge it (it has no
// par band: its score is the waves held); its one build is the reference the Endless tests run
// (tools/endlessRun.test.ts: a seed's 60 waves within assertion 13's CPU budget, and how far it
// holds on Standard: 22–43 waves on seeds 1–8 since D156's roster). Its profile is the finale's
// (campaign.md § 4.9): a post-game player owns at least that.
//
// The reference loadout answers every counter category between four towers, so it meets every
// block (sim/endless.ts) with something: the Prism Spire (armor, shield, air), the Zapcoil (shield, air, splash),
// the Mindspike (air; armor against the Hollow and the Aelari; burrowed and jam as Dread), and the
// Lookout Shack (detection). Vesthara walks with it (the pick list's first).
//
// Its steps all sit in the warm-up's waves: the build executor takes them in order, each when the
// bank covers it (sim/headless.ts), so a step tagged W5 waits for its credits however many waves
// that takes. The road's inner pads first, then the band's under the air lanes and the rifts.
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos, TowerId } from '../../types.ts';

// A1M1's pads at its offset (4, 2).
/** East of the road below the spawn. */
const SPAWN_E: GridPos = [10, 3];
/** West of the road's turn east, by the domes. */
const DOME_W: GridPos = [6, 4];
/** Beside the greenhouse roof, and the roof itself (high ground). */
const ROOF_W: GridPos = [10, 4];
const ROOF: GridPos = [11, 4];
/** The inner bend, west of the road's run back west (a link pair). */
const BEND_N: GridPos = [7, 6];
const BEND_S: GridPos = [7, 7];
/** East of the road's run south (a link pair). */
const EAST_N: GridPos = [14, 6];
const EAST_S: GridPos = [14, 7];
/** Either side of the road's last leg to the gate. */
const GATE_W: GridPos = [6, 9];
const GATE_E: GridPos = [10, 9];
// The band's.
/** Either side of the road's way in. */
const IN_W: GridPos = [7, 1];
const IN_E: GridPos = [9, 1];
/** Either side of the west rift: the power node and a pad. */
const NODE_W: GridPos = [3, 4];
const WEST_S: GridPos = [3, 6];
/** Either side of the east rift: a pad and the high ground. */
const EAST_PAD: GridPos = [18, 4];
const EAST_HIGH: GridPos = [18, 6];
/** The flanks. */
const FLANK_W: GridPos = [3, 9];
const FLANK_E: GridPos = [18, 9];
/** Either side of the gate's approach from the south. */
const SOUTH_W: GridPos = [7, 12];
const SOUTH_E: GridPos = [9, 12];

/** Build `tower` at `tile`, then take it to tier 3. */
const raise = (wave: number, tower: TowerId, tile: GridPos): BuildStep[] => [
  { wave, build: tower, tile },
  { wave, upgrade: tile },
  { wave, upgrade: tile },
];

const STEPS: readonly BuildStep[] = [
  // W1: four towers on the road's inner pads, the gate's covering the air lanes' last leg.
  { wave: 1, build: 'zapcoil', tile: GATE_E },
  { wave: 1, build: 'mindspike', tile: BEND_N },
  { wave: 1, build: 'prism', tile: ROOF },
  { wave: 1, build: 'zapcoil', tile: ROOF_W },
  { wave: 2, upgrade: GATE_E },
  { wave: 2, upgrade: BEND_N },
  { wave: 2, build: 'lookout', tile: BEND_S },
  { wave: 3, upgrade: ROOF },
  { wave: 3, upgrade: ROOF_W },
  { wave: 3, build: 'mindspike', tile: GATE_W },
  { wave: 4, upgrade: GATE_E },
  { wave: 4, upgrade: BEND_N },
  { wave: 4, build: 'zapcoil', tile: EAST_N },
  // From W5 the bank decides: tier 3 on the inner road, its last pads, then the band.
  { wave: 5, upgrade: ROOF },
  { wave: 5, upgrade: ROOF_W },
  { wave: 5, specialize: BEND_N, spec: 'b' }, // Dread: burrowed and jam
  { wave: 5, upgrade: GATE_W },
  { wave: 5, upgrade: GATE_W },
  { wave: 5, upgrade: EAST_N },
  { wave: 5, upgrade: EAST_N },
  ...raise(5, 'prism', EAST_S),
  { wave: 5, specialize: GATE_E, spec: 'a' },
  ...raise(5, 'zapcoil', DOME_W),
  ...raise(5, 'prism', SPAWN_E),
  { wave: 5, specialize: GATE_W, spec: 'a' }, // Echo Spike
  { wave: 5, specialize: ROOF_W, spec: 'a' },
  ...raise(5, 'zapcoil', SOUTH_W),
  ...raise(5, 'prism', SOUTH_E),
  ...raise(5, 'prism', NODE_W),
  ...raise(5, 'zapcoil', WEST_S),
  ...raise(5, 'mindspike', EAST_HIGH),
  ...raise(5, 'prism', EAST_PAD),
  { wave: 5, specialize: EAST_N, spec: 'a' },
  ...raise(5, 'mindspike', IN_W),
  ...raise(5, 'zapcoil', IN_E),
  ...raise(5, 'prism', FLANK_W),
  ...raise(5, 'zapcoil', FLANK_E),
  { wave: 5, specialize: EAST_HIGH, spec: 'b' },
  { wave: 5, specialize: IN_W, spec: 'a' },
  { wave: 5, specialize: DOME_W, spec: 'a' },
  { wave: 5, specialize: WEST_S, spec: 'a' },
  { wave: 5, specialize: IN_E, spec: 'a' },
  { wave: 5, specialize: SOUTH_W, spec: 'a' },
  { wave: 5, specialize: FLANK_E, spec: 'a' },
];

export const builds = defineBuilds({
  // The finale's reference (campaign.md § 4.9): a post-game save owns at least this.
  referenceProfile: REFERENCE_PROFILES.fin_m01,
  parBuild: {
    loadout: ['zapcoil', 'mindspike', 'prism', 'lookout'],
    companion: 'vesthara',
    steps: STEPS,
  },
  noCounterBuilds: {},
});
