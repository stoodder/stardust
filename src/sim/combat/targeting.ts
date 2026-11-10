// Targeting (design/towers.md §5): who a tower may hit, and which one it picks. Deterministic:
// candidates are scanned in ascending slot order, squared distances only, and every priority
// ends in the documented tie-break (First, then the lowest uid). Allocation-free.
// The spare-runners filter (design/core-loop.md § Spare runners) sits on top of every priority:
// with `spare` on, a unit whose wave group carries a SPARE_TAGS tag (fleeing, youngling) is never
// picked or kept as the target. It's only about picking: splash still lands on them, and so does
// a pulse fired for another unit in range (systems/towers.ts).
import type { CompiledAttack } from '../../content/compiled.ts';
import type { TargetPriority } from '../../content/types.ts';
import type { Enemy } from '../entities.ts';
import { onLayers, untargetable } from '../enemyAbilities/layers.ts';
import { isSpared } from '../fireControl.ts';
import type { Pool } from '../pool.ts';

/** The layers a tier can hit (`CompiledTier.targets`). */
export interface TargetLayers {
  readonly ground: boolean;
  readonly air: boolean;
}

/** The range fields of an attack. */
export type RangeSpec = Pick<CompiledAttack, 'rangeSq' | 'minRangeSq'>;

/** An attack's target filter (Magnet Crane; T408): `CompiledAttack.targetFilter`. */
export type TargetFilter = NonNullable<CompiledAttack['targetFilter']>;

/**
 * Whether `e` (with a def) passes `filter`: one of its bodies, or, with `armored`, any armor
 * (its data's, whatever Corroded has stripped). Null passes everything.
 */
export function passesFilter(e: Enemy, filter: TargetFilter | null): boolean {
  if (filter === null) return true;
  const def = e.def;
  if (def === null) return false;
  return filter.bodies.includes(def.body) || (filter.armored && def.armor > 0);
}

/**
 * Whether a tower that hits `layers` may touch `e` at all: alive, not burrowed or leaving
 * (enemyAbilities/layers.ts), and in a layer it hits (design/enemies.md §2.6: a flyer is air, so a
 * ground-only tower never sees it, unless it's Pinned: grounded, T408). A neutral unit (Gerald) is
 * targeted like any enemy; what a hit on it does is combat/neutral.ts's.
 */
export function canHit(e: Enemy, layers: TargetLayers): boolean {
  if (!e.alive || e.def === null || untargetable(e)) return false;
  return onLayers(e, layers.ground, layers.air);
}

/**
 * The range rule: `minRange < distance ≤ range` (minimum exclusive), on squared distances. A
 * tower with no minimum range (0) hits at distance 0 too: a flyer passing over its center.
 */
export function isInRange(d2: number, range: RangeSpec): boolean {
  return d2 <= range.rangeSq && (d2 > range.minRangeSq || range.minRangeSq === 0);
}

/** Squared distance from (x, y) to an enemy, in tiles². */
export function distSqTo(x: number, y: number, e: Enemy): number {
  const dx = e.x - x;
  const dy = e.y - y;
  return dx * dx + dy * dy;
}

/** Route distance left to the core ("First" ranks by it). */
function remaining(e: Enemy): number {
  return e.route === null ? 0 : e.route.lengthTiles - e.dist;
}

/**
 * The best target from (x, y) under `priority`, or null. Priorities (towers.md §5): First (least
 * route distance left), Last (most left), Strong (highest HP + shield), Close (nearest). Ties:
 * First, then the lowest uid. With `spare` (the spare-runners filter), spared units are skipped,
 * and so are the enemy slots in `exclude` (a volley's targets so far; T407b) and the units an
 * attack's `filter` doesn't pass (Magnet Crane; T408).
 */
export function pickTarget(
  enemies: Pool<Enemy>,
  x: number,
  y: number,
  layers: TargetLayers,
  range: RangeSpec,
  priority: TargetPriority,
  spare = false,
  exclude: readonly number[] | null = null,
  filter: TargetFilter | null = null,
): Enemy | null {
  let best: Enemy | null = null;
  let bRem = 0;
  let bStrength = 0;
  let bD2 = 0;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (!canHit(e, layers)) continue;
    if (spare && isSpared(e.tags)) continue;
    if (exclude !== null && exclude.includes(i)) continue;
    if (!passesFilter(e, filter)) continue;
    const d2 = distSqTo(x, y, e);
    if (!isInRange(d2, range)) continue;
    const rem = remaining(e);
    const strength = e.hp + e.shieldHp;
    if (
      best === null ||
      isBetter(priority, rem, strength, d2, e.uid, bRem, bStrength, bD2, best.uid)
    ) {
      best = e;
      bRem = rem;
      bStrength = strength;
      bD2 = d2;
    }
  }
  return best;
}

/** Whether candidate (rem, strength, d2, uid) beats the best so far under `priority`. */
function isBetter(
  priority: TargetPriority,
  rem: number,
  strength: number,
  d2: number,
  uid: number,
  bRem: number,
  bStrength: number,
  bD2: number,
  bUid: number,
): boolean {
  switch (priority) {
    case 'first':
      break;
    case 'last':
      if (rem !== bRem) return rem > bRem;
      break;
    case 'strong':
      if (strength !== bStrength) return strength > bStrength;
      break;
    case 'close':
      if (d2 !== bD2) return d2 < bD2;
      break;
  }
  if (rem !== bRem) return rem < bRem;
  return uid < bUid;
}

/**
 * Whether the enemy in `slot` is still the live, hittable, in-range enemy `uid` (a tower's current
 * target), so a cooling tower can keep it without a full scan. With `spare`, a spared unit isn't
 * kept (the filter was turned on while the tower was cooling); nor is one `filter` doesn't pass.
 */
export function isStillTarget(
  enemies: Pool<Enemy>,
  slot: number,
  uid: number,
  x: number,
  y: number,
  layers: TargetLayers,
  range: RangeSpec,
  spare = false,
  filter: TargetFilter | null = null,
): Enemy | null {
  if (uid === 0 || slot < 0 || slot >= enemies.used) return null;
  const e = enemies.items[slot]!; // 0 ≤ slot < used ≤ items.length
  if (e.uid !== uid || !canHit(e, layers)) return null;
  if (spare && isSpared(e.tags)) return null;
  if (!passesFilter(e, filter)) return null;
  return isInRange(distSqTo(x, y, e), range) ? e : null;
}
