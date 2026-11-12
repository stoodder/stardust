// END_M01's warm-up: the five waves every Endless seed opens with, before the generator's first
// counter block (src/sim/endless.ts; ENDLESS in endless.ts). Plain Skitterkin down the old road on
// the threat curve's first steps (ENDLESS.firstWaveThreat 600, ×1.07 a wave: 600, 642, 687, 735,
// 786; sim/endless.test.ts holds each within 5% and above the one before), so a post-game player
// builds up while the colony's oldest pests say hello. The block demands no counter, so every
// trait in it is soft (≤ 15% of a wave's threat, maps.md § 6.2): the Zoomers' `fast` is intel only,
// and a splitter can't fit (a Bunchling with its three Nibblers is 147, 19% of W5). Countdowns are
// Endless's default (20 s, rules.ts).
import { defineWaves } from '../../define.ts';

const ROUTE = 'road';

export const waves = defineWaves([
  // W1 · 600: twenty Nibblers, two knots.
  {
    groups: [
      { enemy: 'nibbler', count: 10, intervalSec: 0.6, route: ROUTE },
      { enemy: 'nibbler', count: 10, intervalSec: 0.6, delaySec: 9, route: ROUTE },
    ],
  },
  // W2 · 644: Nibblers, then a Zoomer run.
  {
    groups: [
      { enemy: 'nibbler', count: 14, intervalSec: 0.6, route: ROUTE },
      { enemy: 'zoomer', count: 8, delaySec: 6, route: ROUTE },
    ],
  },
  // W3 · 704
  {
    groups: [
      { enemy: 'zoomer', count: 8, route: ROUTE },
      { enemy: 'nibbler', count: 16, intervalSec: 0.5, delaySec: 4, route: ROUTE },
    ],
  },
  // W4 · 724: two Zoomer runs either side of a Nibbler knot.
  {
    groups: [
      { enemy: 'zoomer', count: 6, route: ROUTE },
      { enemy: 'nibbler', count: 12, intervalSec: 0.5, delaySec: 4, route: ROUTE },
      { enemy: 'zoomer', count: 7, delaySec: 10, route: ROUTE },
    ],
  },
  // W5 · 766: a long Nibbler knot, then a Zoomer run.
  {
    groups: [
      { enemy: 'nibbler', count: 18, intervalSec: 0.45, route: ROUTE },
      { enemy: 'zoomer', count: 8, delaySec: 9, route: ROUTE },
    ],
  },
]);
