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

const motes = (count: number, route: RouteId, delaySec: number): WaveGroup =>
  g('mote', count, route, delaySec, 0.3);
const drones = (count: number, delaySec: number, intervalSec = 1.2): WaveGroup =>
  g('compliance', count, 'service', delaySec, intervalSec);
const liabilities = (count: number, delaySec: number, route: RouteId = 'service'): WaveGroup =>
  g('liability', count, route, delaySec);
const silencers = (count: number, route: RouteId, delaySec: number, intervalSec = 4): WaveGroup =>
  g('silencer', count, route, delaySec, intervalSec);
const moths = (count: number, delaySec: number, intervalSec = 1.0): WaveGroup =>
  g('riftmoth', count, 'sky', delaySec, intervalSec);

/**
 * A Silencer pack's spacing: a little over a tell (2 s), so each one's tell starts after the one
 * before has landed and picks a tower that isn't Jammed yet (a pack told together picks one).
 */
export const SIL_GAP = 2.4;
/**
 * W15's and W16's Silencers set off this long into their waves, so they reach the hall junction
 * as the Liability Enforcers do: a jam there lands while the plate walks past.
 */
export const W15_SIL_SEC = 2;
export const W16_SIL_SEC = 0;
/** The build phase before most waves. */
export const COUNTDOWN = 30;
/** Gerald's pass: he enters the chute this long into W7, ahead of its drones. */
export const GERALD_SEC = 0;
/** W7's drones start this long in, as Gerald clears the junction. */
export const W7_DRONES_SEC = 14;

export const waves = defineWaves([
  // W1 · Compliance drones behind a thin Mote screen
  { groups: [motes(4, 'tunnel', 0), drones(6, 6, 1.5)] },
  // W2 · one Liability-Class Enforcer [T: heavy armor]
  { countdownSec: COUNTDOWN, groups: [drones(4, 0, 1.5), liabilities(1, 8)] },
  // W3 · Compliance + Expediter
  {
    countdownSec: COUNTDOWN,
    groups: [motes(4, 'tunnel', 0), drones(3, 2), g('expediter', 1, 'service', 6), drones(3, 8)],
  },
  // W4 · one Silencer [T: hushing; tendril tell]
  { countdownSec: COUNTDOWN, groups: [silencers(1, 'tunnel', 0), drones(5, 10, 1.5)] },
  // W5 · Rift Moths + drones
  { countdownSec: COUNTDOWN, groups: [moths(4, 0), drones(4, 6)] },
  // W6 · Silencers ×2 [X]
  {
    countdownSec: COUNTDOWN,
    groups: [silencers(2, 'tunnel', 0, SIL_GAP), drones(4, 6), motes(4, 'tunnel', 14)],
  },
  // W7 · Gerald's pass + Compliance drones (never called early: QUILL's warning, a full build phase)
  {
    countdownSec: COUNTDOWN,
    noCall: true,
    groups: [g('gerald', 1, 'chute', GERALD_SEC), drones(6, W7_DRONES_SEC, 1.2)],
  },
  // W8 · Liability ×2 + drones [X]
  { countdownSec: COUNTDOWN, groups: [drones(4, 0), liabilities(2, 4), drones(4, 14)] },
  // W9 · Rift Moths + a Silencer [X]
  {
    countdownSec: COUNTDOWN,
    groups: [moths(5, 0), silencers(1, 'tunnel', 2), drones(3, 8)],
  },
  // W10 · Hollow surge: Rift Moths and Silencers, one Fracture
  {
    countdownSec: COUNTDOWN,
    groups: [
      silencers(3, 'tunnel', 0, SIL_GAP),
      g('fracture', 1, 'tunnel', 6),
      moths(6, 14, 0.6),
      motes(5, 'tunnel', 10),
    ],
  },
  // W11 · the Everglow column
  {
    countdownSec: COUNTDOWN,
    groups: [
      drones(5, 0, 1.0),
      g('expediter', 2, 'service', 4, 6),
      liabilities(2, 8),
      drones(4, 20, 1.0),
    ],
  },
  // W12 · Silencers + Rift Moths
  {
    countdownSec: COUNTDOWN,
    groups: [silencers(3, 'tunnel', 0, SIL_GAP), moths(6, 14, 0.6), drones(4, 10)],
  },
  // W13 · both spawns
  {
    countdownSec: COUNTDOWN,
    groups: [
      silencers(2, 'tunnel', 0, SIL_GAP),
      drones(6, 0, 1.0),
      liabilities(2, 6),
      motes(6, 'tunnel', 10),
    ],
  },
  // W14 · the rifts open: Silencers and Rift Moths
  {
    countdownSec: COUNTDOWN,
    groups: [silencers(2, 'rift_w', 0, SIL_GAP), silencers(2, 'rift_e', 1.2, SIL_GAP), moths(8, 8)],
  },
  // W15 · Liability + Silencers
  {
    countdownSec: COUNTDOWN,
    groups: [liabilities(2, 0), drones(4, 10, 1.0), silencers(4, 'tunnel', W15_SIL_SEC, SIL_GAP)],
  },
  // W16 · everything
  {
    countdownSec: COUNTDOWN,
    groups: [
      drones(5, 0, 1.0),
      liabilities(2, 6),
      moths(6, 10),
      g('expediter', 2, 'service', 12, 6),
      silencers(4, 'rift_w', 0, SIL_GAP),
      silencers(3, 'rift_e', 1.2, SIL_GAP),
      silencers(4, 'tunnel', W16_SIL_SEC, SIL_GAP),
      motes(6, 'rift_w', 12),
    ],
  },
]);
