// The Hollow's Act III looks, as rules (T602's minimal views; HollowView draws them; T630a/T630b
// polish them, T640a/T640c draw the real Maw growth steps, the Undertow, and the rift-crack props):
// - **The tendril tell** (art-direction §8's `consumer`: "inward-pulling tendrils for 1 s"): while
//   a Maw holds a unit (`Enemy.gatherUid`), a cold `violet.4` noose over an `ink.0` under-stroke
//   rings the unit, closing as the tell runs (the unit drawn in), and three wavy tendrils run from it to
//   the Maw's body, over the units (a held unit stands close, so they'd hide under the sprites).
//   Under reduced motion they hold still (no waver, no turn).
// - **Growth** (+10% size per absorb): the Maw's body is a sprite per absorb count, `enemy.maw`
//   and `enemy.maw_g1`–`enemy.maw_g5` (T640a; `mawBody` picks it, EnemyView swaps it as `absorbs`
//   changes), and a `violet.3` ring on the ground under a Maw that has gathered, sized by its scale
//   (`gatherScale`).
// - **The tendril pose:** a Maw in its tell (`gatherTelling`) plays its sprite's `tell_<facing>`,
//   the mouth agape and three tendrils out (enemyPose.ts).
// - **The ripple trail** (the Undertow's `burrower` tell underground): small `hollow.4` ripples at
//   fixed distances behind a burrowed Hollow unit along its route, fading with distance.
// - **Rift cracks** (maps.md § 4): a rift lane's tiles joined by a jagged line: none while closed,
//   a dashed `violet.4` crack pulsing on the 1 Hz clock while opening (the wave before), and a
//   solid `hollow.4` one once open, each over an `ink.0` under-stroke.
import type { DeepReadonly } from '../../shared/types.ts';
import { gatherScale, type Enemy, type RiftStatus } from '../../sim/index.ts';

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

/** The growth ring's radius (tiles) under a Maw, or 0 before it has gathered. */
export function growthRingTiles(e: DeepReadonly<Pick<Enemy, 'def' | 'absorbs'>>): number {
  if ((e.def?.gather ?? null) === null || e.absorbs <= 0) return 0;
  return GROWTH_RING_BASE_TILES * gatherScale(e);
}
export const GROWTH_RING_BASE_TILES = 0.4;

/** Whether a unit draws a ripple trail now: a live burrowed Hollow unit (the Undertow). */
export function showsRipples(
  e: DeepReadonly<Pick<Enemy, 'alive' | 'burrowed' | 'leaving' | 'def'>>,
): boolean {
  return e.alive && e.burrowed && !e.leaving && e.def !== null && e.def.faction === 'hollow';
}

/** The trail's ripples: tiles behind the unit along its route, and each one's alpha. */
export const RIPPLES: readonly { readonly back: number; readonly alpha: number }[] = [
  { back: 0.25, alpha: 0.9 },
  { back: 0.55, alpha: 0.65 },
  { back: 0.85, alpha: 0.4 },
];

/** A rift crack's look by status: drawn or not, dashed, and its alpha (`on`: the 1 Hz pulse). */
export function riftLook(
  status: RiftStatus,
  on: boolean,
): { readonly drawn: boolean; readonly dashed: boolean; readonly alpha: number } {
  if (status === 'closed') return { drawn: false, dashed: false, alpha: 0 };
  if (status === 'opening') return { drawn: true, dashed: true, alpha: on ? 1 : 0.55 };
  return { drawn: true, dashed: false, alpha: 1 };
}
