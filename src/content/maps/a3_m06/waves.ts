// A3M6 waves: docs/story/campaign/act3.md § A3M6, Waves. Routes: `road` (A1M1's, from its spawn
// (8,2) at the top of the old map down the S-road to the gate; the refugees, everything Everglow
// walks, and the Hollow behind them), the rift lanes `rift_w` and `rift_e` (they crack as W11 starts
// and open as W12 does, along row 5 onto the road), and the air lanes `sky_w` and `sky_e` (the
// gunships and the Rift Moths, from the north corners in over the gate's approach). A countdown
// opens once the wave before it finishes spawning. Groups without an `intervalSec` use the enemy's
// default spacing (Mote 0.3 s, Compliance Drone 1.0 s, Expediter 1.5 s, Gunship 2.0 s, Operative
// 1.5 s, Rift Moth 0.8 s, Maw 2.0 s).
//
// A group walks ahead of the Hollow sent behind it (map.ts GROUPS): the Hollow on the road spawn
// `BEHIND` s after their group sets off, so the towers meet them before they catch it up. The
// Gathering Maw walks alone in W16, `BOSS_SEC` s in, behind the last group; the wave preview shows
// it from the moment W15 finishes spawning (W16's countdown opens), a wave ahead. W17's countdown is
// a minute, so the road fills behind it only as it reaches the last bend.
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
const drones = (count: number, delaySec: number, intervalSec = 1.2): WaveGroup =>
  g('compliance', count, 'road', delaySec, intervalSec);
const expediters = (count: number, delaySec: number, intervalSec = 6): WaveGroup =>
  g('expediter', count, 'road', delaySec, intervalSec);
const maws = (count: number, route: RouteId, delaySec: number, intervalSec = 4): WaveGroup =>
  g('maw', count, route, delaySec, intervalSec);
const moths = (count: number, route: RouteId, delaySec: number, intervalSec = 1.5): WaveGroup =>
  g('riftmoth', count, route, delaySec, intervalSec);
const gunships = (count: number, route: RouteId, delaySec: number, intervalSec = 3): WaveGroup =>
  g('gunship', count, route, delaySec, intervalSec);
const operatives = (count: number, delaySec: number, intervalSec = 2): WaveGroup =>
  g('blackbudget', count, 'road', delaySec, intervalSec);

/** The build phase before most waves. */
export const COUNTDOWN = 30;
/** How long after its group sets off the Hollow behind it come down the road. */
export const BEHIND = 12;
/** W16: the Gathering Maw comes up the road this long in, behind the last group. */
export const BOSS_SEC = 14;
/** W17's countdown, which opens as the Maw walks in: its road fills behind it a minute later. */
export const BOSS_COUNTDOWN = 60;

const CALL = { countdownSec: COUNTDOWN } as const;
const NO_CALL = { countdownSec: COUNTDOWN, noCall: true } as const;

export const waves = defineWaves([
  // W1 · the first group behind a thin Mote screen (light: the player gets to feel strong); a
  // drone patrol walks in behind them, to repossess
  {
    groups: [motes(4, 'road', 0), drones(3, 10, 2.5), drones(3, 30, 2.5)],
  },
  // W2 · Rift Moths over the second group
  { ...NO_CALL, groups: [moths(1, 'sky_w', 6), moths(2, 'sky_e', 9), drones(2, 14)] },
  // W3 · one Asset Recovery Gunship [T: flying armor; Sproing pin, Harpoon, Seeker Swarm]
  { ...CALL, groups: [drones(3, 0), gunships(1, 'sky_e', 6), drones(2, 10)] },
  // W4 · Maws behind a group
  { ...CALL, groups: [maws(2, 'road', BEHIND, 5), motes(4, 'road', BEHIND + 1)] },
  // W5 · Black Budget Operatives ×3 [T: cloaked armor; Lookout + Harpoon]
  { ...NO_CALL, groups: [drones(3, 0), operatives(3, 5, 5), drones(2, 16)] },
  // W6 · Rift Moths
  { ...CALL, groups: [moths(2, 'sky_w', 0), moths(3, 'sky_e', 4), drones(3, 8)] },
  // W7 · Maws behind a group, with a Mote screen
  {
    ...CALL,
    groups: [motes(3, 'road', 0), maws(3, 'road', BEHIND, 5), motes(4, 'road', BEHIND + 2)],
  },
  // W8 · Expediters + drones
  { ...CALL, groups: [expediters(2, 0), drones(6, 2, 1.2), drones(3, 14)] },
  // W9 · gunships + Black Budget [X; the Operatives' only other wave]
  {
    ...NO_CALL,
    groups: [
      gunships(2, 'sky_w', 0, 4),
      operatives(3, 4, 4),
      gunships(1, 'sky_e', 10),
      drones(3, 12),
    ],
  },
  // W10 · Hollow surge (Maws and Rift Moths)
  {
    ...CALL,
    groups: [
      maws(3, 'road', BEHIND, 4),
      motes(5, 'road', BEHIND + 2),
      moths(3, 'sky_w', 6),
      moths(3, 'sky_e', 10),
    ],
  },
  // W11 · Expediters + drones (the "Accounting" column)
  { ...CALL, groups: [expediters(2, 0), drones(8, 2, 1.0), gunships(1, 'sky_e', 8)] },
  // W12 · rifts
  {
    ...NO_CALL,
    groups: [
      maws(2, 'rift_w', 0, 5),
      motes(5, 'rift_w', 2),
      maws(2, 'rift_e', 6, 5),
      motes(5, 'rift_e', 8),
    ],
  },
  // W13 · two groups at once
  {
    ...CALL,
    groups: [
      maws(2, 'road', BEHIND + 4, 5),
      moths(3, 'sky_w', 8),
      motes(5, 'road', BEHIND + 6),
      drones(5, 4),
    ],
  },
  // W14 · gunships + Rift Moths
  {
    ...CALL,
    groups: [
      gunships(2, 'sky_w', 0, 4),
      gunships(1, 'sky_e', 6),
      moths(3, 'sky_w', 10),
      moths(3, 'sky_e', 14),
    ],
  },
  // W15 · Maws + Rift Moths
  {
    ...CALL,
    groups: [
      maws(3, 'road', 0, 4),
      maws(3, 'rift_e', 6, 4),
      moths(3, 'sky_e', 4),
      maws(2, 'rift_w', 10, 4),
      motes(4, 'rift_w', 12),
    ],
  },
  // W16 · the Gathering Maw, behind the last group
  {
    ...NO_CALL,
    groups: [g('gathering_maw', 1, 'road', BOSS_SEC)],
  },
  // W17 · the road behind it fills (a longer build phase: it opens while the Maw still walks)
  {
    countdownSec: BOSS_COUNTDOWN,
    noCall: true,
    groups: [
      maws(4, 'road', 0, 3),
      motes(6, 'road', 2),
      maws(3, 'rift_w', 6, 3),
      maws(3, 'rift_e', 9, 3),
      moths(4, 'sky_w', 8),
      gunships(2, 'sky_e', 10, 4),
      expediters(2, 14),
      drones(5, 16),
    ],
  },
  // W18 · the road behind it fills
  {
    ...NO_CALL,
    groups: [
      maws(4, 'road', 0, 3),
      maws(3, 'rift_e', 4, 3),
      maws(3, 'rift_w', 6, 3),
      motes(6, 'rift_w', 8),
      moths(4, 'sky_w', 8),
      moths(4, 'sky_e', 10),
      gunships(2, 'sky_w', 12, 4),
      expediters(3, 12),
      drones(6, 14),
    ],
  },
]);
