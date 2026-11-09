// A2M2 waves: docs/story/campaign/act2.md § A2M2, Wave data. Routes: `main` (the ridge road to the
// relay: the fleeing Skitterkin and the Motes that chase them) and `rigs` (the branch to Rigs 7
// and 8: the Aelari, and the Glass Witch). Every Skitterkin group is `fleeing` (Skittish, leak 0,
// bounty 1, medal-exempt); a fleeing group with Motes behind it on the main road leads them by
// FLEE_LEAD seconds ([fleeing-lead]). W2–W11's countdowns are COUNTDOWN (Act II's default is
// 20 s) and open OPEN s in. Groups without an `intervalSec` use the enemy's default spacing
// (Mote 0.3 s, Glimmer 0.8 s, Nibbler 0.8 s, Zoomer 0.5 s, Hauler 2.5 s).
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

/** Fleeing Skitterkin down the main road (the runners). */
const run = (enemy: EnemyId, count: number, delaySec: number, intervalSec?: number): WaveGroup =>
  g(enemy, count, 'main', delaySec, intervalSec, FLEEING);

/** A Mote group down the main road, `intervalSec` apart (default 0.3 s). */
const motes = (count: number, delaySec: number, intervalSec?: number): WaveGroup =>
  g('mote', count, 'main', delaySec, intervalSec);

/** A Glimmer column down the rig branch, `intervalSec` apart (default 0.8 s). */
const glimmers = (count: number, delaySec: number, intervalSec?: number): WaveGroup =>
  g('glimmer', count, 'rigs', delaySec, intervalSec);

/** How far the runners lead the Motes that chase them (enemies.md § 7: 2–4 s). */
export const FLEE_LEAD = 3;
/** W2–W11 open this long after they start, so the last wave's bounties land before contact. */
export const OPEN = 6;
/** The build phase before W2–W11 (Act II's default is 20 s). */
export const COUNTDOWN = 30;
/** A packed Mote cluster's spacing (seconds): 0.32 tiles apart at a Mote's 1.6 tiles/s. */
export const PACKED = 0.2;
/** When the Glass Witch steps onto the branch in W11. */
export const WITCH_DELAY = OPEN;
/**
 * W11's Hollow surge down the main road (SURGE_COUNT Motes behind a Zoomer stampede), on the road
 * as the Witch turns back along the branch for the rigs: par's second Time Dilation, 52 s after its
 * first, catches it only with QUILL's Rapport (51 s; T401). Without it the surge's tail gets
 * through (par's last two leaks).
 */
export const SURGE = 48;
export const SURGE_COUNT = 60;

export const waves = defineWaves([
  // W1 · Skitterkin, fleeing: nothing follows them yet
  {
    groups: [run('nibbler', 10, 0), run('zoomer', 8, 8)],
  },
  // W2 · Glimmers ×4 on the branch [T: shields; Zapcoil]
  {
    countdownSec: COUNTDOWN,
    teach: true,
    groups: [glimmers(4, OPEN, 1.2)],
  },
  // W3 · fleeing Skitterkin + Motes
  {
    countdownSec: COUNTDOWN,
    groups: [run('nibbler', 8, OPEN), motes(10, OPEN + FLEE_LEAD)],
  },
  // W4 · Glimmers ×10 + Skitterkin [X]: both routes for the first time
  {
    countdownSec: COUNTDOWN,
    groups: [glimmers(10, OPEN), run('nibbler', 8, OPEN + 4), motes(12, OPEN + 4 + FLEE_LEAD)],
  },
  // W5 · a Glimmer column + Motes [X]
  {
    countdownSec: COUNTDOWN,
    groups: [
      glimmers(14, OPEN, 0.6),
      run('nibbler', 8, OPEN + 2),
      motes(16, OPEN + 2 + FLEE_LEAD, PACKED),
    ],
  },
  // W6 · a Mote cluster + fleeing Haulers
  {
    countdownSec: COUNTDOWN,
    groups: [run('hauler', 3, OPEN), motes(34, OPEN + FLEE_LEAD, PACKED), glimmers(10, OPEN + 10)],
  },
  // W7 · Glimmers + Motes
  {
    countdownSec: COUNTDOWN,
    groups: [
      glimmers(20, OPEN, 0.6),
      run('nibbler', 10, OPEN + 4),
      motes(30, OPEN + 4 + FLEE_LEAD, PACKED),
    ],
  },
  // W8 · mixed, both routes: two Glimmer columns and two Mote clusters (the no-shield and
  // no-splash builds lose by here; par's first leaks)
  {
    countdownSec: COUNTDOWN,
    groups: [
      glimmers(20, OPEN, 0.5),
      run('zoomer', 16, OPEN, 0.4),
      motes(43, OPEN + FLEE_LEAD, PACKED),
      glimmers(12, OPEN + 18, 0.5),
      motes(24, OPEN + 20, PACKED),
    ],
  },
  // W9 · Glimmers + Motes
  {
    countdownSec: COUNTDOWN,
    groups: [
      glimmers(28, OPEN, 0.5),
      run('nibbler', 10, OPEN + 6),
      motes(40, OPEN + 6 + FLEE_LEAD, PACKED),
    ],
  },
  // W10 · big mixed
  {
    countdownSec: COUNTDOWN,
    groups: [
      glimmers(20, OPEN, 0.5),
      run('zoomer', 20, OPEN, 0.4),
      motes(50, OPEN + FLEE_LEAD, PACKED),
      glimmers(20, OPEN + 16, 0.5),
      run('hauler', 2, OPEN + 18),
      motes(50, OPEN + 18 + FLEE_LEAD, PACKED),
    ],
  },
  // W11 · the Glass Witch on the branch, her constructs behind her, and the Hollow down the road:
  // a rush as she steps out, and a surge as she turns back for the rigs
  {
    countdownSec: COUNTDOWN,
    groups: [
      run('nibbler', 10, OPEN - FLEE_LEAD),
      motes(30, OPEN, PACKED),
      g('glass_witch', 1, 'rigs', WITCH_DELAY),
      glimmers(6, WITCH_DELAY + 8, 0.8),
      run('zoomer', 12, SURGE - FLEE_LEAD, 0.4),
      motes(SURGE_COUNT, SURGE, PACKED),
    ],
  },
]);
