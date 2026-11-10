// A2M5 · The Long Walk: layout and rules (docs/story/campaign/act2.md § A2M5). The Preserve Road
// at dusk: one long road from the north-west, switching back across the valley between Everglow's
// relocation fencing, to the Preserve gate in the south-east; behind the gate, the Preserve's
// fenced basin, too quiet. Before the pivot the gate is the relocation checkpoint (the core) and
// Ves'thara comes down the road in a glass giant, the Sunderglass Penitent. At the pivot (her 50%,
// or W6 starting, whichever comes first) the Aelari stand down, she kneels where she stands and
// becomes the Ward, the map becomes an Escort (the gate is the safe exit, the meter Evacuated),
// and refugee groups walk the road from the north-west while the Hollow comes down the rig road
// from the east and joins the road a third of the way along, and later down the road behind
// them. Lightwings fly in over the fencing from the north-east (W4).
import { defineMapLayout } from '../../define.ts';

/** The pivot's three actions (act2.md § A2M5): the cue, Escort, and the first refugee group. */
const PIVOT = [
  { cue: 'a2_m05_cue_pivot' },
  { setObjective: 'escort', meterLabel: 'evacuated' },
  { spawnAllies: 'first' },
] as const;

export const map = defineMapLayout({
  id: 'a2_m05',
  act: 2,
  env: 'act2.dusk',
  // Defend until the pivot, then an Escort (`setObjective` below).
  objective: 'defend',
  // The refugees lost (hushed on the road, or taken at the gate) that lose the map once passed:
  // generous, because the escort is taught here (act2.md § A2M5) and tested in A3M1.
  maxLost: 13,
  size: { cols: 18, rows: 12 },
  // prettier-ignore
  tiles: [
    '..................',
    'S########.........',
    '..o....o#..o......',
    '.....o..#......o..',
    '..###############S',
    '.o#.o.......o.....',
    '..#...^.o....o....',
    '..###########.....',
    '.........o..#o....',
    '............#.....',
    '.........o..##C...',
    '..........o.......',
  ],
  // prettier-ignore
  paths: [
    {
      // The Preserve Road: in at the north-west, east under the fencing, down, back west along
      // the valley, down again, east the length of the valley floor, and down to the Preserve
      // gate (36 tiles). The Aelari walk it before the pivot, the refugees after, and from W8
      // the Hollow behind them.
      id: 'road',
      tiles: [
        [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1],
        [8, 2], [8, 3], [8, 4],                                       // down the fencing's end
        [7, 4], [6, 4], [5, 4], [4, 4], [3, 4], [2, 4],               // back west
        [2, 5], [2, 6], [2, 7],                                       // down
        [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7],
        [10, 7], [11, 7], [12, 7],                                    // east, the valley floor
        [12, 8], [12, 9], [12, 10],                                   // down to the gate
        [13, 10], [14, 10],                                           // the Preserve gate
      ],
    },
    {
      // The rig road (from the pivot): the Hollow comes in from the rigs at the east edge, west
      // across the valley, and joins the Preserve Road at the fencing's end (8,4), a third of
      // the way along (34 tiles).
      id: 'rig',
      tiles: [
        [17, 4], [16, 4], [15, 4], [14, 4], [13, 4], [12, 4], [11, 4], [10, 4], [9, 4],
        [8, 4],
        [7, 4], [6, 4], [5, 4], [4, 4], [3, 4], [2, 4],
        [2, 5], [2, 6], [2, 7],
        [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7],
        [10, 7], [11, 7], [12, 7],
        [12, 8], [12, 9], [12, 10],
        [13, 10], [14, 10],
      ],
    },
  ],
  // W4's Lightwings fly in over the fencing from the north, across the valley, down to the gate.
  // prettier-ignore
  airLanes: [{ id: 'sky', points: [[6, 0], [7, 5], [14, 10]] }],
  // Markers (render draws the ones it knows as props; the Preserve's are T540c's): the Preserve
  // gate (the core before the pivot and the safe exit after), the fenced basin behind it, the
  // relocation fencing along the road, and the rigs' end of the rig road.
  markers: {
    gate: [14, 10],
    basin: [16, 10],
    fence_north: [4, 0],
    fence_valley: [7, 8],
    rig_yard: [17, 3],
  },
  safeExit: 'gate',
  // The refugee groups (6 each, walking the road to the gate at 0.7 tiles/s; maps.md § 5.2),
  // released by the script below: the first at the pivot, the rest as their waves start.
  refugees: {
    first: { route: 'road' },
    second: { route: 'road' },
    third: { route: 'road' },
    fourth: { route: 'road' },
    fifth: { route: 'road' },
    last: { route: 'road' },
  },
  startCredits: 550,
  stardust: 240,
  // The Aelari's shields and the Cantors' aura (shield), the Veilwalkers and the Penitent's
  // cloaked shards (detection), and the Hollow's clusters after the pivot (splash) are the map's
  // three answers (campaign.md § 4.8); the Wardens' armor, the Blinkstriders' blink, and the
  // Lightwings are intel only.
  threatIntel: [
    'shielded',
    'shield_aura',
    'armored',
    'blink',
    'cloaked',
    'flying',
    'boss',
    'clustered',
  ],
  requiredCounters: ['shield', 'detection', 'splash'],
  // Kneel (act2.md § A2M5, Medals): force the pivot by breaking the Penitent to 50% before W6
  // starts (enemies.md § 6.1: `pivotWave` is the wave the pivot came in).
  medals: {
    challenge: {
      id: 'kneel',
      name: 'Kneel',
      description: 'Break the Penitent to half before the Hollow arrives.',
      condition: { stat: 'pivotWave', gte: 1, lte: 5 },
    },
  },
  // Bricks walks this shift with you: slot 2 is his Suppressing Fire.
  companion: { id: 'bricks', state: 'present' },
  events: [
    // The Penitent comes down the road (its spawn): Ves'thara's challenge, and Bricks's answer.
    { id: 'penitent_cue', on: { bossPhase: 1 }, actions: [{ cue: 'a2_m05_cue_penitent' }] },
    // Its shield breaks (phase 2, the shards): Ves'thara counts back.
    { id: 'shield_cue', on: { bossPhase: 2 }, actions: [{ cue: 'a2_m05_cue_shield' }] },
    // The pivot, whichever comes first (D137; enemies.md § 6.1, the worked example): the Penitent
    // broken to 50% (its own `pivot` ending ran)...
    { id: 'pivot_hp', on: { bossHpPct: 0.5, boss: 'sunderglass_penitent' }, actions: PIVOT },
    // ...or the Hollow surge wave starting, which forces it (and the event above is spent: a
    // forced pivot leaves the Penitent above 50% and immune).
    {
      id: 'pivot_surge',
      on: { wave: 6, phase: 'start' },
      when: { stat: 'pivotWave', lte: 0 },
      actions: [{ bossEnd: 'pivot' }, ...PIVOT],
    },
    // The rest of the refugees, as their waves start, early enough for the road to empty.
    { id: 'second', on: { wave: 7, phase: 'start' }, actions: [{ spawnAllies: 'second' }] },
    { id: 'third', on: { wave: 8, phase: 'start' }, actions: [{ spawnAllies: 'third' }] },
    // W11's two groups at once: the fifth files in on the fourth's heels (six refugees 0.6 tiles
    // apart take 5.1 s to file in at 0.7 tiles/s), one line of twelve.
    { id: 'fourth', on: { wave: 11, phase: 'start' }, actions: [{ spawnAllies: 'fourth' }] },
    {
      id: 'fifth',
      on: { wave: 11, phase: { afterSec: 5.2 } },
      actions: [{ spawnAllies: 'fifth' }],
    },
    { id: 'last', on: { wave: 12, phase: 'start' }, actions: [{ spawnAllies: 'last' }] },
  ],
});
