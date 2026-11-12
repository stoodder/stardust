// END_M01's warm-up: the five waves every Endless seed opens with, before the generator's first
// counter block (src/sim/endless.ts; ENDLESS in endless.ts). Plain Skitterkin down the old road on
// the threat curve's first steps (ENDLESS.firstWaveThreat 600, ×1.07 a wave: 600, 642, 687, 735,
// 786; sim/endless.test.ts holds each within 5% and above the one before), so a post-game player
// builds up while the colony's oldest pests say hello. The block demands no counter; W5's one
// Bunchling (7% of its threat by the validator's count, under the soft cap) is a taste of what
// splits. Countdowns are Endless's default (20 s, rules.ts).
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
  // W5 · 791: and a Bunchling in the knot (the splash to come).
  {
    groups: [
      { enemy: 'nibbler', count: 14, intervalSec: 0.5, route: ROUTE },
      { enemy: 'bunchling', count: 1, delaySec: 3, route: ROUTE },
      { enemy: 'zoomer', count: 8, delaySec: 9, route: ROUTE },
    ],
  },
]);
