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
// - **The pose** (T730a, `leaperPose`; T740a's `ally.leaper` frames): stretched as it springs off
//   (the first fifth of a leg out) and as it reaches for the bonk (its last 15%), tucked into a
//   ball through the arc, and squashed (`land`) over the last fifth of the boing home. Each pose
//   is a still frame, so reduced motion changes nothing but the arc's own motion.
// - **The pad's head** (T730a, `leapersAway`): how many of a pad's leapers are out of it, so the
//   Sproing Pad's head bounces as one leaves and shows its empty pad while all are away
//   (TowerView `setPad`).
// - **A leaper's Pin** keeps no harpoon rope (T730a): HarpoonView passes by the flyers a leaper
//   grounded (LeaperView `grounded`), so the dizzy stars and ring are its whole look.
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

/** A leaper's pose in the air: springing (stretched), mid-arc (tucked), or landing home. */
export type LeaperPose = 'stretch' | 'tuck' | 'land';

/** The pose at progress `p` (0–1) of a leg `out` (to its target) or back (home). */
export function leaperPose(out: boolean, p: number): LeaperPose {
  if (out) return p < 0.2 || p >= 0.85 ? 'stretch' : 'tuck';
  return p >= 0.8 ? 'land' : 'tuck';
}

/** The `ally.leaper` frame for a pose and facing (`walk_<f>_0` tucked, `_1` stretched, `land`). */
export function leaperFrame(pose: LeaperPose, facing: string): string {
  if (pose === 'land') return `land_${facing}_0`;
  return `walk_${facing}_${pose === 'tuck' ? 0 : 1}`;
}

/** The ally fields `leapersAway` reads (a live sim Ally satisfies it). */
export interface PadAlly {
  readonly alive: boolean;
  readonly mode: string;
  readonly kind: string;
  readonly ownerUid: number;
  readonly swarmState: string;
}

/** How many of pad `padUid`'s live leapers are out of it (leaping out or boinging back). */
export function leapersAway(
  allies: { readonly used: number; readonly items: readonly PadAlly[] },
  padUid: number,
): number {
  let n = 0;
  for (let i = 0; i < allies.used; i++) {
    const a = allies.items[i]!; // i < used ≤ items.length
    if (!a.alive || a.mode !== 'owner' || a.kind !== 'leaper' || a.ownerUid !== padUid) continue;
    if (a.swarmState !== 'home') n++;
  }
  return n;
}
