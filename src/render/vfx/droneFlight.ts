// The salvage drone's flight (design/maps.md § 3, the clearing rules; D076): pure, on sim ticks, so
// it holds still while paused and is unit-tested; views/DroneView.ts draws it. The sim counts one
// clear time per tile (6 s, flight included; Salvage Expert halves it): the drone spends the first
// DRONE_FLY_FRAC of it flying in (from home, or from the tile it just cleared when the queue runs
// on) and the rest working over the tile; once the queue is empty it flies home in
// DRONE_RETURN_TICKS and parks out of sight.
import type { Vec2 } from '../iso.ts';

/** The share of a tile's clear time spent flying to it; the rest is work. */
export const DRONE_FLY_FRAC = 0.25;
/** The flight home after the last tile, in sim ticks (1.5 s). */
export const DRONE_RETURN_TICKS = 90;

/** What the drone is doing: flying (in or home), working over a tile, or parked (hidden). */
export type DronePhase = 'fly' | 'work' | 'parked';

/** Smoothstep: eases in and out, so the drone lifts off and settles rather than snapping. */
function ease(t: number): number {
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  return k * k * (3 - 2 * k);
}

/**
 * The drone's spot on its way to the tile it's clearing: `progress` of `total` ticks into the
 * tile's clear time, flying from `from` to `to` (grid points). Writes the point into `out`.
 */
export function droneOutbound(
  from: Vec2,
  to: Vec2,
  progress: number,
  total: number,
  out: Vec2,
): DronePhase {
  const fly = Math.max(1, total * DRONE_FLY_FRAC);
  const t = ease(progress / fly);
  out.x = from.x + (to.x - from.x) * t;
  out.y = from.y + (to.y - from.y) * t;
  return progress < fly ? 'fly' : 'work';
}

/**
 * The drone's spot on its way home: `ticks` since the queue emptied, from the last tile `from` to
 * `home`. Parked once it's there.
 */
export function droneHomebound(from: Vec2, home: Vec2, ticks: number, out: Vec2): DronePhase {
  const t = ease(ticks / DRONE_RETURN_TICKS);
  out.x = from.x + (home.x - from.x) * t;
  out.y = from.y + (home.y - from.y) * t;
  return ticks >= DRONE_RETURN_TICKS ? 'parked' : 'fly';
}
