// A1M2 · Hatching Season: layout and rules (docs/story/campaign/act1.md § A1M2). The road
// switchbacks down three terraces from a north spawn to the gate core on the south edge: west
// along Terrace 1's lip, down the west switchback, east along Terrace 2's, down the east
// switchback past the pump station, and west along Terrace 3's to the gate. Long and slow by
// design, so Sprinkler + Thumper shine. A2M3 revisits this layout.
import { defineMapLayout } from '../../define.ts';

export const map = defineMapLayout({
  id: 'a1_m02',
  act: 1,
  env: 'act1',
  objective: 'defend',
  size: { cols: 14, rows: 10 },
  // prettier-ignore
  tiles: [
    '...........S..',
    '.....o.....#o.',
    '..##########..',
    '..#..o..o.....',
    '..#o..^.......',
    '..##########..',
    '.......o..+#..',
    '......o...o#o.',
    '....########..',
    '....C.........',
  ],
  // The three terraces (render-only): Terrace 1 (rows 0–2) down to Terrace 2 (rows 3–5) down to
  // Terrace 3 (rows 6–9). The renderer draws a cliff along each step; the switchbacks cut through.
  // prettier-ignore
  terraces: [
    '22222222222222',
    '22222222222222',
    '22222222222222',
    '11111111111111',
    '11111111111111',
    '11111111111111',
    '00000000000000',
    '00000000000000',
    '00000000000000',
    '00000000000000',
  ],
  // prettier-ignore
  paths: [
    {
      id: 'road',
      tiles: [
        [11, 0], [11, 1], [11, 2],                                         // down from the spawn
        [10, 2], [9, 2], [8, 2], [7, 2], [6, 2], [5, 2], [4, 2], [3, 2], [2, 2], // Terrace 1's lip
        [2, 3], [2, 4], [2, 5],                                            // the west switchback
        [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], // Terrace 2's
        [11, 6], [11, 7], [11, 8],                                         // the east switchback
        [10, 8], [9, 8], [8, 8], [7, 8], [6, 8], [5, 8], [4, 8],           // Terrace 3's
        [4, 9],                                                            // out through the gate
      ],
    },
  ],
  // The pump station is the power node at the second (east) switchback: the Challenge's marker
  // (D042 lets a marker sit on any non-path tile). The Peeker's rock is at a warren mouth halfway
  // down the east side. Decor the renderer dresses: Extraction Rig 3 beside the (8,3) pad, the
  // housing block beside the (5,3) pad (QUILL's "(Per policy.)" choice), and the Employee of the
  // Month scarecrow on Terrace 2's east end. The west two-thirds carry nothing Act I–specific, so
  // A2M3's scars read.
  markers: {
    pump_station: [10, 6],
    peeker: [13, 4],
    rig3: [9, 3],
    housing: [4, 3],
    scarecrow: [11, 3],
  },
  startCredits: 300,
  coreIntegrity: 20,
  stardust: 130,
  threatIntel: ['fast', 'armored'],
  requiredCounters: ['armor'],
  // Aim for the Sack! (act1.md § A1M2, Medals): no Brood Hauler gets past the pump station.
  medals: {
    challenge: {
      id: 'aim_for_the_sack',
      name: 'Aim for the Sack!',
      description: 'No Brood Hauler gets past the pump station (the power node).',
      condition: { not: { passedMarker: { marker: 'pump_station', enemy: 'hauler' } } },
    },
  },
  // Bricks walks this shift with you (slot 2: Suppressing Fire); no ally post here
  // (story/campaign.md § 2: A1M2 has no Bricks post).
  companion: { id: 'bricks', state: 'present' },
});
