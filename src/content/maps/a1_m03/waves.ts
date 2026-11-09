// A1M3 waves: docs/story/campaign/act1.md § A1M3, Wave data. Ground units and Gerald take the
// road ('road'); Puffwings fly the air lane ('sky'). Every countdown is the Act I default (25 s).
// Groups without an `intervalSec` use the enemy's default spacing (Nibbler 0.8 s, Zoomer 0.5 s,
// Chonk 1.5 s, Hauler 2.5 s, Puffwing 0.6 s).
import { defineWaves } from '../../define.ts';
import type { EnemyId, WaveGroup } from '../../types.ts';

/** `count` of `enemy` on `route`, starting `delaySec` into the wave, `intervalSec` apart. */
function on(
  route: 'road' | 'sky',
  enemy: EnemyId,
  count: number,
  delaySec = 0,
  intervalSec?: number,
): WaveGroup {
  return {
    enemy,
    count,
    delaySec,
    route,
    ...(intervalSec === undefined ? {} : { intervalSec }),
  };
}
const g = (enemy: EnemyId, count: number, delaySec = 0, intervalSec?: number): WaveGroup =>
  on('road', enemy, count, delaySec, intervalSec);
const air = (count: number, delaySec = 0, intervalSec?: number): WaveGroup =>
  on('sky', 'puffwing', count, delaySec, intervalSec);
/** Gerald's pass: one mail drone on the road (D072). */
const gerald = (delaySec: number): WaveGroup => g('gerald', 1, delaySec);

/** W6–W8 release their Haulers one at a time, this far apart (D052): a strike takes one at most. */
export const HAULER_GAP = 12;

export const waves = defineWaves([
  // W1 · Nibblers + Gerald pass 1 [T: Hold Fire (all); the button pulses]
  { groups: [gerald(0), g('nibbler', 10, 18, 0.7)] },
  // W2 · Zoomers [the salvage-drone prompt]
  { groups: [g('nibbler', 6, 0), g('zoomer', 12, 4)] },
  // W3 · Puffwings ×4 [T: the air lane, the Skyhook]
  { teach: true, groups: [g('nibbler', 10, 0, 0.7), air(4, 6)] },
  // W4 · Chonks + Gerald pass 2 [X: hold fire on single towers]
  { groups: [g('chonk', 4, 0, 2), gerald(8), g('nibbler', 8, 4, 0.6)] },
  // W5 · a Puffwing flock ×10 [X; the Time Dilation prompt]
  { groups: [g('zoomer', 10, 0), air(10, 4)] },
  // W6 · Haulers + Puffwings
  { groups: [g('hauler', 4, 0, HAULER_GAP), air(6, 8), air(6, 26)] },
  // W7 · mixed + Gerald pass 3 (carrying the form)
  {
    groups: [
      g('chonk', 3, 0, 2),
      gerald(4),
      g('nibbler', 16, 10, 0.5),
      g('hauler', 2, 14, HAULER_GAP),
      g('zoomer', 12, 30, 0.4),
      air(6, 20),
    ],
  },
  // W8 · mixed + the big flock
  {
    groups: [
      g('hauler', 3, 0, HAULER_GAP),
      g('chonk', 4, 4, 2),
      g('zoomer', 16, 12, 0.4),
      air(20, 18, 0.5),
    ],
  },
]);
