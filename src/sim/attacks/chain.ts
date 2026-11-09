// Chain attacks (Zapcoil; design/towers.md § 7; T304b). The rules as built:
// - **Aim** like a single-target tower (systems/towers.ts): keep the current target while it stays
//   valid, else pick by priority (the spare-runners filter applies to this pick only), and fire
//   when the cooldown allows. Range and damage take the tower's bonuses; jump range doesn't.
// - **Jumps:** after the first hit the arc jumps up to `jumps + t.bonusJumps` times (Zapcoil T1
//   "chains to 3" is `jumps: 2`; Conductive adds 2). Each jump goes from the last enemy struck (its
//   position when struck) to the **nearest** enemy not yet struck by this shot whose center is
//   within `jumpRangeTiles` (squared distance ≤ `jumpRangeSq`), on a layer the tier hits.
//   **Tie-break:** equal squared distances go to the lowest uid; candidates are scanned in slot
//   order. The chain stops early when no enemy is in jump range.
// - **Falloff compounds:** the k-th enemy struck (k = 0 for the first) takes `damage × (1 −
//   falloffPct)^k`, so 10 / 8 / 6.4 at −20%, and long Conductive chains never reach 0.
// - **Each hit** goes through applyDamage with the tower's damage (its `vsStatus` bonus checked
//   per victim), then the tier's effects and the link's statuses (Conductive's Soak).
// - **Neutral units (D072):** a neutral *first* target plinks (combat/neutral.ts `hitNeutral`: no
//   damage, `NeutralHit`, `stats.neutralHits`) and the arc still jumps on from it, as a flak burst
//   fired at Gerald still hits the pests beside him; jumps never pick a neutral unit.
// - **Spare runners:** jumps land on spared (fleeing, youngling) units like splash does; only the
//   tower's own pick skips them (combat/targeting.ts).
// - **Events:** one ProjectileFired (`kind: 'chain'`, uid 0, the first target), then one
//   ProjectileHit per enemy struck, in chain order, at that enemy's position (`hits` 1, or 0 for a
//   neutral first target), so render draws the arc tower → first → each jump (T312a).
// Allocation-free: the struck uids live in the tick's scratch list.
import type { CompiledAttack, CompiledTier } from '../../content/compiled.ts';
import { applyDamage, applyEffects, armorReduces } from '../combat/damage.ts';
import { hitNeutral, isNeutral } from '../combat/neutral.ts';
import { canHit, isStillTarget, pickTarget } from '../combat/targeting.ts';
import { bonusPeriodTicks } from '../bonuses.ts';
import type { Enemy, Tower } from '../entities.ts';
import { emit, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { applyLinkStatuses } from '../systems/status.ts';
import { damageOn, rangeOf } from '../systems/towers.ts';

export type ChainAttack = Extract<CompiledAttack, { kind: 'chain' }>;

/**
 * A chain tower's tick: aim, fire, and jump. Returns whether it fired at a Skitterkin (the "not
 * firing" clock, fireControl.ts).
 */
export function chainAttack(
  state: SimState,
  ctx: TickContext,
  t: Tower,
  tier: CompiledTier,
  attack: ChainAttack,
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
  fireChain(state, ctx, t, tier, attack, target);
  t.cooldownTicks = bonusPeriodTicks(attack, t);
  if (t.firstFiredTick < 0) t.firstFiredTick = state.tick;
  return atSkitterkin;
}

/** Strikes `first`, then jumps (see the header). */
function fireChain(
  state: SimState,
  ctx: TickContext,
  t: Tower,
  tier: CompiledTier,
  attack: ChainAttack,
  first: Enemy,
): void {
  emit(state, {
    type: 'ProjectileFired',
    uid: 0,
    towerUid: t.uid,
    kind: 'chain',
    targetUid: first.uid,
    x: t.x,
    y: t.y,
    targetX: first.x,
    targetY: first.y,
    sprite: null,
    flightTicks: 0,
    radiusTiles: 0,
  });
  const struck = ctx.scratch.slots; // uids struck by this shot
  struck.length = 0;
  const source = ctx.scratch.towerSource;
  source.uid = t.uid;
  const keep = 1 - attack.falloffPct;
  const jumps = attack.jumps + t.bonusJumps;
  let factor = 1;
  let e: Enemy | null = first;
  for (let k = 0; e !== null; k++) {
    // Where the arc jumps from: read before the hit, which may kill it and free its slot.
    const fromX = e.x;
    const fromY = e.y;
    struck.push(e.uid);
    strike(state, t, tier, attack, e, factor, source);
    if (k >= jumps) break;
    factor *= keep;
    e = nextJump(state, tier, attack, fromX, fromY, struck);
  }
  struck.length = 0;
}

/** One enemy struck by the arc at `factor` of the tower's damage: its ProjectileHit and hit. */
function strike(
  state: SimState,
  t: Tower,
  tier: CompiledTier,
  attack: ChainAttack,
  e: Enemy,
  factor: number,
  source: TickContext['scratch']['towerSource'],
): void {
  const neutral = isNeutral(e);
  const hit = {
    type: 'ProjectileHit' as const,
    uid: 0,
    towerUid: t.uid,
    x: e.x,
    y: e.y,
    hits: neutral ? 0 : 1,
    damage: 0,
    reduced: !neutral && armorReduces(e, attack.type, attack),
  };
  emit(state, hit);
  if (neutral) {
    hitNeutral(state, e, t.uid);
    return;
  }
  // Filled in after the damage lands (events.ts, ProjectileHit).
  hit.damage = applyDamage(state, e, damageOn(t, attack, e) * factor, attack.type, source, attack);
  applyEffects(e, tier.effects);
  applyLinkStatuses(t, e);
}

/**
 * The nearest live, hittable, non-neutral enemy not in `struck` within jump range of (x, y);
 * ties to the lowest uid. Null when there's none.
 */
function nextJump(
  state: SimState,
  tier: CompiledTier,
  attack: ChainAttack,
  x: number,
  y: number,
  struck: readonly number[],
): Enemy | null {
  const enemies = state.enemies;
  let best: Enemy | null = null;
  let bestD2 = 0;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (!canHit(e, tier.targets) || isNeutral(e) || struck.includes(e.uid)) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 > attack.jumpRangeSq) continue;
    if (best === null || d2 < bestD2 || (d2 === bestD2 && e.uid < best.uid)) {
      best = e;
      bestD2 = d2;
    }
  }
  return best;
}
