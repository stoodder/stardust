// A3M2 waves: docs/story/campaign/act3.md § A3M2, Waves. Routes: `road` (A1M4's U-road, where
// Everglow Security walks to repossess the gate), and the rift lanes `rift_w` (from W2, in along
// the band's row 4 onto the west side) and `rift_e` (from W10, in along the band's north row onto
// the road past the billboards). A countdown opens once the wave before it finishes spawning.
// Groups without an `intervalSec` use the enemy's default spacing (Mote 0.3 s, Fracture 1.2 s,
// Compliance Drone 1.0 s, Expediter 1.5 s).
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
const drones = (count: number, delaySec: number, intervalSec?: number): WaveGroup =>
  g('compliance', count, 'road', delaySec, intervalSec);
const expediters = (count: number, delaySec: number, intervalSec?: number): WaveGroup =>
  g('expediter', count, 'road', delaySec, intervalSec);

/** The build phase before most waves. */
export const COUNTDOWN = 30;
/** W7's drone column: ten, this far apart, so the Clean Exit (map.ts, 12 s in) lands mid-column. */
export const W7_GAP = 2;
/** The late drone columns, each sent twice (W12's, W14's, W15's). */
export const W12_DRONES = Number(process.env.W12 ?? 16);
export const W14_DRONES = Number(process.env.W14 ?? 18);
export const W15_DRONES = Number(process.env.W15 ?? 12);

export const waves = defineWaves([
  // W1 · Motes down the old road
  { groups: [motes(24, 'road', 0, 0.25), motes(12, 'road', 14, 0.25)] },
  // W2 · Motes through the west rift [T: rift opens; it cracked as W1 started]
  {
    countdownSec: COUNTDOWN,
    noCall: true,
    groups: [motes(20, 'rift_w', 0, 0.2), motes(12, 'road', 10, 0.25)],
  },
  // W3 · Compliance Drones ×4 [T: Everglow Security; armor 4]
  { countdownSec: COUNTDOWN, groups: [drones(4, 0, 2), motes(14, 'rift_w', 8, 0.2)] },
  // W4 · drones + Motes [X]
  { countdownSec: COUNTDOWN, groups: [drones(6, 0, 1.5), motes(22, 'road', 6, 0.2)] },
  // W5 · one Expediter + drones [T: haste aura; kill it first]
  { countdownSec: COUNTDOWN, groups: [drones(3, 0, 1.2), expediters(1, 3), drones(4, 4.5, 1.2)] },
  // W6 · a drone column + Expediters [X]
  {
    countdownSec: COUNTDOWN,
    groups: [drones(10, 0, 1.0), expediters(2, 4, 4), motes(16, 'rift_w', 14, 0.2)],
  },
  // W7 · drones ×10; mid-column, the Clean Exit cue (map.ts `clean_exit`)
  { countdownSec: COUNTDOWN, groups: [drones(10, 0, W7_GAP)] },
  // W8 · a Hollow push: Motes with a few Fractures (preview hidden; QUILL leaks the trait)
  {
    countdownSec: COUNTDOWN,
    groups: [
      motes(20, 'road', 0, 0.25),
      g('fracture', 2, 'rift_w', 5, 3),
      motes(16, 'rift_w', 12, 0.25),
    ],
  },
  // W9 · Expediters + drones
  {
    countdownSec: COUNTDOWN,
    groups: [drones(8, 0, 0.8), expediters(3, 2, 3), drones(8, 9, 0.8)],
  },
  // W10 · Motes through both rifts [the east rift opens; it cracked as W9 started]
  {
    countdownSec: COUNTDOWN,
    noCall: true,
    groups: [motes(16, 'rift_w', 0, 0.3), motes(16, 'rift_e', 8, 0.3)],
  },
  // W11 · drones + Motes
  {
    countdownSec: COUNTDOWN,
    groups: [drones(12, 0, 0.8), expediters(2, 3, 4), motes(12, 'rift_e', 8, 0.3)],
  },
  // W12 · the big drone wave (Sterling's shuttle leaves: map.ts `shuttle`)
  {
    countdownSec: COUNTDOWN,
    groups: [drones(W12_DRONES, 0, 0.7), expediters(4, 2, 3), drones(W12_DRONES, 16, 0.7)],
  },
  // W13 · the Hollow, both rifts
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('fracture', 2, 'rift_e', 0, 4),
      motes(18, 'rift_w', 4, 0.3),
      motes(18, 'rift_e', 12, 0.3),
      g('fracture', 2, 'rift_w', 16, 4),
    ],
  },
  // W14 · everything Everglow
  {
    countdownSec: COUNTDOWN,
    groups: [drones(W14_DRONES, 0, 0.6), expediters(5, 2, 2.5), drones(W14_DRONES, 16, 0.6)],
  },
  // W15 · everything
  {
    countdownSec: COUNTDOWN,
    groups: [
      drones(W15_DRONES, 0, 0.7),
      expediters(4, 2, 3),
      motes(18, 'rift_w', 8, 0.3),
      g('fracture', 2, 'rift_e', 10, 4),
      motes(18, 'rift_e', 16, 0.3),
      drones(W15_DRONES, 20, 0.7),
    ],
  },
]);
