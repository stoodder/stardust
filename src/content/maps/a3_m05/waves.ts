// A3M5 waves: docs/story/campaign/act3.md § A3M5, Waves. Routes: `road` (A2M4's: in at the
// north-east, round Intake B, and down to the control core; everything Everglow sends, and the
// Hollow's main body), `vats` (A2M4's: up out of the drain hatch onto the road's last leg; the
// Hollow, from W10), and `hunt` (the bearers' back route, out of the sluice behind them: the
// Hollow that hunt them, from W5). A countdown opens once the wave before it finishes spawning.
// Groups without an `intervalSec` use the enemy's default spacing (Mote 0.3 s, Fracture 1.2 s,
// Compliance Drone 1.0 s, Associate 1.5 s, Auditor 1.5 s, Liability 2.5 s, Expediter 1.5 s,
// Silencer 2.0 s, Maw 2.0 s).
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
const fractures = (count: number, route: RouteId, delaySec: number, intervalSec = 1.5): WaveGroup =>
  g('fracture', count, route, delaySec, intervalSec);
const drones = (count: number, delaySec: number, intervalSec = 1.2): WaveGroup =>
  g('compliance', count, 'road', delaySec, intervalSec);
const associates = (count: number, delaySec: number, intervalSec = 1.5): WaveGroup =>
  g('associate', count, 'road', delaySec, intervalSec);
const auditors = (count: number, delaySec: number, intervalSec = AUD_GAP): WaveGroup =>
  g('auditor', count, 'road', delaySec, intervalSec);
const liabilities = (count: number, delaySec: number, intervalSec = 2.5): WaveGroup =>
  g('liability', count, 'road', delaySec, intervalSec);
const silencers = (count: number, delaySec: number, intervalSec = 2.4): WaveGroup =>
  g('silencer', count, 'road', delaySec, intervalSec);
const expediters = (count: number, delaySec: number, intervalSec = 6): WaveGroup =>
  g('expediter', count, 'road', delaySec, intervalSec);

/** An Auditor pair's spacing: far enough apart that their rings land on different towers. */
export const AUD_GAP = 4;
/** The build phase before most waves. */
export const COUNTDOWN = 30;
/** How long after a bearer group sets off the Hollow come out of the sluice behind it. */
export const HUNT_SEC = 8;
/** W14: "Shareholder Value" sets off this long in, behind its escort. */
export const BOSS_SEC = 4;

const NO_CALL = { countdownSec: COUNTDOWN, noCall: true } as const;
const CALL = { countdownSec: COUNTDOWN } as const;

/**
 * W10's surge group the map sends only when the feed isn't cut (map.ts `surge`; maps.md § 5.3):
 * Motes up out of the vats behind the wave's own.
 */
export const SCRIPT_GROUPS = {
  feed_surge: motes(10, 'vats', 6, 0.3),
} as const;

export const waves = defineWaves([
  // W1 · Motes toward the vats
  { groups: [motes(6, 'road', 0), motes(6, 'road', 8)] },
  // W2 · Compliance + one Maintenance Associate [T: healer aura; focus it]
  { ...NO_CALL, teach: true, groups: [drones(3, 0), associates(1, 3), drones(3, 4.5)] },
  // W3 · Fractures + Motes
  { ...CALL, groups: [fractures(2, 'road', 0), motes(6, 'road', 4), drones(3, 8)] },
  // W4 · one Auditor [T: ring tell; interrupt with Stillness or Bloom; Choir]
  { ...NO_CALL, groups: [drones(3, 0), auditors(1, 3), drones(3, 7)] },
  // W5 · Kip opens the vats: the first bearers walk; the Hollow hunt them
  {
    ...NO_CALL,
    groups: [motes(6, 'hunt', HUNT_SEC), motes(6, 'road', 2), fractures(1, 'road', 6)],
  },
  // W6 · Liability + one Associate [X]
  { ...CALL, groups: [drones(3, 0), liabilities(1, 3), associates(1, 5), drones(3, 8)] },
  // W7 · Auditors ×2 + drones [X]
  { ...NO_CALL, groups: [drones(4, 0), auditors(2, 3), drones(3, 12)] },
  // W8 · Fractures + Compliance drones
  { ...CALL, groups: [fractures(3, 'road', 0), drones(5, 4), motes(6, 'road', 10)] },
  // W9 · Silencers + Auditors [X, jam limit]; the second bearers walk
  {
    ...NO_CALL,
    groups: [
      silencers(2, 0),
      auditors(2, 4),
      drones(4, 8),
      motes(5, 'hunt', HUNT_SEC),
      fractures(1, 'hunt', HUNT_SEC + 3),
    ],
  },
  // W10 · Hollow surge at the vats (one group bigger unless the feed is cut: SCRIPT_GROUPS)
  {
    ...NO_CALL,
    groups: [
      motes(8, 'vats', 0),
      fractures(2, 'vats', 2),
      g('maw', 1, 'vats', 4),
      motes(8, 'road', 3),
    ],
  },
  // W11 · Expediters + Liability
  {
    ...CALL,
    groups: [expediters(2, 0), liabilities(2, 2), drones(5, 6), associates(1, 9)],
  },
  // W12 · mixed
  {
    ...NO_CALL,
    groups: [
      silencers(2, 0),
      auditors(1, 4),
      drones(4, 6),
      fractures(2, 'vats', 2),
      motes(8, 'vats', 8),
      associates(1, 10),
    ],
  },
  // W13 · the bearers' biggest group, and the Hollow behind it
  {
    ...NO_CALL,
    groups: [
      motes(8, 'hunt', HUNT_SEC),
      fractures(2, 'hunt', HUNT_SEC + 4),
      motes(8, 'vats', 4),
      liabilities(1, 0),
      drones(4, 4),
    ],
  },
  // W14 · "Shareholder Value" (Sterling by remote): drones from the hangar, Hostile Takeover,
  // the jettison
  {
    ...NO_CALL,
    groups: [
      drones(3, 0),
      g('shareholder_value', 1, 'road', BOSS_SEC),
      auditors(2, BOSS_SEC + 6),
      associates(1, BOSS_SEC + 3),
    ],
  },
  // W15 · the last bearers, and the Unsung swarm out of the opened vats behind them (its countdown
  // opens once the platform is driven off)
  {
    ...NO_CALL,
    countdownAfter: 'bossEnded',
    groups: [
      motes(8, 'hunt', HUNT_SEC),
      fractures(2, 'hunt', HUNT_SEC + 4),
      motes(10, 'vats', 2),
      fractures(3, 'vats', 6),
      g('maw', 1, 'vats', 10),
    ],
  },
  // W16 · the swarm
  {
    ...NO_CALL,
    groups: [
      motes(12, 'vats', 0),
      fractures(3, 'vats', 4),
      g('maw', 2, 'vats', 8, 3),
      motes(10, 'road', 2),
      silencers(2, 6),
    ],
  },
  // W17 · the swarm, everything the vats have left
  {
    ...NO_CALL,
    groups: [
      motes(14, 'vats', 0),
      fractures(4, 'vats', 3),
      g('maw', 2, 'vats', 6, 3),
      motes(12, 'road', 2),
      fractures(3, 'road', 6),
      silencers(2, 4),
    ],
  },
]);
