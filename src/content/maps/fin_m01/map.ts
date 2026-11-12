// FIN · Clearing the Way: layout and rules (docs/story/campaign/finale.md § FIN; the song's rules
// design/maps.md § 5.5). The Long Walk at night, from the A1M1 gate on the south edge north over
// Okonkwo's Gap to the mouth of the Deep Halls. This file is Phase 1, the Descent (T820); Phase 2
// (the Unsung) and Phase 3 (Dawn) add their song, waves, and events in T821 (see `PHASE_2`).
//
// **The road** (`halls`, 44 tiles from the Halls to the gate) is the choir's: Pebble leads it from
// the gate (8,13) up the colony's lane, east along row 10, up the east bend, west along row 7 (the
// Gap) under the memorial wreck on its ridge (13,6), up the west bend past the rift field's mouth,
// east along row 4, and up to the Halls mouth, where she stops (`halls_mouth` beside (11,4), 4
// tiles below the Halls). The Hollow come down it the other way, so they meet her head on. Her
// walk keeps time with the waves (`walkWaves`: a leg a wave), so she passes the memorial in W9 and
// reaches the Halls mouth in W18 whatever the countdowns. The road reads 2-wide: the sim walks
// one lane, and render draws the second on the decor beside it (maps.md § 4 allows it; the 2-wide
// lanes are presentation).
// - **Three spawns:** the Halls mouth (11,0) at the top of the road; the west rift field (0,6),
//   onto the road's west bend at (3,6) (the choir passes its mouth in W14, so it feeds her until
//   then and walks on behind her after); and the east Bore road (21,3), past the Deep Bore rig
//   (`bore_rig`) along row 3 onto the Halls descent at (11,3), ahead of her the whole walk.
// - **Air lanes** (Rift Moths, gunships): in from the north edge, the east edge, and the west
//   corner, each over the ridge by the memorial and on to the gate.
// - **Rift lanes** (they open as W15 starts: "rifts everywhere"): along row 1 from either edge onto
//   the Halls descent at (11,1). Each crosses decor and road only (maps.md § 4).
// - **21 buildable tiles:** the two Halls-mouth ledges (10,2) and (12,2) as high ground, two gold
//   seams as power nodes, (10,6) between the Gap and the row-4 run and (15,4) under the Bore road,
//   and 17 pads along the walk, several in adjacent groups for links and the Hum Choir's aura
//   (the west bend's (5,5)–(6,5), the Gap's (9,5)–(9,6)–(10,6), the ridge's (11,9)–(12,8)–(13,8),
//   the Halls' (12,2)–(13,2)).
// - **The four waymark lanterns** are wreckage on decor beside the road (`waymark_1..4`, in the
//   choir's walking order); clearing one relights it (the tile stays decor, the salvage pays).
// - **The memorial wreck** (`memorial_wreck`, (13,6), on the ridge above the Gap) is decor; render
//   draws the wrecked variant of `memorialTower` with the `{name}` plate. The choir passing it
//   cues Pebble's hum and Bricks's silence (W9, whose waves hold off 10 s).
// - **The colony gate** is the core: Everglow units, flyers, and the Heavy Hollow walk on to it and
//   leak there (core integrity 30: the air exam's meter, so no-air loses on it).
import { defineMapLayout } from '../../define.ts';
import { WHOS_THERE_INPUT } from '../../forcedInputs.ts';
import { FIN_SKY } from './lighting.ts';
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

/** Singers the choir can lose to hushes before the map is lost (`ChoirDef.maxHushed`; T821). */
export const MAX_HUSHED = 14;

/** Directive 0 (Keep): this long into Phase 2, as the choir steps into the Halls (D154). */
export const DIRECTIVE_0_SEC = 20;
/** The C4 line (log / holding / "not nothing"): this long into Phase 2. */
export const C4_LINE_SEC = 8;
/** Dawn's light lands, and the map is won, this long into Phase 3. */
export const DAWN_SEC = 8;
const KEEP = { flag: 'quill_choice', eq: 'keep' } as const;
/** Thrum's echo's id (`spawnEcho`, `echoArrived`). */
export const THRUM_ECHO = 'thrum';

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

/**
 * Phase 2 and Dawn (T821; finale.md § FIN, *Where it plays*). The Unsung walks in as W19 (waves.ts).
 * - The C4 line a few seconds in: one trigger, each scene gated by its answer.
 * - Directive 0 (Keep) 20 s in: QUILL revokes the most-invested class (refunded), Time Dilation
 *   goes dark for the phase, and "Who's there?" waits (the forced input arms after the cue's last
 *   line); the press restores the class.
 * - Thrum's echo at rest progress 50% if she was cleared; Pebble's "She heard" as it reaches the
 *   song.
 * - Dawn at rest progress 100%: every Hollow unit laid to rest and the hushed singers awake
 *   (`restAll`), Phase 3, the light; the map is won as it lands, DAWN_SEC later (`winBy: 'script'`).
 */
export const PHASE_2_EVENTS: readonly ScriptedEvent[] = [
  {
    id: 'c4_line',
    on: { phase: 2, afterSec: C4_LINE_SEC },
    actions: [
      { cue: 'fin_m01_cue_log' },
      { cue: 'fin_m01_cue_holding' },
      { cue: 'fin_m01_cue_not_nothing' },
    ],
  },
  {
    id: 'directive0',
    on: { phase: 2, afterSec: DIRECTIVE_0_SEC },
    when: KEEP,
    actions: [
      { cue: 'fin_m01_cue_directive0' },
      { revokeTowerClass: { select: 'mostInvested' }, refundPct: 100 },
      { lockAbility: 'time_dilation', on: true },
      { forceInput: { id: WHOS_THERE_INPUT } },
    ],
  },
  {
    id: 'not_everglow',
    on: { forcedInputResolved: WHOS_THERE_INPUT },
    actions: [{ cue: 'fin_m01_cue_not_everglow' }, { restoreTowerClass: 'lastRevoked' }],
  },
  {
    id: 'echo',
    on: { restProgressPct: 0.5 },
    when: { flag: 'spared_quiet_wave', eq: false },
    actions: [{ spawnEcho: THRUM_ECHO }],
  },
  { id: 'she_heard', on: { echoArrived: THRUM_ECHO }, actions: [{ cue: 'fin_m01_cue_echo' }] },
  {
    id: 'dawn',
    on: { restProgressPct: 1 },
    actions: [{ restAll: true }, { setPhase: 3 }, { setLighting: 'dawn' }],
  },
  { id: 'won', on: { phase: 3, afterSec: DAWN_SEC }, actions: [{ endMap: 'won' }] },
];

/**
 * The militia's three posts (manned under `convoy`), where the walk's last legs need them: the west
 * bend over the rift field's mouth, the row-4 run, and the Halls corner.
 */
const MILITIA = ['militia_bend', 'militia_run', 'militia_halls'] as const;
const CONVOY = { flag: 'door_choice', eq: 'convoy' } as const;

export const map = defineMapLayout({
  id: 'fin_m01',
  act: 'finale',
  // Act III's night until Dawn's `setLighting` (Phase 3). The eastern sky's warming per Phase 1
  // wave (D154's T701 ruling: sky-only lighting keys) is T831's, with its sky stops.
  env: 'act3',
  lighting: FIN_SKY,
  objective: 'choir',
  meterLabel: 'voices',
  // Won by Dawn's hold (`endMap` 8 s into Phase 3), never by the waves resolving: the Unsung's
  // wave resolves as it is laid to rest, and Dawn has no waves.
  winBy: 'script',
  size: { cols: 22, rows: 14 },
  // prettier-ignore
  tiles: [
    '...........S..........',
    '...........#..........',
    '..........^#^o....o...',
    '......o..x.##########S',
    '.o.#########...+......',
    '...#.oo..o..o.........',
    'S###x....o+....o......',
    '...###############....',
    '............oo...#....',
    '...........o..x.o#....',
    '........##########....',
    '.......o#.x..o........',
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
    // The Bore road, in from the east past the Deep Bore rig, onto the Halls descent.
    {
      id: 'bore_road',
      // prettier-ignore
      tiles: [
        [21, 3], [20, 3], [19, 3], [18, 3], [17, 3], [16, 3], [15, 3], [14, 3], [13, 3], [12, 3],
        ...roadFrom(11, 3),
      ],
    },
  ],
  riftLanes: [
    // Along row 1 from either edge onto the Halls descent, either side of the Halls.
    {
      id: 'rift_ne',
      opensAtWave: 15,
      // prettier-ignore
      tiles: [
        [21, 1], [20, 1], [19, 1], [18, 1], [17, 1], [16, 1], [15, 1], [14, 1], [13, 1], [12, 1],
        ...roadFrom(11, 1),
      ],
    },
    {
      id: 'rift_nw',
      opensAtWave: 15,
      // prettier-ignore
      tiles: [
        [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1],
        ...roadFrom(11, 1),
      ],
    },
  ],
  airLanes: [
    {
      id: 'sky_n',
      points: [
        [16, 0],
        [12, 8],
        [8, 13],
      ],
    },
    {
      id: 'sky_e',
      points: [
        [21, 6],
        [13, 8],
        [8, 13],
      ],
    },
    {
      id: 'sky_w',
      points: [
        [0, 2],
        [9, 7],
        [8, 13],
      ],
    },
  ],
  markers: {
    halls_mouth: [12, 4],
    memorial_wreck: [14, 6],
    bore_rig: [20, 2],
    waymark_1: [10, 11],
    waymark_2: [14, 9],
    waymark_3: [4, 6],
    waymark_4: [9, 3],
    militia_bend: [4, 5],
    militia_run: [7, 3],
    militia_halls: [13, 4],
    // HE HELD THE DOOR (maps.md § 7, state-dependent dressing): the blast-door leaf the convoy
    // carried out of the Gap, propped by the colony lane near the gate, under `convoy` only.
    held_door: [6, 12],
  },
  markerWhen: { ...Object.fromEntries(MILITIA.map((m) => [m, CONVOY])), held_door: CONVOY },
  startCredits: 900,
  // The colony gate behind the walk: what the flyers and Everglow's units cost when they get through
  // (the air exam's meter: no-air loses on it).
  coreIntegrity: 30,
  stardust: 500,
  // Air (Rift Moths, gunships), jam (Silencers, the Auditor), and splash (Motes, Fractures, the
  // Maws' gathering) are the finale's answers (campaign.md § 4.8). Armored, cloaked, and burrowing
  // units are soft: Everglow's Associate and Black Budget Operative, and the Undertows, stay ≤ 15% of
  // every wave's threat.
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
    'boss',
  ],
  requiredCounters: ['air', 'jam', 'splash'],
  // Laid to Rest (finale.md § FIN, Medals): in Phase 2, at least 90% of the Hollow destroyed are
  // destroyed inside the song (T805's atom; Phase 2's kills are T821's).
  medals: {
    challenge: {
      id: 'laid_to_rest',
      name: 'Laid to Rest',
      description:
        'In Phase 2, lay at least 90% of the Hollow you destroy to rest inside the song.',
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
  // The choir (D154 and its T820 addendum; maps.md § 5.5): Pebble leading 20 singers up the road,
  // +8 under the warren, −4 under the convoy, Thrum beside her if spared, the Returned under `returned`.
  choir: {
    leader: 'pebble',
    route: 'halls',
    stopAt: 'halls_mouth',
    singers: 20,
    // Paced to Phase 1's waves: a leg a wave (`walkWaves`), walked over most of a Standard wave,
    // so she passes the memorial in W9 and reaches the Halls mouth in W18 whatever the countdowns.
    pace: 0.08,
    haltTiles: 1.5,
    walkWaves: PHASE_1_WAVES,
    // The choir is lost once 15 singers are hushed, whatever its size by flag (T821): every cell
    // has the same room in singers (20 → floor 6, warren 28 → 14, convoy 16 → 2; Thrum +1).
    maxHushed: MAX_HUSHED,
    groups: [
      { when: { flag: 'door_choice', eq: 'warren' }, singers: 8 },
      { when: CONVOY, singers: -4 },
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
  // The colonist militia (maps.md § 5.4), only under the convoy: A3M6's posts' numbers (low DPS,
  // long range, ground only), beside the walk's last legs.
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
      actions: [
        { cue: 'fin_m01_cue_breakthrough' },
        { spawnWave: 'breakthrough_motes' },
        { spawnWave: 'breakthrough_maws' },
      ],
    },
    // W9: the choir passes the memorial (Pebble's hum, Bricks's silence); W9 sends nothing for 10 s.
    {
      id: 'memorial',
      on: { choirAt: 'memorial_wreck' },
      actions: [{ cue: 'fin_m01_cue_memorial' }],
    },
    PHASE_2,
    ...PHASE_2_EVENTS,
  ],
});
