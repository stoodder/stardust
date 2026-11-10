// A2M5 waves: docs/story/campaign/act2.md § A2M5, Wave data. Routes: `road` (the Preserve Road,
// north-west to the gate: the Aelari before the pivot, the refugees after, and the Hollow behind
// them from W8), `rig` (the rig road, in from the east onto the road at the fencing's end: the
// Hollow, from the pivot), and `sky` (W4's Lightwings, over the fencing). Five waves before the
// pivot and seven after: W5 is the Sunderglass Penitent alone, so nothing Aelari spawns after it
// (the pivot stands down live units only), and W6 has an ordinary countdown, so its start is the
// pivot's deadline. A countdown opens once the wave before it finishes spawning. Groups without an
// `intervalSec` use the enemy's default spacing (Mote 0.3 s, Glimmer 0.8 s, Weft Warden 2 s,
// Lightwing 0.7 s, Veilwalker 1 s, Blinkstrider 1 s, Cantor 1.2 s). After the pivot every group
// is Motes (0.25–0.5 s apart): the rig road's groups reach the Preserve Road at the fencing's end
// (8,4) 5.6 s after they spawn, where a forced pivot kneels the Ward (its chill slows them through
// the junction); the road's catch the refugees walking ahead of them.
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

const road = (enemy: EnemyId, count: number, delaySec: number, intervalSec?: number): WaveGroup =>
  g(enemy, count, 'road', delaySec, intervalSec);

/** A Mote group on `route` (default the rig road), `intervalSec` apart (default 0.3 s). */
const motes = (count: number, delaySec: number, intervalSec?: number, route = 'rig'): WaveGroup =>
  g('mote', count, route, delaySec, intervalSec);

/** W2–W12 open this long after they start, so the last wave's bounties land before contact. */
export const OPEN = 6;
/** The build phase before most waves. */
export const COUNTDOWN = 25;
/**
 * W6's build phase: the Penitent's fight. It opens as she spawns (W5's only group), so W6 starts
 * (and forces the pivot) PENITENT_WINDOW s after her, long before she could walk the 36-tile road
 * to the gate (0.2 tiles/s: 180 s). She walks 12 tiles in it, to the fencing's end, so a forced
 * pivot kneels the Ward where the rig road joins.
 */
export const PENITENT_WINDOW = 60;

export const waves = defineWaves([
  // W1 · Glimmers + one Aegis Cantor [T: shield aura; kill it first], the Cantor mid-column
  {
    teach: true,
    groups: [road('glimmer', 4, 0, 1.5), road('cantor', 1, 2.5)],
  },
  // W2 · a Weft Warden with a Cantor at its side [X], Glimmers behind, two Veilwalkers last
  {
    countdownSec: COUNTDOWN,
    groups: [
      road('weft_warden', 1, OPEN),
      road('cantor', 1, OPEN + 2),
      road('glimmer', 6, OPEN + 7, 1.0),
      road('veilwalker', 2, OPEN + 20, 3),
    ],
  },
  // W3 · Blinkstriders + Veilwalkers [C]
  {
    countdownSec: COUNTDOWN,
    groups: [road('blinkstrider', 2, OPEN, 3), road('veilwalker', 6, OPEN + 5, 3.5)],
  },
  // W4 · Lightwings over the valley + Cantors down the road [X], Veilwalkers in their shadow
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('lightwing', 4, 'sky', OPEN, 1.5),
      road('cantor', 4, OPEN + 2, 3),
      road('glimmer', 12, OPEN + 2.5, 0.9),
      road('veilwalker', 6, OPEN + 14, 3.5),
    ],
  },
  // W5 · the Sunderglass Penitent, alone (shield wall and recharge pulse; cloaked shards when
  // its shield breaks; the pivot at 50% or when W6 starts)
  {
    countdownSec: COUNTDOWN,
    groups: [road('sunderglass_penitent', 1, OPEN)],
  },
  // (the pivot) W6 · the surge: Motes from the rig road toward the first refugee group [T:
  // escort, gently]. Never called early (D138): its build phase is the Penitent's fight, and its
  // start forces the pivot.
  {
    countdownSec: PENITENT_WINDOW,
    noCall: true,
    groups: [motes(12, OPEN + 8, 0.5)],
  },
  // W7 · Motes + the second group, the Motes down the road behind it
  {
    countdownSec: COUNTDOWN,
    groups: [motes(10, OPEN, 0.4), motes(10, OPEN + 12, 0.4, 'road')],
  },
  // W8 · Mote clusters from both ends, the third group between them
  {
    countdownSec: COUNTDOWN,
    groups: [motes(14, OPEN + 4, 0.3), motes(14, OPEN + 16, 0.3, 'road')],
  },
  // W9 · larger Mote clusters, one ahead of the third group
  {
    countdownSec: COUNTDOWN,
    groups: [motes(18, OPEN + 4, 0.3), motes(18, OPEN + 16, 0.3, 'road')],
  },
  // W10 · Motes ×20
  {
    countdownSec: COUNTDOWN,
    groups: [motes(20, OPEN, 0.3)],
  },
  // W11 · two groups at once, clusters from both ends
  {
    countdownSec: COUNTDOWN,
    groups: [motes(22, OPEN + 10, 0.25), motes(22, OPEN + 20, 0.25, 'road')],
  },
  // W12 · the last group + the largest surge
  {
    countdownSec: COUNTDOWN,
    groups: [motes(28, OPEN + 5, 0.25), motes(28, OPEN + 16, 0.25, 'road')],
  },
]);
