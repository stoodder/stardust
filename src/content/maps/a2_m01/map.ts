// A2M1 · Rig Nine: layout and rules (docs/story/campaign/act2.md § A2M1). The Diggings, at dusk.
// Two roads come down from the north edge: the Spires road (north-west, where the fleeing
// Skitterkin come from) and Rig Nine's bore mouth (north-east, where the Hollow comes out). Each
// makes one bend and runs in along row 6 to the merge (8, 6); the merged road drops south through
// the rig yard to the outpost lift (the core) on the south edge, and on past it into the
// wilderness. The canyon ledges are the two high-ground tiles (one over the Spires road, one inside
// the bore road's bend), the stardust conduit is the power node by the merge, and two broken
// mining rigs are the crew-log wreckage (Crew Logs, the Objective Intel). The hushed crew sit
// outside their hut beside the bore road, decor nothing can reach; the north-east edge, toward
// the Halls, is the dark one (render).
import { defineMapLayout } from '../../define.ts';

export const map = defineMapLayout({
  id: 'a2_m01',
  act: 2,
  env: 'act2.gold',
  objective: 'defend',
  size: { cols: 18, rows: 12 },
  // prettier-ignore
  tiles: [
    '..S............S..',
    '..#............#..',
    '..#.^..........#..',
    '..####......####..',
    '...o.#o....o#^.#..',
    '.....#.o..o.#x.#..',
    '.....########..#..',
    '....o..o#+.....#..',
    '........####..o#..',
    '.........o.#o..#..',
    '..........x#...#..',
    '...........C####..',
  ],
  // prettier-ignore
  paths: [
    {
      // The Spires road: down from the Spires, east under the west ledge, down, and east into the
      // merge. The fleeing Skitterkin walk it, and the Motes that chase them.
      id: 'spires',
      tiles: [
        [2, 0], [2, 1], [2, 2], [2, 3],                 // down from the Spires
        [3, 3], [4, 3], [5, 3],                         // east, under the west ledge
        [5, 4], [5, 5], [5, 6],                         // down
        [6, 6], [7, 6], [8, 6],                         // east into the merge
        [8, 7], [8, 8],                                 // the merged road, south
        [9, 8], [10, 8], [11, 8],                       // east through the rig yard
        [11, 9], [11, 10], [11, 11],                    // down to the outpost lift
      ],
    },
    {
      // The bore road: out of Rig Nine's bore mouth, past the crew's hut, west, down, and west
      // into the merge.
      id: 'bore',
      tiles: [
        [15, 0], [15, 1], [15, 2], [15, 3],             // out of the bore mouth
        [14, 3], [13, 3], [12, 3],                      // west, round the east ledge
        [12, 4], [12, 5], [12, 6],                      // down
        [11, 6], [10, 6], [9, 6], [8, 6],               // west into the merge
        [8, 7], [8, 8],
        [9, 8], [10, 8], [11, 8],
        [11, 9], [11, 10], [11, 11],
      ],
    },
    {
      // The yard cut: the bore road's short way to the lift, straight down the dark east edge
      // and in along the south fence, out of reach of the merge.
      id: 'cut',
      tiles: [
        [15, 0], [15, 1], [15, 2], [15, 3],
        [15, 4], [15, 5], [15, 6], [15, 7], [15, 8], [15, 9], [15, 10],   // down the east edge
        [15, 11], [14, 11], [13, 11], [12, 11], [11, 11],                  // along the fence
      ],
    },
  ],
  // The fleeing Puffwings glide down from the Spires, straight over the yard to the lift.
  // prettier-ignore
  airLanes: [{ id: 'sky', points: [[4, 0], [11, 11]] }],
  // Two broken mining rigs hide pads; their crew logs are the Objective Intel.
  underWreckage: { '13,5': 'o', '10,10': 'o' },
  salvage: { '13,5': 50, '10,10': 40 },
  // Markers (render draws the ones it knows as props; T440c dresses the rest): the crew-log rigs
  // (the objective and the w06 cue name them), Rig Nine's head frame over the bore mouth, and the
  // crew's hut beside the bore road, where the hushed crew sit.
  markers: {
    crew_log_bore: [13, 5],
    crew_log_yard: [10, 10],
    rig_nine: [16, 0],
    crew_hut: [16, 2],
  },
  startCredits: 420,
  stardust: 180,
  // Every Skitterkin group flees (act2.md: Skittish), so their traits are intel only; the Motes'
  // clusters are the map's one threat, and splash is its one required counter (campaign.md § 4.8).
  threatIntel: [
    'skittish',
    'fast',
    'flying',
    'burrowing',
    'armored',
    'splitting',
    'huddle',
    'clustered',
  ],
  requiredCounters: ['splash'],
  // Hiccup Contained (act2.md § A2M1, Medals): no Hollow unit leaks (a Heavy one is still Hollow).
  medals: {
    challenge: {
      id: 'hiccup_contained',
      name: 'Hiccup Contained',
      description: 'No Hollow unit gets through.',
      condition: { leaks: { faction: 'hollow' }, lte: 0 },
    },
  },
  // Crew Logs (act2.md § A2M1, Medals): send the drone to both marked rigs. It unlocks the
  // crew-log codex entry (story condition `objectiveDone`, story/conditions.ts).
  objectives: [
    {
      id: 'crew_logs',
      name: 'Crew Logs',
      description: 'Clear both crew-log rigs.',
      condition: {
        all: [{ wreckageCleared: 'crew_log_bore' }, { wreckageCleared: 'crew_log_yard' }],
      },
      intel: 1,
    },
  ],
  // Bricks walks this shift with you: slot 2 is his Suppressing Fire.
  companion: { id: 'bricks', state: 'present' },
  events: [
    // QUILL's firmware update teaches Spare runners as the build phase opens (after the briefing).
    {
      id: 'spare_runners_cue',
      on: { wave: 1, phase: 'countdown' },
      actions: [{ cue: 'a2_m01_cue_spare_runners' }],
    },
    // "The crew called it 'the hollow.'": the first crew log recovered, or W6's countdown if the
    // drone hasn't reached one by then. Each guard keeps it to one play.
    {
      id: 'crew_log_bore_cue',
      on: { wreckageCleared: 'crew_log_bore' },
      when: { not: { wreckageCleared: 'crew_log_yard' } },
      actions: [{ cue: 'a2_m01_cue_crew_log' }],
    },
    {
      id: 'crew_log_yard_cue',
      on: { wreckageCleared: 'crew_log_yard' },
      when: { not: { wreckageCleared: 'crew_log_bore' } },
      actions: [{ cue: 'a2_m01_cue_crew_log' }],
    },
    {
      id: 'crew_log_w06_cue',
      on: { wave: 6, phase: 'countdown' },
      when: {
        not: {
          any: [{ wreckageCleared: 'crew_log_bore' }, { wreckageCleared: 'crew_log_yard' }],
        },
      },
      actions: [{ cue: 'a2_m01_cue_crew_log' }],
    },
  ],
});
