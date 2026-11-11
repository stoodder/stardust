// A3M2 balance-harness builds: docs/story/campaign/act3.md § A3M2, Par build. The Clean Exit
// (map.ts) takes the Everglow class with the most credits invested mid-W7; the steps after it for
// that class are skipped by the executor (T606), and the refund rebuilds on the freed pads.
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos } from '../../types.ts';

// A1M4's pads on this grid (A1M4 + (4, 2)).
/** Inside the plaza's north-west corner, beside the west side. */
const NW: GridPos = [7, 4];
/** Inside the plaza's north-east corner, under the centre billboard. */
const NE: GridPos = [13, 4];
/** West of the west side (A1M4's west pads). */
const WEST_N: GridPos = [5, 5];
const WEST_S: GridPos = [5, 8];
/** Inside the south-east bend, beside the fountain. */
const BEND: GridPos = [13, 8];
/** South of the south side. */
const SOUTH_W: GridPos = [8, 10];
const SOUTH_E: GridPos = [11, 10];
/** The gate court between the east side and the east edge. */
const COURT_N: GridPos = [15, 6];
const COURT_W: GridPos = [15, 7];
const COURT_E: GridPos = [16, 7];
const COURT_S: GridPos = [15, 9];
/** Above the billboard stretch, where the road turns down the east edge. */
const BILLBOARD: GridPos = [17, 3];
// The band's pads.
/** North of the west rift. */
const RIFT_W: GridPos = [2, 3];
/** Below the gate, beside the east rift. */
const GATE_S: GridPos = [16, 12];
/** Beside the east edge, outside the gate court. */
const EDGE_N: GridPos = [19, 6];
const EDGE_S: GridPos = [19, 9];
/** South of the plaza. */
const BAND_S: GridPos = [11, 12];

/** Orbital Strike points: the west side and the south side. */
const WEST_SIDE: GridPos = [6, 6];
const SOUTH_SIDE: GridPos = [10, 9];

function parSteps(): BuildStep[] {
  return [
    { wave: 1, build: 'thumper', tile: COURT_W },
    { wave: 1, build: 'harpoon', tile: BEND },
    { wave: 1, build: 'rivet', tile: WEST_N },
    { wave: 1, upgrade: COURT_W },
    { wave: 1, ability: 1, target: WEST_SIDE, when: { afterSec: 6 } },
    { wave: 2, build: 'harpoon', tile: NW },
    { wave: 2, upgrade: WEST_N },
    { wave: 3, upgrade: WEST_N }, // T3: pierce
    { wave: 4, build: 'rivet', tile: COURT_E },
    { wave: 4, upgrade: COURT_E },
    { wave: 4, ability: 1, target: SOUTH_SIDE, when: { afterSec: 8 } },
    { wave: 5, upgrade: COURT_E }, // T3: pierce
    { wave: 6, upgrade: BEND },
    { wave: 6, upgrade: NW },
    // The Clean Exit takes the Rivets (660 invested against the Thumper's 225): the refund
    // rebuilds as a Harpoon on the west side and Mindspikes for the Hollow.
    { wave: 8, build: 'harpoon', tile: WEST_S },
    { wave: 8, build: 'mindspike', tile: COURT_N },
    { wave: 8, build: 'mindspike', tile: SOUTH_W },
    { wave: 8, upgrade: COURT_N },
    { wave: 9, upgrade: SOUTH_W },
    { wave: 9, upgrade: WEST_S },
    { wave: 10, upgrade: COURT_N },
    { wave: 11, upgrade: BEND },
    { wave: 11, upgrade: SOUTH_W },
    { wave: 12, upgrade: NW },
    { wave: 12, build: 'harpoon', tile: EDGE_S },
    { wave: 13, upgrade: WEST_S },
    { wave: 13, upgrade: EDGE_S },
    { wave: 14, upgrade: EDGE_S },
    { wave: 14, build: 'harpoon', tile: EDGE_N },
    { wave: 15, upgrade: EDGE_N },
  ];
}

export const builds = defineBuilds({
  // A3M2's reference profile (campaign.md § 4.9): A3M1's, plus the Harpoon's license and the
  // Mindspike's attunement, with Emergency Bulkhead in the protocol slot.
  referenceProfile: REFERENCE_PROFILES.a3_m02,
  parBuild: { loadout: ['harpoon', 'mindspike', 'rivet', 'thumper'], steps: parSteps() },
  noCounterBuilds: {
    // No armor answer: Mindspike, Thumper, Zapcoil, Sprinkler (no Harpoon, no Prism, no Rivet,
    // no Bunker Buster); Psionic barely scratches the drones.
    armor: {
      loadout: ['mindspike', 'thumper', 'zapcoil', 'sprinkler'],
      steps: [
        { wave: 1, build: 'thumper', tile: COURT_W },
        { wave: 1, build: 'mindspike', tile: BEND },
        { wave: 1, build: 'zapcoil', tile: WEST_N },
        { wave: 1, upgrade: COURT_W },
        { wave: 1, ability: 1, target: WEST_SIDE, when: { afterSec: 6 } },
        { wave: 2, build: 'mindspike', tile: NW },
        { wave: 2, upgrade: WEST_N },
        { wave: 3, build: 'sprinkler', tile: COURT_E },
        { wave: 4, upgrade: BEND },
        { wave: 4, ability: 1, target: SOUTH_SIDE, when: { afterSec: 8 } },
        { wave: 5, upgrade: NW },
        { wave: 6, upgrade: BEND },
        { wave: 6, upgrade: NW },
        { wave: 8, build: 'thumper', tile: SOUTH_W },
        { wave: 8, upgrade: SOUTH_W },
        { wave: 9, upgrade: COURT_W },
      ],
    },
    // No splash answer: Harpoon, Mindspike, Rivet, Prism (no Thumper or Zapcoil, no Rivet Storm or
    // Echo Spike): par with a Prism where its Thumper stands.
    splash: {
      loadout: ['harpoon', 'mindspike', 'rivet', 'prism'],
      steps: parSteps().map((s) =>
        'build' in s && s.build === 'thumper' ? { ...s, build: 'prism' } : s,
      ),
    },
  },
  altBuilds: {
    // Harpoon, Prism, Zapcoil, Sprinkler: the cue takes the Sprinkler (the loadout's one Everglow
    // class). Zapcoils chain the clusters (Conductive with the court's Sprinkler until the cue);
    // the Harpoons and the Prism carry the armor.
    coil_and_beam: {
      loadout: ['harpoon', 'prism', 'zapcoil', 'sprinkler'],
      steps: [
        { wave: 1, build: 'zapcoil', tile: COURT_W },
        { wave: 1, build: 'sprinkler', tile: COURT_E }, // Conductive with the court's Zapcoil
        { wave: 1, build: 'zapcoil', tile: WEST_N },
        { wave: 1, build: 'harpoon', tile: BEND },
        { wave: 1, upgrade: COURT_W },
        { wave: 1, ability: 1, target: WEST_SIDE, when: { afterSec: 6 } },
        { wave: 2, upgrade: WEST_N },
        { wave: 3, build: 'harpoon', tile: NW },
        { wave: 4, build: 'prism', tile: COURT_N },
        { wave: 4, ability: 1, target: SOUTH_SIDE, when: { afterSec: 8 } },
        { wave: 5, upgrade: COURT_W },
        { wave: 6, upgrade: BEND },
        { wave: 6, upgrade: COURT_N },
        { wave: 7, upgrade: COURT_E },
        { wave: 8, build: 'zapcoil', tile: COURT_S },
        { wave: 8, upgrade: COURT_S },
        { wave: 9, upgrade: NW },
        { wave: 9, upgrade: COURT_N },
        { wave: 10, build: 'zapcoil', tile: GATE_S },
        { wave: 10, upgrade: GATE_S },
        { wave: 11, upgrade: BEND },
        { wave: 11, upgrade: WEST_N },
        { wave: 12, build: 'harpoon', tile: SOUTH_E },
        { wave: 12, upgrade: COURT_S },
        { wave: 13, upgrade: SOUTH_E },
        { wave: 13, upgrade: NW },
        { wave: 14, upgrade: GATE_S },
      ],
    },
    // Mindspike, Prism, Zapcoil, Rivet: the cue takes the Rivets; the Prisms' beams carry the
    // armor after it, the Zapcoils the clusters, a Mindspike the Hollow.
    beam_and_spike: {
      loadout: ['mindspike', 'prism', 'zapcoil', 'rivet'],
      steps: [
        { wave: 1, build: 'zapcoil', tile: COURT_W },
        { wave: 1, build: 'rivet', tile: WEST_N },
        { wave: 1, build: 'prism', tile: BEND },
        { wave: 1, upgrade: COURT_W },
        { wave: 1, ability: 1, target: WEST_SIDE, when: { afterSec: 6 } },
        { wave: 2, build: 'zapcoil', tile: SOUTH_W },
        { wave: 2, upgrade: WEST_N },
        { wave: 3, upgrade: WEST_N },
        { wave: 4, build: 'rivet', tile: COURT_E },
        { wave: 4, upgrade: COURT_E },
        { wave: 4, ability: 1, target: SOUTH_SIDE, when: { afterSec: 8 } },
        { wave: 5, upgrade: COURT_E },
        { wave: 6, upgrade: BEND },
        { wave: 6, build: 'prism', tile: NW },
        { wave: 8, build: 'prism', tile: COURT_N },
        { wave: 8, build: 'mindspike', tile: WEST_S },
        { wave: 8, upgrade: COURT_N },
        { wave: 9, upgrade: SOUTH_W },
        { wave: 9, upgrade: WEST_S },
        { wave: 10, build: 'zapcoil', tile: GATE_S },
        { wave: 10, upgrade: GATE_S },
        { wave: 11, upgrade: NW },
        { wave: 11, upgrade: COURT_W },
        { wave: 12, upgrade: COURT_N },
        { wave: 12, build: 'prism', tile: EDGE_S },
        { wave: 13, upgrade: BEND },
        { wave: 13, upgrade: EDGE_S },
        { wave: 13, upgrade: WEST_S },
        { wave: 14, upgrade: GATE_S },
        { wave: 14, upgrade: EDGE_S },
      ],
    },
  },
});

/** Pads named for the tests and alts (balance/a3m2.test.ts). */
export const PADS = {
  NW,
  NE,
  WEST_N,
  WEST_S,
  BEND,
  SOUTH_W,
  SOUTH_E,
  COURT_N,
  COURT_W,
  COURT_E,
  COURT_S,
  BILLBOARD,
  RIFT_W,
  GATE_S,
  EDGE_N,
  EDGE_S,
  BAND_S,
} as const;
