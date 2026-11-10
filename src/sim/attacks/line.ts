// Line attacks (the Harpoon's Skewer; design/towers.md § 7; T408). The rules as built:
// - **Aim** like a single-target tower (systems/towers.ts): keep the current target while it stays
//   valid, else pick by priority (the spare-runners filter applies to this pick only), and fire
//   when the cooldown allows. Range and damage take the tower's bonuses.
// - **The line** runs from the tower's centre through its target's, `lengthTiles` long (Skewer: 5,
//   past its 4.0 range), scaled by the tower's range bonus as its range is (high ground's +25%
//   makes it 6.25), so it always reaches past the target.
// - **Victims:** every enemy on a layer the tier hits whose centre lies along the line, past the
//   tower (0 < along ≤ length) and within LINE_HALF_WIDTH_TILES of it (rules.ts), in ascending slot
//   order, each taking the full hit (its `vsStatus` bonus checked per victim), then the tier's
//   effects and the link's statuses. A pinned flyer is grounded (enemyAbilities/layers.ts).
// - **Neutral units (D072):** the line passes them by, except its own target: a neutral target
//   plinks (combat/neutral.ts) and the harpoon still skewers the pests behind it.
// - **Spare runners:** the line hits spared (fleeing, youngling) units in its way, as splash does;
//   only the tower's own pick skips them.
// - **Events:** one ProjectileFired (`kind: 'line'`, uid 0, the target; `targetX/Y` is the line's
//   far end, so render draws the whole skewer), then one ProjectileHit at the target with `hits`
//   counting the enemies damaged and `damage` their sum.
// Allocation-free: the victims live in the tick's scratch list.
import type { CompiledAttack, CompiledTier } from '../../content/compiled.ts';
import { LINE_HALF_WIDTH_TILES } from '../../content/rules.ts';
import { bonusPeriodTicks, bonusRangeTiles } from '../bonuses.ts';
import { applyDamage, applyEffects, armorReduces } from '../combat/damage.ts';
import { hitNeutral, isNeutral } from '../combat/neutral.ts';
import { canHit, isStillTarget, pickTarget } from '../combat/targeting.ts';
import type { Enemy, Tower } from '../entities.ts';
import { emit, type SimState } from '../state.ts';
import { applyLinkStatuses } from '../systems/status.ts';
import { damageOn, rangeOf } from '../systems/towers.ts';
import type { TickContext } from '../tick.ts';

export type LineAttack = Extract<CompiledAttack, { kind: 'line' }>;

const HALF_WIDTH_SQ = LINE_HALF_WIDTH_TILES * LINE_HALF_WIDTH_TILES;

/**
 * A line tower's tick: aim, then skewer. Returns whether it fired at a Skitterkin (the "not
 * firing" clock, fireControl.ts).
 */
export function lineAttack(
  state: SimState,
  ctx: TickContext,
  t: Tower,
  tier: CompiledTier,
  attack: LineAttack,
): boolean {
  const enemies = state.enemies;
  const layers = tier.targets;
  const range = rangeOf(ctx, t, attack);
  const spare = t.spareRunners;
  let target: Enemy | null = null;
  if (t.cooldownTicks > 0) {
    target = isStillTarget(enemies, t.targetSlot, t.targetUid, t.x, t.y, layers, range, spare);
  }
  if (target === null) {
    target = pickTarget(enemies, t.x, t.y, layers, range, t.priority ?? 'first', spare);
  }
  if (target === null) {
    t.targetUid = 0;
    t.targetSlot = -1;
    return false;
  }
  t.targetUid = target.uid;
  t.targetSlot = target.slot;
  if (t.cooldownTicks > 0) return false;

  const atSkitterkin = target.def?.faction === 'skitterkin';
  skewer(state, ctx, t, tier, attack, target);
  t.cooldownTicks = bonusPeriodTicks(attack, t);
  if (t.firstFiredTick < 0) t.firstFiredTick = state.tick;
  return atSkitterkin;
}

/**
 * The line's length after the tower's range bonus and the dark (lengthTiles × its range / base
 * range), so an unlit Skewer's line shrinks with its reach (D138).
 */
export function lineLengthTiles(attack: LineAttack, t: Tower): number {
  if (t.flatRange === 0 && t.pctRange === 0 && t.darkRangePct === 0) return attack.lengthTiles;
  return (attack.lengthTiles * bonusRangeTiles(attack, t)) / attack.rangeTiles;
}

/** Fires the line through `target` (see the header). */
function skewer(
  state: SimState,
  ctx: TickContext,
  t: Tower,
  tier: CompiledTier,
  attack: LineAttack,
  target: Enemy,
): void {
  let dx = target.x - t.x;
  let dy = target.y - t.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  // A target exactly on the tower's centre (a flyer overhead) gives no direction: the line then
  // points down the grid's +x axis.
  if (d > 0) {
    dx /= d;
    dy /= d;
  } else {
    dx = 1;
    dy = 0;
  }
  const length = lineLengthTiles(attack, t);
  emit(state, {
    type: 'ProjectileFired',
    uid: 0,
    towerUid: t.uid,
    kind: 'line',
    targetUid: target.uid,
    x: t.x,
    y: t.y,
    targetX: t.x + dx * length,
    targetY: t.y + dy * length,
    sprite: null,
    flightTicks: 0,
    radiusTiles: 0,
  });
  const enemies = state.enemies;
  const victims = ctx.scratch.slots;
  victims.length = 0;
  const targetNeutral = isNeutral(target);
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (!canHit(e, tier.targets) || isNeutral(e)) continue;
    const ex = e.x - t.x;
    const ey = e.y - t.y;
    const along = ex * dx + ey * dy;
    if (along <= 0 || along > length) continue;
    const across = ex * dy - ey * dx;
    if (across * across > HALF_WIDTH_SQ && e !== target) continue;
    victims.push(i);
  }
  const hit = {
    type: 'ProjectileHit' as const,
    uid: 0,
    towerUid: t.uid,
    x: target.x,
    y: target.y,
    hits: victims.length,
    damage: 0,
    reduced: false,
  };
  emit(state, hit);
  if (targetNeutral) hitNeutral(state, target, t.uid);
  const source = ctx.scratch.towerSource;
  source.uid = t.uid;
  for (let k = 0; k < victims.length; k++) {
    const e = enemies.items[victims[k]!]!; // collected slots < used
    if (!hit.reduced && armorReduces(e, attack.type, attack)) hit.reduced = true;
    // Summed into the emitted event as each victim takes its damage (events.ts, ProjectileHit).
    hit.damage += applyDamage(state, e, damageOn(t, attack, e), attack.type, source, attack);
    applyEffects(e, tier.effects);
    applyLinkStatuses(t, e);
  }
  victims.length = 0;
}
