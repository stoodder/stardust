// A2M6 waves: docs/story/campaign/act2.md § A2M6, Wave data. Routes: `west` and `east` (down from
// the Spires, through the two gates, merging under the watchtower, and down the yard road to the
// domes) and `sky` (the Rift Moths, across the wall diagonally). The Hollow only: Motes, Fractures
// (each splits into 2 Shards, each Shard into 2 Motes), Rift Moths (Phasing). W2–W14 open OPEN s
// in. Groups without an `intervalSec` use the enemy's default spacing (Mote 0.3 s, Fracture
// 1.2 s, Rift Moth 0.8 s).
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

/** A Mote group down `route`, `intervalSec` apart (default 0.3 s). */
const motes = (route: RouteId, count: number, delaySec: number, intervalSec?: number): WaveGroup =>
  g('mote', count, route, delaySec, intervalSec);

/** Fractures down `route`, `intervalSec` apart (default 1.2 s). */
const fractures = (
  route: RouteId,
  count: number,
  delaySec: number,
  intervalSec?: number,
): WaveGroup => g('fracture', count, route, delaySec, intervalSec);

/** Rift Moths across the wall, `intervalSec` apart (default 0.8 s). */
const moths = (count: number, delaySec: number, intervalSec?: number): WaveGroup =>
  g('riftmoth', count, 'sky', delaySec, intervalSec);

/** W2–W14 open this long after they start, so the last wave's bounties land before contact. */
export const OPEN = 6;
/** The build phase before most waves (Act II's default is 20 s). */
export const COUNTDOWN = 20;
/** A packed Mote cluster's spacing (seconds). */
export const PACKED = 0.2;

export const waves = defineWaves([
  // W1 · Motes down the west road
  {
    groups: [motes('west', 12, 0, 0.5)],
  },
  // W2 · Motes, both roads
  {
    countdownSec: COUNTDOWN,
    groups: [motes('west', 12, OPEN), motes('east', 12, OPEN + 4)],
  },
  // W3 · Fractures ×2 (Hollow splitting: splash at the death point)
  {
    countdownSec: COUNTDOWN,
    groups: [fractures('west', 1, OPEN), fractures('east', 1, OPEN + 3)],
  },
  // W4 · Mote clusters
  {
    countdownSec: COUNTDOWN,
    groups: [motes('west', 20, OPEN, PACKED), motes('east', 20, OPEN + 10, PACKED)],
  },
  // W5 · Rift Moths ×3 [T: phasing; burst; Stillness, Prism]
  {
    countdownSec: COUNTDOWN,
    teach: true,
    groups: [moths(3, OPEN, 2)],
  },
  // W6 · Fractures + Motes [X]
  {
    countdownSec: COUNTDOWN,
    groups: [fractures('west', 1, OPEN, 3), motes('east', 40, OPEN + 6, PACKED)],
  },
  // W7 · both roads
  {
    countdownSec: COUNTDOWN,
    groups: [
      fractures('west', 1, OPEN, 3),
      fractures('east', 1, OPEN + 1.5, 3),
      motes('west', 18, OPEN + 12, PACKED),
      motes('east', 18, OPEN + 14, PACKED),
    ],
  },
  // W8 · Rift Moths + Fractures
  {
    countdownSec: COUNTDOWN,
    groups: [fractures('east', 3, OPEN, 2.5), moths(5, OPEN + 6, 1.2)],
  },
  // W9 · a Rift Moth flock [X]
  {
    countdownSec: COUNTDOWN,
    groups: [moths(16, OPEN, 0.25), motes('west', 30, OPEN + 8, PACKED)],
  },
  // W10 · big mixed
  {
    countdownSec: COUNTDOWN,
    groups: [
      fractures('west', 1, OPEN, 2.5),
      fractures('east', 2, OPEN + 1, 2.5),
      moths(5, OPEN + 8, 1),
      motes('west', 10, OPEN + 14, PACKED),
      motes('east', 10, OPEN + 16, PACKED),
    ],
  },
  // W11 · the surge down the west road (full dark as it starts)
  {
    countdownSec: COUNTDOWN,
    groups: [
      motes('west', 30, OPEN, PACKED),
      fractures('west', 2, OPEN + 6, 1.5),
      motes('west', 24, OPEN + 16, PACKED),
    ],
  },
  // W12 · the surge down the east road, in full dark
  {
    countdownSec: COUNTDOWN,
    groups: [
      motes('east', 30, OPEN, PACKED),
      fractures('east', 2, OPEN + 6, 1.5),
      moths(4, OPEN + 10, 0.8),
      motes('east', 24, OPEN + 16, PACKED),
    ],
  },
  // W13 · both roads
  {
    countdownSec: COUNTDOWN,
    groups: [
      fractures('west', 2, OPEN, 3),
      fractures('east', 1, OPEN + 1.5, 3),
      moths(12, OPEN + 6, 0.5),
      motes('west', 20, OPEN + 12, PACKED),
      motes('east', 20, OPEN + 14, PACKED),
    ],
  },
  // W14 · everything
  {
    countdownSec: COUNTDOWN,
    groups: [
      motes('west', 24, OPEN, PACKED),
      motes('east', 24, OPEN + 2, PACKED),
      fractures('west', 2, OPEN + 8, 1.5),
      fractures('east', 2, OPEN + 9, 1.5),
      moths(17, OPEN + 12, 0.4),
      motes('west', 24, OPEN + 22, PACKED),
      motes('east', 24, OPEN + 24, PACKED),
    ],
  },
]);
