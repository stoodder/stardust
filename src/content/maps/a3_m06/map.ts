// A3M6 · Let Them In: layout and rules (docs/story/campaign/act3.md § A3M6). Dome Row at night: a
// revisit of A1M1 by reference (`revisitOf`, content/compileRevisit.ts), its 14×10 layout centred at
// (4, 2) in 22×14 with its S-road, its 10 pads (the greenhouse roof's high ground (11,4) among them),
// the Peeker rock (7,3), and the gate (8,11) unchanged, so an edit to A1M1 flows here.
//
// The road runs the way it ran in A1M1, north to south; what flips is the gate at its end. Goldie
// has opened Dome 1 beside it, the old road beyond is barricaded with lettuce crates, and every
// refugee who reaches the gate turns in: the gate is the safe exit (`gate`, A1M1's core tile). The
// valley's Skitterkin come down from the north edge in groups (`north`: two tiles of the band onto
// A1M1's spawn (8,2), then its road, 22 tiles; a group takes about half a minute), and the Hollow
// come down the same road behind them. Everglow's units that reach the gate reseal a dome door (the
// escort's exit rule, presented as repossession: one sheltered refugee lost); a boss that reaches it,
// the Gathering Maw or any of its parts, loses the map (sim/escort.ts).
//
// The band is this map's own:
// - **Two rifts** (W12; they crack as W11 starts) break in along row 5 from either edge, through the
//   decor under the domes, onto the road: the west one where the road turns east (8,5) (25 tiles),
//   the east one where it turns south (13,5) (20). Both cross only decor and road, never a pad
//   (maps.md § 4).
// - **Two air lanes** for Everglow's Asset Recovery Gunships and the Rift Moths, in from the north
//   corners, down each side of the band, and in over the gate's approach to the gate.
// - **Nine pads**: either side of the road's way in (7,1) and (9,1); either side of each rift where
//   it leaves the band ((3,4), (3,6); (18,4), (18,6)), under the air lanes; the east lane's turn
//   (18,9); and either side of the barricade below the gate ((7,12), (9,12)).
//
// Markers (render draws the ones it knows; T740c's props, T730b's world render): Dome 1 open and
// frosted beside the gate, the lettuce-crate barricade on the old road beyond it, Zibzab's crate (the
// NO REFUNDS sticker peeled off), Pebble on the Peeker rock (A1M1's `peeker`, from W1), and under
// `convoy` the colonist militia's three posts (sandbags and lettuce crates) beside the road.
import { defineMapLayout } from '../../define.ts';
import type { GridPos } from '../../types.ts';

/** A1M1's road on this grid (offset 4, 2): from its spawn (8,2) to the gate (8,11), 20 tiles. */
// prettier-ignore
const ROAD: readonly GridPos[] = [
  [8, 2], [8, 3], [8, 4], [8, 5],                    // south from A1M1's spawn
  [9, 5], [10, 5], [11, 5], [12, 5], [13, 5],        // east along the domes
  [13, 6], [13, 7], [13, 8],
  [12, 8], [11, 8], [10, 8], [9, 8], [8, 8],         // back west
  [8, 9], [8, 10], [8, 11],                          // to the gate
];

/** The road from tile (x, y) (inclusive) to the gate. */
const roadFrom = (x: number, y: number): GridPos[] =>
  ROAD.slice(ROAD.findIndex(([a, b]) => a === x && b === y));

/**
 * The refugee groups, in release order (the map script; waves.ts sends the Hollow behind them):
 * each group's id, the wave whose start releases it, how many walk in it, and how many seconds into
 * that wave it sets off. Seven groups of six by W10 (the first behind W1's Mote screen, the second
 * under W2's Moths, then W4's and W7's with Maws behind them), two smaller groups at once in W13,
 * and the last in W16, ahead of the Gathering Maw.
 */
export const GROUPS = [
  ['first', 1, 6, 3],
  ['second', 2, 6, 0],
  ['third', 4, 6, 0],
  ['fourth', 6, 6, 0],
  ['fifth', 7, 6, 0],
  ['sixth', 9, 6, 0],
  ['seventh', 10, 6, 0],
  ['eighth', 13, 4, 0],
  ['ninth', 13, 4, 8],
  ['last', 16, 4, 0],
] as const;

/** Every refugee who walks (Pebble isn't counted; no group is gated). */
export const REFUGEES = GROUPS.reduce((n, [, , count]) => n + count, 0);

export const map = defineMapLayout({
  id: 'a3_m06',
  act: 3,
  env: 'act3',
  objective: 'escort',
  meterLabel: 'sheltered',
  revisitOf: 'a1_m01',
  revisitAt: [4, 2],
  // A generous limit (act3.md § A3M6: the breather inside A3M5 → A3M6 → FIN): the map is lost
  // once half the refugees are lost (27 of 54).
  maxLostPct: 0.55,
  size: { cols: 22, rows: 14 },
  // The band only: '*' is A1M1's footprint, composed in unchanged.
  // prettier-ignore
  tiles: [
    '......................',
    '.......o.o............',
    '....**************....',
    '....**************....',
    '...o**************o...',
    '....**************....',
    '...o**************o...',
    '....**************....',
    '....**************....',
    '....**************o...',
    '....**************....',
    '....**************....',
    '.......o.o............',
    '......................',
  ],
  // A1M1's `road` comes with its layout (the refugees' route, and the Hollow's behind them); the
  // band adds no path of its own.
  paths: [],
  riftLanes: [
    // The west rift (W12): in along row 5 under the domes onto the road's turn east (8,5) (25).
    {
      id: 'rift_w',
      opensAtWave: 12,
      // prettier-ignore
      tiles: [[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], ...roadFrom(8, 5)],
    },
    // The east rift (W12): the same from the east edge onto the road's turn south (13,5) (20).
    {
      id: 'rift_e',
      opensAtWave: 12,
      // prettier-ignore
      tiles: [
        [21, 5], [20, 5], [19, 5], [18, 5], [17, 5], [16, 5], [15, 5], [14, 5], ...roadFrom(13, 5),
      ],
    },
  ],
  // Everglow's gunships and the Rift Moths: in from each north corner, down that side of the band,
  // and in over the gate's approach.
  airLanes: [
    {
      id: 'sky_w',
      points: [
        [0, 1],
        [6, 6],
        [8, 11],
      ],
    },
    {
      id: 'sky_e',
      points: [
        [21, 1],
        [14, 5],
        [8, 11],
      ],
    },
  ],
  // A1M1's markers come with its layout (the Peeker rock (7,3), where Pebble sits from W1, and
  // Bricks's old post by the gate (9,10), empty). The band's own and the night's dressing: the gate
  // (the safe exit, on A1M1's core), Dome 1 open beside it, the lettuce-crate barricade on the old
  // road beyond, Zibzab's crate, and the militia's posts (manned under `convoy`).
  markers: {
    gate: [8, 11],
    dome_1: [9, 11],
    barricade: [8, 12],
    zibzab_crate: [11, 12],
    militia_n: [9, 3],
    militia_loop: [12, 6],
    militia_gate: [7, 9],
  },
  markerWhen: {
    militia_n: { flag: 'door_choice', eq: 'convoy' },
    militia_loop: { flag: 'door_choice', eq: 'convoy' },
    militia_gate: { flag: 'door_choice', eq: 'convoy' },
  },
  safeExit: 'gate',
  // The refugee groups (6 each, 0.7 tiles/s; maps.md § 5.2), released as their waves start
  // (GROUPS). Pebble isn't with any of them: she is on the rock.
  refugees: Object.fromEntries(GROUPS.map(([id, , count]) => [id, { route: 'road', count }])),
  startCredits: 780,
  stardust: 380,
  // Air (the gunships and the Rift Moths), detection (the Black Budget Operatives), and armor (the
  // gunships, the Operatives, Everglow's drones and Expediters, and the Maws) are the map's answers
  // (campaign.md § 4.8). The Maws' gathering, the Moths' phasing, and the Expediters' haste are intel;
  // the Mote screens are soft (≤ 15% of a wave).
  threatIntel: [
    'flying',
    'armored',
    'cloaked',
    'phasing',
    'gathering',
    'haste_aura',
    'clustered',
    'boss',
  ],
  requiredCounters: ['air', 'detection', 'armor'],
  // Nothing Repossessed (act3.md § A3M6, Medals): no Everglow unit reaches the gate.
  medals: {
    challenge: {
      id: 'nothing_repossessed',
      name: 'Nothing Repossessed',
      description: 'No Everglow unit reaches the gate.',
      condition: { leaks: { faction: 'everglow' }, lte: 0 },
    },
  },
  // Zibzab walks this shift with you: slot 2 is his Clearance Sale.
  companion: { id: 'zibzab', state: 'present' },
  // The colonist militia (maps.md § 5.4), only under C3's convoy: three posts beside the road, each a
  // colonist with a rifle behind lettuce crates (low DPS, long range, Kinetic, ground only).
  allies: (['militia_n', 'militia_loop', 'militia_gate'] as const).map((post) => ({
    kind: 'militia' as const,
    post,
    when: { flag: 'door_choice', eq: 'convoy' },
    attack: {
      type: 'kinetic' as const,
      damage: 4,
      ratePerSec: 1,
      rangeTiles: 3.5,
      targets: { ground: true, air: false },
    },
  })),
  events: [
    ...GROUPS.map(([id, wave, , afterSec]) => ({
      id,
      on: { wave, phase: afterSec === 0 ? ('start' as const) : { afterSec } },
      actions: [{ spawnAllies: id }],
    })),
    // QUILL, as the first of them is sheltered (no refugee is lost before it in any reference run).
    { id: 'sheltered', on: { refugeesRemaining: REFUGEES - 1 }, actions: [{ cue: 'a3_m06_cue_sheltered' }] },
  ],
});
