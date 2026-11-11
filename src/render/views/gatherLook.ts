// The Hollow's Act III looks, as rules (T602's views, polished by T630a; HollowView draws them; T640a
// draws the Maw's growth steps and the Undertow; the rift cracks are RiftView's, riftCrack.ts):
// - **The tendril tell** (art-direction §8's `consumer`: "inward-pulling tendrils for 1 s"): while
//   a Maw holds a unit (`Enemy.gatherUid`), a cold `violet.4` noose over an `ink.0` under-stroke
//   rings the unit, closing from 0.5 to 0.2 tiles as the tell runs (the unit drawn in), and three
//   wavy tendrils run from it to the Maw's body, over the units (a held unit stands close, so they'd
//   hide under the sprites). Along each tendril a `white.1` bead rides from the noose to the Maw
//   as the tell runs (`beadAt`: the tell's progress, so it reads how long is left), and for the
//   last NOOSE_SNAP of the tell the noose flashes `white.1` (`nooseColor`): the gulp is coming.
//   Under reduced motion the tendrils hold still (no waver, no turn); the bead and the snap are
//   the tell's own readout, so they stay.
// - **Growth** (+10% size per absorb): the Maw's body is a sprite per absorb count, `enemy.maw`
//   and `enemy.maw_g1`–`enemy.maw_g5` (T640a; `mawBody` picks it, EnemyView swaps it as `absorbs`
//   changes). The swap is the growth's read; each absorb also pulses a `violet.3` gulp ring out
//   from the Maw (`gulpRing`: GULP_FROM to the size its growth reaches over GULP_MS, fading down
//   the stepped-alpha ladder; held at its size under reduced motion). No standing ring: the
//   grown sprite says it (T630a dropped T602's growth ring).
// - **The tendril pose:** a Maw in its tell (`gatherTelling`) plays its sprite's `tell_<facing>`,
//   the mouth agape and three tendrils out (enemyPose.ts).
// - **The ripple trail** (the Undertow's `burrower` tell underground): `hollow.4` rings left on the
//   ground behind a burrowed Hollow unit every RIPPLE_SPACING tiles of its route (`rippleAt`), each
//   staying where it formed, widening and stepping down the alpha ladder as the unit draws away,
//   so the trail reads as the ground disturbed in its wake rather than marks it carries. It moves
//   only as the unit does (no clock), so reduced motion keeps it.
import type { DeepReadonly } from '../../shared/types.ts';
import { gatherScale, type Enemy } from '../../sim/index.ts';
import { STEPPED_ALPHA } from '../vfx/fxTiming.ts';
import { enemyBody } from './spriteInfo.ts';

/** The growth steps a gatherer's body is drawn in (the Maw's `maxAbsorbs`): one sprite each. */
export const GROWTH_STEPS = 5;

/**
 * The body a gatherer draws now: its own sprite (`body`, the def's) until it has gathered, then
 * `<body>_g<n>` for `absorbs` = n (capped at GROWTH_STEPS). A unit that doesn't gather keeps `body`.
 */
export function mawBody(body: string, e: DeepReadonly<Pick<Enemy, 'def' | 'absorbs'>>): string {
  if ((e.def?.gather ?? null) === null || e.absorbs <= 0) return body;
  return `${body}_g${Math.min(GROWTH_STEPS, Math.floor(e.absorbs))}`;
}

/** How far through its tendril tell a Maw is (0 at the start, 1 as it gathers). */
export function tendrilProgress(
  e: DeepReadonly<Pick<Enemy, 'def' | 'gatherUid' | 'gatherTicks'>>,
): number {
  const g = e.def?.gather ?? null;
  if (g === null || e.gatherUid === 0 || g.tellTicks <= 0) return 0;
  const p = 1 - e.gatherTicks / g.tellTicks;
  return p < 0 ? 0 : p > 1 ? 1 : p;
}

/** The noose's radius (tiles) round the held unit: 0.5 closing to 0.2 as the tell runs. */
export function nooseTiles(progress: number): number {
  return 0.5 - 0.3 * progress;
}

/** The last share of the tell the noose flashes white (the gulp is coming). */
export const NOOSE_SNAP = 0.2;

/** The noose's colour at `progress` through the tell: `violet.4`, then `white.1` for its snap. */
export function nooseColor(progress: number): 'violet.4' | 'white.1' {
  return progress >= 1 - NOOSE_SNAP ? 'white.1' : 'violet.4';
}

/**
 * Where tendril `t`'s bead rides at `progress` through the tell, as a share of the way from the
 * noose (0) to the Maw (1): all three set out together, one a step behind the next (BEAD_LAG),
 * and all reach the Maw as it gathers.
 */
export function beadAt(progress: number, t: number): number {
  const p = progress * (1 + 2 * BEAD_LAG) - t * BEAD_LAG;
  return p < 0 ? 0 : p > 1 ? 1 : p;
}
const BEAD_LAG = 0.12;

/**
 * The size a grown Maw's gulp ring reaches (tiles), by its growth (`gatherScale`), or 0 for a unit
 * that hasn't gathered.
 */
export function growthRingTiles(e: DeepReadonly<Pick<Enemy, 'def' | 'absorbs'>>): number {
  if ((e.def?.gather ?? null) === null || e.absorbs <= 0) return 0;
  return GROWTH_RING_BASE_TILES * gatherScale(e);
}
export const GROWTH_RING_BASE_TILES = 0.6;

/** The gulp ring: it grows from GULP_FROM of its size over GULP_MS, stepping down the alpha ladder. */
export const GULP_MS = 360;
export const GULP_FROM = 0.4;

/**
 * The gulp ring `ms` after an absorb, for a Maw whose growth reaches `tiles`: its radius (tiles)
 * and alpha (0: done). Under reduced motion it holds at its size and only fades.
 */
export function gulpRing(
  ms: number,
  tiles: number,
  reducedMotion: boolean,
): { readonly tiles: number; readonly alpha: number } {
  if (ms < 0 || ms >= GULP_MS || tiles <= 0) return { tiles: 0, alpha: 0 };
  const t = ms / GULP_MS;
  const step = Math.min(STEPPED_ALPHA.length - 1, Math.floor(t * STEPPED_ALPHA.length));
  const grow = reducedMotion ? 1 : GULP_FROM + (1 - GULP_FROM) * Math.min(1, t * 2);
  return { tiles: tiles * grow, alpha: STEPPED_ALPHA[step]! }; // step < length
}

/** Whether a unit draws a ripple trail now: a live burrowed Hollow unit (the Undertow). */
export function showsRipples(
  e: DeepReadonly<Pick<Enemy, 'alive' | 'burrowed' | 'leaving' | 'def'>>,
): boolean {
  return e.alive && e.burrowed && !e.leaving && e.def !== null && e.def.faction === 'hollow';
}

/** A ripple forms every RIPPLE_SPACING tiles of route; RIPPLES of them trail the unit at once. */
export const RIPPLE_SPACING = 0.3;
export const RIPPLES = 3;
/** A ripple's width (px) as it forms and once it's the trail's last; its height is half. */
export const RIPPLE_W_FROM = 6;
export const RIPPLE_W_TO = 14;

/** One ripple of a trail: how far back along the route it lies (tiles), its width (px), its alpha. */
export interface Ripple {
  back: number;
  w: number;
  alpha: number;
}

/**
 * Ripple `k` (0 nearest) of a unit `dist` tiles along its route, into `out`: the ripples lie on
 * the ground at whole multiples of RIPPLE_SPACING along the route (so each stays where it formed as
 * the unit moves on), and each widens and fades with how far behind it has fallen. False when it
 * would lie before the route's start.
 */
export function rippleAt(dist: number, k: number, out: Ripple): boolean {
  const lastMark = Math.floor(dist / RIPPLE_SPACING) * RIPPLE_SPACING;
  const at = lastMark - k * RIPPLE_SPACING;
  if (at < 0) return false;
  const back = dist - at;
  const age = Math.min(1, back / (RIPPLES * RIPPLE_SPACING));
  out.back = back;
  out.w = Math.round(RIPPLE_W_FROM + (RIPPLE_W_TO - RIPPLE_W_FROM) * age);
  const step = Math.min(STEPPED_ALPHA.length - 1, Math.floor(age * (STEPPED_ALPHA.length - 1)));
  out.alpha = STEPPED_ALPHA[step]!; // step < length
  return true;
}

/**
 * The body a unit draws now, for a view that marks it without its EnemyView (the fallback): its
 * def's body as EnemyView picks it (`enemyBody`: a youngling's, a fleeing runner's), grown for a Maw
 * (`mawBody`), so a mark sits over the grown body's head, not the small one's.
 */
export function drawnBody(e: DeepReadonly<Pick<Enemy, 'def' | 'absorbs' | 'tags'>>): string {
  if (e.def === null) return '';
  return mawBody(enemyBody(e.def.sprites.body, e.tags), e);
}
