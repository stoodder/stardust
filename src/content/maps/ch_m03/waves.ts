// CH_M03 waves (Glass Core; T862). Routes are A2M4's: `road` (in at the north-east, round Intake B,
// east under the vats, down round the conduit to the control core, 39 tiles), `vats` (up out of the
// drain hatch onto the road's last leg, 12 tiles: short, so whatever comes up it is close), and
// `sky` (the Lightwings, over the vats to the core). The Aelari, who brought shields to A2M4, and
// the Hollow's Motes: Glimmers, Weft Wardens and Aegis Cantors (shield), Lightwings (air, shielded),
// and Mote clusters (splash). Every leak counts against a core of 5, so the crowds are smaller
// than a campaign map's; the hatch is where it stays tense. Groups without an `intervalSec` use the
// enemy's default spacing.
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
const wings = (count: number, delaySec: number, intervalSec = 1.5): WaveGroup =>
  g('lightwing', count, 'sky', delaySec, intervalSec);

/** The build phase before most waves. */
export const COUNTDOWN = 20;
/** Most waves open this long after they start. */
export const OPEN = 5;

export const waves = defineWaves([
  // W1 · Glimmers down the road
  { groups: [g('glimmer', 8, 'road', OPEN, 1.2)] },
  // W2 · Motes down the road, Glimmers behind
  {
    countdownSec: COUNTDOWN,
    groups: [motes('road', 20, OPEN, 0.15), g('glimmer', 6, 'road', OPEN + 8, 1.2)],
  },
  // W3 · Lightwings over the vats
  { countdownSec: COUNTDOWN, groups: [wings(4, OPEN), g('glimmer', 6, 'road', OPEN + 4, 1.2)] },
  // W4 · a Weft Warden, Glimmers at its back
  {
    countdownSec: COUNTDOWN,
    groups: [g('weft_warden', 1, 'road', OPEN), g('glimmer', 8, 'road', OPEN + 3, 1)],
  },
  // W5 · Motes up out of the hatch, close to the core
  {
    countdownSec: COUNTDOWN,
    groups: [motes('road', 24, OPEN, 0.15), motes('vats', 14, OPEN + 10, 0.15)],
  },
  // W6 · an Aegis Cantor with its Glimmers; Lightwings
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('cantor', 1, 'road', OPEN),
      g('glimmer', 8, 'road', OPEN + 1, 0.8),
      wings(4, OPEN + 10),
    ],
  },
  // W7 · two Weft Wardens, Motes up the hatch
  {
    countdownSec: COUNTDOWN,
    groups: [g('weft_warden', 2, 'road', OPEN, 4), motes('vats', 18, OPEN + 12, 0.15)],
  },
  // W8 · a Lightwing flight, a crowd under it
  {
    countdownSec: COUNTDOWN,
    groups: [wings(6, OPEN, 1.2), motes('road', 26, OPEN + 6, 0.15)],
  },
  // W9 · Cantors keeping a column's shields up
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('cantor', 2, 'road', OPEN, 3),
      g('glimmer', 10, 'road', OPEN + 1, 0.8),
      g('weft_warden', 1, 'road', OPEN + 10),
    ],
  },
  // W10 · the hatch: Glimmers and Motes straight up out of it
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('glimmer', 6, 'vats', OPEN, 1),
      motes('vats', 20, OPEN + 8, 0.15),
      wings(4, OPEN + 12),
    ],
  },
  // W11 · Wardens and Cantors together
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('weft_warden', 2, 'road', OPEN, 3),
      g('cantor', 1, 'road', OPEN + 2),
      motes('road', 26, OPEN + 10, 0.15),
    ],
  },
  // W12 · everything, the road and the hatch and the sky
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('weft_warden', 1, 'road', OPEN),
      g('cantor', 1, 'road', OPEN + 2),
      g('glimmer', 10, 'road', OPEN + 3, 0.8),
      wings(6, OPEN + 8, 1.2),
      motes('vats', 20, OPEN + 14, 0.15),
    ],
  },
]);
