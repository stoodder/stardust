// The Brood Hauler's sack burst (D059, D061; design/enemies.md § 5.1): the timings of the young
// that scurry *back up the route toward the warren* when a Hauler dies. Pure, so the motion is
// tested without Phaser; views/SackBurstView.ts draws it. Render-only and cosmetic (real time).
// D061: long and clear enough to read as creatures fleeing, not debris: ~2.5 s, 2–3 tiles, whole
// until the last 0.3 s, and one young stops partway to look back.
import { fadeAlpha } from './fxTiming.ts';

/** How long the young scurry before they're gone (ms). */
export const SCURRY_MS = 2500;
/** The young stay whole until this long before the end, then fade in steps (ms). */
export const SCURRY_FADE_MS = 300;
/** Their pace back up the route (tiles/s): a scamper, well over a Hauler's plod. */
export const SCURRY_TILES_PER_S = 1.15;
/** Each young starts this long after the one before (ms), so they spill out, not march out. */
export const SCURRY_STAGGER_MS = 90;
/** The most young drawn per burst (the Hauler carries 3). */
export const MAX_YOUNG = 3;
/** Each young's sideways offset from the route's center line (px), by index. */
export const YOUNG_LANES_PX: readonly number[] = [0, -4, 4];
/** Each young's pace, as a share of `SCURRY_TILES_PER_S`, by index: a little ragged. */
const YOUNG_PACE: readonly number[] = [1, 1, 1.1];
/** The young that stops to look back (the pebble in the shoe). */
export const LOOK_BACK_YOUNG = 1;
/** When it stops, measured from its own start (ms), and for how long. */
export const LOOK_BACK_AT_MS = 800;
export const LOOK_BACK_MS = 550;

/** How long young `i` has been running `ms` after the burst (ms): its stagger and pause left out. */
function runMs(ms: number, i: number): number {
  const own = Math.max(0, ms - i * SCURRY_STAGGER_MS);
  if (i !== LOOK_BACK_YOUNG || own <= LOOK_BACK_AT_MS) return own;
  return LOOK_BACK_AT_MS + Math.max(0, own - LOOK_BACK_AT_MS - LOOK_BACK_MS);
}

/**
 * Where young `i` is along the route (tiles from its start) `ms` after a burst at route distance
 * `dist0`: it waits its stagger, then runs back toward 0 (the spawn), and stops there.
 */
export function scurryDist(dist0: number, ms: number, i: number): number {
  const pace = SCURRY_TILES_PER_S * (YOUNG_PACE[i] ?? 1);
  return Math.max(0, dist0 - (pace * runMs(ms, i)) / 1000);
}

/** Whether young `i` is stopped, looking back the way it came, `ms` after the burst. */
export function scurryLooksBack(ms: number, i: number): boolean {
  if (i !== LOOK_BACK_YOUNG) return false;
  const own = ms - i * SCURRY_STAGGER_MS;
  return own > LOOK_BACK_AT_MS && own < LOOK_BACK_AT_MS + LOOK_BACK_MS;
}

/**
 * The young's alpha `ms` after the burst: whole until the last SCURRY_FADE_MS, then the stepped
 * fade (its 60/35/15 steps); 0 once it's over or the young reached the spawn (it's home).
 */
export function scurryAlpha(ms: number, dist: number): number {
  if (ms >= SCURRY_MS || dist <= 0) return 0;
  const into = ms - (SCURRY_MS - SCURRY_FADE_MS);
  if (into < 0) return 1;
  return fadeAlpha(0.5 + (0.5 * into) / SCURRY_FADE_MS);
}
