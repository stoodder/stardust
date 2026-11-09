// A1M4 · The Audit: layout and rules (docs/story/campaign/act1.md § A1M4). Admin Plaza: a U-shaped
// road around the plaza fountain, under three giant Evie billboards along the open north side. It
// enters north-west, runs down the plaza's west side, east along its south side, back up its east
// side, and then down the east edge to the plaza gate (the core) in the south-east corner. The
// audit podium faces the south-west bend; five wreckage carts ring the fountain, and the one
// nearest the podium hides a power node. A3M2 revisits this plaza at night, so the podium, the
// billboards, and the fountain are markers render draws as landmarks.
import { defineMapLayout } from '../../define.ts';

export const map = defineMapLayout({
  id: 'a1_m04',
  act: 1,
  env: 'act1',
  objective: 'defend',
  size: { cols: 14, rows: 10 },
  // prettier-ignore
  tiles: [
    '..S...........',
    '..#..........o',
    '..#o.x.x.o####',
    '.o#.......#..#',
    '..#.......#o.#',
    '..#.x...x.#oo#',
    '.o#...x..o#..#',
    '..#########o.#',
    '....o..o.....#',
    '.............C',
  ],
  // prettier-ignore
  paths: [
    {
      id: 'road',
      tiles: [
        [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7],          // the west side
        [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7],         // the south side
        [10, 6], [10, 5], [10, 4], [10, 3], [10, 2],                             // the east side
        [11, 2], [12, 2], [13, 2],                                               // past the billboards
        [13, 3], [13, 4], [13, 5], [13, 6], [13, 7], [13, 8],                    // down the east edge
        [13, 9],
      ],
    },
  ],
  // The salvage yard (maps.md § 3): five toppled lettuce carts ring the fountain. The cart nearest
  // the podium (4,5) hides the power node; the south-east cart (8,5) hides a pad; the two north
  // carts and the south one lie on the plaza's paving and pay salvage only.
  underWreckage: { '4,5': '+', '8,5': 'o', '5,2': '.', '7,2': '.', '6,6': '.' },
  salvage: { '4,5': 50, '8,5': 40, '5,2': 30, '7,2': 30, '6,6': 30 },
  // Landmarks render draws (A3M2 revisits them): the three Evie billboards over the open north
  // side, the fountain at the plaza's heart, and the audit podium facing the south-west bend
  // (Prim hovers there all map). The Peeker's rock is a planter by the fountain.
  markers: {
    billboard_west: [5, 0],
    billboard_center: [8, 0],
    billboard_east: [11, 0],
    fountain: [6, 4],
    podium: [3, 5],
    peeker: [8, 3],
  },
  startCredits: 320,
  coreIntegrity: 20,
  stardust: 150,
  threatIntel: ['fast', 'armored', 'splitting', 'huddle'],
  requiredCounters: ['splash', 'armor'],
  // Asset Recovery (act1.md § A1M4, Medals): clear all 5 wreckage tiles.
  medals: {
    challenge: {
      id: 'asset_recovery',
      name: 'Asset Recovery',
      description: 'Clear all 5 wreckage carts.',
      condition: { stat: 'wreckageCleared', gte: 5 },
    },
  },
  // Clean Audit (act1.md § A1M4; the ruling is sim/objectives.ts's): no write-offs. A tower may be
  // sold freely until a wave starts after it was built; a misclick-grace refund is never a sale.
  objectives: [
    {
      id: 'clean_audit',
      name: 'Clean Audit',
      description: 'Sell no turret once a wave has started since you built it.',
      condition: { stat: 'lateSells', lte: 0 },
      intel: 1,
    },
  ],
  // Zibzab rides along this shift (slot 2: Clearance Sale; campaign.md § 2).
  companion: { id: 'zibzab', state: 'present' },
});
