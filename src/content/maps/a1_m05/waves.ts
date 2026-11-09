// A1M5 waves: docs/story/campaign/act1.md § A1M5, Wave data. Routes: `spires` (the west road),
// `warren` (the north-east track, whose spawn opens at W3), `sky` (the air lane down the middle),
// and `sky_east` (a lone Puffwing round the east edge in W6 and W8). Countdowns are the Act I default (25 s)
// except W10's, which starts once the boss fight is over. Groups without an `intervalSec` use the enemy's
// default spacing (Nibbler 0.8 s, Zoomer 0.5 s, Chonk 1.5 s, Hauler 2.5 s, Bunchling 1.0 s, Elder
// 2.0 s, Digger 1.0 s, Puffwing 0.6 s).
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
 * W10's countdown, which starts only once the Matriarch is driven off (`countdownAfter:
 * 'bossEnded'`; D097): the field goes quiet, Bricks lowers his cannon, and then the Quiet Wave
 * walks in. It can't be called early (the sim refuses `callWave` on a quiet wave).
 */
export const QUIET_WAVE_COUNTDOWN_SEC = 8;
/**
 * The Quiet Wave walks in this long after W10 starts: after Bricks's cue and his cannon lowering
 * (1.5 s after the start, D094), so the player sees both before anything is on the road.
 */
export const QUIET_WAVE_DELAY_SEC = 4;
/**
 * W2–W8 open this long after they start: the last wave's bounties land before the first contact,
 * so a player who calls waves early isn't buying turrets mid-fight (the harness's early-call check).
 * 6 s, not more, keeps par's shift near 8.7 minutes at 1×, inside Act I's 6–9 (T315).
 */
export const OPEN = 6;
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
  { groups: [g('nibbler', 30, 'spires', 0, 0.8)] },
  // W2 · Diggers ×3 [T: burrowing, "not a hard requirement"]
  {
    teach: true,
    groups: [g('digger', 3, 'spires', OPEN, 2.5), g('nibbler', 26, 'spires', OPEN + 9, 0.6)],
  },
  // W3 · the east spawn opens: Zoomers + Nibblers [T: second spawn]
  { groups: [g('zoomer', 16, 'warren', OPEN, 0.4), g('nibbler', 30, 'spires', OPEN + 4, 0.6)] },
  // W4 · Bunchlings with a few Diggers, both roads [X: splash]
  {
    groups: [
      g('bunchling', 6, 'spires', OPEN, 1.0),
      g('bunchling', 6, 'warren', OPEN + 4, 1.0),
      g('digger', 2, 'warren', OPEN + 12, 1.5),
    ],
  },
  // W5 · Elder + Haulers [X: armor]: a convoy down the Spires road, one Hauler and its Elder down
  // the warren track, then three loose Haulers down the Spires road
  {
    groups: [
      ...convoy('spires', OPEN, 8),
      g('hauler', 1, 'warren', OPEN + 10),
      g('elder', 1, 'warren', OPEN + 11.2),
      g('nibbler', 8, 'warren', OPEN + 11.6, 0.3),
      g('hauler', 3, 'spires', OPEN + 20, 1.5),
    ],
  },
  // W6 · Puffwings + Chonks [X: air]
  {
    groups: [
      g('chonk', 6, 'spires', OPEN, 2),
      g('puffwing', 10, 'sky', OPEN + 6, 0.6),
      g('puffwing', 10, 'sky', OPEN + 20, 0.6),
      // A lone Puffwing round the east edge: `sky_east` shows here, two waves before W8's
      g('puffwing', 1, 'sky_east', OPEN + 12),
    ],
  },
  // W7 · mixed, both roads [X]
  {
    groups: [
      g('bunchling', 12, 'spires', OPEN, 0.8),
      ...convoy('warren', OPEN + 2, 6),
      g('puffwing', 10, 'sky', OPEN + 8, 0.6),
      g('zoomer', 20, 'spires', OPEN + 16, 0.35),
      g('chonk', 4, 'spires', OPEN + 18, 1.5),
    ],
  },
  // W8 · the Spring Surge: the largest wave of Act I, both roads and the sky
  {
    groups: [
      g('zoomer', 24, 'warren', OPEN, 0.3),
      g('bunchling', 16, 'spires', OPEN, 0.6),
      ...huddle('spires', OPEN + 14, 10),
      g('chonk', 8, 'warren', OPEN + 12, 1.5),
      g('puffwing', 16, 'sky', OPEN + 16, 0.5),
      // the warren convoy: two Haulers, three Elders keeping them at their pace, and their brood
      g('hauler', 2, 'warren', OPEN + 22, 1.5),
      g('elder', 3, 'warren', OPEN + 24.7),
      g('nibbler', 14, 'warren', OPEN + 25.1, 0.3),
      ...convoy('spires', OPEN + 24, 8),
      g('digger', 3, 'warren', OPEN + 30, 1.2),
      g('puffwing', 1, 'sky_east', OPEN + 20),
    ],
  },
  // W9 · Matriarch Chitterbloom (west road): sneezes, burrows, panics, and is driven off
  { groups: [g('chitterbloom', 1, 'spires', BOSS_DELAY_SEC)] },
  // W10 · the Quiet Wave: Old Thrum leading six younglings, east road. No NEW badge, no prompt.
  {
    countdownAfter: 'bossEnded',
    countdownSec: QUIET_WAVE_COUNTDOWN_SEC,
    groups: [
      g('elder', 1, 'warren', QUIET_WAVE_DELAY_SEC, undefined, ['quiet_wave']),
      g('nibbler', YOUNGLINGS, 'warren', QUIET_WAVE_DELAY_SEC + 0.6, 0.8, [
        'quiet_wave',
        'youngling',
      ]),
    ],
  },
]);
