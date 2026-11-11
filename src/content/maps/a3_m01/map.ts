// A3M1 · The Preserve: layout and rules (docs/story/campaign/act3.md § A3M1). Everglow's "Humane
// Relocation Preserve", a fenced bowl, in the Long Night. The Hollow is inside, where you led them.
// The refugee road spirals out from the inner basin (the warren homes under the Preserve's sign) to
// the back gate in the south-west (the safe exit, toward the shelters): east, up, back west round
// the basin, down, the long run east, up the east fence, the long run west under the north fence,
// down the west side, and out along the south to the gate (50 tiles; a group takes about 75 s).
// The Hollow come from inside the basin, behind the refugees, and down the north spawn road, which
// joins the spiral's outer ring under the north fence. Rift lanes crack through the fences: the
// north rift (from W2) cuts down through the decor west of the spiral onto the west ring; the
// east rift (from W6) breaks in through the east fence onto the east ring. Both cross only decor
// and road, never a pad (maps.md § 4), and each cracks as the wave before it starts. Rift Moths fly
// in from the north-east, over the basin, to the gate. Pads sit between the spiral's rings, so a
// tower there covers two of them, and outside the outer ring beside the rifts.
//
// Markers (render draws the ones it knows as props; the Preserve's are T630b's): the back gate (the
// safe exit), the inner basin and its sign over the inner gate, the warren homes (the Scuttle Den's
// mounds look like them), the fences the rifts break through, and Bricks's view of it all is none:
// he's on the radio.
import { defineMapLayout } from '../../define.ts';

/** The spiral: from the inner basin (12,6) out to the back gate (2,13), 50 tiles. */
// prettier-ignore
const SPIRAL = [
  [12, 6], [13, 6], [14, 6],                                          // out of the basin, east
  [14, 5], [14, 4],                                                   // up
  [13, 4], [12, 4], [11, 4], [10, 4],                                 // back west over the basin
  [10, 5], [10, 6], [10, 7], [10, 8],                                 // down its west side
  [11, 8], [12, 8], [13, 8], [14, 8], [15, 8], [16, 8],               // the long run east
  [16, 7], [16, 6], [16, 5], [16, 4], [16, 3], [16, 2],               // up the east fence
  [15, 2], [14, 2], [13, 2], [12, 2], [11, 2], [10, 2], [9, 2], [8, 2], // west under the north fence
  [8, 3], [8, 4], [8, 5], [8, 6], [8, 7], [8, 8], [8, 9], [8, 10], [8, 11], // down the west side
  [7, 11], [6, 11], [5, 11], [4, 11], [3, 11], [2, 11],               // along the south
  [2, 12], [2, 13],                                                   // out of the back gate
] as const satisfies readonly (readonly [number, number])[];

/** The spiral from tile `from` (inclusive) to the gate. */
const spiralFrom = (x: number, y: number): [number, number][] => {
  const i = SPIRAL.findIndex(([a, b]) => a === x && b === y);
  return SPIRAL.slice(i).map(([a, b]) => [a, b]);
};

export const map = defineMapLayout({
  id: 'a3_m01',
  act: 3,
  env: 'act3',
  objective: 'escort',
  meterLabel: 'evacuated',
  // The refugees lost (hushed or gathered on the road, or taken at the gate) that lose the map,
  // every pip full (D138).
  maxLost: 13,
  size: { cols: 22, rows: 14 },
  // prettier-ignore
  tiles: [
    '............S.........',
    '...........o#..o......',
    '........#########.....',
    '........#.o..o..#.....',
    '......o.#.#####.#.o...',
    '........#.#...#o#.....',
    '........#o#.S##.#.....',
    '........#.#.o...#.....',
    '......o.#.#######.o...',
    '...o....#....o........',
    '........#o.........o..',
    '..#######.............',
    '..#.o.................',
    '..C...................',
  ],
  paths: [
    // The refugees' road, and the Hollow inside the basin behind them.
    { id: 'spiral', tiles: SPIRAL.map(([a, b]) => [a, b]) },
    // In at the north edge, down onto the outer ring under the north fence (12,2), and out (24).
    { id: 'north', tiles: [[12, 0], [12, 1], ...spiralFrom(12, 2)] },
  ],
  riftLanes: [
    // The north rift (W2): down through the decor west of the spiral, east under the old fence
    // post onto the west ring (8,5), and out with it (27 tiles).
    {
      id: 'rift_n',
      opensAtWave: 2,
      // prettier-ignore
      tiles: [
        [5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5], [6, 5], [7, 5],
        ...spiralFrom(8, 5),
      ],
    },
    // The east rift (W6): in through the east fence along row 6 onto the east ring (16,6) (35).
    {
      id: 'rift_e',
      opensAtWave: 6,
      tiles: [[21, 6], [20, 6], [19, 6], [18, 6], [17, 6], ...spiralFrom(16, 6)],
    },
  ],
  // Rift Moths in from the east, low over the south of the bowl, to the gate.
  airLanes: [
    {
      id: 'sky',
      points: [
        [21, 9],
        [11, 10],
        [2, 13],
      ],
    },
  ],
  markers: {
    gate: [2, 13],
    basin: [12, 5],
    sign: [11, 5],
    home_1: [13, 5],
    home_2: [11, 6],
    home_3: [11, 7],
    home_4: [13, 7],
    fence_north: [9, 1],
    fence_east: [18, 6],
    fence_north_1: [6, 1],
    fence_north_2: [8, 1],
    fence_north_3: [14, 1],
    fence_north_4: [17, 1],
    fence_east_1: [18, 3],
    fence_east_2: [18, 5],
    fence_east_3: [18, 7],
    fence_east_4: [18, 9],
  },
  safeExit: 'gate',
  // The refugee groups (6 each, 0.7 tiles/s; maps.md § 5.2), released as their waves start: the
  // first group out (W1), the second under the Rift Moths (W5), Bramble's own column (W9), the
  // third, Old Thrum's, only if she was spared at A1M5 (W10; `spared_quiet_wave`), and the last (W14).
  refugees: {
    first: { route: 'spiral' },
    second: { route: 'spiral' },
    bramble: { route: 'spiral' },
    thrum: { route: 'spiral', when: { flag: 'spared_quiet_wave', eq: true } },
    last: { route: 'spiral' },
  },
  startCredits: 600,
  stardust: 280,
  // Splash (the Mote clusters, the Fractures, and the Maw's gathering: kill the small ones near it,
  // or burst it) and air (the Rift Moths) are the map's answers (campaign.md § 4.8). The Maw's
  // armor, the Moths' phasing, and the rifts are intel only.
  threatIntel: ['clustered', 'splitting', 'gathering', 'armored', 'flying', 'phasing'],
  requiredCounters: ['splash', 'air'],
  // Nothing Gathered (act3.md § A3M1, Medals): no Maw gathers a refugee.
  medals: {
    challenge: {
      id: 'nothing_gathered',
      name: 'Nothing Gathered',
      description: 'No Maw gathers a refugee.',
      condition: { stat: 'refugeesGathered', lte: 0 },
    },
  },
  // Objective Intel +1 (act3.md § A3M1): Bramble's column (W9) loses no one.
  objectives: [
    {
      id: 'matriarchs_young',
      name: "The Matriarch's Young",
      description: "Bramble's column loses no one.",
      condition: { groupLost: 'bramble', lte: 0 },
      intel: 1,
    },
  ],
  // Bramble walks with her people: slot 2 is her Underfoot.
  companion: { id: 'bramble', state: 'present' },
  events: [
    { id: 'first', on: { wave: 1, phase: 'start' }, actions: [{ spawnAllies: 'first' }] },
    { id: 'second', on: { wave: 5, phase: 'start' }, actions: [{ spawnAllies: 'second' }] },
    { id: 'bramble', on: { wave: 9, phase: 'start' }, actions: [{ spawnAllies: 'bramble' }] },
    // Never released when she wasn't spared (sim/escort.ts: a gated group is released at createSim).
    { id: 'thrum', on: { wave: 10, phase: 'start' }, actions: [{ spawnAllies: 'thrum' }] },
    { id: 'last', on: { wave: 14, phase: 'start' }, actions: [{ spawnAllies: 'last' }] },
  ],
});
