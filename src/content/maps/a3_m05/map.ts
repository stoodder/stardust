// A3M5 · Unsung: layout and rules (docs/story/campaign/act3.md § A3M5). Second Harvest at night,
// at maximum throughput: a revisit of A2M4 by reference (`revisitOf`, content/compileRevisit.ts),
// its 18×12 layout centred at (2, 1) in 22×14 with its road, its vats' surge route, its 15 pads,
// the intake hoppers, Intake B, the vats and the control core unchanged, so an edit to A2M4 flows
// here. The vats glow violet at full blaze; no Tidybots anywhere (render's). The core is A2M4's
// control core (11,12).
//
// Everything Everglow sends walks A2M4's `road` (in at the north-east (16,1), west under the
// cliff, round Intake B, east under the vats, and down to the core), "Shareholder Value" too; the
// Hollow come by the road and, from W10, up out of the vats' drain hatch (`vats`, onto the road's
// last leg).
//
// The band is this map's own:
// - **The bearers' back route** (west): the vats' back sluice comes up in the band's north-west
//   corner (1,0), and from W5 the bearers (Brood Haulers carrying the vats' unsung dead) walk
//   south down the band past the old intake (Intake B, (4,7)) to the door at the band's west edge
//   (0,12), and home (`home`, 14 tiles; a bearer there is home, sim/bearers.ts). The Hollow come
//   out of the sluice behind them to hunt them (`hunt`, the same tiles to (1,12), beside the Long
//   Walk's waymark (1,13): a unit that gets there costs the asset its leak, as on any Protect
//   map's branch route).
// - **The asset** is the bearers (integrity 12; `bearers`): each one hushed costs it 1, and so
//   does each leak down the hunt.
// - **The three vat-feed lines** cross the band's north edge above the vats as wreckage over
//   decor (`feed_1..3`): clear them before W10 for Cut the Feed (W10's surge then walks in one
//   group smaller).
// - **Shareholder Value's hangar** (east), and the four decor tiles its plates land on when it
//   jettisons (`crash_1..4`, the crash site; never a pad).
// - Three pads: two by the bearers' route under the sluice ((0,5), (0,6): a link pair), and one
//   under the yard's south gate below the core's last leg (13,13).
import { defineMapLayout } from '../../define.ts';
import type { GridPos } from '../../types.ts';

/** The bearers' back route: out of the sluice (0,0), south down the band's west edge to (0,11). */
// prettier-ignore
const BACK: readonly GridPos[] = [
  [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
  [0, 7], [0, 8], [0, 9], [0, 10], [0, 11],
];

/** The waves whose start releases a bearer group, and the group. */
export const BEARER_WAVES = [
  [5, 'bearers_1'],
  [9, 'bearers_2'],
  [13, 'bearers_3'],
  [15, 'bearers_4'],
] as const;

export const map = defineMapLayout({
  id: 'a3_m05',
  act: 3,
  env: 'act3',
  objective: 'protect',
  revisitOf: 'a2_m04',
  revisitAt: [2, 1],
  size: { cols: 22, rows: 14 },
  // The band only: '*' is A2M4's footprint, composed in unchanged.
  // prettier-ignore
  tiles: [
    'S.......x.x.x.........',
    '#.******************..',
    '#.******************..',
    '#.******************..',
    '#.******************..',
    '#.******************..',
    '#o******************..',
    '#.******************..',
    '#o******************..',
    '#.******************..',
    '#.******************..',
    '#.******************..',
    'C.******************..',
    '.............o........',
  ],
  underWreckage: { '8,0': '.', '10,0': '.', '12,0': '.' },
  salvage: { '8,0': 80, '10,0': 80, '12,0': 80 },
  // A2M4's `road` and `vats` come with its layout; the band adds the bearers' route and the hunt.
  paths: [
    { id: 'home', tiles: [...BACK, [0, 12]] },
    { id: 'hunt', tiles: BACK },
  ],
  // A2M4's `sky` (the Lightwings' lane) comes with its layout; nothing flies it tonight.
  // A2M4's markers come with its layout (Intake B (4,7), the intake hoppers (5,7) and (5,8), the
  // vats (8,5), (10,6), (12,5), the gold seams, the catwalks). The band's own: the sluice the
  // bearers come up out of, their door home and the Long Walk's waymark beside it (the asset),
  // the three feed lines, Shareholder Value's hangar, and its crash site.
  markers: {
    sluice: [1, 0],
    bearer_door: [0, 12],
    long_walk: [1, 11],
    feed_1: [8, 0],
    feed_2: [10, 0],
    feed_3: [12, 0],
    hangar: [20, 1],
    crash_1: [20, 4],
    crash_2: [21, 6],
    crash_3: [20, 8],
    crash_4: [21, 10],
    kip_office: [3, 1],
  },
  startCredits: 750,
  stardust: 355,
  // Jam (the Auditors, the Silencers, and Shareholder Value's Hostile Takeover), armor (Everglow
  // Security's machines, the Liability Enforcers' plate, the Silencers), and splash (the Mote
  // clusters and the Fractures, out of the vats) are the map's answers (campaign.md § 4.8). The
  // Associates' heal and the Expediters' haste are intel.
  threatIntel: [
    'clustered',
    'armored',
    'healer_aura',
    'splitting',
    'jammer',
    'haste_aura',
    'gathering',
    'boss',
  ],
  requiredCounters: ['jam', 'armor', 'splash'],
  // Protect the bearers (design/maps.md § 5.2): their meter, 12; a hushed bearer costs it 1, and
  // a Hollow unit down the hunt its leak (sim/bearers.ts).
  asset: { name: 'Bearers', integrity: 12, marker: 'long_walk', routes: ['hunt'], bearers: true },
  safeExit: 'bearer_door',
  refugees: {
    bearers_1: { route: 'home', count: 6, kind: 'bearer' },
    bearers_2: { route: 'home', count: 6, kind: 'bearer' },
    bearers_3: { route: 'home', count: 8, kind: 'bearer' },
    bearers_4: { route: 'home', count: 6, kind: 'bearer' },
  },
  // Declined (act3.md § A3M5, Medals): no tower stays jammed by Hostile Takeover for more than
  // 1 s (the longest single Takeover jam actually held, in ticks; a Choir T3 makes it 1 s, a
  // Reboot as it lands ends it).
  medals: {
    challenge: {
      id: 'declined',
      name: 'Declined',
      description: 'No tower stays jammed by Hostile Takeover for more than 1 s.',
      condition: { stat: 'takeoverJamTicks', lte: 60 },
    },
  },
  // Cut the Feed (act3.md § A3M5): clear the three vat-feed lines before W10.
  objectives: [
    {
      id: 'cut_the_feed',
      name: 'Cut the Feed',
      description: 'Clear the three vat-feed lines before wave 10.',
      condition: { cleared: ['feed_1', 'feed_2', 'feed_3'], byWave: 10 },
      intel: 1,
    },
  ],
  // Ves'thara walks this shift with you: slot 2 is her Stillness.
  companion: { id: 'vesthara', state: 'present' },
  // Under C4 Rewrite QUILL is offline here, and she runs System Reboot (core-loop.md § 6.11).
  lockedAbilities: [{ ability: 'system_reboot', when: { flag: 'quill_choice', eq: 'rewrite' } }],
  events: [
    // Kip opens the vats as W5 starts: the first bearers walk. Then a group as W9 starts, the
    // biggest as W13 does, and the last as W15 does, ahead of the Unsung swarm.
    ...BEARER_WAVES.map(([wave, group]) => ({
      id: `walk_w${String(wave).padStart(2, '0')}`,
      on: { wave, phase: 'start' as const },
      actions: [{ spawnAllies: group }],
    })),
    // W10's surge at the vats walks in one group bigger unless the feed is cut (maps.md § 5.3:
    // authored the other way round, the wave without it and this event adding it).
    {
      id: 'surge',
      on: { wave: 10, phase: 'start' },
      when: { not: { objectiveDone: 'cut_the_feed' } },
      actions: [{ spawnWave: 'feed_surge' }],
    },
    {
      id: 'feed_cut',
      on: { objectiveCompleted: 'cut_the_feed' },
      actions: [{ cue: 'a3_m05_cue_feed_cut' }],
    },
    // Sterling, by remote: his platform's three phases (each cue plays the tick after its phase
    // begins; T707's hooks).
    { id: 'sv_spawn', on: { bossPhase: 1 }, actions: [{ cue: 'a3_m05_cue_sv_spawn' }] },
    { id: 'takeover', on: { bossPhase: 2 }, actions: [{ cue: 'a3_m05_cue_takeover' }] },
    { id: 'jettison', on: { bossPhase: 3 }, actions: [{ cue: 'a3_m05_cue_jettison' }] },
  ],
});
