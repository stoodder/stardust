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
const E = (k: string, d: number): number => Number(process.env[k] ?? d);
export const W12_RUSH = E('R12', 10);
export const W14_RUSH = E('R14', 12);
export const W15_RUSH = E('R15', 10);
const RUSH_GAP = E('RG', 0.4);
/** A hasted rush: `e` Expediters with `n` drones packed in among them, `delaySec` into the wave. */
const rush = (delaySec: number, e: number, n: number): WaveGroup[] => [
  expediters(e, delaySec, 1.2),
  drones(n, delaySec + 0.3, RUSH_GAP),
];
/**
 * The Mote clusters before the cue (W1's second pack, W2's rift, W4's road, W6's rift) and after
 * it (W8's two packs, W10's rifts), this far apart: packed tight enough that only splash keeps up.
 */
const M_GAP = 0.18;
const MOTES1 = 16;
const MOTES2 = 30;
const MOTES4 = 38;
const MOTES6 = 32;
const MOTES8 = 26;
const MOTES10 = 20;

export const waves = defineWaves([
  // W1 · Motes down the old road
  { groups: [motes(24, 'road', 0, 0.25), motes(MOTES1, 'road', 14, M_GAP)] },
  // W2 · Motes through the west rift [T: rift opens; it cracked as W1 started]
  {
    countdownSec: COUNTDOWN,
    noCall: true,
    groups: [motes(MOTES2, 'rift_w', 0, M_GAP), motes(12, 'road', 10, 0.25)],
  },
  // W3 · Compliance Drones ×4 [T: Everglow Security; armor 4]
  { countdownSec: COUNTDOWN, groups: [drones(4, 0, 2), motes(14, 'rift_w', 8, 0.2)] },
  // W4 · drones + Motes [X]
  { countdownSec: COUNTDOWN, groups: [drones(6, 0, 1.5), motes(MOTES4, 'road', 6, M_GAP)] },
  // W5 · one Expediter + drones [T: haste aura; kill it first]
  { countdownSec: COUNTDOWN, groups: [drones(3, 0, 1.2), expediters(1, 3), drones(4, 4.5, 1.2)] },
  // W6 · a drone column + Expediters [X]
  {
    countdownSec: COUNTDOWN,
    groups: [drones(10, 0, 1.0), expediters(2, 4, 4), motes(MOTES6, 'rift_w', 14, M_GAP)],
  },
  // W7 · drones ×10; mid-column, the Clean Exit cue (map.ts `clean_exit`)
  { countdownSec: COUNTDOWN, groups: [drones(10, 0, W7_GAP)] },
  // W8 · a Hollow push: Motes with a few Fractures (preview hidden; QUILL leaks the trait)
  {
    countdownSec: COUNTDOWN,
    groups: [
      motes(MOTES8, 'road', 0, M_GAP),
      g('fracture', 2, 'rift_w', 6, 4),
      motes(MOTES8, 'rift_w', 18, M_GAP),
    ],
  },
  // W9 · Expediters + drones
  {
    countdownSec: COUNTDOWN,
    groups: [drones(8, 0, 1.0), expediters(3, 2, 4), drones(8, 16, 1.0)],
  },
  // W10 · Motes through both rifts [the east rift opens; it cracked as W9 started]
  {
    countdownSec: COUNTDOWN,
    noCall: true,
    groups: [motes(MOTES10, 'rift_w', 0, M_GAP), motes(MOTES10, 'rift_e', 16, M_GAP)],
  },
  // W11 · drones + Motes
  {
    countdownSec: COUNTDOWN,
    groups: [drones(8, 0, 1.2), expediters(1, 4), motes(14, 'rift_e', 20, 0.3)],
  },
  // W12 · the big drone wave (Sterling's shuttle leaves: map.ts `shuttle`): a long column, then
  // a hasted rush
  {
    countdownSec: COUNTDOWN,
    groups: [...rush(0, 2, W12_RUSH), drones(20, 12, 1.2)],
  },
  // W13 · the Hollow, both rifts
  {
    countdownSec: COUNTDOWN,
    groups: [
      g('fracture', 2, 'rift_e', 0, 4),
      motes(18, 'rift_w', 6, 0.3),
      motes(18, 'rift_e', 18, 0.3),
      g('fracture', 2, 'rift_w', 26, 4),
    ],
  },
  // W14 · everything Everglow: a column with its escorts, then the biggest rush
  {
    countdownSec: COUNTDOWN,
    groups: [...rush(0, 3, W14_RUSH), drones(22, 12, 1.0), expediters(2, 18, 8)],
  },
  // W15 · everything
  {
    countdownSec: COUNTDOWN,
    groups: [
      ...rush(0, 2, W15_RUSH),
      motes(18, 'rift_w', 8, 0.3),
      drones(14, 12, 1.0),
      g('fracture', 2, 'rift_e', 14, 4),
      expediters(2, 15, 6),
      motes(18, 'rift_e', 24, 0.3),
    ],
  },
]);
