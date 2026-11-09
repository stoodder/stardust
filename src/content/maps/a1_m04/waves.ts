// A1M4 waves: docs/story/campaign/act1.md § A1M4, Wave data. Every group takes the road; every
// countdown is the Act I default (25 s). Groups without an `intervalSec` use the enemy's default
// spacing (Nibbler 0.8 s, Zoomer 0.5 s, Chonk 1.5 s, Hauler 2.5 s, Bunchling 1.0 s, Elder 2.0 s).
//
// A huddle is an Elder with Nibblers packed in right behind it: they keep to its pace (0.6 tiles/s)
// and regenerate while they stay within 1.5 tiles, so a single-target turret chews through a
// healing clump while a splash shell or a chain hits the whole clump at once.
import { defineWaves } from '../../define.ts';
import type { EnemyId, WaveGroup } from '../../types.ts';

/** `count` of `enemy` on the road, starting `delaySec` into the wave, `intervalSec` apart. */
function g(enemy: EnemyId, count: number, delaySec = 0, intervalSec?: number): WaveGroup {
  return {
    enemy,
    count,
    delaySec,
    route: 'road',
    ...(intervalSec === undefined ? {} : { intervalSec }),
  };
}

/** An Elder at `delaySec` with `n` Nibblers packed in behind it. */
const huddle = (delaySec: number, n: number): WaveGroup[] => [
  g('elder', 1, delaySec),
  g('nibbler', n, delaySec + HUDDLE_LAG, HUDDLE_GAP),
];

/** How far behind its Elder a huddle's Nibblers start, and their spacing (seconds). */
export const HUDDLE_LAG = 0.4;
export const HUDDLE_GAP = 0.3;
/** W7 and W9 release their Haulers one at a time, this far apart (D052): a strike takes one. */
export const HAULER_GAP = 12;
/**
 * W5's Chonks walk this far apart (1.2 tiles): a column the splash shells roll down, which a
 * single-target turret can't stop in time.
 */
export const CHONK_GAP = 2;
/** W6's and W9's Elders walk this far apart, so one strike never catches two huddles. */
export const ELDER_GAP = 10;

export const waves = defineWaves([
  // W1 · Nibblers, then a Zoomer rush [the Clearance Sale prompt]
  { groups: [g('nibbler', 18, 0, 0.7), g('zoomer', 32, 10, 0.3)] },
  // W2 · Bunchlings ×4 [T: splitting]
  { teach: true, groups: [g('bunchling', 4, 0, 2.5), g('nibbler', 10, 12, 0.6)] },
  // W3 · Bunchlings + Zoomers [X]
  { groups: [g('bunchling', 10, 0, 1.0), g('zoomer', 18, 6, 0.4)] },
  // W4 · one Elder + huddled Nibblers [T: huddle; splash], then a loose pack
  { teach: true, groups: [...huddle(0, 10), g('nibbler', 13, 20, 0.5)] },
  // W5 · Chonks + Bunchlings [the armor test: light armor in a column, splitters behind it]
  { groups: [g('chonk', 10, 0, CHONK_GAP), g('bunchling', 20, 6, 0.8)] },
  // W6 · Elders ×2 + Bunchlings [X]
  { groups: [...huddle(0, 10), ...huddle(ELDER_GAP, 10), g('bunchling', 13, 16, 0.8)] },
  // W7 · Haulers ×2 + an Elder
  { groups: [g('hauler', 2, 0, HAULER_GAP), ...huddle(6, 13), g('zoomer', 21, 20, 0.35)] },
  // W8 · a Zoomer flood + Bunchlings
  { groups: [g('zoomer', 39, 0, 0.3), g('bunchling', 18, 6, 0.7)] },
  // W9 · Elders ×3 with big huddles + Haulers [X]
  {
    groups: [
      g('hauler', 4, 0, HAULER_GAP),
      ...huddle(4, 16),
      ...huddle(4 + ELDER_GAP, 16),
      ...huddle(4 + 2 * ELDER_GAP, 16),
      g('bunchling', 13, 30, 0.8),
    ],
  },
]);
