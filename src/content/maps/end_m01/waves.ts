// END_M01's warm-up: the five waves every Endless seed opens with, before the generator's first
// counter block (src/sim/endless.ts; ENDLESS in endless.ts). Hollow down the old road on the threat
// curve's first steps (ENDLESS.firstWaveThreat 600, ×1.07 a wave: 600, 642, 687, 735, 786;
// sim/endless.test.ts holds each within 5% and above the one before): Mote knots, then a Fracture
// at the head of each from W3, so a post-game player builds up against the Long Night's smallest.
// No Skitterkin: after the finale the player is never asked to shoot the people they walked home
// (D156). The block demands no counter; the Motes' `clustered` and the Fractures' `splitting` are
// passed over the soft cap on this map (map.ts `softExempt`). Countdowns are Endless's default
// (20 s, rules.ts).
import { defineWaves } from '../../define.ts';

const ROUTE = 'road';

export const waves = defineWaves([
  // W1 · 601: nineteen Motes, two knots.
  {
    groups: [
      { enemy: 'mote', count: 10, intervalSec: 0.6, route: ROUTE },
      { enemy: 'mote', count: 9, intervalSec: 0.6, delaySec: 9, route: ROUTE },
    ],
  },
  // W2 · 632: twenty Motes, a long knot and a short one.
  {
    groups: [
      { enemy: 'mote', count: 14, intervalSec: 0.5, route: ROUTE },
      { enemy: 'mote', count: 6, intervalSec: 0.5, delaySec: 10, route: ROUTE },
    ],
  },
  // W3 · 674: the first Fracture, Motes behind it.
  {
    groups: [
      { enemy: 'fracture', count: 1, route: ROUTE },
      { enemy: 'mote', count: 6, intervalSec: 0.5, delaySec: 5, route: ROUTE },
    ],
  },
  // W4 · 737: Motes either side of a Fracture.
  {
    groups: [
      { enemy: 'mote', count: 4, intervalSec: 0.5, route: ROUTE },
      { enemy: 'fracture', count: 1, delaySec: 4, route: ROUTE },
      { enemy: 'mote', count: 4, intervalSec: 0.5, delaySec: 10, route: ROUTE },
    ],
  },
  // W5 · 800: a Fracture and a long Mote knot behind it.
  {
    groups: [
      { enemy: 'fracture', count: 1, route: ROUTE },
      { enemy: 'mote', count: 10, intervalSec: 0.45, delaySec: 5, route: ROUTE },
    ],
  },
]);
