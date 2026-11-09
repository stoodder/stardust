// A1M3 waves: docs/story/campaign/act1.md § A1M3, Wave data. Ground units and Gerald take the
// road ('road'); Puffwings fly the air lane ('sky'). Every countdown is the Act I default (25 s).
// Groups without an `intervalSec` use the enemy's default spacing (Nibbler 0.8 s, Zoomer 0.5 s,
// Chonk 1.5 s, Hauler 2.5 s, Puffwing 0.6 s).
//
// Gerald's passes set the rhythm: a held pass (Hold Fire (all), par's macro) lasts about 22 s, the
// time he takes to fly the 26-tile road. Each pass opens its wave and the wave's own threats come in
// behind him, and the wave before a pass ends on a trailing group well after its slow units, so a
// player who calls waves early isn't holding fire over the previous wave's Haulers.
import { defineWaves } from '../../define.ts';
import type { EnemyId, WaveGroup } from '../../types.ts';

/** `count` of `enemy` on `route`, starting `delaySec` into the wave, `intervalSec` apart. */
function on(
  route: 'road' | 'sky',
  enemy: EnemyId,
  count: number,
  delaySec: number,
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
/** Puffwings on the air lane. */
const air = (count: number, delaySec = 0, intervalSec?: number): WaveGroup =>
  on('sky', 'puffwing', count, delaySec, intervalSec);
/** Gerald's pass: one mail drone on the road (D072). */
const gerald = (delaySec: number): WaveGroup => g('gerald', 1, delaySec);

/** W6–W8 release their Haulers one at a time, this far apart (D052): a strike takes one at most. */
export const HAULER_GAP = 12;
/**
 * W4's three Chonks, this far apart (1.8 tiles; 3.6 end to end): more than a Mk I strike's 3-tile
 * blast covers whole and inside Mk II's 4 tiles, so the R&D pick decides whether the last one
 * leaks (T228).
 */
export const CHONK_GAP = 3;

export const waves = defineWaves([
  // W1 · Gerald pass 1, then Nibblers [T: Hold Fire (all); the button pulses]
  { groups: [gerald(0), g('nibbler', 10, 18, 0.7)] },
  // W2 · Zoomers [the salvage-drone prompt]
  { groups: [g('nibbler', 4, 0), g('zoomer', 10, 4)] },
  // W3 · Puffwings ×4 [T: the air lane, the Skyhook]
  { teach: true, groups: [air(4, 0)] },
  // W4 · Chonks + Gerald pass 2 [X: hold fire on single towers]: he overtakes the Chonks, so a
  // held pass lets them walk
  { groups: [g('chonk', 3, 0, CHONK_GAP), gerald(8), g('nibbler', 6, 16, 0.6)] },
  // W5 · a Puffwing flock ×10 [X; the Time Dilation prompt]
  { groups: [air(10, 0), g('zoomer', 8, 6)] },
  // W6 · Haulers + Puffwings, and a trailing Nibbler pack
  {
    groups: [air(6, 0), g('hauler', 5, 8, HAULER_GAP), air(6, 24), g('nibbler', 6, 80, 0.7)],
  },
  // W7 · Gerald pass 3 (carrying the form), then mixed
  {
    groups: [
      gerald(0),
      g('hauler', 2, 12, HAULER_GAP),
      g('chonk', 3, 20, 2),
      g('nibbler', 16, 24, 0.5),
      air(6, 28),
      g('zoomer', 12, 42, 0.4),
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
