// A2M4 waves: docs/story/campaign/act2.md § A2M4, Wave data. Routes: `road` (in at the north-east,
// round Intake B, and down to the control core: everything but the vats' surge), `vats` (up out of
// the drain hatch onto the road's last leg: the Hollow, from W10), and `sky` (the Lightwings, over
// the vats). Every Skitterkin group is `fleeing` (Skittish, leak 0, bounty 1, medal-exempt); a
// fleeing group with Motes behind it on the road leads them by FLEE_LEAD seconds ([fleeing-lead]).
// W2–W12 open OPEN s in. Groups without an `intervalSec` use the enemy's default spacing (Mote
// 0.3 s, Glimmer 0.8 s, Weft Warden 2 s, Lightwing 0.7 s, Veilwalker 1 s, Blinkstrider 1 s,
// Nibbler 0.8 s, Zoomer 0.5 s, Elder 2 s).
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

/** Veilwalkers down the road, `intervalSec` apart (default 1 s). */
const veils = (count: number, delaySec: number, intervalSec?: number): WaveGroup =>
  g('veilwalker', count, 'road', delaySec, intervalSec);

/** Blinkstriders down the road, `intervalSec` apart (default 1 s). */
const blinks = (count: number, delaySec: number, intervalSec?: number): WaveGroup =>
  g('blinkstrider', count, 'road', delaySec, intervalSec);

/** A Glimmer column down the road, `intervalSec` apart (default 0.8 s). */
const glimmers = (count: number, delaySec: number, intervalSec?: number): WaveGroup =>
  g('glimmer', count, 'road', delaySec, intervalSec);

/** Weft Wardens down the road, `intervalSec` apart (default 2 s). */
const wardens = (count: number, delaySec: number, intervalSec?: number): WaveGroup =>
  g('weft_warden', count, 'road', delaySec, intervalSec);

/** Lightwings over the vats, `intervalSec` apart (default 0.7 s). */
const lightwings = (count: number, delaySec: number, intervalSec?: number): WaveGroup =>
  g('lightwing', count, 'sky', delaySec, intervalSec);

/** How far the runners lead the Motes that chase them (enemies.md § 7: 2–4 s). */
export const FLEE_LEAD = 3;
/** W2–W12 open this long after they start, so the last wave's bounties land before contact. */
export const OPEN = 6;
/** The build phase before most waves (Act II's default is 20 s). */
export const COUNTDOWN = 25;
/**
 * The build phase before W5: W4's runners and their chasers are off the road and the truth scene
 * plays (on W4's clear) with nothing on the field and W5 still to come, in every reference run.
 */
export const LONG_COUNTDOWN = 50;
/** A packed Mote cluster's spacing (seconds). */
export const PACKED = 0.2;

export const waves = defineWaves([
  // W1 · Skitterkin, fleeing: families running from something nobody names yet
  {
    groups: [run('nibbler', 8, 0, 1.0), young(6, 0.5, 1.0)],
  },
  // W2 · Motes drawn toward the vats
  {
    countdownSec: COUNTDOWN,
    groups: [motes(12, OPEN), motes(12, OPEN + 8)],
  },
  // W3 · Veilwalkers ×2 [T: cloak; Lookout, Scanner Sweep], alone on the road
  {
    countdownSec: COUNTDOWN,
    teach: true,
    groups: [veils(2, OPEN, 3)],
  },
  // W4 · fleeing Skitterkin with the Hollow behind them, then a cluster
  {
    countdownSec: COUNTDOWN,
    groups: [run('zoomer', 10, OPEN, 0.4), motes(4, OPEN + FLEE_LEAD), motes(16, OPEN + 10, PACKED)],
  },
  // (the truth scene, on W4's clear) W5 · a Mote cluster
  {
    countdownSec: LONG_COUNTDOWN,
    groups: [motes(36, OPEN, PACKED), motes(36, OPEN + 12, PACKED)],
  },
  // W6 · Blinkstriders ×3 [T: blink; depth placement]
  {
    countdownSec: COUNTDOWN,
    teach: true,
    groups: [blinks(6, OPEN, 2)],
  },
  // W7 · Veilwalkers + Glimmers [X: cloak]
  {
    countdownSec: COUNTDOWN,
    groups: [veils(6, OPEN, 2.5), glimmers(12, OPEN + 12, 0.8), motes(40, OPEN + 22, PACKED), motes(30, OPEN + 30, PACKED)],
  },
  // W8 · Lightwings over the vats + Wardens down the road, Veilwalkers in their shadow
  {
    countdownSec: COUNTDOWN,
    groups: [
      wardens(4, OPEN, 3),
      veils(3, OPEN + 2, 4),
      lightwings(6, OPEN + 12, 2),
      motes(40, OPEN + 16, PACKED),
    ],
  },
  // W9 · Blinkstriders + Veilwalkers [X: blink]
  {
    countdownSec: LONG_COUNTDOWN,
    groups: [blinks(6, OPEN, 2), veils(6, OPEN + 6, 2), glimmers(8, OPEN + 16)],
  },
  // W10 · the Hollow surges up at the vats, with fleeing Skitterkin ahead of it down the road
  {
    countdownSec: COUNTDOWN,
    groups: [
      run('nibbler', 10, OPEN, 0.6),
      motes(4, OPEN + FLEE_LEAD),
      motes(40, OPEN + 14, PACKED, 'vats'),
      motes(40, OPEN + 24, PACKED, 'vats'),
    ],
  },
  // W11 · cloak and blink mixed [X]
  {
    countdownSec: COUNTDOWN,
    groups: [veils(8, OPEN, 1.5), blinks(8, OPEN + 1, 1.5), glimmers(12, OPEN + 12)],
  },
  // W12 · everything: the Aelari down the road and over the vats, the Hollow up out of them
  {
    countdownSec: COUNTDOWN,
    groups: [
      wardens(3, OPEN, 4),
      veils(8, OPEN + 6, 1.5),
      blinks(8, OPEN + 10, 1.5),
      lightwings(9, OPEN + 16, 1.5),
      glimmers(12, OPEN + 22),
      motes(50, OPEN + 30, PACKED, 'vats'),
    ],
  },
]);
