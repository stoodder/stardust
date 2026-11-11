// The Gathering Maw's split and merge (T708's minimal look, polished by T730a; design/enemies.md
// § 6): pure rules, unit-tested, applied by GatheringMawView (and EnemyView's lane for the parts).
// Its phase-1 gather is the Maw's look (gatherLook.ts, HollowView), at the boss's reach.
// - **The parts side by side:** the sim spreads the three parts 0.6 tiles apart along the road;
//   drawn there alone their bodies overlap into one blob, so each walks its own lane across the
//   road (`partLanePx`: −PART_LANE_PX, 0, +PART_LANE_PX by uid), and render spreads them along
//   the road to SPREAD_TO_TILES apart (`gmawSpread`: each part's distance from its split's middle,
//   scaled; as the merge pulls them together the spread closes with it), so three bodies read as
//   three. The drawn spot leads or trails the sim's by at most 0.4 tiles (shots still land on it).
// - **The merged Maw** (phase 3) sorts MERGED_DEPTH_LIFT_PX lower than its feet (`gmawSpread`), so
//   its big body draws over the tower bases on the row in front instead of behind them. Its look
//   is the sprite's `panic`: its hide hue-shifted to the merge's hot violet-pink (gathering_maw.ts).
// - **The tether** (the parts are still one thing): while a split's parts walk apart, a `violet.3`
//   thread (2 px) over an `ink.0` under-stroke runs body to body (as drawn) from each part to the
//   next along the road (nearest first), with a `violet.4` bead at its middle, so three bodies
//   read as one boss. Through the merge's tell (its last 1.5 s, the walk together) it pulls taut:
//   `violet.4`, thicker as the merge comes (`tetherStroke`), with a `white.1` core in its last
//   third, the snap the merge lands on.
// - **The burst** (the split) and **the gulp** (the merge): two `violet.3`/`violet.4` rings over
//   an `ink.0` under-stroke round the unit, the second a step behind, opening out from
//   BURST_FROM_TILES to BURST_TO_TILES over BURST_MS and fading (`burstRing`), and a spray of
//   Hollow motes (TransientFx `unravel`); under reduced motion the rings hold at full size and
//   fade by alpha only, and no motes fly.
import type { ColorName } from '../../content/palettes/master.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { isMergedBoss, isSplitPart, type Enemy } from '../../sim/index.ts';

export const UNDER: ColorName = 'ink.0';
export const TETHER: ColorName = 'violet.3';
export const TETHER_TAUT: ColorName = 'violet.4';
export const TETHER_CORE: ColorName = 'white.1';
export const BURST: ColorName = 'violet.3';
export const BURST_MS = 600;
/** The second ring trails the first by this much of BURST_MS. */
export const BURST_LAG = 0.25;
export const BURST_FROM_TILES = 0.3;
export const BURST_TO_TILES = 1.1;

/** A tether's stroke: width (px), color, and whether it shows its white core. */
export interface TetherStroke {
  readonly px: number;
  readonly color: ColorName;
  readonly core: boolean;
}

const SLACK: TetherStroke = { px: 2, color: TETHER, core: false };
const TAUT: readonly TetherStroke[] = [
  { px: 2, color: TETHER_TAUT, core: false },
  { px: 3, color: TETHER_TAUT, core: false },
  { px: 3, color: TETHER_TAUT, core: true },
];

/** The sim's spacing between a split's parts along the road (bossSplit.ts SPLIT_SPREAD_TILES). */
export const SIM_SPREAD_TILES = 0.6;
/** The spacing render draws them at. */
export const SPREAD_TO_TILES = 1.0;
/** The merged Maw sorts as if its feet were this much lower (px: a tile row). */
export const MERGED_DEPTH_LIFT_PX = 16;

/** A unit as `gmawSpread` reads it. */
type SpreadUnit = Pick<
  DeepReadonly<Enemy>,
  'uid' | 'alive' | 'leaving' | 'splitFrom' | 'splitMaxHp' | 'ownerUid' | 'dist'
>;

/** What `gmawSpread` returns: EnemyView `setSpread`'s two arguments. */
export interface Spread {
  alongTiles: number;
  depthLiftPx: number;
}

const scratch: Spread = { alongTiles: 0, depthLiftPx: 0 };

/**
 * A split part's extra spread along its travel (tiles: its distance from the mean of its split's
 * live parts, × (SPREAD_TO_TILES / SIM_SPREAD_TILES − 1)), and the merged Maw's sort lift; zeros
 * for any other unit. Into `out` (a shared scratch by default); one pass over the pool for a part, none otherwise.
 */
export function gmawSpread(
  e: SpreadUnit,
  enemies: { readonly used: number; readonly items: readonly SpreadUnit[] },
  out: Spread = scratch,
): Spread {
  out.alongTiles = 0;
  out.depthLiftPx = isMergedBoss(e) ? MERGED_DEPTH_LIFT_PX : 0;
  if (!isSplitPart(e) || e.leaving) return out;
  let n = 0;
  let sum = 0;
  for (let i = 0; i < enemies.used; i++) {
    const q = enemies.items[i]!; // i < used ≤ items.length
    if (!isSplitPart(q) || q.leaving || q.ownerUid !== e.ownerUid) continue;
    n++;
    sum += q.dist;
  }
  if (n > 1) out.alongTiles = (e.dist - sum / n) * (SPREAD_TO_TILES / SIM_SPREAD_TILES - 1);
  return out;
}

/** How far apart the parts' lanes are across the road (px). */
export const PART_LANE_PX = 9;

/** A split part's sideways lane (px) by its uid: −PART_LANE_PX, 0, or +PART_LANE_PX. */
export function partLanePx(uid: number): number {
  return ((uid % 3) - 1) * PART_LANE_PX;
}

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
export function bossBarKey(e: {
  readonly uid: number;
  readonly ownerUid: number;
  readonly splitMaxHp: number;
}): number {
  return e.splitMaxHp > 0 ? e.ownerUid : e.uid;
}
