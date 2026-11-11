// A3M1 waves: docs/story/campaign/act3.md § A3M1, Waves. Routes: `spiral` (from inside the basin,
// behind the refugees), `north` (down onto the spiral's outer ring under the north fence), the
// rift lanes `rift_n` (from W2, straight down the west side to the gate) and `rift_e` (from W6, in
// through the east fence onto the east ring), and `sky` (the Rift Moths, north-east to the gate). A
// countdown opens once the wave before it finishes spawning. Groups without an `intervalSec` use
// the enemy's default spacing (Mote 0.3 s, Fracture 1.5 s, Rift Moth 0.8 s, Maw 2.0 s). A Maw
// leads its Motes (T602): they catch it up as its first gather comes ready, one 4 s period after it
// spawns, so a Maw left alone among them grows.
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

const motes = (count: number, route: RouteId, delaySec: number, intervalSec = 0.3): WaveGroup =>
  g('mote', count, route, delaySec, intervalSec);

/** The build phase before most waves. */
export const COUNTDOWN = 30;
/** Most waves open this long after they start. */
export const OPEN = 6;

export const waves = defineWaves([
  // W1 · Motes down the north road, the first group out of the basin
  {
    groups: [
      motes(20, 'north', OPEN, 0.2),
      motes(6, 'spiral', OPEN + 16, 0.25),
    ],
  },
  // W2 · the first rift opens (the north fence) [T: rift lanes]
  {
    countdownSec: COUNTDOWN,
    noCall: true,
    groups: [
      motes(18, 'rift_n', OPEN, 0.2),
      motes(12, 'north', OPEN + 12, 0.2),
    ],
  },
  // W3 · Fractures
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('fracture', 1, 'north', OPEN),
      motes(14, 'rift_n', OPEN + 8, 0.2),
    ],
  },
  // W4 · one Maw, Motes catching it up [T: gathering; burst it, or kill the small ones near it; Underfoot]
  {
    teach: true,
    countdownSec: COUNTDOWN,
    groups: [
      g('maw', 1, 'north', OPEN),
      motes(12, 'north', OPEN + 2, 0.3),
    ],
  },
  // W5 · Rift Moths over the second group
  {
    countdownSec: COUNTDOWN,
    groups: [
      motes(20, 'north', OPEN, 0.2),
      g('riftmoth', 3, 'sky', OPEN + 12, 2.5),
    ],
  },
  // W6 · Motes through two rifts [X]
  {
    countdownSec: COUNTDOWN,
    noCall: true,
    groups: [
      motes(20, 'rift_n', OPEN, 0.2),
      motes(20, 'rift_e', OPEN + 6, 0.2),
    ],
  },
  // W7 · Maw + Motes [X]
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('maw', 1, 'rift_e', OPEN),
      motes(12, 'rift_e', OPEN + 2, 0.3),
      g('fracture', 1, 'north', OPEN + 6),
    ],
  },
  // W8 · Fractures + Rift Moths
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('fracture', 1, 'rift_n', OPEN),
      g('riftmoth', 5, 'sky', OPEN + 8, 2.5),
    ],
  },
  // W9 · Bramble's own column + two Maws
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('maw', 1, 'north', OPEN),
      motes(12, 'north', OPEN + 2, 0.3),
      g('riftmoth', 4, 'sky', OPEN + 6, 2.5),
      g('maw', 1, 'rift_e', OPEN + 12),
      motes(12, 'rift_e', OPEN + 14, 0.3),
    ],
  },
  // W10 · the third group (Old Thrum's, if spared)
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('fracture', 1, 'north', OPEN, 3),
      motes(20, 'rift_n', OPEN + 10, 0.2),
      motes(8, 'rift_e', OPEN + 30, 0.25),
    ],
  },
  // W11 · rifts everywhere
  {
    countdownSec: COUNTDOWN,
    groups: [
      motes(22, 'rift_n', OPEN, 0.2),
      motes(22, 'rift_e', OPEN + 3, 0.2),
      g('riftmoth', 4, 'sky', OPEN + 6, 2),
      g('fracture', 1, 'rift_e', OPEN + 10, 2.5),
    ],
  },
  // W12 · three Maws [X]
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('maw', 1, 'north', OPEN),
      motes(12, 'north', OPEN + 2, 0.3),
      g('maw', 1, 'rift_e', OPEN + 8),
      motes(12, 'rift_e', OPEN + 10, 0.3),
      g('maw', 1, 'rift_n', OPEN + 16),
      motes(12, 'rift_n', OPEN + 18, 0.3),
    ],
  },
  // W13 · surge
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('fracture', 2, 'north', OPEN, 2.5),
      motes(22, 'rift_e', OPEN + 4, 0.2),
      g('riftmoth', 5, 'sky', OPEN + 8, 1.2),
      motes(22, 'rift_n', OPEN + 14, 0.2),
    ],
  },
  // W14 · the last group out, the basin's Hollow behind it
  {
    countdownSec: COUNTDOWN,
    groups: [
      motes(20, 'north', OPEN, 0.2),
      g('riftmoth', 6, 'sky', OPEN + 6, 1.2),
      motes(16, 'spiral', OPEN + 16, 0.2),
    ],
  },
]);
