// CH_M01 waves (Skitterkin Only; T862). Routes are A3M1's: `spiral` (out of the basin, the long way
// round, 50 tiles), `north` (down onto the outer ring under the north fence, 24), the rifts `rift_n`
// (from W2, down the west side onto the west ring) and `rift_e` (from W6, in through the east fence
// onto the east ring), and `sky` (the Rift Moths, north-east to the gate). The Hollow only: Motes
// (splash), Fractures (splash), Maws (splash, armored), Rift Moths (air), and Undertows (burrowed,
// armored), so each of the warrens' homes has its job: the Gloop the crowds, the Sproing Pad the
// sky, the Den the diggers, the Choir the lot of them louder. Groups without an `intervalSec` use
// the enemy's default spacing.
import { defineWaves } from '../../define.ts';
import type { EnemyId, RouteId, WaveGroup } from '../../types.ts';

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

const motes = (count: number, route: RouteId, delaySec: number, intervalSec = 0.25): WaveGroup =>
  g('mote', count, route, delaySec, intervalSec);
const moths = (count: number, delaySec: number, intervalSec = 1.5): WaveGroup =>
  g('riftmoth', count, 'sky', delaySec, intervalSec);

/** The build phase before most waves. */
export const COUNTDOWN = 22;
/** Most waves open this long after they start. */
export const OPEN = 4;

export const waves = defineWaves([
  // W1 · Motes down the north road, then out of the basin
  { groups: [motes(16, 'north', OPEN), motes(10, 'spiral', OPEN + 8)] },
  // W2 · Fractures out of the basin; Motes through the north rift
  {
    countdownSec: COUNTDOWN,
    groups: [g('fracture', 2, 'spiral', OPEN, 3), motes(14, 'rift_n', OPEN + 6)],
  },
  // W3 · the first Undertows, out of the basin, under Motes on the north road
  {
    countdownSec: COUNTDOWN,
    groups: [g('undertow', 2, 'spiral', OPEN, 3), motes(16, 'north', OPEN + 4)],
  },
  // W4 · Rift Moths, and Motes on both roads
  {
    countdownSec: COUNTDOWN,
    groups: [moths(4, OPEN), motes(14, 'north', OPEN + 2), motes(14, 'rift_n', OPEN + 10)],
  },
  // W5 · a Maw leading Motes down the north road; Undertows out of the basin
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('maw', 1, 'north', OPEN),
      motes(12, 'north', OPEN + 1),
      g('undertow', 2, 'spiral', OPEN + 4, 3),
    ],
  },
  // W6 · Fractures through the east rift (it opens); Rift Moths
  {
    countdownSec: COUNTDOWN,
    groups: [g('fracture', 3, 'rift_e', OPEN, 2.5), moths(4, OPEN + 6)],
  },
  // W7 · Undertows on every road
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('undertow', 2, 'spiral', OPEN, 3),
      g('undertow', 2, 'north', OPEN + 3, 3),
      motes(18, 'rift_n', OPEN + 6),
    ],
  },
  // W8 · two Maws, and the sky
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('maw', 1, 'north', OPEN),
      motes(10, 'north', OPEN + 1),
      g('maw', 1, 'rift_e', OPEN + 6),
      motes(10, 'rift_e', OPEN + 7),
      moths(5, OPEN + 10),
    ],
  },
  // W9 · Fractures and Undertows through both rifts
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('fracture', 3, 'rift_n', OPEN, 2.5),
      g('undertow', 3, 'rift_e', OPEN + 4, 3),
      motes(16, 'spiral', OPEN + 8),
    ],
  },
  // W10 · the swarm: Rift Moths over Motes on every road
  {
    countdownSec: COUNTDOWN,
    groups: [
      moths(7, OPEN, 1.2),
      motes(18, 'north', OPEN + 2),
      motes(18, 'rift_n', OPEN + 6),
      motes(18, 'rift_e', OPEN + 10),
    ],
  },
  // W11 · Maws and Undertows together
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('maw', 2, 'north', OPEN, 4),
      motes(14, 'north', OPEN + 1),
      g('undertow', 4, 'spiral', OPEN + 4, 2.5),
      g('fracture', 2, 'rift_e', OPEN + 8, 3),
    ],
  },
  // W12 · everything the warrens know how to answer, at once
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('fracture', 4, 'rift_n', OPEN, 2.5),
      g('undertow', 4, 'north', OPEN + 3, 2.5),
      moths(7, OPEN + 6, 1.2),
      g('maw', 1, 'rift_e', OPEN + 8),
      motes(16, 'rift_e', OPEN + 9),
    ],
  },
]);
