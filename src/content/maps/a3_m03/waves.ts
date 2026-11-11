// A3M3 waves: docs/story/campaign/act3.md § A3M3, Waves. Routes: `cut_west` and `cut_east` (down
// the cut, through the choke past Bricks, and to the west or east door), the rift lanes `rift_east`
// (from W4) and `rift_west` (from W11), both onto a fork behind Bricks, and `sky_west`/`sky_east`
// (the Rift Moths, crossing over the choke). Every wave from W2 is `noCall` (D141), so the waves'
// starts are fixed from W1's, and a countdown opens once the wave before it finishes spawning.
// Groups without an `intervalSec` use the enemy's default spacing (Mote 0.3 s, Fracture 1.2 s,
// Undertow 1.5 s, Maw 2.0 s, Rift Moth 0.8 s).
//
// W14 never plays: the SEAL fires as it starts (the map script), and its groups wait out a delay
// first (nothing spawns on the SEAL's tick). Its countdown is the last group's walk: the group is
// released as the countdown opens (once W13 has finished spawning), and its last refugee reaches
// the door on the tick before W14 starts, so the road is empty, W14 starts, and the SEAL fires on
// one tick (balance/a3m3.test.ts).
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

const motes = (count: number, route: RouteId, delaySec: number, intervalSec = 0.25): WaveGroup =>
  g('mote', count, route, delaySec, intervalSec);

/** The build phase before most waves. */
export const COUNTDOWN = 40;
/**
 * W14's countdown: the last group's walk, from its release as the countdown opens to its last
 * refugee through the door the tick before W14 starts (20 tiles at 0.7 tiles/s, the last one 3
 * tiles back in the line).
 */
export const LAST_WALK_SEC = 32.87;
/** Most waves open this long after they start. */
export const OPEN = 6;

export const waves = defineWaves([
  // W1 · Motes down the cut; the first group out
  {
    groups: [motes(8, 'cut_west', OPEN), motes(8, 'cut_east', OPEN + 6)],
  },
  // W2 · Fractures
  {
    countdownSec: COUNTDOWN,
    noCall: true,
    groups: [
      g('fracture', 1, 'cut_west', OPEN),
      motes(10, 'cut_east', OPEN + 4, 0.2),
      g('fracture', 1, 'cut_east', OPEN + 8),
    ],
  },
  // W3 · one Undertow [T: burrowing in Act III; Scuttle Den]
  {
    countdownSec: COUNTDOWN,
    noCall: true,
    groups: [g('undertow', 1, 'cut_east', OPEN), motes(6, 'cut_west', OPEN + 12)],
  },
  // W4 · Motes + a rift (the east rift opens behind Bricks)
  {
    countdownSec: COUNTDOWN,
    noCall: true,
    groups: [motes(8, 'cut_west', OPEN), motes(3, 'rift_east', OPEN + 8, 0.45)],
  },
  // W5 · a Maw, Motes catching it up
  {
    countdownSec: COUNTDOWN,
    noCall: true,
    groups: [g('maw', 1, 'cut_west', OPEN), motes(12, 'cut_west', OPEN + 2, 0.25)],
  },
  // W6 · Rift Moths
  {
    countdownSec: COUNTDOWN,
    noCall: true,
    groups: [
      g('riftmoth', 2, 'sky_west', OPEN, 2),
      motes(12, 'cut_east', OPEN + 2, 0.2),
      g('riftmoth', 1, 'sky_east', OPEN + 6),
    ],
  },
  // W7 · Undertows ×3 (the Den’s wave; burrowing is intel here, map.ts `softExempt`)
  {
    countdownSec: COUNTDOWN,
    noCall: true,
    groups: [g('undertow', 2, 'cut_west', OPEN, 2.5), g('undertow', 1, 'cut_east', OPEN + 8)],
  },
  // W8 · everything, larger
  {
    countdownSec: COUNTDOWN,
    noCall: true,
    groups: [
      motes(18, 'cut_west', OPEN, 0.2),
      g('riftmoth', 2, 'sky_west', OPEN + 6, 2),
      motes(8, 'cut_east', OPEN + 10, 0.2),
    ],
  },
  // W9 · held, while the fourth group crosses
  {
    countdownSec: COUNTDOWN,
    noCall: true,
    groups: [
      g('undertow', 1, 'cut_east', OPEN),
      g('riftmoth', 2, 'sky_east', OPEN + 6, 2),
      motes(10, 'cut_west', OPEN + 10, 0.25),
    ],
  },
  // W10 · the last holdable wave, the fifth group on the road
  {
    countdownSec: COUNTDOWN,
    noCall: true,
    groups: [
      g('maw', 1, 'cut_east', OPEN),
      motes(14, 'cut_east', OPEN + 2, 0.2),
      g('undertow', 2, 'cut_west', OPEN + 6, 2.5),
      g('riftmoth', 2, 'sky_west', OPEN + 12, 2),
    ],
  },
  // W11 · the doomed escalation: the west rift opens too
  {
    countdownSec: COUNTDOWN,
    noCall: true,
    groups: [
      g('undertow', 2, 'rift_west', OPEN, 2.5),
      motes(24, 'cut_west', OPEN + 4, 0.15),
      g('undertow', 1, 'cut_east', OPEN + 8),
      g('riftmoth', 2, 'sky_east', OPEN + 10, 2),
    ],
  },
  // W12 · past what any build holds
  {
    countdownSec: COUNTDOWN,
    noCall: true,
    groups: [
      g('undertow', 2, 'rift_east', OPEN, 2.5),
      g('undertow', 1, 'rift_west', OPEN + 2),
      g('maw', 1, 'cut_west', OPEN + 4),
      motes(16, 'cut_east', OPEN + 6, 0.15),
      g('riftmoth', 2, 'sky_west', OPEN + 12, 2),
    ],
  },
  // W13 · everything at once, Bricks at a quarter
  {
    countdownSec: COUNTDOWN,
    noCall: true,
    groups: [
      g('undertow', 1, 'rift_west', OPEN),
      motes(30, 'cut_west', OPEN + 2, 0.15),
      g('undertow', 2, 'rift_east', OPEN + 4, 2.5),
      motes(16, 'cut_east', OPEN + 6, 0.15),
      g('fracture', 1, 'cut_west', OPEN + 8, 2),
      g('riftmoth', 3, 'sky_east', OPEN + 10, 1.5),
    ],
  },
  // W14 · never plays: the SEAL fires as it starts, before anything spawns
  {
    countdownSec: LAST_WALK_SEC,
    noCall: true,
    groups: [motes(30, 'cut_west', 2), motes(30, 'cut_east', 2), g('maw', 3, 'rift_east', 3, 2)],
  },
]);
