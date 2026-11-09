// A1M3 · Special Delivery: layout and rules (docs/story/campaign/act1.md § A1M3). A straight-ish
// mail road from a north spawn with one long hairpin: west along the upper leg (row 3), round the
// hairpin's bend (column 2), east along the lower leg (row 6), and down to the gate core on the
// south edge. The Puffwings' air lane cuts diagonally across the hairpin from the north-west
// corner to the core. Gerald the mail drone flies the road itself (D072), three passes.
import { defineMapLayout } from '../../define.ts';

export const map = defineMapLayout({
  id: 'a1_m03',
  act: 1,
  env: 'act1',
  objective: 'defend',
  size: { cols: 14, rows: 10 },
  // prettier-ignore
  tiles: [
    '...........S..',
    '......o....#..',
    '...o.....^.#o.',
    '..##########..',
    '.o#.o...o.....',
    '.x#....o......',
    '..#########.x.',
    '...o..o...#o..',
    '......x...#...',
    '..........C...',
  ],
  // prettier-ignore
  paths: [
    {
      id: 'road',
      tiles: [
        [11, 0], [11, 1], [11, 2], [11, 3],                                 // down from the spawn
        [10, 3], [9, 3], [8, 3], [7, 3], [6, 3], [5, 3], [4, 3], [3, 3], [2, 3], // the upper leg
        [2, 4], [2, 5], [2, 6],                                             // the hairpin's bend
        [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6],    // the lower leg
        [10, 7], [10, 8],                                                   // down to the gate
        [10, 9],
      ],
    },
  ],
  // Flyers cross the hairpin on the diagonal, north-west corner to the core (maps.md § 4).
  airLanes: [{ id: 'sky', points: [[0, 0], [10, 9]] }],
  // Three crashed delivery drones in Gerald's livery ("Gerald's colleagues"). The one at the
  // hairpin's bend hides a pad; the other two lie on decor and pay salvage only.
  underWreckage: { '1,5': 'o', '12,6': '.', '6,8': '.' },
  salvage: { '1,5': 40, '12,6': 30, '6,8': 30 },
  // The Peeker's rock behind a fallen mailbox on the east verge; Zibzab's shell-shop clanks onto
  // the decor patch beside the gate road at W6 and stays as dressing (render reads the markers).
  markers: {
    peeker: [13, 4],
    mailbox: [13, 5],
    zibzab_shop: [12, 8],
  },
  startCredits: 310,
  coreIntegrity: 20,
  stardust: 140,
  briefing: "QUILL: Today's route includes Gerald. Gerald is the mail. Gerald has right of way.",
  // The Skyhook is issued for this map and first used in W3, as the Puffwings arrive
  // (story/campaign.md § 4.1).
  towerUnlockWave: { skyhook: 3 },
  threatIntel: ['fast', 'armored', 'flying'],
  requiredCounters: ['air', 'armor'],
  // Return to Sender (act1.md § A1M3, Medals): Gerald is never hit. Only shots aimed at him count
  // (D072), so it measures the hold-fire choice.
  medals: {
    challenge: {
      id: 'return_to_sender',
      name: 'Return to Sender',
      description: 'Gerald is never hit.',
      condition: { stat: 'neutralHits', lte: 0 },
    },
  },
  // QUILL walks this shift with you (slot 2: Time Dilation; campaign.md § 2).
  companion: { id: 'quill', state: 'present' },
});
