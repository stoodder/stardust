// Everglow's jammers' look, minimal (T707; design/enemies.md § 4 and § 6; art-direction.md § 8's
// `disabler` tell; T730a polishes it, T730b the crash site): pure rules, unit-tested, applied by
// JamRingView (the Auditor's ring) and TakeoverView ("Shareholder Value").
// - **The Auditor's ring** (its tell): an `orange.3` ring over an `ink.0` under-stroke grows from
//   the Auditor (`ringTiles`: from RING_START of its reach to all of it as the jams land), with
//   a faint `orange.2` outline of the whole reach from the tell's first tick, so where it will
//   land reads before it does. Still under reduced motion it holds the full outline and fills
//   only by alpha (`ringAlpha`).
// - **Hostile Takeover's laser** (its tell): a `red.3` beam with an `ink.0` under-stroke and a
//   `red.4` core from the platform to each tower it picked, widening as the jam comes
//   (`laserWidth`), and a reticle closing on each target (`reticlePx`: RETICLE_FROM_PX down to
//   RETICLE_TO_PX), so the player sees which towers and when.
// - **The hangar's door** (a launch's tell): an `orange.3` bar over the platform opening wide
//   (`doorShare`) through its 1.5 s.
// - **The plates** (the jettison): each opened `crash_*` tile shows a `steel.1` slab with a
//   `steel.3` edge and an `ink.0` outline, set askew per marker (`plateSkew`).
import type { ColorName } from '../../content/palettes/master.ts';

export const RING_COLOR: ColorName = 'orange.3';
export const RING_OUTLINE: ColorName = 'orange.2';
export const UNDER: ColorName = 'ink.0';
export const LASER_COLOR: ColorName = 'red.3';
export const LASER_CORE: ColorName = 'red.4';
export const DOOR_COLOR: ColorName = 'orange.3';
export const PLATE_FILL: ColorName = 'steel.1';
export const PLATE_EDGE: ColorName = 'steel.3';
/** The ring's radius as its tell starts, as a share of its reach. */
export const RING_START = 0.15;
export const RETICLE_FROM_PX = 12;
export const RETICLE_TO_PX = 5;
export const LASER_MIN_PX = 1;
export const LASER_MAX_PX = 3;
/** The hangar door's full width (px) over the platform. */
export const DOOR_PX = 14;

function clamp01(f: number): number {
  return f < 0 ? 0 : f > 1 ? 1 : f;
}

/** A tell's progress (0 as it starts, 1 as it lands) with `left` of `tell` ticks to go. */
export function tellProgress(left: number, tell: number): number {
  return tell <= 0 ? 1 : clamp01(1 - left / tell);
}

/** The growing ring's radius in tiles at `growth` (0–1) of a reach of `reach` tiles. */
export function ringTiles(growth: number, reach: number, still: boolean): number {
  if (still) return reach;
  return reach * (RING_START + (1 - RING_START) * clamp01(growth));
}

/** The ring's alpha at `growth`: brightening as the jam comes. */
export function ringAlpha(growth: number): number {
  return 0.45 + 0.55 * clamp01(growth);
}

/** The laser's width (px) at `progress`. */
export function laserWidth(progress: number): number {
  return Math.round(LASER_MIN_PX + (LASER_MAX_PX - LASER_MIN_PX) * clamp01(progress));
}

/** The reticle's half-size (px) on a target at `progress`. */
export function reticlePx(progress: number): number {
  const f = clamp01(progress);
  return Math.round(RETICLE_FROM_PX + (RETICLE_TO_PX - RETICLE_FROM_PX) * f);
}

/** How far the hangar door has opened (0–1) with `left` ticks of a `tell`-tick tell to go. */
export function doorShare(left: number, tell: number): number {
  return tellProgress(left, tell);
}

/** A plate's skew (px, −2..2) on marker `i`: each lies a little differently. */
export function plateSkew(i: number): number {
  return ((i * 7 + 3) % 5) - 2;
}
