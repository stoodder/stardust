// Everglow's jammers' look (T707's minimal one, polished by T730a; design/enemies.md § 4 and § 6;
// art-direction.md § 8's `disabler` tell): pure rules, unit-tested, applied
// by JamRingView (the Auditor's ring) and TakeoverView ("Shareholder Value").
// - **The Auditor's ring** (its tell): an `orange.3` ring over an `ink.0` under-stroke grows from
//   the Auditor (`ringTiles`: from RING_START of its reach to all of it as the jams land), with
//   a faint `orange.2` outline of the whole reach from the tell's first tick, so where it will
//   land reads before it does. Still under reduced motion it holds the full outline and fills
//   only by alpha (`ringAlpha`).
// - **Hostile Takeover's laser** (its tell): from the dish's red lens (`lensOffset`: where the
//   `aim` frame draws it, by facing) to each tower it picked, a `red.3` beam over a wide faint
//   `red.2` glow and an `ink.0` under-stroke, with a `red.4` core (`white.1` in its last third, as
//   the jam comes), widening as it comes (`laserWidth`: LASER_MIN_PX to LASER_MAX_PX); a flare on
//   the lens; and four corner brackets closing on each target (`reticlePx`: RETICLE_FROM_PX down
//   to RETICLE_TO_PX), so the player sees which towers and when.
// - **The hangar's door** (a launch's tell): the sprite's `tell` opens the door on its rear flank
//   (`doorOffset`: where, by facing); over it a hazard frame (`orange.3` over `ink.0`, blinking on
//   the tell step; steady under reduced motion) and under it a launch gauge filling through its
//   1.5 s (`doorShare`), DOOR_PX wide, so the launch reads big on the hull, below the floaters.
// - **The jettison:** a burst (fx.explosion) and an `orange.3` ring the platform's size as its
//   plates blow off (TransientFx). The plates' flight and landing are crashLanding.ts's (T730b).
import type { ColorName } from '../../content/palettes/master.ts';

export const RING_COLOR: ColorName = 'orange.3';
export const RING_OUTLINE: ColorName = 'orange.2';
export const UNDER: ColorName = 'ink.0';
export const LASER_COLOR: ColorName = 'red.3';
export const LASER_CORE: ColorName = 'red.4';
export const DOOR_COLOR: ColorName = 'orange.3';
/** The ring's radius as its tell starts, as a share of its reach. */
export const RING_START = 0.15;
export const RETICLE_FROM_PX = 14;
export const RETICLE_TO_PX = 6;
export const LASER_MIN_PX = 2;
export const LASER_MAX_PX = 5;
export const LASER_GLOW: ColorName = 'red.2';
/** The launch gauge's full width (px) under the hangar door, and the door's frame (px square). */
export const DOOR_PX = 20;
export const DOOR_FRAME_PX = 14;
/** The jettison's ring (tiles). */
export const JETTISON_RING_TILES = 1.2;
/** The `aim` lens's and the hangar door's offsets from the platform's anchor, facing se (px). */
const LENS_SE = { dx: -11, dy: -39 } as const;
const LENS_NE = { dx: 13, dy: -39 } as const;
const DOOR_SE = { dx: -15, dy: -18 } as const;
const DOOR_NE = { dx: 12, dy: -18 } as const;

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

/** Whether the laser's core runs white (its last third, as the jam comes). */
export function laserHot(progress: number): boolean {
  return progress >= 2 / 3;
}

/**
 * Where a point on "Shareholder Value" sits from its anchor (px) facing `facing`: authored for
 * `se` and `ne`, mirrored for `sw` and `nw` (the sprite's mirrors: x flips round the anchor, which
 * is the frame's centre, one pixel over).
 */
function offsetFor(
  se: { readonly dx: number; readonly dy: number },
  ne: { readonly dx: number; readonly dy: number },
  facing: string,
  out: { dx: number; dy: number },
): void {
  const src = facing === 'ne' || facing === 'nw' ? ne : se;
  out.dx = facing === 'sw' || facing === 'nw' ? -src.dx - 1 : src.dx;
  out.dy = src.dy;
}

/** The dish's lens (the laser's source) from the platform's anchor, facing `facing`. */
export function lensOffset(facing: string, out: { dx: number; dy: number }): void {
  offsetFor(LENS_SE, LENS_NE, facing, out);
}

/** The hangar door's centre from the platform's anchor, facing `facing`. */
export function doorOffset(facing: string, out: { dx: number; dy: number }): void {
  offsetFor(DOOR_SE, DOOR_NE, facing, out);
}
