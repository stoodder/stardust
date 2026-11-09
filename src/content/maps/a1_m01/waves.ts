// A1M1 waves: docs/story/campaign/act1.md § A1M1, Wave data. One route ('road'); every
// countdown is the Act I default (25 s, rules.ts), so no wave sets `countdownSec`. Groups without
// an `intervalSec` use the enemy's default spacing (Nibbler 0.8 s, Zoomer 0.5 s). A clump is 4
// Nibblers at 0.25 s; clumps start 3.75 s apart. W7's big clumps are 6 Nibblers at 0.2 s, starting
// 2.25 s apart: the knots Thumper splash is for. No wave is a teach wave: A1M1 has no required
// counters, so it has no soft enemies to exempt.
//
// Tuning (T107, against the balance harness): W1's 8 Nibblers at 0.65 s are one more than the
// lone roof Rivet of the par build can stop, so par lets one through (margin 95, act1.md's
// target; QUILL's first-leak bark lands on the first shift). W7's big clumps are where a Thumper
// earns its slot: par holds them, and the Rivet-only build leaks a few and still wins.
import { defineWaves } from '../../define.ts';
import type { WaveGroup } from '../../types.ts';

const ROUTE = 'road';

/** A clump: 4 Nibblers at 0.25 s spacing, starting `delaySec` into the wave. */
function clump(delaySec: number): WaveGroup {
  return { enemy: 'nibbler', count: 4, intervalSec: 0.25, delaySec, route: ROUTE };
}

/** A big clump (W7): 6 Nibblers at 0.2 s spacing, starting `delaySec` into the wave. */
function bigClump(delaySec: number): WaveGroup {
  return { enemy: 'nibbler', count: 6, intervalSec: 0.2, delaySec, route: ROUTE };
}

export const waves = defineWaves([
  // W1 · build
  { groups: [{ enemy: 'nibbler', count: 8, intervalSec: 0.65, route: ROUTE }] },
  // W2 · upgrade; high ground
  { groups: [{ enemy: 'nibbler', count: 10, route: ROUTE }] },
  // W3 · Thumper unlocks (towerUnlockWave), Crossfire (cosmetic until T202)
  { groups: [clump(0), clump(3.75), clump(7.5)] },
  // W4 · fast
  { groups: [{ enemy: 'zoomer', count: 4, route: ROUTE }] },
  // W5 · test; Orbital Strike prompt
  {
    groups: [clump(0), clump(3.75), { enemy: 'zoomer', count: 4, delaySec: 7.5, route: ROUTE }],
  },
  // W6 · Zoomer rush
  { groups: [{ enemy: 'zoomer', count: 10, route: ROUTE }] },
  // W7 · five big clumps; a Zoomer group of 8 starts as the second and as the fourth clump
  // finish spawning
  {
    groups: [
      bigClump(0),
      bigClump(2.25),
      bigClump(4.5),
      bigClump(6.75),
      bigClump(9.0),
      { enemy: 'zoomer', count: 8, delaySec: 3.25, route: ROUTE },
      { enemy: 'zoomer', count: 8, delaySec: 7.75, route: ROUTE },
    ],
  },
]);
