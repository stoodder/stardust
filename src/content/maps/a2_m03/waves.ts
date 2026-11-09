// A2M3 waves: docs/story/campaign/act2.md § A2M3, Wave data. Routes: `road` (A1M2's switchbacks,
// from the warren mouth down to the gate: the fleeing Skitterkin, the Motes that chase them, and
// the Weft Wardens), `mine` (down the strip mine and along the foot of the terraces to the gate:
// the Glimmers, and the Hollow in W10's push), and `sky` (the Lightwings, over the strip mine).
// Every Skitterkin group is `fleeing` (Skittish, leak 0, bounty 1, medal-exempt); a fleeing group
// with Motes behind it on the road leads them by FLEE_LEAD seconds ([fleeing-lead]). W2–W11's
// countdowns are COUNTDOWN and open OPEN s in. Groups without an `intervalSec` use the enemy's
// default spacing (Mote 0.3 s, Glimmer 0.8 s, Weft Warden 2 s, Lightwing 0.7 s, Nibbler 0.8 s,
// Zoomer 0.5 s, Hauler 2.5 s, Elder 2 s).
import { defineWaves } from '../../define.ts';
import type { EnemyId, RouteId, WaveGroup, WaveTag } from '../../types.ts';

/** `count` of `enemy` on `route`, starting `delaySec` into the wave, `intervalSec` apart. */
function g(
  enemy: EnemyId,
  count: number,
  route: RouteId,
  delaySec = 0,
  intervalSec?: number,
  tags?: readonly WaveTag[],
): WaveGroup {
  return {
    enemy,
    count,
    route,
    delaySec,
    ...(intervalSec === undefined ? {} : { intervalSec }),
    ...(tags === undefined ? {} : { tags }),
  };
}

const FLEEING: readonly WaveTag[] = ['fleeing'];
const YOUNG: readonly WaveTag[] = ['fleeing', 'youngling'];

/** Fleeing Skitterkin down the road (the runners). */
const run = (enemy: EnemyId, count: number, delaySec: number, intervalSec?: number): WaveGroup =>
  g(enemy, count, 'road', delaySec, intervalSec, FLEEING);

/** Younglings in tow: Nibbler-sized young running with their elders, `intervalSec` apart. */
const young = (count: number, delaySec: number, intervalSec: number): WaveGroup =>
  g('nibbler', count, 'road', delaySec, intervalSec, YOUNG);

/** A Mote group on `route` (default the road), `intervalSec` apart (default 0.3 s). */
const motes = (count: number, delaySec: number, intervalSec?: number, route = 'road'): WaveGroup =>
  g('mote', count, route, delaySec, intervalSec);

/** A Glimmer column down the mine road, `intervalSec` apart (default 0.8 s). */
const glimmers = (count: number, delaySec: number, intervalSec?: number): WaveGroup =>
  g('glimmer', count, 'mine', delaySec, intervalSec);

/** Weft Wardens down the road, `intervalSec` apart (default 2 s). */
const wardens = (count: number, delaySec: number, intervalSec?: number): WaveGroup =>
  g('weft_warden', count, 'road', delaySec, intervalSec);

/** Lightwings over the strip mine, `intervalSec` apart (default 0.7 s). */
const lightwings = (count: number, delaySec: number, intervalSec?: number): WaveGroup =>
  g('lightwing', count, 'sky', delaySec, intervalSec);

/** How far the runners lead the Motes that chase them (enemies.md § 7: 2–4 s). */
export const FLEE_LEAD = 3;
/** W2–W11 open this long after they start, so the last wave's bounties land before contact. */
export const OPEN = 6;
/** The build phase before W2–W11 (Act II's default is 20 s): room to look. */
export const COUNTDOWN = 30;
/**
 * The build phase before W2, W4 and W9, after the slow runners (W1's younglings, W3's Haulers,
 * W8's Elders and younglings): long
 * enough that they're off the road before the next wave's threats arrive, so a player holding fire
 * on every runner group isn't holding it on the Aelari too.
 */
export const LONG_COUNTDOWN = 60;
/** A packed Mote cluster's spacing (seconds). */
export const PACKED = 0.2;

export const waves = defineWaves([
  // W1 · Skitterkin families with younglings in tow, fleeing: nothing follows them yet
  {
    groups: [run('nibbler', 8, 0, 1.0), young(6, 0.5, 1.0)],
  },
  // W2 · Glimmers on the strip mine. The long build phase lets W1's younglings walk out first.
  {
    countdownSec: LONG_COUNTDOWN,
    groups: [glimmers(4, OPEN + 8, 1.5)],
  },
  // W3 · Haulers fleeing, the sacks young, with nothing behind them: a wave to look at
  {
    countdownSec: COUNTDOWN,
    groups: [run('hauler', 3, OPEN)],
  },
  // W4 · one Weft Warden + Glimmers [T: heavy shield; Soaked + Zapcoil]. The long build phase lets
  // the Haulers walk out first.
  {
    countdownSec: LONG_COUNTDOWN,
    groups: [wardens(1, OPEN), glimmers(6, OPEN + 4, 1.2)],
  },
  // W5 · a Mote cluster down the mine, then fleeing Skitterkin with the Hollow behind them
  // [the rock lights up as the wave starts]
  {
    countdownSec: COUNTDOWN,
    groups: [
      motes(16, OPEN, PACKED, 'mine'),
      run('nibbler', 8, OPEN + 14),
      motes(3, OPEN + 14 + FLEE_LEAD),
    ],
  },
  // W6 · Lightwings ×4 over the strip mine [T: flying shields], Glimmers behind
  {
    countdownSec: COUNTDOWN,
    groups: [lightwings(4, OPEN, 4.0), glimmers(6, OPEN + 16)],
  },
  // W7 · Wardens ×2 + Lightwings [X], and a cluster down the mine
  {
    countdownSec: COUNTDOWN,
    groups: [
      wardens(2, OPEN, 4),
      lightwings(5, OPEN + 6, 3.0),
      motes(20, OPEN + 20, PACKED, 'mine'),
    ],
  },
  // W8 · a cluster down the mine, then Elders with younglings, the Hollow behind them
  {
    countdownSec: COUNTDOWN,
    groups: [
      motes(24, OPEN, PACKED, 'mine'),
      run('elder', 2, OPEN + 16, 6),
      young(10, OPEN + 16.4, 0.6),
      motes(3, OPEN + 16 + FLEE_LEAD),
    ],
  },
  // W9 · the big Aelari wave: Wardens on the road, Glimmers down the mine, Lightwings over it.
  // The long build phase lets W8's Elders walk out first.
  {
    countdownSec: LONG_COUNTDOWN,
    groups: [wardens(3, OPEN, 3), glimmers(16, OPEN, 0.8), lightwings(10, OPEN + 14, 1.4)],
  },
  // W10 · the Hollow push, both routes: runners with the Hollow behind them down the road, then a
  // cluster down the mine and a bigger one down the road
  {
    countdownSec: COUNTDOWN,
    groups: [
      run('zoomer', 12, OPEN, 0.4),
      motes(4, OPEN + FLEE_LEAD),
      motes(30, OPEN + 20, PACKED, 'mine'),
      motes(50, OPEN + 26, PACKED),
    ],
  },
  // W11 · everything: the last runners first, then the Aelari, the Lightwings, and the Hollow
  {
    countdownSec: COUNTDOWN,
    groups: [
      run('zoomer', 10, OPEN, 0.4),
      motes(4, OPEN + FLEE_LEAD),
      wardens(2, OPEN + 12, 6),
      glimmers(16, OPEN + 24, 0.8),
      lightwings(14, OPEN + 34, 1.0),
      motes(40, OPEN + 44, PACKED),
      motes(24, OPEN + 50, PACKED, 'mine'),
    ],
  },
]);
