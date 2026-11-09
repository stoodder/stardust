// A1M1 waves: docs/story/campaign/act1.md § A1M1, Wave data. One route ('road'); every
// countdown is the Act I default (25 s, rules.ts), so no wave sets `countdownSec`. Groups without
// an `intervalSec` use the enemy's default spacing (Nibbler 0.8 s, Zoomer 0.5 s). A clump is a
// knot of Nibblers fired close together: the knots Thumper splash and the Orbital Strike are for.
// No wave is a teach wave: A1M1 has no required counters, so it has no soft enemies to exempt.
//
// Tuning (T127, T130, T125; D026, D028; against the balance harness, with Crossfire, the roof's
// high ground, and Bricks at the gate all live): pressure ramps through W4–W7 instead of a
// single-wave wall. Par (two Rivets in the setup, its bank spent) holds every wave but W7, where
// one pest gets past Bricks; its W7 strike saves 8 integrity. A defense that never upgrades feels
// it coming: two setup Rivets start leaking in W4 and lose over W5–W6, and three lose over W5–W7.
// Zoomers are the upgrade check (a tier-2 Rivet kills one in two shots, a tier-1 in three); W7's
// Zoomer groups are the tuning's sharpest knob (18 each puts par at 100, 22 walls the alts).
// src/balance/a1m1.test.ts shifts the clump spacing ±0.2 s to keep these verdicts off a cliff.
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
  // W3 · Thumper unlocks (towerUnlockWave), Crossfire: clumps of 4
  { groups: [clump(0, 4, 0.25), clump(3.75, 4, 0.25), clump(7.5, 4, 0.25)] },
  // W4 · fast, and the warning: a clump of 8 runs in behind the Zoomers, so two unupgraded
  // Rivets start to leak here, a wave before anything can end the shift
  { groups: [zoomers(14), clump(3, 8, 0.2)] },
  // W5 · test; Orbital Strike prompt: a dense Zoomer burst over the first of four clumps of 4
  {
    groups: [
      clump(0, 4, 0.2),
      clump(5, 4, 0.2),
      clump(10, 4, 0.2),
      clump(15, 4, 0.2),
      zoomers(16, 1, 0.2),
    ],
  },
  // W6 · Zoomer rush in three bursts, with two clumps of 8 in it: a breather for upgraded towers,
  // the upgrade check for tier-1 ones
  {
    groups: [
      zoomers(10, 0, 0.3),
      zoomers(10, 4, 0.3),
      zoomers(10, 8, 0.3),
      clump(2, 8, 0.25),
      clump(5.75, 8, 0.25),
    ],
  },
  // W7 · four big clumps of 8, 2 s apart, and two dense Zoomer groups of 20
  {
    groups: [
      clump(0, 8, 0.2),
      clump(2, 8, 0.2),
      clump(4, 8, 0.2),
      clump(6, 8, 0.2),
      zoomers(20, 0, 0.2),
      zoomers(20, 6.5, 0.2),
    ],
  },
]);
