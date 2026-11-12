// FIN · Clearing the Way: layout and rules (docs/story/campaign/finale.md § FIN; the song's rules
// design/maps.md § 5.5). The Long Walk at night, from the A1M1 gate on the south edge north over
// Okonkwo's Gap to the mouth of the Deep Halls. This file is Phase 1, the Descent (T820); Phase 2
// (the Unsung) and Phase 3 (Dawn) add their song, waves, and events in T821 (see `PHASE_2`).
//
// **The road** (`halls`, 44 tiles from the Halls to the gate) is the choir's: Pebble leads it from
// the gate (8,13) up the colony's lane, east along row 10 past the Bore road's mouth, up to the Gap,
// west along row 7 past the memorial wreck (10,8), up the west bend, east along row 4 under the
// Halls ledges, and up to the Halls mouth, where she stops (`halls_mouth` beside (11,4), 4 tiles
// below the Halls). The Hollow come down it the other way, so they meet her head on. The road
// reads 2-wide: the sim walks one lane, and render draws the second on the decor beside it (as
// maps.md § 4 allows; the 2-wide lanes are presentation).
// - **Three spawns:** the Halls mouth (11,0) at the top of the road; the west rift field (0,6),
//   onto the road's west bend at (3,6) (the choir passes it at about 70% of her walk, so it feeds
//   her until late); and the east Bore road (21,9), past the Deep Bore rig (`bore_rig`) onto the
//   road at (17,9), which the choir passes early (its units then walk to the gate behind her).
// - **Air lanes** (Rift Moths, gunships): in from the north edge, the east edge, and the west
//   corner, each to the gate.
// - **Rift lanes** (they open as W15 starts: "rifts everywhere"): along row 1 from the east edge
//   onto the Halls descent; up from the south edge onto row 10; and along row 10 from the west
//   edge onto the colony's lane. Each crosses decor and road only (maps.md § 4).
// - **21 buildable tiles:** the two Halls-mouth ledges (10,2) and (12,2) as high ground, two gold
//   seams as power nodes, (10,6) between the Gap and the row-4 run and (19,8) above the Bore road,
//   and 17 pads along the walk, several in adjacent groups for links and the Hum Choir's aura
//   (the west bend's (5,5)–(6,5), the Gap's (9,5)–(9,6)–(10,6), the ridge's (11,9)–(12,8)–(13,8),
//   the Halls' (12,2)–(13,3)).
// - **The four waymark lanterns** are wreckage on decor beside the road (`waymark_1..4`, in the
//   choir's walking order); clearing one relights it (the tile stays decor, the salvage pays).
// - **The memorial wreck** (`memorial_wreck`, (10,8), on the ridge above the Gap) is decor; render
//   draws the wrecked variant of `memorialTower` with the `{name}` plate.
// - **The colony gate** is the core: Everglow units, flyers, and the Heavy Hollow walk on to it and
//   leak there (core integrity, 20).
import { defineMapLayout } from '../../define.ts';
import type { GridPos, ScriptedEvent } from '../../types.ts';

/** The choir's road, from the Halls (11,0) to the colony gate (8,13). */
export const ROAD: readonly GridPos[] = [
  ...[0, 1, 2, 3, 4].map((r): GridPos => [11, r]),
  ...[10, 9, 8, 7, 6, 5, 4, 3].map((c): GridPos => [c, 4]),
  ...[5, 6, 7].map((r): GridPos => [3, r]),
  ...[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((c): GridPos => [c, 7]),
  ...[8, 9, 10].map((r): GridPos => [17, r]),
  ...[16, 15, 14, 13, 12, 11, 10, 9, 8].map((c): GridPos => [c, 10]),
  ...[11, 12, 13].map((r): GridPos => [8, r]),
];

/** The road from tile (x, y) (inclusive) to the gate. */
export const roadFrom = (x: number, y: number): GridPos[] =>
  ROAD.slice(ROAD.findIndex(([a, b]) => a === x && b === y));

/** The waymark lanterns, in the choir's walking order (finale.md § FIN, *Waymarks*). */
export const WAYMARKS = ['waymark_1', 'waymark_2', 'waymark_3', 'waymark_4'] as const;
/** Waymarks: relit before this wave starts (W18, the Halls mouth: still the Descent). */
export const WAYMARKS_BY_WAVE = 18;

/** The last wave of Phase 1 (the Descent); Phase 2 starts once it has cleared. */
export const PHASE_1_WAVES = 18;

/**
 * Phase 2's start (D154; maps.md § 5.5): the later of W18 cleared and the choir at the Halls mouth
 * (`afterWave`). It checkpoints ("Retry from the Halls") and stops the Bore, which fixes the
 * Unsung's HP bonus. T821 adds Phase 2's own events (the Unsung, Directive 0, the echo, Dawn) after
 * these, keyed to `{ phase: 2, afterSec }` and the song.
 */
export const PHASE_2: ScriptedEvent = {
  id: 'halls',
  on: { choirAt: 'halls_mouth', afterWave: PHASE_1_WAVES },
  actions: [
    { setPhase: 2 },
    { checkpoint: 'halls' },
    { setTimerRate: { timer: 'deep_bore', pct: 0 } },
    { cue: 'fin_m01_cue_phase2' },
  ],
};

/** The militia's three posts (manned under `convoy`): the gate, the Gap, and the Bore road. */
const MILITIA = ['militia_gate', 'militia_gap', 'militia_bore'] as const;
const CONVOY = { flag: 'door_choice', eq: 'convoy' } as const;

export const map = defineMapLayout({
  id: 'fin_m01',
  act: 'finale',
  // Act III's night; the eastern sky warms one step per Phase 1 wave (a sky-only key: the world
  // stays dark until Dawn's `setLighting`; D154's T701 ruling).
  env: 'act3',
  lighting: [{ wave: PHASE_1_WAVES, env: 'finale', skyOnly: true }],
  objective: 'choir',
  meterLabel: 'voices',
  // D154: the floor is 40% of the run's choir, rounded up (10 → 4, warren 14 → 6, convoy 8 → 4).
  minVoicesPct: 0.4,
  size: { cols: 22, rows: 14 },
  // prettier-ignore
  tiles: [
    '...........S..........',
    '...........#..........',
    '..........^#^.........',
    '......o..x.#.o........',
    '.o.#########..........',
    '...#.oo..o..o.........',
    'S###x....o+....o......',
    '...###############....',
    '............oo...#.+..',
    '...........o..x.o####S',
    '........##########....',
    '.......o#.x..o....o...',
    '........#o............',
    '........C.............',
  ],
  // The relit lanterns stay decor; each pays its salvage.
  underWreckage: { '10,11': '.', '14,9': '.', '4,6': '.', '9,3': '.' },
  salvage: { '10,11': 40, '14,9': 40, '4,6': 40, '9,3': 40 },
  paths: [
    { id: 'halls', tiles: ROAD },
    // The west rift field, onto the road's west bend.
    { id: 'rift_field', tiles: [[0, 6], [1, 6], [2, 6], ...roadFrom(3, 6)] },
    // The Bore road, past the Deep Bore rig, onto the road's east bend.
    { id: 'bore_road', tiles: [[21, 9], [20, 9], [19, 9], [18, 9], ...roadFrom(17, 9)] },
  ],
  riftLanes: [
    // In along row 1 from the east edge onto the Halls descent.
    {
      id: 'rift_ne',
      opensAtWave: 15,
      // prettier-ignore
      tiles: [
        [21, 1], [20, 1], [19, 1], [18, 1], [17, 1], [16, 1], [15, 1], [14, 1], [13, 1], [12, 1],
        ...roadFrom(11, 1),
      ],
    },
    // Up from the south edge onto row 10.
    { id: 'rift_s', opensAtWave: 15, tiles: [[14, 13], [14, 12], [14, 11], ...roadFrom(14, 10)] },
    // In along row 10 from the west edge onto the colony's lane.
    {
      id: 'rift_sw',
      opensAtWave: 15,
      // prettier-ignore
      tiles: [[0, 10], [1, 10], [2, 10], [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], ...roadFrom(8, 10)],
    },
  ],
  airLanes: [
    {
      id: 'sky_n',
      points: [
        [16, 0],
        [13, 6],
        [8, 13],
      ],
    },
    {
      id: 'sky_e',
      points: [
        [21, 3],
        [14, 9],
        [8, 13],
      ],
    },
    {
      id: 'sky_w',
      points: [
        [0, 2],
        [4, 9],
        [8, 13],
      ],
    },
  ],
  markers: {
    halls_mouth: [12, 4],
    memorial_wreck: [10, 8],
    bore_rig: [20, 11],
    waymark_1: [10, 11],
    waymark_2: [14, 9],
    waymark_3: [4, 6],
    waymark_4: [9, 3],
    militia_gate: [9, 11],
    militia_gap: [7, 8],
    militia_bore: [18, 10],
  },
  markerWhen: Object.fromEntries(MILITIA.map((m) => [m, CONVOY])),
  startCredits: 900,
  stardust: 500,
  // Air (Rift Moths, gunships), jam (Silencers, the Auditor), and splash (Motes, Fractures, the
  // Maws' gathering) are the finale's answers (campaign.md § 4.8). Armored, cloaked, and burrowing
  // units are soft: Everglow's drones, Associates, the Liability, the Black Budget Operatives, and
  // the Undertows stay ≤ 15% of every wave's threat.
  threatIntel: [
    'clustered',
    'splitting',
    'flying',
    'phasing',
    'armored',
    'jammer',
    'gathering',
    'burrowing',
    'cloaked',
    'healer_aura',
  ],
  requiredCounters: ['air', 'jam', 'splash'],
  // Laid to Rest (finale.md § FIN, Medals): in Phase 2, at least 90% of the Hollow destroyed are
  // destroyed inside the song (T805's atom; Phase 2's kills are T821's).
  medals: {
    challenge: {
      id: 'laid_to_rest',
      name: 'Laid to Rest',
      description: 'In Phase 2, lay at least 90% of the Hollow you destroy to rest inside the song.',
      condition: { restedPct: 0.9 },
    },
  },
  // Waymarks (finale.md § FIN, Medals): relight all four waymark lanterns in Phase 1.
  objectives: [
    {
      id: 'waymarks',
      name: 'Waymarks',
      description: 'Relight all four waymark lanterns before the Halls mouth (wave 18).',
      condition: { cleared: WAYMARKS, byWave: WAYMARKS_BY_WAVE },
      intel: 1,
    },
  ],
  // The player picks who walks with them (core-loop.md § 3.1): Ves'thara is the default.
  companion: { pick: ['vesthara', 'bramble', 'zibzab', 'quill'] },
  // The choir (D154; maps.md § 5.5): Pebble leading 10 singers up the road, +4 under the warren,
  // −2 under the convoy, Thrum beside her if spared, the Returned under `returned`.
  choir: {
    leader: 'pebble',
    route: 'halls',
    stopAt: 'halls_mouth',
    singers: 10,
    // Tuned so par's choir reaches the Halls mouth as W18 clears (T820; maps.md § 5.5's "about
    // 0.35 tiles/s" was D154's proposal before the walk was measured on this road).
    pace: 0.06,
    haltTiles: 1.5,
    groups: [
      { when: { flag: 'door_choice', eq: 'warren' }, singers: 4 },
      { when: CONVOY, singers: -2 },
    ],
    thrum: { when: { flag: 'spared_quiet_wave', eq: true }, radiusBonus: 0.5 },
    returned: { when: { flag: 'stardust_choice', eq: 'returned' }, count: 2, auraRadius: 1 },
  },
  // The Leaving Song (maps.md § 5.5): its circle round Pebble from the start (a light in the dark;
  // render's), rest and scatter in Phase 2 only. T821 tunes `restTarget`, the trickle, and the
  // boss's rest to the ~3 min countdown at Keep (#18).
  song: {
    baseRadius: 2.5,
    restTarget: 40,
    restPerSec: 0.2,
    restPerBossHp: 0.001,
    multipliers: [
      { flag: 'quill_choice', value: 'rewrite', mul: 1.5 },
      { flag: 'quill_choice', value: 'keep', mul: 1.25 },
      { flag: 'quill_choice', value: 'purge', mul: 1 },
    ],
    scatter: { reformSec: 4, hpPct: 0.5 },
  },
  // The Deep Bore (maps.md § 5.5): fills over Phase 1 (Purge: 75% speed), +5% Unsung HP per 10%;
  // full, it breaks through at the Halls mouth.
  timers: { deep_bore: { fillSec: 1320, bossHpPerTenth: 0.05 } },
  // The colonist militia (maps.md § 5.4), only under the convoy: low DPS, long range, ground only.
  allies: MILITIA.map((post) => ({
    kind: 'militia' as const,
    post,
    when: CONVOY,
    attack: {
      type: 'kinetic' as const,
      damage: 4,
      ratePerSec: 1,
      rangeTiles: 3.5,
      targets: { ground: true, air: false },
    },
  })),
  events: [
    // The Deep Bore starts with the walk; Purge's QUILL slows it (finale.md w06; core-loop § 6.11).
    { id: 'bore', on: { wave: 1, phase: 'start' }, actions: [{ startTimer: 'deep_bore' }] },
    {
      id: 'bore_purge',
      on: { wave: 1, phase: 'start' },
      when: { flag: 'quill_choice', eq: 'purge' },
      actions: [{ setTimerRate: { timer: 'deep_bore', pct: 0.75 } }],
    },
    // Full before the choir arrives: the breakthrough surge at the Halls mouth.
    {
      id: 'breakthrough',
      on: { timerFull: 'deep_bore' },
      actions: [{ spawnWave: 'breakthrough_motes' }, { spawnWave: 'breakthrough_maws' }],
    },
    // W9: the choir passes the memorial (Pebble's hum, Bricks's silence); W9 sends nothing for 10 s.
    { id: 'memorial', on: { wave: 9, phase: 'start' }, actions: [{ cue: 'fin_m01_cue_memorial' }] },
    PHASE_2,
  ],
});
