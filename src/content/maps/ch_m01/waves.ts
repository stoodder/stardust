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
  { groups: [motes(10, 'north', OPEN, 0.35), motes(8, 'spiral', OPEN + 10, 0.35)] },
  // W2 · a Fracture out of the basin; Motes through the north rift; the first Rift Moths
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('fracture', 1, 'spiral', OPEN),
      motes(8, 'rift_n', OPEN + 10, 0.35),
      moths(2, OPEN + 14, 3),
    ],
  },
  // W3 · the first Undertow, out of the basin, behind Motes on the north road
  {
    countdownSec: COUNTDOWN,
    groups: [motes(10, 'north', OPEN, 0.35), g('fracture', 1, 'spiral', OPEN + 2)],
  },
  // W4 · Rift Moths, and a Mote cluster on the north road
  {
    countdownSec: COUNTDOWN,
    groups: [moths(4, OPEN, 3), motes(24, 'north', OPEN + 8, 0.15)],
  },
  // W5 · a Maw leading Motes down the north road; an Undertow out of the basin
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('maw', 1, 'north', OPEN),
      motes(6, 'north', OPEN + 1, 0.35),
      motes(24, 'rift_n', OPEN + 10, 0.12),
    ],
  },
  // W6 · a Fracture through the east rift (it opens); Rift Moths
  {
    countdownSec: COUNTDOWN,
    groups: [g('fracture', 1, 'rift_e', OPEN), moths(5, OPEN + 10, 2.5)],
  },
  // W7 · Undertows on both roads, Motes through the north rift
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('fracture', 2, 'spiral', OPEN, 3),
      moths(5, OPEN + 6, 2.5),
      motes(24, 'rift_n', OPEN + 14, 0.12),
    ],
  },
  // W8 · two Maws, and the sky
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('maw', 1, 'north', OPEN),
      motes(14, 'north', OPEN + 1, 0.15),
      g('maw', 1, 'rift_e', OPEN + 12),
      moths(7, OPEN + 18, 2),
    ],
  },
  // W9 · Fractures and Undertows through both rifts
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('fracture', 1, 'rift_n', OPEN),
      motes(18, 'rift_e', OPEN + 10, 0.15),
      moths(2, OPEN + 18, 3),
    ],
  },
  // W10 · the swarm: Rift Moths over Motes on both north ways in
  {
    countdownSec: COUNTDOWN,
    groups: [
      moths(5, OPEN, 2.5),
      motes(22, 'north', OPEN + 6, 0.15),
      motes(22, 'rift_n', OPEN + 14, 0.15),
    ],
  },
  // W11 · Maws and Undertows together
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('maw', 2, 'north', OPEN, 6),
      motes(8, 'north', OPEN + 1, 0.35),
      motes(20, 'spiral', OPEN + 8, 0.15),
      g('fracture', 1, 'rift_e', OPEN + 16),
    ],
  },
  // W12 · everything the warrens know how to answer, at once
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('fracture', 2, 'rift_n', OPEN, 5),
      motes(16, 'north', OPEN + 8, 0.15),
      moths(3, OPEN + 14, 3),
      g('maw', 1, 'rift_e', OPEN + 18),
      motes(6, 'rift_e', OPEN + 19, 0.35),
    ],
  },
]);
