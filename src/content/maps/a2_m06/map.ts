// A2M6 · Sundown: layout and rules (docs/story/campaign/act2.md § A2M6). The colony's north wall at
// sundown, the first Hollow assault on the colony itself, everyone on the wall. Two roads come
// down from the Spires (north-west and north-east) and meet the wall (row 3) at two gates; inside,
// they merge under the old watchtower and wind as one road down to Goldie's dome cluster on the
// south edge (the core), where Pebble sleeps in the lettuce behind a dome window. The Rift Moths
// fly in from the north-west and cross the wall diagonally, over the merge, to the domes. Pads sit
// on the wall walk and in the yard inside it; the watchtower, just inside the wall at the merge, is
// the high ground. Four lamps along the wall are light sources in the dark (radius 1.5, the
// default): they light the wall walk and the pocket between the gates, never the yard, so deep in
// the night only a beaming Prism keeps the yard's towers at full range (maps.md § 5.1, Sundown).
//
// Markers (render draws the ones it knows as props; the wall, the gates, the watchtower, the lamps,
// and the dome window are T540c's): the four lamps, Bricks's post on the wall by the east gate,
// the wall's two ends (the wall runs the whole of row 3, broken by the gates at (6,3) and (11,3)),
// and the dome window where Pebble sleeps.
import { defineMapLayout } from '../../define.ts';

export const map = defineMapLayout({
  id: 'a2_m06',
  act: 2,
  env: 'act2.dusk',
  objective: 'defend',
  size: { cols: 18, rows: 12 },
  // prettier-ignore
  tiles: [
    '...S..........S...',
    '...#..........#...',
    '...####....####...',
    '....o.#.oo.#.o....',
    '......#o..o#......',
    '......######......',
    '.......o#^o.......',
    '...######.........',
    '..o#.o...o..o.....',
    '...###########....',
    '......o...o..#o...',
    '.............C....',
  ],
  // prettier-ignore
  paths: [
    {
      // The west road: down from the Spires, east to the west gate, through it, and into the merge
      // under the watchtower; then the yard road (32 tiles).
      id: 'west',
      tiles: [
        [3, 0], [3, 1], [3, 2],                                     // down from the Spires
        [4, 2], [5, 2], [6, 2],                                     // east under the wall
        [6, 3],                                                     // the west gate
        [6, 4], [6, 5], [7, 5],                                     // inside, to the merge
        [8, 5],                                                     // the merge
        [8, 6], [8, 7],                                             // down past the watchtower
        [7, 7], [6, 7], [5, 7], [4, 7], [3, 7],                     // west across the yard
        [3, 8], [3, 9],                                             // down
        [4, 9], [5, 9], [6, 9], [7, 9], [8, 9], [9, 9],
        [10, 9], [11, 9], [12, 9], [13, 9],                         // east toward the domes
        [13, 10],
        [13, 11],                                                   // into the dome cluster
      ],
    },
    {
      // The east road: down from the Spires, west to the east gate, through it, and into the merge
      // from the east; then the same yard road (33 tiles).
      id: 'east',
      tiles: [
        [14, 0], [14, 1], [14, 2],                                  // down from the Spires
        [13, 2], [12, 2], [11, 2],                                  // west under the wall
        [11, 3],                                                    // the east gate
        [11, 4], [11, 5], [10, 5], [9, 5],                          // inside, to the merge
        [8, 5],                                                     // the merge
        [8, 6], [8, 7],
        [7, 7], [6, 7], [5, 7], [4, 7], [3, 7],
        [3, 8], [3, 9],
        [4, 9], [5, 9], [6, 9], [7, 9], [8, 9], [9, 9],
        [10, 9], [11, 9], [12, 9], [13, 9],
        [13, 10],
        [13, 11],
      ],
    },
  ],
  // The Rift Moths: in from the north-east corner, across the wall diagonally and over the merge to
  // the yard's west side, then down to the domes.
  // prettier-ignore
  airLanes: [{ id: 'sky', points: [[17, 0], [5, 8], [13, 11]] }],
  markers: {
    lamp_west_gate: [5, 3],
    lamp_west_walk: [7, 3],
    lamp_east_walk: [10, 3],
    lamp_east_gate: [12, 3],
    bricks_post: [15, 3],
    wall_west_end: [0, 3],
    wall_east_end: [17, 3],
    dome_window: [15, 11],
  },
  // The lamps along the wall stay on all night (radius 1.5, LAMP_RADIUS_TILES): the wall walk's
  // pads and the pocket between the gates are lit; the yard is not.
  lights: [
    { marker: 'lamp_west_gate' },
    { marker: 'lamp_west_walk' },
    { marker: 'lamp_east_walk' },
    { marker: 'lamp_east_gate' },
  ],
  // Sundown (maps.md § 5.1): dusk through W3, then the dark deepens in equal steps from W4 to full
  // Long Night darkness as W11 starts (eased over 4 s), so it is full dark through W12's build
  // phase, where Goldie's line plays, and every wave after (balance/a2m6.test.ts checks it).
  lighting: [
    { wave: 3, env: 'act2.dusk', dark: 0 },
    { wave: 11, env: 'act2.dusk', dark: 1 },
  ],
  startCredits: 550,
  stardust: 260,
  // The Fractures' splits and the Mote clusters (splash) and the Rift Moths (air) are the map's two
  // answers (campaign.md § 4.9's no-counter builds). No Skitterkin: they are inside the domes now.
  threatIntel: ['clustered', 'splitting', 'flying', 'phasing'],
  requiredCounters: ['splash', 'air'],
  // Before the Dark (act2.md § A2M6, Medals): no leaks in the last three waves (by the leaker's
  // spawn wave; D137).
  medals: {
    challenge: {
      id: 'before_the_dark',
      name: 'Before the Dark',
      description: 'Let nothing through in the last three waves.',
      condition: { leaks: { waves: [12, 14] }, lte: 0 },
    },
  },
  // Ves'thara fights beside you tonight: slot 2 is her Stillness.
  companion: { id: 'vesthara', state: 'present' },
  // Bricks in person on the wall by the east gate (design/maps.md § 5.4): his rivet cannon, about a
  // tier-1 Rivet's DPS, over the east road as it comes down to the gate.
  allies: [
    {
      kind: 'bricks',
      post: 'bricks_post',
      attack: {
        type: 'kinetic',
        damage: 8,
        ratePerSec: 2,
        rangeTiles: 2,
        targets: { ground: true, air: true },
      },
    },
  ],
});
