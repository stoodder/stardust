// The Brood Hauler's sack burst (D059, design/enemies.md § 5.1): the timings of the young that
// scurry *back up the route toward the warren* when a Hauler dies. Pure, so the motion is tested
// without Phaser; views/SackBurstView.ts draws it. Render-only and cosmetic (real time).
import { fadeAlpha } from './fxTiming.ts';

/** How long the young scurry before they're gone (ms). */
export const SCURRY_MS = 1500;
/** Their pace back up the route (tiles/s): a scamper, three times a Hauler's plod. */
export const SCURRY_TILES_PER_S = 2.2;
/** Each young starts this long after the one before (ms), so they spill out, not march out. */
export const SCURRY_STAGGER_MS = 90;
/** The most young drawn per burst (the Hauler carries 3). */
export const MAX_YOUNG = 3;
/** Each young's sideways offset from the route's center line (px), by index. */
export const YOUNG_LANES_PX: readonly number[] = [0, -4, 4];
/** Each young's pace, as a share of `SCURRY_TILES_PER_S`, by index: a little ragged. */
const YOUNG_PACE: readonly number[] = [1, 0.85, 1.12];

/**
 * Where young `i` is along the route (tiles from its start) `ms` after a burst at route distance
 * `dist0`: it waits its stagger, then runs back toward 0 (the spawn), and stops there.
 */
export function scurryDist(dist0: number, ms: number, i: number): number {
  const run = Math.max(0, ms - i * SCURRY_STAGGER_MS);
  const pace = SCURRY_TILES_PER_S * (YOUNG_PACE[i] ?? 1);
  return Math.max(0, dist0 - (pace * run) / 1000);
}

/**
 * The young's alpha `ms` after the burst: whole, then the stepped fade over the run's end; 0 once
 * it's over or the young reached the spawn (it's home).
 */
export function scurryAlpha(ms: number, dist: number): number {
  if (ms >= SCURRY_MS || dist <= 0) return 0;
  return fadeAlpha(ms / SCURRY_MS);
}
