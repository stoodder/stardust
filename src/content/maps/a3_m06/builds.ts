// A3M6 balance-harness builds: docs/story/campaign/act3.md § A3M6, Par build. The map is judged on
// Sheltered % (the Escort chain; maps.md § 6.1). The harness runs par under every `door_choice` ×
// `quill_choice` cell (D146 fork 3): the convoy mans the militia's posts, and Purge's −2 Everglow
// armor carries from A3M5. The reference profile is the same in every cell (reference.ts
// REFERENCE_VARIANTS: both doors own the Gloop by now, and Zibzab's crate is in it).
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES, REFERENCE_VARIANTS } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos, TowerId } from '../../types.ts';

// The pads: A1M1's ten at its offset (4, 2), and the band's nine.
/** Either side of the road's way in at the north edge (band). */
const IN_W: GridPos = [7, 1];
const IN_E: GridPos = [9, 1];
/** East of the road below A1M1's spawn. */
const SPAWN_E: GridPos = [10, 3];
/** West of the road's turn east, by the domes. */
const DOME_W: GridPos = [6, 4];
/** Beside the greenhouse roof, and the roof itself (high ground; A1M1's first Rivet). */
const ROOF_W: GridPos = [10, 4];
const ROOF: GridPos = [11, 4];
/** West of the road's run back west: the inner bend (two pads, a link pair). */
const BEND_N: GridPos = [7, 6];
const BEND_S: GridPos = [7, 7];
/** East of the road's run south (two pads, a link pair). */
const EAST_N: GridPos = [14, 6];
const EAST_S: GridPos = [14, 7];
/** Either side of the road's last leg to the gate: the gate approach. */
const GATE_W: GridPos = [6, 9];
const GATE_E: GridPos = [10, 9];
/** The band's west side, either side of the west rift, under the west air lane. */
const WEST_N: GridPos = [3, 4];
const WEST_S: GridPos = [3, 6];
/** The band's east side, either side of the east rift, under the east air lane, and its turn. */
const EASTB_N: GridPos = [18, 4];
const EASTB_S: GridPos = [18, 6];
const LANE_E: GridPos = [18, 9];
/** Either side of the barricade below the gate (band). */
const BAR_W: GridPos = [7, 12];
const BAR_E: GridPos = [9, 12];

/** Suppressing Fire (slot 1) on the road at `target`, `afterSec` into `wave`. */
const fire = (wave: number, afterSec: number, target: GridPos): BuildStep => ({
  wave,
  ability: 1,
  target,
  when: { afterSec },
});
/** Clearance Sale (slot 2) as `wave` starts: its next three purchases at 40% off. */
const sale = (wave: number): BuildStep => ({ wave, ability: 2, when: 'waveStart' });

/** Where Suppressing Fire lands on the Gathering Maw: the road's turn south past the domes. */
export const MAW_TRAP: GridPos = [8, 4];
/** W16: Suppressing Fire on the Maw on the road below the spawn, and again 50 s later. */
export const MAW_FIRE_SEC = 26;

function parSteps(): BuildStep[] {
  return [
    { wave: 1, build: 'harpoon', tile: ROOF },
    { wave: 1, build: 'mindspike', tile: BEND_S },
    { wave: 1, build: 'sproing', tile: GATE_E },
    { wave: 1, build: 'sproing', tile: BEND_N },
    { wave: 2, build: 'harpoon', tile: EAST_S },
    { wave: 3, upgrade: ROOF },
    { wave: 4, build: 'lookout', tile: ROOF_W },
    sale(5),
    { wave: 5, upgrade: BEND_S },
    { wave: 5, upgrade: ROOF_W },
    { wave: 5, upgrade: EAST_S },
    { wave: 6, upgrade: BEND_S },
    { wave: 7, upgrade: ROOF },
    { wave: 8, build: 'mindspike', tile: DOME_W },
    { wave: 9, upgrade: EAST_S },
    sale(10),
    { wave: 10, upgrade: DOME_W },
    { wave: 10, build: 'harpoon', tile: GATE_W },
    { wave: 11, upgrade: DOME_W },
    { wave: 12, upgrade: GATE_W },
    { wave: 13, build: 'mindspike', tile: EAST_N },
    { wave: 14, upgrade: EAST_N },
    sale(15),
    { wave: 15, upgrade: EAST_N },
    { wave: 15, upgrade: GATE_E },
    fire(16, MAW_FIRE_SEC, MAW_TRAP),
    fire(16, MAW_FIRE_SEC + 50, MAW_TRAP),
    { wave: 16, upgrade: BEND_N },
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
  // A3M6's reference profile (campaign.md § 4.9): A3M5's, the Gloop (Goldie's under the convoy; the
  // warren's since A3M4), Harpoon tune 2, then Zibzab's crate (every rank of an owned Vrell tower's
  // tune-up, free); Head Start on, slot 1 Suppressing Fire whatever C4 was.
  referenceProfile: REFERENCE_PROFILES.a3_m06,
  referenceProfileByFlag: REFERENCE_VARIANTS.a3_m06,
  parBuild: { loadout: ['sproing', 'lookout', 'mindspike', 'harpoon'], steps: parSteps() },
  // The convoy first: a run with no door set (a dev battle) mans the militia's posts.
  flagVariants: { door_choice: ['convoy', 'warren'], quill_choice: ['keep', 'purge', 'rewrite'] },
  noCounterBuilds: {
    // No detection: no Lookout, Lantern, or Scanner Sweep (Sproing, Harpoon, Mindspike, Hum Choir:
    // a Choir where par's Lookout stands). The Operatives walk in unseen.
    detection: {
      loadout: ['sproing', 'harpoon', 'mindspike', 'choir'],
      steps: swapped({ lookout: 'choir' }),
    },
    // No air: nothing in reach of the air lanes (Lookout, Thumper (Bunker Buster), Scuttle Den,
    // Hum Choir: Thumpers where par's Sproings stand, a Den for its Harpoons).
    air: {
      loadout: ['lookout', 'thumper', 'burrow', 'choir'],
      steps: swapped({ sproing: 'thumper', harpoon: 'burrow', mindspike: 'choir' }),
    },
    // No armor: no Harpoon, Prism, Gloop, Bunker Buster, Seeker Swarm, Mindspike (Psionic ignores
    // the Maws' armor), or Rivet at T3 (Lookout, Sproing, Thumper, Hum Choir: Thumpers where par's
    // Mindspikes stand, a Choir for its Harpoons). The shells and the bonks barely scratch the
    // gunships.
    armor: {
      loadout: ['lookout', 'sproing', 'thumper', 'choir'],
      steps: swapped({ harpoon: 'choir', mindspike: 'thumper' }),
    },
  },
  altBuilds: {
    // Lookout, Harpoon, Skyhook, Thumper (act3.md § A3M6): the Skyhooks under each air lane carry
    // the gunships and the Moths, the Harpoons their armor, the Thumpers the Maws.
    hooks: {
      loadout: ['lookout', 'harpoon', 'skyhook', 'thumper'],
      steps: [
        { wave: 1, build: 'harpoon', tile: ROOF },
        { wave: 1, build: 'thumper', tile: BEND_S },
        { wave: 1, build: 'skyhook', tile: GATE_E },
        { wave: 1, build: 'skyhook', tile: EASTB_S },
        { wave: 2, build: 'lookout', tile: GATE_W },
        { wave: 3, upgrade: ROOF },
        { wave: 4, upgrade: BEND_S },
        sale(5),
        { wave: 5, build: 'harpoon', tile: EAST_S },
        { wave: 5, upgrade: GATE_W },
        { wave: 6, build: 'skyhook', tile: WEST_S },
        { wave: 7, upgrade: GATE_E },
        { wave: 8, upgrade: BEND_S },
        { wave: 8, upgrade: EAST_S },
        { wave: 9, build: 'thumper', tile: BEND_N },
        sale(10),
        { wave: 10, upgrade: GATE_E },
        { wave: 10, upgrade: EASTB_S },
        { wave: 11, upgrade: EASTB_S },
        { wave: 12, upgrade: BEND_N },
        { wave: 13, upgrade: ROOF },
        { wave: 14, upgrade: WEST_S },
        sale(15),
        { wave: 15, upgrade: BEND_N },
        fire(16, MAW_FIRE_SEC, MAW_TRAP),
        fire(16, MAW_FIRE_SEC + 50, MAW_TRAP),
        { wave: 16, upgrade: EAST_S },
      ],
    },
    // Lookout, Sproing, Thumper (Bunker Buster), Scuttle Den (act3.md § A3M6): the Sproings bonk
    // the gunships down, the Bunker Busters crack the armor, the Den holds the Maws.
    bonk_and_bust: {
      loadout: ['lookout', 'sproing', 'thumper', 'burrow'],
      steps: [
        { wave: 1, build: 'thumper', tile: ROOF },
        { wave: 1, build: 'burrow', tile: BEND_S },
        { wave: 1, build: 'sproing', tile: GATE_E },
        { wave: 1, build: 'sproing', tile: EASTB_S },
        { wave: 2, build: 'lookout', tile: GATE_W },
        { wave: 3, upgrade: ROOF },
        { wave: 4, upgrade: BEND_S },
        sale(5),
        { wave: 5, build: 'thumper', tile: EAST_S },
        { wave: 5, upgrade: GATE_W },
        { wave: 6, build: 'sproing', tile: WEST_S },
        { wave: 7, upgrade: ROOF },
        { wave: 8, specialize: ROOF, spec: 'b' },
        { wave: 9, upgrade: EAST_S },
        sale(10),
        { wave: 10, upgrade: GATE_E },
        { wave: 10, upgrade: EASTB_S },
        { wave: 11, upgrade: EAST_S },
        { wave: 12, build: 'burrow', tile: BEND_N },
        { wave: 13, upgrade: BEND_N },
        { wave: 14, upgrade: WEST_S },
        sale(15),
        { wave: 15, specialize: EAST_S, spec: 'b' },
        fire(16, MAW_FIRE_SEC, MAW_TRAP),
        fire(16, MAW_FIRE_SEC + 50, MAW_TRAP),
        { wave: 16, upgrade: BEND_N },
      ],
    },
  },
});

/** Pads named for the tests (balance/a3m6*.test.ts). */
export const PADS = {
  IN_W,
  IN_E,
  SPAWN_E,
  DOME_W,
  ROOF_W,
  ROOF,
  BEND_N,
  BEND_S,
  EAST_N,
  EAST_S,
  GATE_W,
  GATE_E,
  WEST_N,
  WEST_S,
  EASTB_N,
  EASTB_S,
  LANE_E,
  BAR_W,
  BAR_E,
} as const;
