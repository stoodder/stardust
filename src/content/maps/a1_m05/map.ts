// A1M5 · Record Quarter: layout and rules (docs/story/campaign/act1.md § A1M5). Northern Gate, in
// party dressing. Two roads come down from the north edge and zigzag south, one down each half of
// the map: the Spires road (west) and the warren track (north-east, whose spawn opens at W3, the
// second spawn). Both run in along row 6 and meet at the colony's north gate, mid-map, and the
// merged road drops three tiles south to the core. The banner line (party bunting) hangs across the
// merged road just inside the gate, two-thirds of the way down; the party tent and the confetti
// cannon stand by the core, Bricks keeps his post beside the gate, and the Peeker's rock is on the
// warren track.
import { defineMapLayout } from '../../define.ts';

export const map = defineMapLayout({
  id: 'a1_m05',
  act: 1,
  env: 'act1',
  objective: 'defend',
  size: { cols: 14, rows: 10 },
  // prettier-ignore
  tiles: [
    '.S..........S.',
    '.#..........#.',
    '.####....####.',
    '..o^#....#^o..',
    '.####....####.',
    '.#oo.+oo..oo#.',
    '.############.',
    '......#.o.....',
    '......#.......',
    '......C.......',
  ],
  // prettier-ignore
  paths: [
    {
      // The Spires road: a zigzag down the west half, then east along row 6 into the north gate.
      id: 'spires',
      tiles: [
        [1, 0], [1, 1], [1, 2],                         // down from the Spires
        [2, 2], [3, 2], [4, 2],                         // east
        [4, 3], [4, 4],                                 // down
        [3, 4], [2, 4], [1, 4],                         // west
        [1, 5], [1, 6],                                 // down
        [2, 6], [3, 6], [4, 6], [5, 6],                 // east
        [6, 6],                                         // the north gate
        [6, 7], [6, 8], [6, 9],                         // the merged road, under the banner line
      ],
    },
    {
      // The warren track: the same zigzag down the east half, then west along row 6 into the gate.
      id: 'warren',
      tiles: [
        [12, 0], [12, 1], [12, 2],                      // down from the warrens
        [11, 2], [10, 2], [9, 2],                       // west, past the Peeker's rock
        [9, 3], [9, 4],                                 // down
        [10, 4], [11, 4], [12, 4],                      // east
        [12, 5], [12, 6],                               // down
        [11, 6], [10, 6], [9, 6], [8, 6], [7, 6],       // west
        [6, 6],                                         // the north gate
        [6, 7], [6, 8], [6, 9],
      ],
    },
  ],
  // The Puffwings fly straight down the middle, between the two roads, over the gate to the core.
  airLanes: [
    {
      id: 'sky',
      points: [
        [6, 0],
        [6, 9],
      ],
    },
  ],
  // The party dressing (render draws these markers as props, render/views/groundTiles.ts): the
  // banner line across the merged road (the Challenge's line), the party tent and the confetti
  // cannon by the core. Bricks's post is beside the north gate; the Peeker's rock is on the warren
  // track, closer than ever.
  markers: {
    banner_line: [7, 7],
    party_tent: [8, 9],
    confetti_cannon: [4, 8],
    bricks_post: [5, 7],
    peeker: [8, 3],
  },
  startCredits: 350,
  coreIntegrity: 20,
  stardust: 160,
  // Chitterbloom's `boss` shows as her tell, not a trait (no Trait is 'boss').
  threatIntel: ['fast', 'flying', 'armored', 'splitting', 'huddle', 'burrowing'],
  requiredCounters: ['air', 'splash', 'armor'],
  // Party Pooper Prevention (act1.md § A1M5, Medals): the Matriarch is driven off before she
  // reaches the banner line. No medal can reference the Quiet Wave.
  medals: {
    challenge: {
      id: 'party_pooper_prevention',
      name: 'Party Pooper Prevention',
      description: 'Drive the Matriarch off before she reaches the banner line.',
      condition: { not: { passedMarker: { marker: 'banner_line', enemy: 'chitterbloom' } } },
    },
  },
  // Bricks walks this shift with you: slot 2 is his Suppressing Fire.
  companion: { id: 'bricks', state: 'present' },
  // Bricks in person at his post by the gate (design/maps.md § 5.4), as on A1M1: his rivet cannon,
  // about a tier-1 Rivet's DPS. He never fires on the Quiet Wave (ALLY_NEVER_TARGET_TAGS).
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
  // The Quiet Wave (C1): Bricks's "Clear it, Sprout." and Sterling's last cheer as W10 starts. No
  // prompt, no UI: holding fire is the player's choice alone.
  events: [
    {
      id: 'quiet_wave_cue',
      on: { wave: 10, phase: 'start' },
      actions: [{ cue: 'a1_m05_cue_quiet_wave' }],
    },
  ],
});
