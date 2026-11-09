// A1M1 · Orientation Day: layout and rules (docs/story/campaign/act1.md § A1M1). The road drops
// south from the spawn, swings east along the domes, back west, and out through the perimeter
// gate (the core) on the south edge. A3M6 reuses this layout, and the finale leaves through it.
import { defineMapLayout } from '../../define.ts';

export const map = defineMapLayout({
  id: 'a1_m01',
  act: 1,
  env: 'act1',
  objective: 'defend',
  size: { cols: 14, rows: 10 },
  // prettier-ignore
  tiles: [
    '....S.........',
    '....#.o.......',
    '..o.#.o^......',
    '....######....',
    '...o.....#o...',
    '...o.....#o...',
    '....######....',
    '..o.#.o.......',
    '....#.........',
    '....C.........',
  ],
  // prettier-ignore
  paths: [
    {
      id: 'road',
      tiles: [
        [4, 0], [4, 1], [4, 2], [4, 3],                 // south from the spawn
        [5, 3], [6, 3], [7, 3], [8, 3], [9, 3],         // east along the domes
        [9, 4], [9, 5], [9, 6],
        [8, 6], [7, 6], [6, 6], [5, 6], [4, 6],         // back west
        [4, 7], [4, 8], [4, 9],                         // out through the gate
      ],
    },
  ],
  // The Peeker's rock, in the brush beside the spawn road (clickable from M3).
  markers: { peeker: [3, 1] },
  startCredits: 350,
  coreIntegrity: 20,
  stardust: 0,
  briefing: [
    "QUILL: Hello, Technician! I'm QUILL, your Quantified Unified Integrated Logistics & Lethality assistant. I love my job!",
    "Bricks: Name's Okonkwo. Sergeant. I'll call you Sprout, 'cause you're green and you work with lettuce.",
    "QUILL: Today's forecast: Nibblers, with a chance of Zoomers!",
    'Bricks: Turrets go on the pads. Bugs go on the path. Nothing goes on the path but bugs and bad decisions.',
  ].join('\n'),
  // Thumper's build button unlocks when W3's countdown starts (the build phase before W3).
  towerUnlockWave: { thumper: 3 },
  threatIntel: ['fast'],
  requiredCounters: [],
  companion: null,
});
