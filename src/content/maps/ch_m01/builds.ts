// CH_M01 balance-harness builds (Skitterkin Only; T862). The reference profile is the campaign's
// end (FIN's row, campaign.md § 4.9): a post-game player owns at least that, and it holds no spec
// for a Skitterkin tower, so every home here tops out at tier 3. Par splits the work between the
// Gloops (the crowds) and the Sproing Pads (the sky, and they bonk the ground well too); it carries
// the Hum Choir but never builds one, since no two of A3M1's pads stand close enough for its aura.
// The par band is the challenge maps' own (below).
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos, TowerId } from '../../types.ts';

// A3M1's pads.
/** Between the outer ring (row 2) and the basin's ring, where the north road comes in. */
const RING_NW: GridPos = [10, 3];
/** Between the west ring (column 8) and the basin's west side. */
const RING_W: GridPos = [9, 6];
/** Between the north rift and the west ring. */
const RIFT_NW: GridPos = [6, 4];
/** East of the bowl, under the Moths' lane as it comes in. */
const LANE_E: GridPos = [19, 10];
/** Inside the south-west corner of the spiral, under the Moths' lane. */
const CORNER: GridPos = [9, 10];
/** Between the east ring (column 16) and the basin's east side. */
const RING_E: GridPos = [15, 5];
/** Beside the gate. */
const GATE: GridPos = [4, 12];
/** South of the long run east, under the Moths' lane as it comes in. */
const SOUTH: GridPos = [13, 9];
/** Between the north road's turn and the basin's ring. */
const RING_NE: GridPos = [13, 3];
/** Over the north fence, beside the north road. */
const FENCE: GridPos = [11, 1];

/** Build `tower` at `tile`, then take it to tier 3. */
const raise = (wave: number, tower: TowerId, tile: GridPos): BuildStep[] => [
  { wave, build: tower, tile },
  { wave, upgrade: tile },
  { wave, upgrade: tile },
];

function parSteps(): BuildStep[] {
  return [
    // The setup (the bank is deep): a Gloop each side of the trunk, a Sproing Pad where the north
    // road comes in and the Den beside it, a Pad by the gate and one under the Moths' lane.
    ...raise(1, 'gloop', RING_W),
    ...raise(1, 'gloop', CORNER),
    { wave: 1, build: 'sproing', tile: RING_NE },
    { wave: 1, upgrade: RING_NE },
    { wave: 1, build: 'burrow', tile: RING_NW },
    { wave: 1, build: 'sproing', tile: GATE },
    { wave: 1, build: 'sproing', tile: SOUTH },
    { wave: 2, upgrade: RING_NE },
    { wave: 3, upgrade: GATE },
    { wave: 4, upgrade: SOUTH },
    { wave: 4, upgrade: RING_NW },
    ...raise(4, 'gloop', RIFT_NW),
    ...raise(5, 'sproing', LANE_E),
    { wave: 6, upgrade: GATE },
    { wave: 6, upgrade: SOUTH },
    { wave: 7, upgrade: RING_NW },
    ...raise(8, 'gloop', RING_E),
    { wave: 9, build: 'sproing', tile: FENCE },
  ];
}

/** Par's placements and spending with each tower swapped by `swap` (a no-counter or alt build). */
function swapped(swap: Readonly<Partial<Record<TowerId, TowerId>>>): BuildStep[] {
  return parSteps().map((st) => {
    const to = 'build' in st ? swap[st.build] : undefined;
    return to === undefined ? st : { ...st, build: to };
  });
}

export const builds = defineBuilds({
  referenceProfile: REFERENCE_PROFILES.fin_m01,
  // The challenge maps' band (T862): par is judged in 50–70 (Act III's band), never against the
  // campaign's curve (outside the monotonic chain, balance/harness.ts).
  marginBand: { minPct: 50, maxPct: 70 },
  parBuild: { loadout: ['gloop', 'burrow', 'sproing', 'choir'], steps: parSteps() },
  noCounterBuilds: {
    // No Gloop: Sproing Pads in its place (they bonk one at a time).
    splash: { loadout: ['burrow', 'sproing', 'choir'], steps: swapped({ gloop: 'sproing' }) },
    // No Sproing Pad: Gloops in its place (ground only).
    air: { loadout: ['gloop', 'burrow', 'choir'], steps: swapped({ sproing: 'gloop' }) },
  },
});
