// Charge attacks (Capacitor Bank, the Zapcoil's spec B; design/towers.md § 7; T407b). The rules as
// built:
// - **Aim:** a charging bank keeps its target while that target stays hittable and in range,
//   whatever its priority says (as a beam would: the charge is aimed). With no target it picks one
//   by priority (Strong by default; the spare-runners filter applies to the pick).
// - **Charge:** `t.chargeTicks` grows by one on every tick the bank holds a target, the tick it
//   picks one included. When it reaches the charge time it discharges and starts again from 0, so
//   a bank that holds one target discharges every `chargeTicks` ticks (4 s). Rate bonuses (a power
//   node, Overclock) shorten the charge as they shorten any period (`bonusChargeTicks`); the
//   attack's own `ratePerSec` only restates the cycle. Its `cooldownTicks` is never used.
// - **Discharge:** `damage` (the tower's bonuses, its `vsStatus` bonus per victim) into the target,
//   and `splashPct` of each splash victim's own damage to every other enemy whose center is within
//   `splashTiles` of the target, on the tier's layers, in slot order; burrowed, leaving, and
//   cloaked-out units are never victims. Every victim takes the tier's effects and the link's
//   statuses (Conductive's Soak). A neutral target plinks (combat/neutral.ts) and the splash still
//   lands round it; the splash passes neutral units by.
// - **What interrupts a charge.** Losing the target in a way that isn't its own doing keeps the
//   work: when the target dies, leaks, or is dropped by the spare-runners filter, the bank swings
//   to a new target in range by priority and keeps its charge. The charge **fizzles** (back to 0)
//   when the target escapes on its own (it burrows, slips into its cloak, leaves the map's fight,
//   or moves out of range) and when the bank loses its target with nothing else in range. Hold
//   Fire vents it too (systems/towers.ts). A fizzle emits nothing: render reads `chargeTicks`.
// - **Events:** a discharge emits one ProjectileFired (`kind: 'charge'`, uid 0, the target,
//   `radiusTiles` the splash), then one ProjectileHit at the target (uid 0) counting every victim
//   and the damage they took.
// Allocation-free: the splash victims live in the tick's scratch list.
import type { CompiledAttack, CompiledTier } from '../../content/compiled.ts';
import { stackedStat } from '../../content/rules.ts';
import { TICK_HZ, ratePerSecToPeriodTicks } from '../../shared/time.ts';
import { applyDamage, applyEffects, armorReduces } from '../combat/damage.ts';
import { hitNeutral, isNeutral } from '../combat/neutral.ts';
import { canHit, distSqTo, isInRange, pickTarget } from '../combat/targeting.ts';
import type { Enemy, Tower } from '../entities.ts';
import { isSpared } from '../fireControl.ts';
import { emit, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { applyLinkStatuses } from '../systems/status.ts';
import { damageOn, rangeOf } from '../systems/towers.ts';

export type ChargeAttack = Extract<CompiledAttack, { kind: 'charge' }>;

/**
 * The ticks a full charge takes under the tower's rate bonuses: the charge as a period, sped up
 * by the stacking formula and rounded back to whole ticks (sim/bonuses.ts bonusPeriodTicks' rule).
 * With no rate bonus it's the attack's `chargeTicks` exactly.
 */
export function bonusChargeTicks(
  attack: ChargeAttack,
  t: Pick<Tower, 'flatRate' | 'pctRate'>,
): number {
  if (t.flatRate === 0 && t.pctRate === 0) return attack.chargeTicks;
  const rate = stackedStat('rate', TICK_HZ / attack.chargeTicks, t.flatRate, t.pctRate);
  return rate > 0 ? ratePerSecToPeriodTicks(rate) : attack.chargeTicks;
}

/**
 * A charge tower's tick: keep or swing its target, build the charge, and discharge when it's
 * full. Returns whether it discharged into a Skitterkin (the "not firing" clock, fireControl.ts).
 */
export function chargeAttack(
  state: SimState,
  ctx: TickContext,
  t: Tower,
  tier: CompiledTier,
  attack: ChargeAttack,
): boolean {
  const enemies = state.enemies;
  const layers = tier.targets;
  const range = rangeOf(ctx, t, attack);
  const spare = t.spareRunners;
  let target: Enemy | null = null;
  if (t.targetUid !== 0 && t.targetSlot >= 0 && t.targetSlot < enemies.used) {
    const e = enemies.items[t.targetSlot]!; // 0 ≤ slot < used ≤ items.length
    if (e.uid === t.targetUid && e.alive) {
      if (!canHit(e, layers) || !isInRange(distSqTo(t.x, t.y, e), range)) {
        t.chargeTicks = 0; // it escaped: burrowed, cloaked, leaving, or out of range
      } else if (!(spare && isSpared(e.tags))) {
        target = e;
      }
    }
  }
  if (target === null) {
    target = pickTarget(enemies, t.x, t.y, layers, range, t.priority ?? 'strong', spare);
  }
  if (target === null) {
    t.chargeTicks = 0; // nothing to hold: the charge fizzles
    t.targetUid = 0;
    t.targetSlot = -1;
    return false;
  }
  t.targetUid = target.uid;
  t.targetSlot = target.slot;
  t.chargeTicks++;
  if (t.chargeTicks < bonusChargeTicks(attack, t)) return false;
  t.chargeTicks = 0;
  const atSkitterkin = target.def?.faction === 'skitterkin';
  discharge(state, ctx, t, tier, attack, target);
  if (t.firstFiredTick < 0) t.firstFiredTick = state.tick;
  return atSkitterkin;
}

/** The discharge into `target` and its splash (see the header). */
function discharge(
  state: SimState,
  ctx: TickContext,
  t: Tower,
  tier: CompiledTier,
  attack: ChargeAttack,
  target: Enemy,
): void {
  const enemies = state.enemies;
  const layers = tier.targets;
  const tx = target.x;
  const ty = target.y;
  emit(state, {
    type: 'ProjectileFired',
    uid: 0,
    towerUid: t.uid,
    kind: 'charge',
    targetUid: target.uid,
    x: t.x,
    y: t.y,
    targetX: tx,
    targetY: ty,
    sprite: null,
    flightTicks: 0,
    radiusTiles: attack.splashTiles,
  });
  // Every victim is chosen before any damage lands, so a kill can't change who is in the blast.
  const splash = ctx.scratch.slots;
  splash.length = 0;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (e === target || !canHit(e, layers) || isNeutral(e)) continue;
    const dx = e.x - tx;
    const dy = e.y - ty;
    if (dx * dx + dy * dy <= attack.splashSq) splash.push(i);
  }
  const neutral = isNeutral(target);
  const hit = {
    type: 'ProjectileHit' as const,
    uid: 0,
    towerUid: t.uid,
    x: tx,
    y: ty,
    hits: splash.length + (neutral ? 0 : 1),
    damage: 0,
    reduced: false,
  };
  emit(state, hit);
  const source = ctx.scratch.towerSource;
  source.uid = t.uid;
  if (!neutral) {
    hit.reduced = armorReduces(target, attack.type, attack);
    // Summed into the emitted event as each victim takes its damage (events.ts, ProjectileHit).
    hit.damage += applyDamage(
      state,
      target,
      damageOn(t, attack, target),
      attack.type,
      source,
      attack,
    );
    applyEffects(target, tier.effects);
    applyLinkStatuses(t, target);
  }
  for (let k = 0; k < splash.length; k++) {
    const e = enemies.items[splash[k]!]!; // collected slots < used
    if (!hit.reduced && armorReduces(e, attack.type, attack)) hit.reduced = true;
    const amount = damageOn(t, attack, e) * attack.splashPct;
    hit.damage += applyDamage(state, e, amount, attack.type, source, attack);
    applyEffects(e, tier.effects);
    applyLinkStatuses(t, e);
  }
  splash.length = 0;
  if (neutral) hitNeutral(state, target, t.uid);
}
