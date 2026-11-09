// A2M1 waves: docs/story/campaign/act2.md § A2M1, Wave data. Routes: `spires` (the north-west road,
// where the Skitterkin run from), `bore` (out of Rig Nine's bore mouth, north-east: the Hollow's
// road), `cut` (the bore road's short way down the east edge to the lift, from W8), and `sky` (the
// air lane, for the fleeing Puffwings). Every Skitterkin group is `fleeing` (Skittish, leak 0,
// bounty 1, medal-exempt), so the Motes are the only threat; a fleeing group on a road with Motes
// behind it leads them by FLEE_LEAD seconds ([fleeing-lead]). W2–W10's countdowns are COUNTDOWN
// (Act II's default is 20 s). Groups without an `intervalSec` use the enemy's default spacing (Mote
// 0.3 s, Nibbler 0.8 s, Zoomer 0.5 s, Puffwing 0.6 s, Digger 1.0 s, Bunchling 1.0 s, Hauler 2.5 s).
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

/** Fleeing Skitterkin: `count` of `enemy` on `route` (the runners). */
const run = (
  enemy: EnemyId,
  count: number,
  route: RouteId,
  delaySec: number,
  intervalSec?: number,
): WaveGroup => g(enemy, count, route, delaySec, intervalSec, FLEEING);

/** A Mote group: `count` Motes on `route`, `intervalSec` apart (default 0.3 s). */
const motes = (count: number, route: RouteId, delaySec: number, intervalSec?: number): WaveGroup =>
  g('mote', count, route, delaySec, intervalSec);

/**
 * How far the runners lead the Motes that chase them on the same road (enemies.md § 7: 2–4 s).
 * At 1.6 tiles/s a Mote closes on a 1.0 tiles/s Nibbler 3 s ahead in about 5 s, a third of the
 * way down the Spires road, under the west ledge: the hush happens in view, every Mote wave.
 */
export const FLEE_LEAD = 3;
/**
 * W2–W10 open this long after they start: the last wave's bounties land before the first contact,
 * so a player who calls waves early isn't buying turrets mid-fight (the harness's early-call check).
 */
export const OPEN = 6;
/**
 * The build phase before W2–W10 (Act II's default is 20 s): room to read the next wave's preview
 * and place the drone, and par's shift lands near ten minutes at 1×.
 */
export const COUNTDOWN = 35;

/** A packed cluster's spacing (seconds): 0.32 tiles apart at a Mote's 1.6 tiles/s. */
export const PACKED = 0.2;
/**
 * W10 down the yard cut (the bore road's short way to the lift, out of reach of the merge): a
 * packed cluster of CUT_CLUSTER, CUT_DELAY s into the wave (par's strike breaks it), then a looser
 * column of CUT_COUNT, CUT_STREAM s apart, a little faster than par's cut Zapcoil can chain.
 */
export const CUT_DELAY = 14;
export const CUT_CLUSTER = 12;
export const CUT_COUNT = 20;
export const CUT_STREAM = 0.4;
/**
 * A bore cluster released this long before a Spires one reaches the merge with it: the bore road
 * is a tile longer to the merge (13 vs 12 tiles; 0.6 s at a Mote's pace).
 */
export const BORE_HEAD = 0.6;

export const waves = defineWaves([
  // W1 · Nibblers + Zoomers, fleeing [T: Skittish; nothing follows them yet]
  {
    teach: true,
    groups: [run('nibbler', 10, 'spires', 0), run('zoomer', 8, 'spires', 8)],
  },
  // W2 · Puffwings + Diggers, fleeing ("They keep looking back.")
  {
    countdownSec: COUNTDOWN,
    groups: [
      run('digger', 4, 'spires', OPEN),
      run('puffwing', 8, 'sky', OPEN + 4),
      run('nibbler', 8, 'spires', OPEN + 8),
    ],
  },
  // W3 · a fleeing group, then Motes ×6 behind it on the same road [T: Mote; the hush, Heavy]
  {
    countdownSec: COUNTDOWN,
    groups: [
      run('nibbler', 6, 'spires', OPEN),
      { ...motes(6, 'spires', OPEN + FLEE_LEAD, 0.6), teach: true },
    ],
  },
  // W4 · Haulers fleeing + Motes [X: shoot the Hollow, not the runners]; the bore opens
  {
    countdownSec: COUNTDOWN,
    groups: [
      run('hauler', 3, 'spires', OPEN),
      motes(10, 'spires', OPEN + FLEE_LEAD),
      motes(16, 'bore', OPEN + 10, PACKED),
    ],
  },
  // W5 · an Elder with her younglings + Motes, on both roads
  {
    countdownSec: COUNTDOWN,
    groups: [
      run('elder', 1, 'spires', OPEN),
      g('nibbler', 6, 'spires', OPEN + 0.4, 0.3, ['fleeing', 'youngling']),
      motes(12, 'spires', OPEN + FLEE_LEAD),
      motes(20, 'bore', OPEN + 8, PACKED),
    ],
  },
  // W6 · Mote clusters out of the bore [X: splash], meeting runners and their chasers at the merge;
  // the no-splash build loses here
  {
    countdownSec: COUNTDOWN,
    groups: [
      run('nibbler', 8, 'spires', OPEN),
      motes(24, 'spires', OPEN + FLEE_LEAD, PACKED),
      motes(36, 'bore', OPEN + FLEE_LEAD - BORE_HEAD, PACKED),
      motes(36, 'bore', OPEN + 18, PACKED),
    ],
  },
  // W7 · Bunchlings fleeing + Motes, both roads at once (the double cluster: the full-catalog
  // no-splash build loses here)
  {
    countdownSec: COUNTDOWN,
    groups: [
      run('bunchling', 6, 'spires', OPEN),
      motes(60, 'spires', OPEN + FLEE_LEAD, PACKED),
      motes(60, 'bore', OPEN + FLEE_LEAD - BORE_HEAD, PACKED),
      motes(30, 'bore', OPEN + 24, PACKED),
    ],
  },
  // W8 · mixed: a Zoomer stampede and Diggers fleeing down the Spires road, Puffwings overhead,
  // Motes; the yard cut opens (a few Motes straight down the east edge)
  {
    countdownSec: COUNTDOWN,
    groups: [
      run('zoomer', 20, 'spires', OPEN, 0.4),
      motes(24, 'spires', OPEN + FLEE_LEAD, PACKED),
      motes(24, 'bore', OPEN + FLEE_LEAD - BORE_HEAD, PACKED),
      run('puffwing', 8, 'sky', OPEN + 5),
      motes(6, 'cut', OPEN + 12),
      run('digger', 4, 'spires', OPEN + 20),
      motes(20, 'spires', OPEN + 20 + FLEE_LEAD, PACKED),
    ],
  },
  // W9 · runners and their chasers, a bore cluster to meet them at the merge, and the cut again
  {
    countdownSec: COUNTDOWN,
    groups: [
      run('nibbler', 10, 'spires', OPEN),
      motes(24, 'spires', OPEN + FLEE_LEAD, PACKED),
      motes(20, 'bore', OPEN + FLEE_LEAD - BORE_HEAD, PACKED),
      motes(12, 'cut', OPEN + 12),
    ],
  },
  // W10 · everything, both roads and the cut
  {
    countdownSec: COUNTDOWN,
    groups: [
      run('zoomer', 24, 'spires', OPEN, 0.4),
      motes(30, 'spires', OPEN + FLEE_LEAD, PACKED),
      motes(30, 'bore', OPEN + FLEE_LEAD - BORE_HEAD, PACKED),
      run('puffwing', 8, 'sky', OPEN + 8),
      motes(CUT_CLUSTER, 'cut', OPEN + CUT_DELAY, PACKED),
      motes(CUT_COUNT, 'cut', OPEN + CUT_DELAY + 4, CUT_STREAM),
      run('hauler', 2, 'spires', OPEN + 24),
      motes(30, 'spires', OPEN + 24 + FLEE_LEAD, PACKED),
      motes(30, 'bore', OPEN + 24 + FLEE_LEAD - BORE_HEAD, PACKED),
    ],
  },
]);
