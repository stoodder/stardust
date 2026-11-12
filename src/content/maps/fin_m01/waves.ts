// FIN waves: docs/story/campaign/finale.md § FIN, Waves. This file holds Phase 1, the Descent
// (W1–18, T820, retuned by T821 and T874), then Phase 2's add waves (W19–26) with the Unsung (T821;
// `PHASE_2_WAVES`). Routes: `halls` (the Halls mouth (11,0) down the choir's
// road to the gate: the Hollow meet the choir head on), `rift_field` (the west rift field, onto
// the road's west bend: ahead of the choir until she passes its mouth in W14, behind her after),
// `bore_road` (the east Bore road along row 3 onto the Halls descent, ahead of her throughout),
// the air lanes `sky_n`, `sky_e`, `sky_w` (over the ridge to the gate), and the rift lanes
// `rift_ne`, `rift_nw` (along row 1 onto the Halls descent), which open as W15 starts. A countdown
// opens once the wave before it finishes spawning. The choir walks a leg as each wave starts.
//
// Air, jam, and splash are required; armored, cloaked, and burrowing units are soft (≤ 15% of a
// wave's threat, a splitter's brood counted): the drones, the Associate, the Operative, and the
// Undertows ride inside big Hollow waves. Every Hollow ground unit that reaches the choir hushes
// one singer; Everglow's walk past her to the gate.
//
// W14–W18 (T874: the finale has no single required tower, pillar 2): a third of the Descent's
// last void threat is Everglow's Bore security instead, Auditors with drones and an Associate up
// the Bore road. They jam and cost the gate, not singers, and Psionic does ×0.35 to them; the
// Maws are one fewer a wave, and the Silencers (the plated jammers that walk through a Thumper
// road into the choir) mostly Auditors. The splash exams stay sharp: W15's rift-field Motes come
// packed (0.12 s apart) and W18 sends a dense Mote cluster down the Halls.
import { defineWaves } from '../../define.ts';
import type { EnemyId, RouteId, WaveDef, WaveGroup } from '../../types.ts';

/** `count` of `enemy` on `route`, starting `delaySec` into the wave, `intervalSec` apart. */
function g(
  enemy: EnemyId,
  count: number,
  route: RouteId,
  delaySec = 0,
  intervalSec?: number,
): WaveGroup {
  return {
    enemy,
    count,
    route,
    delaySec,
    ...(intervalSec === undefined ? {} : { intervalSec }),
  };
}

const motes = (count: number, route: RouteId, delaySec: number, intervalSec = 0.3): WaveGroup =>
  g('mote', count, route, delaySec, intervalSec);
const fractures = (count: number, route: RouteId, delaySec: number, intervalSec = 1.5): WaveGroup =>
  g('fracture', count, route, delaySec, intervalSec);
const moths = (count: number, route: RouteId, delaySec: number, intervalSec = 1.2): WaveGroup =>
  g('riftmoth', count, route, delaySec, intervalSec);
const maws = (count: number, route: RouteId, delaySec: number, intervalSec = 3): WaveGroup =>
  g('maw', count, route, delaySec, intervalSec);
const silencers = (count: number, route: RouteId, delaySec: number, intervalSec = 3): WaveGroup =>
  g('silencer', count, route, delaySec, intervalSec);
const gunships = (count: number, route: RouteId, delaySec: number, intervalSec = 3): WaveGroup =>
  g('gunship', count, route, delaySec, intervalSec);
/** Everglow's Compliance drones up the Bore road (Bore security). */
const drones = (count: number, delaySec: number, intervalSec = 1.2): WaveGroup =>
  g('compliance', count, 'bore_road', delaySec, intervalSec);
/** Everglow's Auditors up the Bore road (Bore security). */
const auditors = (count: number, delaySec: number, intervalSec = 5): WaveGroup =>
  g('auditor', count, 'bore_road', delaySec, intervalSec);

/** The build phase before most waves. */
export const COUNTDOWN = 30;
/** W9: the choir passes the memorial; nothing walks in for this long (finale.md § FIN). */
export const MEMORIAL_QUIET_SEC = 10;

const CALL = { countdownSec: COUNTDOWN } as const;

/** Phase 1, the Descent (W1–18). */
export const PHASE_1: readonly WaveDef[] = [
  // W1 · Motes ahead of the choir
  { groups: [motes(6, 'halls', 4, 1.2), motes(6, 'halls', 16, 1.2)] },
  // W2 · Fractures from the rift field
  { ...CALL, groups: [fractures(1, 'halls', 0), motes(6, 'rift_field', 6, 1.2)] },
  // W3 · Rift Moths
  { ...CALL, groups: [moths(2, 'sky_n', 0), moths(2, 'sky_e', 6), motes(6, 'halls', 4, 1.2)] },
  // W4 · Bore security: an Auditor on the Bore road, which runs past the rig onto the Halls descent
  {
    ...CALL,
    groups: [
      g('auditor', 1, 'bore_road', 0),
      motes(6, 'rift_field', 4, 1.2),
      fractures(1, 'halls', 8),
    ],
  },
  // W5 · Maws
  {
    ...CALL,
    groups: [maws(2, 'halls', 0, 5), motes(8, 'halls', 3, 0.8), motes(6, 'rift_field', 8, 0.8)],
  },
  // W6 · Mote clusters (the canon's pair of Undertows walks in W16 and W18 instead: at 15% of a
  // wave's threat, a soft pair needs a wave ~7,500 strong, past W6's size)
  {
    ...CALL,
    groups: [
      motes(8, 'halls', 0, 0.5),
      motes(8, 'rift_field', 4, 0.5),
      fractures(3, 'halls', 8, 3),
    ],
  },
  // W7 · Silencers
  {
    ...CALL,
    groups: [
      silencers(1, 'halls', 0),
      g('auditor', 1, 'bore_road', 4),
      motes(8, 'halls', 2, 0.5),
      motes(8, 'rift_field', 6, 0.5),
      fractures(2, 'halls', 10, 3),
    ],
  },
  // W8 · gunships over the road
  {
    ...CALL,
    groups: [gunships(1, 'sky_n', 0), moths(3, 'sky_w', 8), fractures(3, 'halls', 4, 3)],
  },
  // W9 · the choir passes the memorial: nothing for MEMORIAL_QUIET_SEC, then the rift field
  {
    ...CALL,
    groups: [
      fractures(2, 'halls', MEMORIAL_QUIET_SEC + 2, 3),
      motes(10, 'halls', MEMORIAL_QUIET_SEC + 4),
      moths(3, 'sky_n', MEMORIAL_QUIET_SEC + 6),
    ],
  },
  // W10 · Hollow from all three spawns
  {
    ...CALL,
    groups: [
      motes(10, 'halls', 0, 0.5),
      fractures(3, 'halls', 10, 3),
      motes(6, 'bore_road', 6, 0.5),
      fractures(2, 'rift_field', 12, 3),
      moths(3, 'sky_e', 8),
    ],
  },
  // W11 · a Fracture column, and behind it a Bore crew (an Associate). From here to W14 the choir
  // passes the rift field's mouth, so the Hollow come down from the Halls
  {
    ...CALL,
    groups: [
      fractures(3, 'halls', 0, 3),
      motes(10, 'halls', 10, 0.5),
      maws(2, 'halls', 16, 4),
      g('associate', 1, 'bore_road', 12),
    ],
  },
  // W12 · Maws + Silencers
  {
    ...CALL,
    groups: [
      maws(1, 'halls', 0),
      silencers(2, 'halls', 4, 5),
      gunships(1, 'sky_n', 8),
      motes(10, 'halls', 14, 0.5),
      fractures(1, 'bore_road', 6),
    ],
  },
  // W13 · a Rift Moth flock
  {
    ...CALL,
    groups: [
      moths(4, 'sky_n', 0, 0.8),
      moths(3, 'sky_e', 4, 0.8),
      moths(3, 'sky_w', 8, 0.8),
      motes(10, 'halls', 6, 0.5),
      maws(1, 'rift_field', 16),
      fractures(2, 'halls', 12, 3),
    ],
  },
  // W14 · an Associate and Bore security on the Bore road, behind a Mote screen, gunships over
  // it (the canon's Liability stays home: at 15% of a wave's threat it needs one ~6,000 strong)
  {
    ...CALL,
    groups: [
      motes(10, 'halls', 0),
      maws(1, 'halls', 4),
      fractures(2, 'halls', 14, 3),
      silencers(2, 'halls', 20, 4),
      g('associate', 1, 'bore_road', 8),
      g('auditor', 1, 'bore_road', 10),
      gunships(2, 'sky_e', 12, 4),
    ],
  },
  // W15 · rifts everywhere, a packed Mote column out of the rift field, two Auditors on the Bore road
  {
    ...CALL,
    groups: [
      motes(4, 'rift_ne', 0),
      fractures(1, 'rift_nw', 2),
      maws(1, 'rift_nw', 8),
      motes(10, 'rift_field', 6, 0.12),
      motes(4, 'rift_nw', 10),
      maws(1, 'rift_ne', 12),
      moths(4, 'sky_n', 8),
      gunships(2, 'sky_w', 10, 4),
      auditors(2, 4),
    ],
  },
  // W16 · Fractures with an Undertow, two Auditors on the Bore road
  {
    ...CALL,
    groups: [
      fractures(2, 'halls', 0, 2),
      fractures(1, 'rift_nw', 6, 2),
      silencers(2, 'halls', 8, 4),
      motes(6, 'rift_ne', 8),
      maws(1, 'halls', 12),
      g('undertow', 1, 'halls', 16),
      auditors(2, 2),
    ],
  },
  // W17 · the largest surge, Bore security (four Auditors, drones) and a Black Budget Operative
  {
    ...CALL,
    groups: [
      motes(16, 'halls', 0, 0.4),
      fractures(1, 'rift_ne', 4, 2),
      maws(2, 'halls', 10, 4),
      silencers(1, 'halls', 16),
      motes(12, 'rift_nw', 8),
      motes(14, 'rift_ne', 12, 0.2),
      moths(4, 'sky_e', 6),
      gunships(2, 'sky_n', 10, 4),
      g('blackbudget', 1, 'bore_road', 14),
      auditors(4, 4, 4),
      drones(2, 8),
    ],
  },
  // W18 · the Halls mouth: everything converges (the second Undertow among it, and a packed Mote
  // cluster down the Halls)
  {
    ...CALL,
    groups: [
      motes(7, 'halls', 0),
      maws(1, 'halls', 4),
      fractures(1, 'rift_nw', 2, 3),
      silencers(1, 'rift_ne', 6),
      fractures(1, 'rift_ne', 14),
      maws(1, 'rift_ne', 12),
      moths(4, 'sky_n', 4),
      moths(4, 'sky_w', 8),
      gunships(2, 'sky_e', 10, 4),
      auditors(1, 6),
      fractures(2, 'rift_field', 8, 2),
      g('undertow', 1, 'halls', 16),
      g('associate', 1, 'bore_road', 9),
      motes(12, 'halls', 10, 0.2),
      auditors(1, 6),
    ],
  },
];

/**
 * The Deep Bore's breakthrough (maps.md § 5.5): if it fills before the choir reaches the Halls, a
 * Hollow surge pours out of the Halls mouth (script groups; map.ts's `breakthrough` event).
 */
export const SCRIPT_GROUPS = {
  breakthrough_motes: motes(16, 'halls', 0),
  breakthrough_maws: maws(3, 'halls', 4),
} as const;

/** Phase 2's build phase between add waves: with ≤ 8 s of spawning, a wave every ~20 s. */
export const PHASE_2_COUNTDOWN = 6;
/**
 * W20's: the add waves wait while the Unsung rises, so Directive 0 (Keep, 20 s in) folds a class
 * and "Who's there?" restores it between add waves (T821: it stings, it doesn't decide the run).
 */
export const DIRECTIVE_LULL = 30;
/** W19's: the Unsung rises a few seconds after the choir reaches the Halls. */
export const UNSUNG_COUNTDOWN = 5;

/**
 * Phase 2's add waves on a fixed cadence: each belongs to script phase 2 (`inPhase`: W19 waits for
 * it, and none starts after Dawn) and is never called early, so the phase keeps its clock under
 * early calls too. They come down from the Halls and the rift lanes onto the descent, into the
 * song, so they are laid to rest there; the Rift Moths fly the air lanes past it and scatter.
 */
const P2 = { countdownSec: PHASE_2_COUNTDOWN, noCall: true, inPhase: 2 } as const;

/** Phase 2, the Unsung (W19–26). */
export const PHASE_2_WAVES: readonly WaveDef[] = [
  // W19 · the Unsung rises from the Halls
  {
    ...P2,
    countdownSec: UNSUNG_COUNTDOWN,
    groups: [g('unsung', 1, 'halls', 0), motes(6, 'rift_ne', 0, 0.3)],
  },
  // W20 · Motes down the descent (after a lull: Directive 0's window under Keep)
  {
    ...P2,
    countdownSec: DIRECTIVE_LULL,
    groups: [motes(8, 'halls', 0, 0.6), fractures(1, 'rift_nw', 3)],
  },
  // W21 · a Maw, and Motes from the west rift
  { ...P2, groups: [maws(1, 'halls', 0), motes(6, 'rift_nw', 2, 0.6)] },
  // W22 · a Fracture, and Motes from the east rift
  { ...P2, groups: [fractures(1, 'halls', 0), motes(6, 'rift_ne', 4, 0.6)] },
  // W23 · rifts both sides
  {
    ...P2,
    groups: [motes(6, 'rift_ne', 0, 0.6), motes(6, 'rift_nw', 2, 0.6), maws(1, 'halls', 4)],
  },
  // W24 · Fractures, and Rift Moths over the song (they scatter past it)
  {
    ...P2,
    groups: [fractures(1, 'halls', 0), moths(3, 'sky_n', 2), motes(6, 'halls', 4, 0.5)],
  },
  // W25 · a Maw and a Silencer
  {
    ...P2,
    groups: [maws(1, 'halls', 0), silencers(1, 'rift_nw', 3), motes(6, 'rift_ne', 4, 0.6)],
  },
  // W26 · the last of the Halls
  {
    ...P2,
    groups: [motes(6, 'halls', 0, 0.5), fractures(1, 'halls', 6), maws(1, 'rift_ne', 5)],
  },
];

export const waves = defineWaves([...PHASE_1, ...PHASE_2_WAVES]);
