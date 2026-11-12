// END_M01 · The Long Shift: Endless mode's map (design/maps.md § 8), on QUILL's sim deck (D156).
// Dome Row at dawn, after the campaign: a revisit of A1M1 by reference (`revisitOf`, content/compileRevisit.ts), its 14×10
// layout centred at (4, 2) in 22×14, as A3M6 sets it, with its S-road, its 10 pads (the greenhouse
// roof's high ground (11,4) among them), the Peeker rock (7,3), and the gate (8,11), which is the
// core again: a Defend map. An edit to A1M1 flows here.
//
// Its waves are generated (src/sim/endless.ts, from the seed and `ENDLESS` in endless.ts): the
// five authored here (waves.ts) are the warm-up every seed opens with, and the generator adds the
// rest. The run's content swaps this map's waves for the generated ones (`endlessContent`).
//
// The band is this map's own:
// - **Two rifts** break in along row 5 from either edge, through the decor under the domes, onto
//   the road: the west one where the road turns east (8,5) (25 tiles), the east one where it turns
//   south (13,5) (20). They open with W11 (cracking as W10, the first boss wave, starts), so the
//   Hollow walk the road before then. Both cross only decor and road, never a pad (maps.md § 4).
// - **Two air lanes**, in from the north corners over the domes ((6,6) west, (14,5) east), then in
//   over the gate's approach to the gate.
// - **Ten buildable tiles**: either side of the road's way in (7,1) and (9,1); a power node (3,4)
//   and a pad (3,6) either side of the west rift, and a pad (18,4) and high ground (18,6) either
//   side of the east one, under the air lanes as they come in; (3,9) and (18,9) on the flanks; and
//   either side of the gate's approach from the south ((7,12), (9,12)).
// - **The crash site**: four decor tiles east of the old map ((19,3), (20,7), (19,10), (16,12)),
//   where "Shareholder Value" drops its plating when it jettisons (`crash_1..4`; never a pad).
import { defineMapLayout } from '../../define.ts';
import type { GridPos } from '../../types.ts';
import { map as a1m01 } from '../a1_m01/map.ts';

/** Where A1M1's tile (0, 0) sits on this grid (its 14×10 centred in 22×14). */
export const AT: GridPos = [4, 2];

/** A1M1's road on this grid: from its spawn (8,2) to the gate (8,11), 20 tiles (read, not copied). */
const ROAD: readonly GridPos[] = a1m01.paths
  .find((p) => p.id === 'road')!
  .tiles.map(([c, r]): GridPos => [c + AT[0], r + AT[1]]);

/** The road from tile (x, y) (inclusive) to the gate. */
const roadFrom = (x: number, y: number): GridPos[] =>
  ROAD.slice(ROAD.findIndex(([a, b]) => a === x && b === y));

/** The wave the rifts open with (the first boss wave is the one before). */
export const RIFTS_OPEN_AT_WAVE = 11;

export const map = defineMapLayout({
  id: 'end_m01',
  act: 'endless',
  // Dawn: the finale's palette, the world after the Long Night.
  env: 'finale',
  objective: 'defend',
  revisitOf: 'a1_m01',
  revisitAt: AT,
  size: { cols: 22, rows: 14 },
  // The band only: '*' is A1M1's footprint, composed in unchanged.
  // prettier-ignore
  tiles: [
    '......................',
    '.......o.o............',
    '....**************....',
    '....**************....',
    '...+**************o...',
    '....**************....',
    '...o**************^...',
    '....**************....',
    '....**************....',
    '...o**************o...',
    '....**************....',
    '....**************....',
    '.......o.o............',
    '......................',
  ],
  // A1M1's `road` comes with its layout; the band adds no path of its own.
  paths: [],
  riftLanes: [
    // The west rift: in along row 5 under the domes onto the road's turn east (8,5) (25 tiles).
    {
      id: 'rift_w',
      opensAtWave: RIFTS_OPEN_AT_WAVE,
      // prettier-ignore
      tiles: [[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], ...roadFrom(8, 5)],
    },
    // The east rift: the same from the east edge onto the road's turn south (13,5) (20 tiles).
    {
      id: 'rift_e',
      opensAtWave: RIFTS_OPEN_AT_WAVE,
      // prettier-ignore
      tiles: [
        [21, 5], [20, 5], [19, 5], [18, 5], [17, 5], [16, 5], [15, 5], [14, 5], ...roadFrom(13, 5),
      ],
    },
  ],
  // In from each north corner over the domes, and in over the gate's approach.
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
  // A1M1's markers come with its layout (the Peeker rock (7,3), Bricks's old post by the gate
  // (9,10), empty now). No script, no story beat: the shift that never ends. The band adds the
  // crash site "Shareholder Value"'s plates land on (a boss of the rotation; endless.ts).
  markers: { crash_1: [19, 3], crash_2: [20, 7], crash_3: [19, 10], crash_4: [16, 12] },
  startCredits: 900,
  coreIntegrity: 20,
  // Endless pays no first-clear Stardust: its reward is the score (waves held, one record per seed;
  // meta/endless.ts).
  stardust: 0,
  // The warm-up's intel (waves.ts); a run's intel is its plan's (sim/endless.ts `endlessIntel`).
  threatIntel: ['clustered', 'splitting'],
  // The warm-up demands no counter; each generated block names its own (≤ 3; sim/endless.ts).
  requiredCounters: [],
  // The warm-up is Hollow (waves.ts): with the Skitterkin off this map (D156), every unit left
  // carries a counter category, and the warm-up names none, so its two traits pass the soft cap.
  softExempt: [
    {
      trait: 'clustered',
      reason:
        "Endless's warm-up (W1–W5) is Mote knots and names no counter: the generator's blocks name them from W6, and any four towers work through 25-HP Motes.",
    },
    {
      trait: 'splitting',
      reason:
        "Endless's warm-up sends one Fracture a wave from W3, at the head of a Mote knot; it names no counter (the generator's blocks do from W6).",
    },
  ],
  // The finale's pick list: whoever walked the Long Walk with you.
  companion: { pick: ['vesthara', 'bramble', 'zibzab', 'quill'] },
});
