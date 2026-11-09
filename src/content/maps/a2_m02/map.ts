// A2M2 · The Glass Witch: layout and rules (docs/story/campaign/act2.md § A2M2). Ridge Rigs, at
// gold dusk. One spawn on the north edge; the main road runs south down the ridge to the ridge
// relay (the core), and at the top the rig branch peels east along the ledge, doubles back once
// on itself, and ends at Rigs 7 and 8 on the east edge (the asset, Protect: a leak on the branch
// costs the rigs, not the core). The Skitterkin and the Hollow only ever take the main road; the
// Aelari constructs, and the Glass Witch, only ever take the branch. The two thread-glass
// outcrops are the high ground (one at the fork, one over the branch's switchback), the
// stardust conduit is the power node in the fork's pocket, and the habitat domes on the west
// edge are decor nothing goes near: the camera frames them, so the player can notice she never
// does.
import { defineMapLayout } from '../../define.ts';

export const map = defineMapLayout({
  id: 'a2_m02',
  act: 2,
  env: 'act2.gold',
  objective: 'protect',
  size: { cols: 18, rows: 12 },
  // prettier-ignore
  tiles: [
    '...S..............',
    '...#..............',
    '...##############.',
    '...#.^......o^o.#.',
    '...#o....########.',
    '...#.+..o######...',
    '...#......oooo#...',
    '...#####......#...',
    '......o#o.....#...',
    '.....###......#...',
    '....o#........###.',
    '.....C............',
  ],
  // prettier-ignore
  paths: [
    {
      // The main road: down the ridge past the fork, east, down, west, and down to the ridge
      // relay. The fleeing Skitterkin run it, and the Motes that chase them.
      id: 'main',
      tiles: [
        [3, 0], [3, 1], [3, 2],                         // the fork
        [3, 3], [3, 4], [3, 5], [3, 6], [3, 7],         // down the ridge
        [4, 7], [5, 7], [6, 7], [7, 7],                 // east
        [7, 8], [7, 9],                                 // down
        [6, 9], [5, 9],                                 // west
        [5, 10], [5, 11],                               // down to the relay
      ],
    },
    {
      // The rig branch: east along the ledge, down, back west under the thread-glass outcrop,
      // down, and east again to Rigs 7 and 8. Only the Aelari walk it.
      id: 'rigs',
      tiles: [
        [3, 0], [3, 1], [3, 2],
        [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2],
        [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2],   // east along the ledge
        [16, 3], [16, 4],                                       // down
        [15, 4], [14, 4], [13, 4], [12, 4], [11, 4], [10, 4], [9, 4], // back west
        [9, 5],                                                 // round the hairpin
        [10, 5], [11, 5], [12, 5], [13, 5], [14, 5],            // east again
        [14, 6], [14, 7], [14, 8], [14, 9], [14, 10],           // down off the ledge
        [15, 10], [16, 10],                                     // to the rigs
      ],
    },
  ],
  // Markers (render draws the ones it knows as props; T430b/T440c dress the rest): the rigs (the
  // asset, on decor at the branch's end), the habitat domes on the west edge (decor she never
  // goes near), and the fork, where the branch leaves the road.
  markers: {
    rigs: [17, 10],
    dome_north: [1, 3],
    dome_south: [1, 8],
    fork: [4, 1],
  },
  // Protect the asset (design/maps.md § 5.2, D111): Rigs 7 and 8, one meter of 10. A leak down the
  // branch costs the rigs its leak value; the Glass Witch reaching them drains it.
  asset: { name: 'Rigs', integrity: 10, marker: 'rigs', routes: ['rigs'] },
  startCredits: 500,
  stardust: 195,
  // Every Skitterkin group flees (act2.md: Skittish), so their traits are intel only; the Motes'
  // clusters (splash) and the Aelari shields (shield) are the map's two answers (campaign.md
  // § 4.8), and the Glass Witch is its boss.
  threatIntel: ['skittish', 'fast', 'armored', 'shielded', 'clustered', 'boss'],
  requiredCounters: ['shield', 'splash'],
  // Glass Half Empty (act2.md § A2M2, Medals): force her retreat before she blinks a third time.
  medals: {
    challenge: {
      id: 'glass_half_empty',
      name: 'Glass Half Empty',
      description: 'Drive the Glass Witch off before her third blink.',
      condition: { stat: 'bossBlinks', lte: 2 },
    },
  },
  // QUILL walks this shift with you (the fair-play joke: its "(Per policy.)" is, for once,
  // correct): slot 2 is its Time Dilation.
  companion: { id: 'quill', state: 'present' },
  events: [
    // The Glass Witch's in-stage cues (design/enemies.md § 6.1): at her spawn only for a player
    // who spared the Quiet Wave (C1's variant line), then at 70%, 55%, and her retreat at 40%.
    {
      id: 'witch_spawn_cue',
      on: { bossPhase: 1 },
      when: { flag: 'spared_quiet_wave', eq: true },
      actions: [{ cue: 'a2_m02_cue_witch_spared' }],
    },
    {
      id: 'witch_70_cue',
      on: { bossHpPct: 0.7, boss: 'glass_witch' },
      actions: [{ cue: 'a2_m02_cue_witch_counter' }],
    },
    {
      id: 'witch_55_cue',
      on: { bossHpPct: 0.55, boss: 'glass_witch' },
      actions: [{ cue: 'a2_m02_cue_witch_strike' }],
    },
    {
      id: 'witch_retreat_cue',
      on: { bossHpPct: 0.4, boss: 'glass_witch' },
      actions: [{ cue: 'a2_m02_cue_witch_retreat' }],
    },
  ],
});
