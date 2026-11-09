// A1M1 waves: docs/story/campaign/act1.md § A1M1, Wave data. One route ('road'); every
// countdown is the Act I default (25 s, rules.ts), so no wave sets `countdownSec`. Groups without
// an `intervalSec` use the enemy's default spacing (Nibbler 0.8 s, Zoomer 0.5 s). A clump is 4
// Nibblers at 0.25 s; clumps start 3.75 s apart. No wave is a teach wave: A1M1 has no required
// counters, so it has no soft enemies to exempt.
import { defineWaves } from '../../define.ts';
import type { WaveGroup } from '../../types.ts';

const ROUTE = 'road';

/** A clump: 4 Nibblers at 0.25 s spacing, starting `delaySec` into the wave. */
function clump(delaySec: number): WaveGroup {
  return { enemy: 'nibbler', count: 4, intervalSec: 0.25, delaySec, route: ROUTE };
}

export const waves = defineWaves([
  // W1 · build
  { groups: [{ enemy: 'nibbler', count: 6, route: ROUTE }] },
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
  // W7 · five clumps and two Zoomer groups of 4 in the gaps after the second and fourth
  {
    groups: [
      clump(0),
      clump(3.75),
      clump(7.5),
      clump(11.25),
      clump(15.0),
      { enemy: 'zoomer', count: 4, delaySec: 5.5, route: ROUTE },
      { enemy: 'zoomer', count: 4, delaySec: 13.0, route: ROUTE },
    ],
  },
]);
