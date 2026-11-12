// FIN waves: docs/story/campaign/finale.md § FIN, Waves. This file holds Phase 1, the Descent
// (W1–18, T820); Phase 2's add waves (W19–26) and the Unsung follow in T821, appended after
// `PHASE_1` (see the end of the file). Routes: `halls` (the Halls mouth (11,0) down the choir's
// road to the gate: the Hollow meet the choir head on), `rift_field` (the west rift field, onto
// the road's west bend), `bore_road` (the east Bore road, past the rig, onto the road's east bend,
// which the choir passes early), the air lanes `sky_n`, `sky_e`, `sky_w`, and the rift lanes
// `rift_ne` (onto the Halls descent), `rift_s`, `rift_sw` (onto the road behind the choir), which
// open as W15 starts. A countdown opens once the wave before it finishes spawning.
//
// Air, jam, and splash are required; armored, cloaked, and burrowing units are soft (≤ 15% of a
// wave's threat): the drones, Associates, the Liability, the Operatives, and the Undertows ride
// inside big Hollow waves. Every Hollow ground unit that reaches the choir hushes one singer.
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

/** The build phase before most waves. */
export const COUNTDOWN = 30;
/** W9: the choir passes the memorial; nothing walks in for this long (finale.md § FIN). */
export const MEMORIAL_QUIET_SEC = 10;

const CALL = { countdownSec: COUNTDOWN } as const;

/** Phase 1, the Descent (W1–18). */
export const PHASE_1: readonly WaveDef[] = [
  // W1 · Motes ahead of the choir
  { groups: [motes(8, 'halls', 4, 0.8), motes(6, 'halls', 14, 0.8)] },
  // W2 · Fractures from the rift field
  { ...CALL, groups: [fractures(1, 'rift_field', 0), motes(8, 'halls', 6, 0.8)] },
  // W3 · Rift Moths
  { ...CALL, groups: [moths(3, 'sky_n', 0), moths(3, 'sky_e', 6), motes(6, 'halls', 4, 0.8)] },
  // W4 · Bore security: Auditors with a drone, on the Bore road the walk runs past
  {
    ...CALL,
    groups: [
      g('auditor', 1, 'bore_road', 0),
      motes(10, 'halls', 4, 0.8),
      fractures(1, 'rift_field', 6),
    ],
  },
  // W5 · Maws
  { ...CALL, groups: [maws(2, 'halls', 0, 5), motes(8, 'halls', 3, 0.8), motes(6, 'rift_field', 8, 0.8)] },
  // W6 · Mote clusters (the canon's pair of Undertows walks in W16 and W18 instead: at 15% of a
  // wave's threat, a soft pair needs a wave ~7,500 strong, past W6's size)
  {
    ...CALL,
    groups: [
      motes(8, 'halls', 0, 0.8),
      motes(8, 'rift_field', 4, 0.8),
      fractures(2, 'halls', 8, 3),
    ],
  },
  // W7 · Silencers
  {
    ...CALL,
    groups: [silencers(3, 'halls', 0, 4), motes(8, 'halls', 2, 0.8), motes(8, 'rift_field', 6, 0.8)],
  },
  // W8 · gunships over the road
  {
    ...CALL,
    groups: [gunships(1, 'sky_n', 0), gunships(1, 'sky_e', 6), moths(3, 'sky_w', 8)],
  },
  // W9 · the choir passes the memorial: nothing for MEMORIAL_QUIET_SEC, then the rift field
  {
    ...CALL,
    groups: [
      fractures(2, 'rift_field', MEMORIAL_QUIET_SEC + 2, 3),
      motes(10, 'halls', MEMORIAL_QUIET_SEC + 4),
      moths(3, 'sky_n', MEMORIAL_QUIET_SEC + 6),
    ],
  },
  // W10 · Hollow from all three spawns
  {
    ...CALL,
    groups: [
      motes(12, 'halls', 0),
      fractures(4, 'rift_field', 2),
      maws(2, 'bore_road', 4, 4),
      moths(3, 'sky_e', 8),
    ],
  },
  // W11 · a Fracture column, and behind it a Bore crew (an Associate) with two Operatives
  {
    ...CALL,
    groups: [
      fractures(12, 'halls', 0, 1.2),
      motes(12, 'rift_field', 4),
      maws(3, 'halls', 10, 4),
      g('associate', 1, 'bore_road', 12),
      g('blackbudget', 1, 'bore_road', 14),
    ],
  },
  // W12 · Maws + Silencers
  {
    ...CALL,
    groups: [
      maws(3, 'halls', 0, 4),
      silencers(3, 'halls', 4, 4),
      motes(10, 'rift_field', 6),
      maws(2, 'rift_field', 10, 4),
    ],
  },
  // W13 · a Rift Moth flock
  {
    ...CALL,
    groups: [
      moths(5, 'sky_n', 0, 0.8),
      moths(4, 'sky_e', 4, 0.8),
      moths(4, 'sky_w', 8, 0.8),
      motes(10, 'halls', 6),
    ],
  },
  // W14 · Associates and a Liability on the Bore road, behind a Mote screen
  {
    ...CALL,
    groups: [
      motes(18, 'halls', 0),
      maws(4, 'halls', 4, 4),
      fractures(8, 'rift_field', 4),
      silencers(3, 'rift_field', 10, 4),
      g('associate', 1, 'bore_road', 8),
      g('liability', 1, 'bore_road', 12),
      maws(2, 'bore_road', 14, 4),
    ],
  },
  // W15 · rifts everywhere
  {
    ...CALL,
    groups: [
      motes(12, 'rift_ne', 0),
      fractures(4, 'rift_s', 2),
      maws(2, 'rift_sw', 4, 4),
      motes(10, 'rift_field', 6),
      maws(2, 'rift_ne', 10, 4),
      moths(4, 'sky_n', 8),
    ],
  },
  // W16 · Fractures with an Undertow
  {
    ...CALL,
    groups: [
      fractures(8, 'halls', 0, 1.2),
      fractures(6, 'rift_field', 4, 1.2),
      maws(2, 'halls', 10, 4),
      g('undertow', 1, 'halls', 14),
    ],
  },
  // W17 · the largest surge
  {
    ...CALL,
    groups: [
      motes(16, 'halls', 0),
      fractures(6, 'rift_ne', 2),
      maws(3, 'halls', 6, 3),
      silencers(2, 'halls', 10, 4),
      motes(12, 'rift_field', 4),
      moths(4, 'sky_e', 6),
      gunships(2, 'sky_n', 10, 4),
      g('compliance', 2, 'bore_road', 12, 2),
    ],
  },
  // W18 · the Halls mouth: everything converges
  {
    ...CALL,
    groups: [
      motes(16, 'halls', 0),
      maws(3, 'halls', 4, 3),
      fractures(6, 'rift_field', 2),
      silencers(2, 'rift_ne', 6, 4),
      maws(2, 'rift_ne', 10, 4),
      moths(4, 'sky_n', 4),
      moths(4, 'sky_w', 8),
      gunships(2, 'sky_e', 10, 4),
      g('auditor', 1, 'bore_road', 6),
      fractures(4, 'rift_sw', 8),
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

// Phase 2's add waves (W19–26, T821) append here: `[...PHASE_1, ...PHASE_2_WAVES]`.
export const waves = defineWaves([...PHASE_1]);
