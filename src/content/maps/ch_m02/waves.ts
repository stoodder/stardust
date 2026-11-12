// CH_M02 waves (Lights Out; T862). Routes are A2M6's: `west` and `east` (down from the Spires,
// through the two gates, merging under the watchtower, and down the yard road to the domes) and
// `sky` (the Rift Moths, across the wall diagonally). Sundown's Hollow (Motes, Fractures, Rift
// Moths), every unit cloaked by the map's rule, in smaller crowds than Sundown sent: a crowd you
// can't see is crowd enough. Groups without an `intervalSec` use the enemy's default spacing.
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

const motes = (route: RouteId, count: number, delaySec: number, intervalSec = 0.3): WaveGroup =>
  g('mote', count, route, delaySec, intervalSec);
const fractures = (route: RouteId, count: number, delaySec: number, intervalSec = 3): WaveGroup =>
  g('fracture', count, route, delaySec, intervalSec);
const moths = (count: number, delaySec: number, intervalSec = 1.5): WaveGroup =>
  g('riftmoth', count, 'sky', delaySec, intervalSec);

/** The build phase before most waves. */
export const COUNTDOWN = 20;
/** Most waves open this long after they start. */
export const OPEN = 5;

export const waves = defineWaves([
  // W1 · Motes down the west road
  { groups: [motes('west', 10, OPEN)] },
  // W2 · Motes, both roads; the first Rift Moths
  {
    countdownSec: COUNTDOWN,
    groups: [motes('west', 10, OPEN), motes('east', 10, OPEN + 6), moths(3, OPEN + 10, 2)],
  },
  // W3 · a Fracture down the west road, Motes down the east
  { countdownSec: COUNTDOWN, groups: [fractures('west', 1, OPEN), motes('east', 10, OPEN + 6)] },
  // W4 · Rift Moths over the wall; Motes behind them
  { countdownSec: COUNTDOWN, groups: [moths(4, OPEN, 2), motes('east', 14, OPEN + 8)] },
  // W5 · a Mote crowd down each road (a Fracture in the east one), Rift Moths after
  {
    countdownSec: COUNTDOWN,
    groups: [
      motes('west', 20, OPEN, 0.2),
      fractures('east', 1, OPEN + 4),
      motes('east', 20, OPEN + 8, 0.2),
      moths(3, OPEN + 12, 2),
    ],
  },
  // W6 · Fractures and Rift Moths
  {
    countdownSec: COUNTDOWN,
    groups: [fractures('west', 1, OPEN), fractures('east', 1, OPEN + 3), moths(4, OPEN + 8, 2)],
  },
  // W7 · both roads at once, Rift Moths after
  {
    countdownSec: COUNTDOWN,
    groups: [
      fractures('east', 2, OPEN),
      motes('west', 16, OPEN + 6, 0.25),
      motes('east', 12, OPEN + 12, 0.25),
      moths(3, OPEN + 16, 2),
    ],
  },
  // W8 · a Rift Moth flock, a crowd down each road under it, Fractures in the east one
  {
    countdownSec: COUNTDOWN,
    groups: [
      moths(6, OPEN, 1.2),
      motes('west', 18, OPEN + 6, 0.25),
      fractures('east', 2, OPEN + 8),
      motes('east', 14, OPEN + 12, 0.25),
    ],
  },
  // W9 · a Fracture down each road, Rift Moths over the wall
  {
    countdownSec: COUNTDOWN,
    groups: [fractures('west', 1, OPEN), fractures('east', 1, OPEN + 4), moths(3, OPEN + 10, 2)],
  },
  // W10 · the west road's surge (full dark next wave)
  {
    countdownSec: COUNTDOWN,
    groups: [
      motes('west', 22, OPEN, 0.22),
      fractures('west', 1, OPEN + 6),
      moths(4, OPEN + 10, 1.5),
    ],
  },
  // W11 · the east road's surge, in full dark
  {
    countdownSec: COUNTDOWN,
    groups: [
      motes('east', 22, OPEN, 0.22),
      fractures('east', 2, OPEN + 6),
      moths(5, OPEN + 12, 1.2),
    ],
  },
  // W12 · everything, both roads and the sky, in the dark
  {
    countdownSec: COUNTDOWN,
    groups: [
      fractures('west', 2, OPEN),
      fractures('east', 2, OPEN + 1.5),
      moths(8, OPEN + 6, 1),
      motes('west', 16, OPEN + 12, 0.25),
      motes('east', 16, OPEN + 14, 0.25),
    ],
  },
]);
