// A3M4 · Empty Slot: layout and rules (docs/story/campaign/act3.md § A3M4). The Shelters under the
// colony, the ones Sterling approved in A2M5: concrete tunnels and blast-door bays around a central
// hall where the colonists (convoy) or the warren (warren) shelter. The core is the **shelter
// generator** in the hall (11,11); the hall itself, below it, is dressing.
//
// Two tunnels come down to the hall, mirror images of each other: the Hollow's **tunnel** (west, in
// at (0,2)) and Everglow's **service tunnel** (east, in at (21,2)), where the Liability Enforcers
// walk in to repossess the generator. Each runs along the north wall, down into its own switchback
// (row 5, then down to row 8), and along row 8 to the **hall junction** (11,8), from which one
// corridor runs down to the generator (29 and 28 tiles). Two rifts (W14) break in through the
// bays' south walls onto each tunnel's last bend, and Rift Moths fly a lane in from the north-east
// corner to the hall. Gerald's route is an old **mail chute**, an air lane of its own from the west
// wall across the Hollow's tunnel and over the junction to the hall, where he delivers.
//
// Flag dressing (maps.md § 7, `markerWhen`; render's): under `convoy` a blast door stands upright by
// the hall, painted HE HELD THE DOOR; under `warren` a ring of Skitterkin hum by the hall door. The
// last Mandatory Fun Friday banner hangs across the hall either way (Goldie has one end of it over
// sleeping kids).
import { defineMapLayout } from '../../define.ts';
import type { GridPos } from '../../types.ts';

/** The shared corridor from the hall junction down to the generator. */
// prettier-ignore
const CORRIDOR: readonly GridPos[] = [[11, 9], [11, 10], [11, 11]];

/** The Hollow's tunnel, west (29 tiles). */
// prettier-ignore
const TUNNEL: readonly GridPos[] = [
  [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2],   // along the north wall
  [7, 3], [7, 4], [7, 5],                                           // down
  [6, 5], [5, 5], [4, 5], [3, 5],                                   // back west
  [3, 6], [3, 7], [3, 8],                                           // down into the bays
  [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [10, 8], [11, 8], // east to the hall junction
  ...CORRIDOR,
];

/** Everglow's service tunnel, east (28 tiles). */
// prettier-ignore
const SERVICE: readonly GridPos[] = [
  [21, 2], [20, 2], [19, 2], [18, 2], [17, 2], [16, 2], [15, 2], [14, 2], // along the north wall
  [14, 3], [14, 4], [14, 5],                                              // down
  [15, 5], [16, 5], [17, 5], [18, 5],                                     // back east
  [18, 6], [18, 7], [18, 8],                                              // down into the bays
  [17, 8], [16, 8], [15, 8], [14, 8], [13, 8], [12, 8], [11, 8],          // west to the junction
  ...CORRIDOR,
];

/** The tail of `road` from tile (x, y) (inclusive) to the generator. */
const roadFrom = (road: readonly GridPos[], x: number, y: number): GridPos[] =>
  road.slice(road.findIndex(([a, b]) => a === x && b === y));

export const map = defineMapLayout({
  id: 'a3_m04',
  act: 3,
  env: 'act3',
  objective: 'defend',
  size: { cols: 22, rows: 14 },
  // Pads (18): inside each switchback (north and south of its back run) and beside its down run;
  // the outer bays at each tunnel's mouth; the four corners of the hall junction, and one more
  // under its south-west corner beside the corridor (the two touch: a link pair); under the Moths'
  // lane north of the junction; beside each rift's bay; and either side of the generator.
  // prettier-ignore
  tiles: [
    '......................',
    '......................',
    'S#######......#######S',
    '.....o.#......#.o.....',
    '.o.....#o....o#.....o.',
    '...#####...o..#####...',
    '...#..............#...',
    '...#.o....o.o...o.#...',
    '...################...',
    '.o........o#o.......o.',
    '..........o#..........',
    '.........o.C.o........',
    '......................',
    '......................',
  ],
  paths: [
    { id: 'tunnel', tiles: TUNNEL },
    { id: 'service', tiles: SERVICE },
  ],
  riftLanes: [
    // The west bay's rift (W14): in through the south-west wall along row 11, up onto the tunnel's
    // last bend at (3,8) (20).
    {
      id: 'rift_w',
      opensAtWave: 14,
      tiles: [[0, 11], [1, 11], [2, 11], [3, 11], [3, 10], [3, 9], ...roadFrom(TUNNEL, 3, 8)],
    },
    // The east bay's rift (W14): the same in the south-east, onto the service tunnel at (18,8) (20).
    {
      id: 'rift_e',
      opensAtWave: 14,
      // prettier-ignore
      tiles: [
        [21, 11], [20, 11], [19, 11], [18, 11], [18, 10], [18, 9], ...roadFrom(SERVICE, 18, 8),
      ],
    },
  ],
  airLanes: [
    // Rift Moths: in from the north-east corner, over the junction's north side, to the hall.
    {
      id: 'sky',
      points: [
        [21, 0],
        [12, 4],
        [11, 11],
      ],
    },
    // Gerald's old mail chute (W7): in from the west wall along row 7, across the Hollow's tunnel,
    // then down over the junction to the hall, where he delivers (sim: he never leaks).
    {
      id: 'chute',
      points: [
        [0, 7],
        [9, 7],
        [11, 11],
      ],
    },
  ],
  // The hall's dressing (render reads the markers): the banner across it, the hall door, and by
  // it the door's own memorial (`markerWhen`); the chute's mouth in the west wall.
  markers: {
    banner_friday: [11, 13],
    hall_door: [11, 12],
    held_door: [9, 13],
    humming_ring: [13, 13],
    mail_chute: [0, 7],
  },
  markerWhen: {
    held_door: { flag: 'door_choice', eq: 'convoy' },
    humming_ring: { flag: 'door_choice', eq: 'warren' },
  },
  startCredits: 660,
  stardust: 330,
  // Jam (the Silencers), armor (the drones, the Expediters, and the Liability Enforcers' heavy
  // plate), and air (the Rift Moths) are the map's answers (campaign.md § 4.8): jam is the new
  // category. The haste aura is intel; the Mote and Fracture screens are soft (≤ 15% of a wave).
  threatIntel: ['jammer', 'armored', 'haste_aura', 'flying', 'phasing', 'splitting', 'clustered'],
  requiredCounters: ['jam', 'armor', 'air'],
  // Keep the Lights On (act3.md § A3M4, Medals): never more than one tower jammed at once.
  medals: {
    challenge: {
      id: 'keep_the_lights_on',
      name: 'Keep the Lights On',
      description: 'Never more than one tower jammed at once.',
      condition: { stat: 'jammedPeak', lte: 1 },
    },
  },
  // Objective Intel +1 (act3.md § A3M4): Gerald is never hit. Only shots aimed at him count (D072),
  // so it measures the Hold Fire choice on his pass.
  objectives: [
    {
      id: 'signature_received',
      name: 'Signature: Received',
      description: 'Gerald is never hit.',
      condition: { stat: 'neutralHits', lte: 0 },
      intel: 1,
    },
  ],
  // Bricks's slot is empty: his portrait is dark and his button disabled (core-loop.md § 3.1).
  companion: { id: 'bricks', state: 'absent' },
});
