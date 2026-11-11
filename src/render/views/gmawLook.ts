// The Gathering Maw's split and merge, minimal (T708; design/enemies.md § 6; T730a polishes it):
// pure rules, unit-tested, applied by GatheringMawView. Its phase-1 gather is the Maw's look
// (gatherLook.ts, HollowView), at the boss's reach.
// - **The tether** (the parts are still one thing): while a split's parts walk apart, a thin
//   `violet.3` thread over an `ink.0` under-stroke runs from each part to the next along the road
//   (nearest first), so three bodies read as one boss. Through the merge's tell (its last 1.5 s,
//   the walk together) it pulls taut: `violet.4`, thicker as the merge comes (`tetherStroke`), with
//   a `white.1` core in its last third, the snap the merge lands on.
// - **The burst** (the split) and **the gulp** (the merge): a `violet.3` ring over an `ink.0`
//   under-stroke round the unit, opening out from BURST_FROM_TILES to BURST_TO_TILES over
//   BURST_MS and fading (`burstRing`); under reduced motion it holds at its full size and fades
//   by STEPPED alpha only.
import type { ColorName } from '../../content/palettes/master.ts';

export const UNDER: ColorName = 'ink.0';
export const TETHER: ColorName = 'violet.3';
export const TETHER_TAUT: ColorName = 'violet.4';
export const TETHER_CORE: ColorName = 'white.1';
export const BURST: ColorName = 'violet.3';
export const BURST_MS = 450;
export const BURST_FROM_TILES = 0.3;
export const BURST_TO_TILES = 1.1;

/** A tether's stroke: width (px), color, and whether it shows its white core. */
export interface TetherStroke {
  readonly px: number;
  readonly color: ColorName;
  readonly core: boolean;
}

const SLACK: TetherStroke = { px: 1, color: TETHER, core: false };
const TAUT: readonly TetherStroke[] = [
  { px: 1, color: TETHER_TAUT, core: false },
  { px: 2, color: TETHER_TAUT, core: false },
  { px: 2, color: TETHER_TAUT, core: true },
];

/**
 * The tether between a split's parts with `mergeTicks` left of the clock (`tellTicks` its tell):
 * slack until the tell, then taut, thickening in three steps, the core in the last third.
 */
export function tetherStroke(mergeTicks: number, tellTicks: number): TetherStroke {
  if (tellTicks <= 0 || mergeTicks > tellTicks || mergeTicks <= 0) return SLACK;
  const progress = 1 - mergeTicks / tellTicks; // 0 at the tell's start
  const step = Math.min(TAUT.length - 1, Math.floor(progress * TAUT.length));
  return TAUT[step]!; // 0 ≤ step < length
}

/** A burst ring `ms` into its BURST_MS: its radius (tiles) and alpha (0: done). */
export function burstRing(ms: number, still: boolean): { tiles: number; alpha: number } {
  if (ms < 0 || ms >= BURST_MS) return { tiles: BURST_TO_TILES, alpha: 0 };
  const t = ms / BURST_MS;
  if (still) return { tiles: BURST_TO_TILES, alpha: t < 0.5 ? 1 : 0.5 };
  return { tiles: BURST_FROM_TILES + (BURST_TO_TILES - BURST_FROM_TILES) * t, alpha: 1 - t };
}

/**
 * The one boss bar across a split (T708; BossBarView): which fight a unit's bar belongs to (a
 * split-born unit's is the boss it split from, `ownerUid`, so the bar never steps out between the
 * whole Maw, its parts, and the merged Maw), and its maximum (the parts' HP summed, `splitMaxHp`).
 */
export function bossBarKey(e: { readonly uid: number; readonly ownerUid: number; readonly splitMaxHp: number }): number {
  return e.splitMaxHp > 0 ? e.ownerUid : e.uid;
}
