// The Sproing Pad's look, minimal (T704; LeaperView draws it, T730a polishes it): pure rules, so
// they unit-test without Phaser.
// - **The boing.** A leaper in the air rides an arc between where its leg began (the pad, or where
//   it bonked) and where it's headed (its target, or the pad): its height over the ground is a
//   parabola peaking LEAP_ARC_PX at mid-leg, on top of a straight blend from the start's body lift
//   to the end's (a flyer's body sits AIR_LIFT_PX up, so a bonk on a flyer lands up there). The
//   leg's progress is how far it has come over how far it has come plus how far is left, so a leg
//   that re-aims at a moving target stays smooth.
// - **The bonk.** A small `orange.4` ring pops on the target (TransientFx), so each bonk reads.
// - **A grounded flyer** (Pinned by a leaper: `FlyerGrounded`): an `orange.3` ring on the ground
//   under it and three `gold.4` dizzy stars (3 px) circling over its head, above its health bar,
//   while the Pin holds. The stars turn once every STAR_PERIOD_MS (held still under reduced
//   motion).
import type { ColorName } from '../../content/palettes/master.ts';

/** The arc's peak over the straight line (px). */
export const LEAP_ARC_PX = 18;
/** The bonk's pop: its ring colour, reach (tiles) and life (ms). */
export const BONK_COLOR: ColorName = 'orange.4';
export const BONK_RADIUS_TILES = 0.35;
export const BONK_MS = 220;
/** A grounded flyer's marks: its ground ring, its stars, and the stars' turn. */
export const GROUND_RING_COLOR: ColorName = 'orange.3';
export const STAR_COLOR: ColorName = 'gold.4';
export const STARS = 3;
export const STAR_PERIOD_MS = 900;
/** The ground ring's half-width and half-height (px; an iso ellipse), and the stars' orbit. */
export const GROUND_RING_RX = 7;
export const GROUND_RING_RY = 3.5;
export const STAR_ORBIT_RX = 6;
export const STAR_ORBIT_RY = 2.5;

/** A leg's progress (0–1): `done` tiles come over `done` + `left`. A leg with no length is done. */
export function legProgress(done: number, left: number): number {
  const total = done + left;
  if (total <= 0) return 1;
  const p = done / total;
  return p < 0 ? 0 : p > 1 ? 1 : p;
}

/** The leaper's height over its ground point (px) at progress `p` from `fromLift` to `toLift`. */
export function leapLiftPx(p: number, fromLift: number, toLift: number): number {
  return fromLift + (toLift - fromLift) * p + LEAP_ARC_PX * 4 * p * (1 - p);
}

/** Star `k`'s offset (px) round the orbit at `ms` (frozen at its start under reduced motion). */
export function starOffset(
  k: number,
  ms: number,
  still: boolean,
  out: { dx: number; dy: number },
): void {
  const turn = still ? 0 : (ms % STAR_PERIOD_MS) / STAR_PERIOD_MS;
  const a = (turn + k / STARS) * Math.PI * 2;
  out.dx = Math.round(Math.cos(a) * STAR_ORBIT_RX);
  out.dy = Math.round(Math.sin(a) * STAR_ORBIT_RY);
}
