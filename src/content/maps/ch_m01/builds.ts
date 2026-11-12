// CH_M01 balance-harness builds (Skitterkin Only; T862). The reference profile is the campaign's
// end (FIN's row, campaign.md § 4.9): a post-game player owns at least that, and it holds no spec
// for a Skitterkin tower, so every home here tops out at tier 3. The par band is the challenge
// maps' own (below).
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
const RIFT_SW: GridPos = [6, 8];
/** Inside the south-west corner of the spiral, under the Moths' lane. */
const CORNER: GridPos = [9, 10];
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
    { wave: 1, build: 'gloop', tile: RING_W },
    { wave: 1, build: 'gloop', tile: RING_NE },
    { wave: 1, build: 'burrow', tile: RING_NW },
    { wave: 1, build: 'sproing', tile: GATE },
    { wave: 1, upgrade: RING_W },
    { wave: 1, upgrade: RING_NE },
    { wave: 2, build: 'gloop', tile: CORNER },
    { wave: 2, upgrade: RING_W },
    { wave: 3, upgrade: RING_NE },
    { wave: 3, upgrade: RING_NW },
    { wave: 4, upgrade: GATE },
    { wave: 4, build: 'sproing', tile: SOUTH },
    { wave: 5, upgrade: CORNER },
    { wave: 5, build: 'burrow', tile: RIFT_NW },
    { wave: 6, upgrade: RING_NW },
    { wave: 7, upgrade: SOUTH },
    { wave: 8, upgrade: GATE },
    { wave: 8, upgrade: CORNER },
    { wave: 8, upgrade: RIFT_NW },
    ...raise(9, 'gloop', FENCE),
    { wave: 10, upgrade: SOUTH },
    { wave: 10, upgrade: RIFT_NW },
    ...raise(11, 'gloop', RIFT_SW),
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
  // The challenge maps' band (T862): a post-game map asks for the campaign's end and then some, so
  // par is judged in 50–70 (Act III's floor, a little narrower at the top), never against the
  // campaign's curve (outside the monotonic chain, balance/harness.ts).
  marginBand: { minPct: 50, maxPct: 70 },
  parBuild: { loadout: ['gloop', 'burrow', 'sproing', 'choir'], steps: parSteps() },
  noCounterBuilds: {
    // No Gloop: the Den and the Choir in its place.
    splash: { loadout: ['burrow', 'sproing', 'choir'], steps: swapped({ gloop: 'burrow' }) },
    // No Sproing Pad: Gloops in its place (ground only).
    air: { loadout: ['gloop', 'burrow', 'choir'], steps: swapped({ sproing: 'gloop' }) },
    // No Den, no Underfoot: Gloops in its place.
    burrowed: { loadout: ['gloop', 'sproing', 'choir'], steps: swapped({ burrow: 'gloop' }) },
  },
});
