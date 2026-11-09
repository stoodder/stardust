// A1M1 waves: docs/story/campaign/act1.md § A1M1, Wave data. One route ('road'); every
// countdown is the Act I default (25 s, rules.ts), so no wave sets `countdownSec`. Groups without
// an `intervalSec` use the enemy's default spacing (Nibbler 0.8 s, Zoomer 0.5 s). A clump is a
// knot of Nibblers fired close together: the knots Thumper splash and the Orbital Strike are for.
// No wave is a teach wave: A1M1 has no required counters, so it has no soft enemies to exempt.
//
// Tuning (T127, against the balance harness; D026): pressure ramps through W4–W7 instead of a W7
// wall. Par (two Rivets in the setup, its bank spent) holds W1–W6 and lets one W7 Nibbler
// through; its W7 strike saves 6 more. The Rivet-only build leaks on W5's and W7's tight clumps
// and still wins; three unupgraded Rivets leak from W5 on and lose in W7. src/balance/a1m1.test.ts
// shifts the clump spacing ±0.2 s to keep these verdicts from resting on a cliff.
import { defineWaves } from '../../define.ts';
import type { WaveGroup } from '../../types.ts';

const ROUTE = 'road';

/** A clump of `count` Nibblers `intervalSec` apart, starting `delaySec` into the wave. */
function clump(delaySec: number, count: number, intervalSec: number): WaveGroup {
  return { enemy: 'nibbler', count, intervalSec, delaySec, route: ROUTE };
}

/** `count` Zoomers, starting `delaySec` into the wave (default spacing 0.5 s). */
function zoomers(count: number, delaySec = 0, intervalSec?: number): WaveGroup {
  return {
    enemy: 'zoomer',
    count,
    delaySec,
    route: ROUTE,
    ...(intervalSec === undefined ? {} : { intervalSec }),
  };
}

export const waves = defineWaves([
  // W1 · build
  { groups: [{ enemy: 'nibbler', count: 8, intervalSec: 0.65, route: ROUTE }] },
  // W2 · upgrade; high ground
  { groups: [{ enemy: 'nibbler', count: 10, route: ROUTE }] },
  // W3 · Thumper unlocks (towerUnlockWave), Crossfire (cosmetic until T202): clumps of 4
  { groups: [clump(0, 4, 0.25), clump(3.75, 4, 0.25), clump(7.5, 4, 0.25)] },
  // W4 · fast
  { groups: [zoomers(6)] },
  // W5 · test; Orbital Strike prompt: four tight clumps of 6, then Zoomers
  {
    groups: [
      clump(0, 6, 0.2),
      clump(3.75, 6, 0.2),
      clump(7.5, 6, 0.2),
      clump(11.25, 6, 0.2),
      zoomers(12, 15, 0.4),
    ],
  },
  // W6 · Zoomer rush, with two clumps of 6 in it
  { groups: [zoomers(20), clump(2, 6, 0.25), clump(5.75, 6, 0.25)] },
  // W7 · four big clumps of 8, 2.25 s apart, and two Zoomer groups of 12
  {
    groups: [
      clump(0, 8, 0.2),
      clump(2.25, 8, 0.2),
      clump(4.5, 8, 0.2),
      clump(6.75, 8, 0.2),
      zoomers(12, 0.5, 0.4),
      zoomers(12, 6.5, 0.4),
    ],
  },
]);
