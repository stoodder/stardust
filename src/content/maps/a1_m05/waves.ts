// A1M5 waves: docs/story/campaign/act1.md § A1M5, Wave data. Routes: `spires` (the west road),
// `warren` (the north-east track, whose spawn opens at W3), and `sky` (the air lane). Countdowns
// are the Act I default (25 s) except W10's, which waits out the boss fight. Groups without an
// `intervalSec` use the enemy's default spacing.
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

/** An Elder at `delaySec` on `route` with `n` Nibblers packed in behind it (A1M4's huddle). */
const huddle = (route: RouteId, delaySec: number, n: number): WaveGroup[] => [
  g('elder', 1, route, delaySec),
  g('nibbler', n, route, delaySec + 0.4, 0.3),
];

/**
 * W10's countdown: long enough that the Quiet Wave walks in after the Matriarch is driven off
 * (the countdown starts as soon as W9 has spawned; waves overlap), and a held breath after.
 */
export const QUIET_WAVE_COUNTDOWN_SEC = 70;
/**
 * The Matriarch comes up the Spires road this long after W9 starts: the ground rumbles first, and
 * a player who calls W9 early still meets her after W8's tail has cleared the gate.
 */
export const BOSS_DELAY_SEC = 20;
/** The Quiet Wave: Old Thrum leading six younglings, 0.8 s apart, close behind her. */
export const YOUNGLINGS = 6;

/**
 * A convoy (A1M4's W9): two Haulers 1.5 s apart, their Elder 1.2 s behind the second (both walk in
 * its huddle, at its pace, regenerating), and `n` Nibblers behind it.
 */
const convoy = (route: RouteId, delaySec: number, n: number): WaveGroup[] => [
  g('hauler', 2, route, delaySec, 1.5),
  g('elder', 1, route, delaySec + 2.7),
  g('nibbler', n, route, delaySec + 3.1, 0.3),
];

export const waves = defineWaves([
  // W1 · Nibblers (west)
  { groups: [g('nibbler', 16, 'spires', 0, 0.8)] },
  // W2 · Diggers ×3 [T: burrowing, "not a hard requirement"]
  { teach: true, groups: [g('digger', 3, 'spires', 0, 2.5), g('nibbler', 10, 'spires', 9, 0.6)] },
  // W3 · the east spawn opens: Zoomers + Nibblers [T: second spawn]
  { groups: [g('zoomer', 16, 'warren', 0, 0.4), g('nibbler', 14, 'spires', 4, 0.6)] },
  // W4 · Bunchlings with a few Diggers, both roads [X: splash]
  {
    groups: [
      g('bunchling', 10, 'spires', 0, 1.0),
      g('bunchling', 10, 'warren', 4, 1.0),
      g('digger', 2, 'warren', 12, 1.5),
    ],
  },
  // W5 · Elder + Haulers [X: armor]: a convoy down each road
  { groups: [...convoy('spires', 0, 8), ...convoy('warren', 10, 8)] },
  // W6 · Puffwings + Chonks [X: air]
  {
    groups: [
      g('chonk', 6, 'spires', 0, 2),
      g('puffwing', 10, 'sky', 6, 0.6),
      g('puffwing', 10, 'sky', 20, 0.6),
    ],
  },
  // W7 · mixed, both roads [X]
  {
    groups: [
      g('bunchling', 12, 'spires', 0, 0.8),
      ...convoy('warren', 2, 6),
      g('puffwing', 10, 'sky', 8, 0.6),
      g('zoomer', 20, 'warren', 16, 0.35),
      g('chonk', 4, 'spires', 18, 1.5),
    ],
  },
  // W8 · the Spring Surge: the largest wave of Act I, both roads and the sky
  {
    groups: [
      g('zoomer', 24, 'warren', 0, 0.3),
      g('bunchling', 16, 'spires', 0, 0.6),
      ...huddle('spires', 14, 10),
      g('chonk', 8, 'warren', 12, 1.5),
      g('puffwing', 16, 'sky', 16, 0.5),
      ...convoy('warren', 20, 8),
      ...convoy('spires', 24, 8),
      g('digger', 3, 'warren', 30, 1.2),
    ],
  },
  // W9 · Matriarch Chitterbloom (west road): sneezes, burrows, panics, and is driven off
  { groups: [g('chitterbloom', 1, 'spires', BOSS_DELAY_SEC)] },
  // W10 · the Quiet Wave: Old Thrum leading six younglings, east road. No NEW badge, no prompt.
  {
    countdownSec: QUIET_WAVE_COUNTDOWN_SEC,
    groups: [
      g('elder', 1, 'warren', 0, undefined, ['quiet_wave']),
      g('nibbler', YOUNGLINGS, 'warren', 0.6, 0.8, ['quiet_wave', 'youngling']),
    ],
  },
]);
