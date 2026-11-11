// A3M3 · The Gap: layout and rules (docs/story/campaign/act3.md § A3M3). Okonkwo's Gap, an old mining
// cut in the Long Night. The Hollow come down the cut from the north edge (the switchback past the
// old survey pads), through the choke at mid-map where Bricks stands on his post, and south of it
// the cut forks to the two blast doors: the convoy road's (west) and the warren tunnel's (east).
// Under the fork, the refugees' road runs the whole width of the map. Only the side C3 chose
// (`door_choice`) walks it: the convoy's colonists in from the south-east edge, west under the
// choke's south face, across the east fork, and in at the west door; the warren's Skitterkin in
// from the south-west edge, east, across the west fork, and in at the east door. Each road is 20
// tiles from the map's edge to its door, so the last group lands on the same tick through either
// door (waves.ts). The unchosen door is shut and dark (render's), but any enemy that reaches either
// door follows the exit rule and takes one of the sheltered (sim/escort.ts `leakAtExit`).
//
// Two rifts open behind Bricks, onto the forks, never through him: the east rift (cracks as W3
// starts, opens as W4 does) down column 15 from the north edge onto the east fork; the west rift
// (W11, the doomed escalation) down column 5 onto the west fork. Both cross only decor and road,
// never a pad (maps.md § 4). Rift Moths fly two lanes from the north corners, crossing over the
// choke to the far door.
//
// Markers: the blast doors (each a core `C` a group's `exit` names), Bricks's post on the rock
// beside the choke (he blocks the road where it passes nearest it, (10,6); sim/blocker.ts), the
// convoy road's and the warren tunnel's mouths at the edges, and the ridge on the east rim that
// later holds the memorial wreck (A3M4 on; render's).
import { defineMapLayout } from '../../define.ts';
import type { GridPos, ScriptTrigger, ScriptedEvent } from '../../types.ts';

/** The cut from the north edge to the fork (17 tiles): the switchback, then the choke. */
// prettier-ignore
const CUT: readonly GridPos[] = [
  [10, 0], [10, 1], [10, 2],                   // in from the north edge
  [9, 2], [8, 2], [7, 2], [6, 2],              // west along the old survey bench
  [6, 3], [6, 4],                              // down
  [7, 4], [8, 4], [9, 4], [10, 4],             // back east
  [10, 5], [10, 6], [10, 7],                   // the choke, past Bricks's post (11,6)
  [10, 8],                                     // the fork
];
/** From the fork west to the convoy road's door (3,13). */
// prettier-ignore
const FORK_WEST: readonly GridPos[] = [
  [9, 8], [8, 8], [7, 8], [6, 8], [5, 8], [4, 8], [3, 8],
  [3, 9], [3, 10], [3, 11], [3, 12], [3, 13],
];
/** From the fork east to the warren tunnel's door (17,13). */
// prettier-ignore
const FORK_EAST: readonly GridPos[] = [
  [11, 8], [12, 8], [13, 8], [14, 8], [15, 8], [16, 8], [17, 8],
  [17, 9], [17, 10], [17, 11], [17, 12], [17, 13],
];

/** The tail of a fork from tile (x, y) (inclusive) to its door. */
const forkFrom = (fork: readonly GridPos[], x: number, y: number): GridPos[] =>
  fork.slice(fork.findIndex(([a, b]) => a === x && b === y));

/** The convoy's road: in at the south-east edge, west along row 11, in at the west door (21). */
// prettier-ignore
const CONVOY_ROAD: GridPos[] = [
  [21, 11], [20, 11], [19, 11], [18, 11], [17, 11], [16, 11], [15, 11], [14, 11], [13, 11],
  [12, 11], [11, 11], [10, 11], [9, 11], [8, 11], [7, 11], [6, 11], [5, 11], [4, 11],
  ...forkFrom(FORK_WEST, 3, 11),
];
/** The warren's tunnel: up out of the south-west edge, east along row 11, in at the east door (21). */
// prettier-ignore
const WARREN_ROAD: GridPos[] = [
  [0, 10], [0, 11], [1, 11], [2, 11], [3, 11], [4, 11], [5, 11], [6, 11], [7, 11], [8, 11],
  [9, 11], [10, 11], [11, 11], [12, 11], [13, 11], [14, 11], [15, 11], [16, 11],
  ...forkFrom(FORK_EAST, 17, 11),
];

/** The six refugee groups' ids, in release order (waves.ts and the map script). */
export const GROUPS = ['first', 'second', 'third', 'fourth', 'fifth', 'last'] as const;

/** The script event releasing group `g` through both doors (the door C3 didn't pick stays home). */
function release(g: (typeof GROUPS)[number], on: ScriptTrigger): ScriptedEvent {
  return { id: g, on, actions: [{ spawnAllies: `convoy_${g}` }, { spawnAllies: `warren_${g}` }] };
}

export const map = defineMapLayout({
  id: 'a3_m03',
  act: 3,
  env: 'act3',
  objective: 'holdout',
  meterLabel: 'evacuated',
  // The harness's floor (maps.md § 6.4): every sensible build gets half of them out.
  evacuatedFloor: 0.5,
  size: { cols: 22, rows: 14 },
  // Pads (18): the switchback's (inside its bend, and either side), the choke's north face and the
  // rock behind Bricks, the forks, the rifts' edges, and the doors' approach.
  // prettier-ignore
  tiles: [
    '..........S...........',
    '..........#...........',
    '......#####...........',
    '....o.#.o...o...o.....',
    '.o....#####........o..',
    '........o.#.o.........',
    '..........#...........',
    '........o.#.o.........',
    '...###############....',
    '.o.#..o.......o..#.o..',
    'S..#......o......#....',
    '#####################S',
    '...#.o....o....o.#....',
    '...C.............C....',
  ],
  paths: [
    // The Hollow: down the cut, through the choke, and to either door.
    { id: 'cut_west', tiles: [...CUT, ...FORK_WEST] },
    { id: 'cut_east', tiles: [...CUT, ...FORK_EAST] },
    // The refugees: only the `door_choice` side walks (`refugees` below).
    { id: 'convoy_road', tiles: CONVOY_ROAD },
    { id: 'warren_road', tiles: WARREN_ROAD },
  ],
  riftLanes: [
    // The east rift (W4): down from the north edge east of the switchback, onto the east fork (16).
    {
      id: 'rift_east',
      opensAtWave: 4,
      // prettier-ignore
      tiles: [
        [15, 0], [15, 1], [15, 2], [15, 3], [15, 4], [15, 5], [15, 6], [15, 7],
        ...forkFrom(FORK_EAST, 15, 8),
      ],
    },
    // The west rift (W11): the same west of it, onto the west fork (16).
    {
      id: 'rift_west',
      opensAtWave: 11,
      // prettier-ignore
      tiles: [
        [5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5], [5, 6], [5, 7],
        ...forkFrom(FORK_WEST, 5, 8),
      ],
    },
  ],
  // Rift Moths from the north corners, crossing over the choke to the far door.
  airLanes: [
    {
      id: 'sky_west',
      points: [
        [21, 1],
        [11, 6],
        [3, 13],
      ],
    },
    {
      id: 'sky_east',
      points: [
        [0, 1],
        [10, 6],
        [17, 13],
      ],
    },
  ],
  markers: {
    door_west: [3, 13],
    door_east: [17, 13],
    bricks_post: [11, 6],
    convoy_mouth: [21, 12],
    warren_mouth: [0, 12],
    memorial_ridge: [20, 2],
  },
  // A Holdout's doors are its groups' exits; `safeExit` names the first (escort data needs one).
  safeExit: 'door_west',
  // Six groups of six per door (36), each walking only under its door's `door_choice` (a group kept
  // home is never released and isn't in the meter's total; sim/escort.ts). The script releases both
  // doors' groups together; the gated ones do nothing.
  refugees: Object.fromEntries(
    GROUPS.flatMap((g) => [
      [
        `convoy_${g}`,
        {
          route: 'convoy_road',
          exit: 'door_west',
          when: { flag: 'door_choice', eq: 'convoy' },
        },
      ],
      [
        `warren_${g}`,
        {
          route: 'warren_road',
          exit: 'door_east',
          when: { flag: 'door_choice', eq: 'warren' },
        },
      ],
    ]),
  ),
  // Bricks in person (maps.md § 5.4), his rivet cannon about a Rivet T1's worth, on his post beside
  // the choke. He holds two at a time; his health follows the waves only (D141): near full through
  // W10 with shallow dips, then falling across W11–W13 (25% as W13 starts, the vitals cue) to the
  // 5% floor as W14 starts and the SEAL fires.
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
      block: {
        capacity: 2,
        health: [
          { wave: 4, pct: 0.96 },
          { wave: 7, pct: 0.92 },
          { wave: 10, pct: 0.9 },
          { wave: 11, pct: 0.7 },
          { wave: 12, pct: 0.45 },
          { wave: 13, pct: 0.25 },
          { wave: 14, pct: 0.05 },
        ],
      },
    },
  ],
  startCredits: 700,
  // Flat: it doesn't scale with Evacuated (the score is never a price; progression.md § 2).
  stardust: 320,
  // Burrowed (the Undertows), air (the Rift Moths), and splash (the Mote clusters and Fractures)
  // are the map's answers (campaign.md § 4.8). Armor, gathering, phasing, and the rifts are intel.
  threatIntel: ['clustered', 'splitting', 'burrowing', 'armored', 'gathering', 'flying', 'phasing'],
  requiredCounters: ['burrowed', 'air', 'splash'],
  // Much Obliged (Challenge): Evacuated ≥ 60%. Held the Door, ≥ 85%, takes Perfect's slot
  // (sim/medals.ts).
  medals: {
    challenge: {
      id: 'much_obliged',
      name: 'Much Obliged',
      description: 'Get 60% or more of them out.',
      condition: { stat: 'evacuated', gte: 22 },
    },
  },
  // Bricks rides along one last time (slot 2: Suppressing Fire).
  companion: { id: 'bricks', state: 'present' },
  events: [
    // The groups walk out as their waves start (W1, W4, W7, W9, W10); the last as W14's countdown
    // opens, timed to clear its door as W14 starts (waves.ts LAST_WALK_SEC).
    release('first', { wave: 1, phase: 'start' }),
    release('second', { wave: 4, phase: 'start' }),
    release('third', { wave: 7, phase: 'start' }),
    release('fourth', { wave: 9, phase: 'start' }),
    release('fifth', { wave: 10, phase: 'start' }),
    release('last', { wave: 14, phase: 'countdown' }),
    // The last name tag (app/dialogue.ts: a `latest` tag's moment): {name}, on the newest turret,
    // as W10's countdown opens.
    {
      id: 'name_tag',
      on: { wave: 10, phase: 'countdown' },
      actions: [{ cue: 'a3_m03_cue_name_tag' }],
    },
    // QUILL breaks policy as W13 starts, where the timeline puts him at 25%.
    { id: 'vitals', on: { wave: 13, phase: 'start' }, actions: [{ cue: 'a3_m03_cue_vitals' }] },
    // The SEAL (core-loop.md § 2.11): as W14 starts, the moment the last group is through; the
    // map ends, held, on its press.
    {
      id: 'seal',
      on: { wave: 14, phase: 'start' },
      actions: [{ cue: 'a3_m03_cue_seal' }, { forceInput: { id: 'seal' } }],
    },
    { id: 'held', on: { forcedInputResolved: 'seal' }, actions: [{ endMap: 'completed' }] },
  ],
});
