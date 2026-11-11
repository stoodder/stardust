// A3M4 waves: docs/story/campaign/act3.md § A3M4, Waves. Routes: `tunnel` (the Hollow's, west),
// `service` (Everglow's, east, where the Liability Enforcers walk in to repossess the generator),
// the rift lanes `rift_w` and `rift_e` (from W14, onto each tunnel's last bend), `sky` (the Rift
// Moths, from the north-east corner), and `chute` (Gerald's mail chute, W7). A countdown opens once
// the wave before it finishes spawning. Groups without an `intervalSec` use the enemy's default
// spacing (Mote 0.3 s, Fracture 1.2 s, Compliance Drone 1.0 s, Expediter 1.5 s, Silencer 2.0 s,
// Liability 2.5 s, Rift Moth 0.8 s).
//
// Splash isn't required here, so the Mote and Fracture screens stay under 15% of any wave's threat
// (maps.md § 6.2).
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

/**
 * A Silencer pack's spacing: a little over a tell (2 s), so each one's tell starts after the one
 * before has landed and picks a tower that isn't Jammed yet (a pack told together picks one).
 */
export const SIL_GAP = 2.4;

const motes = (count: number, route: RouteId, delaySec: number): WaveGroup =>
  g('mote', count, route, delaySec, 0.3);
const drones = (count: number, delaySec: number, intervalSec = 1.2): WaveGroup =>
  g('compliance', count, 'service', delaySec, intervalSec);
const liabilities = (count: number, delaySec: number, route: RouteId = 'service'): WaveGroup =>
  g('liability', count, route, delaySec);
const silencers = (
  count: number,
  route: RouteId,
  delaySec: number,
  intervalSec = SIL_GAP,
): WaveGroup => g('silencer', count, route, delaySec, intervalSec);
const moths = (count: number, delaySec: number, intervalSec = 1.0): WaveGroup =>
  g('riftmoth', count, 'sky', delaySec, intervalSec);

/** W15's Silencers set off this long in, just behind the Liability Enforcers' first steps. */
export const W15_SIL_SEC = 2;
/** The build phase before most waves. */
export const COUNTDOWN = 32;
/** Gerald's pass: he enters the chute as W7 starts, ahead of its drones. */
export const GERALD_SEC = 0;
/** W7's drones start this long in, once Gerald has cleared the junction (his pass is ~11 s). */
export const W7_DRONES_SEC = 14;

/**
 * The waves never called early (core-loop.md § 2.4; `noCall`): W2 (the Liability's teach), W7
 * (Gerald's pass: QUILL's warning plays in its countdown), and every wave that sends Silencers, so
 * the build phase before a jam always runs whole (place out of reach, have System Reboot ready).
 */
const NO_CALL = { countdownSec: COUNTDOWN, noCall: true } as const;
/** A wave that may be called early. */
const CALL = { countdownSec: COUNTDOWN } as const;

export const waves = defineWaves([
  // W1 · Compliance drones behind a thin Mote screen
  { groups: [motes(4, 'tunnel', 0), drones(5, 6, 1.5)] },
  // W2 · one Liability-Class Enforcer [T: heavy armor]
  { ...NO_CALL, groups: [drones(3, 0, 1.5), liabilities(1, 8)] },
  // W3 · Compliance + Expediter
  {
    ...CALL,
    groups: [motes(4, 'tunnel', 0), drones(2, 2), g('expediter', 1, 'service', 6), drones(2, 8)],
  },
  // W4 · one Silencer [T: hushing; tendril tell; System Reboot, Hum Choir]
  { ...NO_CALL, groups: [silencers(1, 'tunnel', 0), drones(4, 10, 1.5)] },
  // W5 · Rift Moths + drones
  { ...CALL, groups: [moths(4, 0), drones(4, 6)] },
  // W6 · Silencers ×2 [X]
  {
    ...NO_CALL,
    groups: [silencers(2, 'tunnel', 0, SIL_GAP), drones(4, 6), motes(4, 'tunnel', 14)],
  },
  // W7 · Gerald's pass down the mail chute, then Compliance drones
  { ...NO_CALL, groups: [g('gerald', 1, 'chute', GERALD_SEC), drones(6, W7_DRONES_SEC, 1.2)] },
  // W8 · Liability ×2 + drones [X]
  { ...CALL, groups: [drones(3, 0), liabilities(2, 4), drones(3, 14)] },
  // W9 · Rift Moths + a Silencer [X]
  { ...NO_CALL, groups: [moths(5, 0), silencers(1, 'tunnel', 2), drones(3, 8)] },
  // W10 · Hollow surge: Rift Moths and Silencers, one Fracture
  {
    ...NO_CALL,
    groups: [
      silencers(3, 'tunnel', 0, SIL_GAP),
      g('fracture', 1, 'tunnel', 6),
      moths(5, 14, 0.6),
      motes(5, 'tunnel', 10),
    ],
  },
  // W11 · the Everglow column
  {
    ...CALL,
    groups: [
      drones(4, 0, 1.0),
      g('expediter', 2, 'service', 4, 6),
      liabilities(2, 8),
      drones(3, 20, 1.0),
    ],
  },
  // W12 · Silencers + Rift Moths
  { ...NO_CALL, groups: [silencers(3, 'tunnel', 0, SIL_GAP), moths(6, 14, 0.6), drones(4, 10)] },
  // W13 · both spawns (the rifts crack as it starts)
  {
    ...NO_CALL,
    groups: [
      silencers(2, 'tunnel', 0, SIL_GAP),
      drones(6, 0, 1.0),
      liabilities(2, 6),
      motes(6, 'tunnel', 10),
    ],
  },
  // W14 · the rifts open: Silencers up both, and Rift Moths
  {
    ...NO_CALL,
    groups: [silencers(2, 'rift_w', 0, SIL_GAP), silencers(2, 'rift_e', 1.2, SIL_GAP), moths(8, 8)],
  },
  // W15 · Liability + Silencers
  {
    ...NO_CALL,
    groups: [liabilities(3, 0), drones(4, 10, 1.0), silencers(4, 'tunnel', W15_SIL_SEC, SIL_GAP)],
  },
  // W16 · everything: Silencers up the west rift first, then the east's and the tunnel's
  {
    ...NO_CALL,
    groups: [
      drones(5, 0, 1.0),
      liabilities(2, 6),
      moths(5, 10),
      silencers(4, 'rift_w', 0, SIL_GAP),
      silencers(4, 'rift_e', 6, SIL_GAP),
      silencers(4, 'tunnel', 0, SIL_GAP),
      motes(6, 'rift_w', 12),
    ],
  },
]);
