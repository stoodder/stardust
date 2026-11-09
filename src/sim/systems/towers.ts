// System 7: towers. Targeting, cooldowns, and firing (design/towers.md §5), in ascending slot
// order. M1 delivers three attack kinds:
// - hitscan (Rivet): damage lands the tick it fires.
// - lobbed (Thumper): a shell aimed with lead targeting at the target's predicted route position
//   after the flight time, fixed when it fires; the projectiles system lands it as splash.
// - pulse (Sprinkler): every period, hits every enemy in range; no target, no priority. It waits
//   (cooldown 0) until an enemy is in range, so its first pulse always affects one.
// Cooldowns: a tower fires on a tick whose cooldown starts at 0, then waits `cooldownTicks`.
// A tower picks a fresh target when it's ready to fire, and otherwise keeps its current one while
// it stays valid (performance rule 6), so `targetUid` (render aims with it) is always current.
// Stats: damage, rate, and range go through the stacking formula with the tower's bonuses
// (sim/bonuses.ts; the links system sums them), and a link's conditional `vsStatus` bonus is
// checked per victim: on the hit for hitscan and pulses, on impact for shells.
// Fire control (design/core-loop.md § 2.7; sim/fireControl.ts):
// - A tower holding fire (`holdFire`) doesn't attack: it drops its target and its cooldown keeps
//   counting down, so it can fire the tick it's released. Its links and bonuses are untouched.
//   `stats.holdFireTicks` counts ticks with any live tower holding.
// - With the spare-runners filter (`spareRunners`), a single-target tower never picks or keeps a
//   `fleeing` or `youngling` unit (combat/targeting.ts), and a pulse only goes off when an unspared
//   unit is in range (a pulse picks no target, so it waits like a tower with none). Splash, and a
//   pulse fired for another unit, still land on spared units.
// - "Not firing": after the towers act, `trackNotFiring` resets or advances
//   `stats.ticksSinceFiredAtSkitterkin` (a shot fired at a Skitterkin target, or a pulse that hits
//   one, resets it).
import type { CompiledAttack, CompiledTier } from '../../content/compiled.ts';
import { assertNever } from '../../shared/types.ts';
import {
  bonusDamage,
  bonusDamageVs,
  bonusPeriodTicks,
  bonusRangeTiles,
  hasStatusIn,
} from '../bonuses.ts';
import { applyDamage, applyEffects } from '../combat/damage.ts';
import {
  canHit,
  distSqTo,
  isInRange,
  isStillTarget,
  pickTarget,
  type RangeSpec,
} from '../combat/targeting.ts';
import { PROJECTILE_BLANK, type Enemy, type Tower } from '../entities.ts';
import { isSpared, trackNotFiring } from '../fireControl.ts';
import { pointAt } from '../path.ts';
import { poolAlloc } from '../pool.ts';
import { emit, takeUid, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { enemySpeedPerTick } from './movement.ts';

export function towers(state: SimState, ctx: TickContext): void {
  const pool = state.towers;
  let holding = false;
  let firedAtSkitterkin = false;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (!t.alive || t.tierDef === null) continue;
    if (t.holdFire) holding = true;
    const tier = t.tierDef;
    const attack = tier.attack;
    if (attack === null) continue;
    if (t.cooldownTicks > 0) t.cooldownTicks--;
    if (t.holdFire) {
      t.targetUid = 0;
      t.targetSlot = -1;
      continue;
    }
    switch (attack.kind) {
      case 'hitscan':
      case 'lobbed':
        if (aimAndFire(state, ctx, t, tier, attack)) firedAtSkitterkin = true;
        break;
      case 'pulse':
        if (pulse(state, ctx, t, tier, attack)) firedAtSkitterkin = true;
        break;
      // TODO(T2xx): straight projectiles, beams, chains, and spawners arrive with their towers
      // (no M1 tower uses them).
      case 'projectile':
      case 'beam':
      case 'chain':
      case 'spawner':
        break;
      default:
        assertNever(attack);
    }
  }
  if (holding) state.stats.holdFireTicks++;
  trackNotFiring(state, ctx, firedAtSkitterkin, skitterkinInRange);
}

/**
 * Whether any live Skitterkin enemy is in range of any live attacking tower (holding or not) on a
 * layer it hits: the "not firing" clock only runs then. Stops at the first one found.
 */
function skitterkinInRange(state: SimState, ctx: TickContext): boolean {
  const enemies = state.enemies;
  const pool = state.towers;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (!e.alive || e.def === null || e.def.faction !== 'skitterkin') continue;
    for (let j = 0; j < pool.used; j++) {
      const t = pool.items[j]!; // j < used ≤ items.length
      const attack = t.tierDef?.attack ?? null;
      if (!t.alive || attack === null) continue;
      if (
        canHit(e, t.tierDef!.targets) &&
        isInRange(distSqTo(t.x, t.y, e), rangeOf(ctx, t, attack))
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Single-target towers: keep or pick a target (the spare-runners filter skips spared units), spin
 * up, and fire when the cooldown allows. Returns whether it fired at a Skitterkin.
 */
function aimAndFire(
  state: SimState,
  ctx: TickContext,
  t: Tower,
  tier: CompiledTier,
  attack: Extract<CompiledAttack, { kind: 'hitscan' | 'lobbed' }>,
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
  // Spin-up (Rivet Storm) counts from acquiring a target after having none; retargeting
  // between live targets keeps the barrels spinning.
  if (t.targetUid === 0) t.spinTicks = attack.spinUpTicks;
  t.targetUid = target.uid;
  t.targetSlot = target.slot;
  if (t.spinTicks > 0) {
    t.spinTicks--;
    return false;
  }
  if (t.cooldownTicks > 0) return false;

  // Read before firing: a hitscan kill frees the target's slot.
  const atSkitterkin = target.def?.faction === 'skitterkin';
  if (attack.kind === 'hitscan') fireHitscan(state, ctx, t, tier, attack, target);
  else fireShell(state, ctx, t, tier, attack, target);
  t.cooldownTicks = bonusPeriodTicks(attack, t);
  if (t.firstFiredTick < 0) t.firstFiredTick = state.tick;
  return atSkitterkin;
}

function fireHitscan(
  state: SimState,
  ctx: TickContext,
  t: Tower,
  tier: CompiledTier,
  attack: Extract<CompiledAttack, { kind: 'hitscan' }>,
  target: Enemy,
): void {
  emit(state, {
    type: 'ProjectileFired',
    uid: 0,
    towerUid: t.uid,
    kind: 'hitscan',
    targetUid: target.uid,
    x: t.x,
    y: t.y,
    targetX: target.x,
    targetY: target.y,
    sprite: null,
    flightTicks: 0,
    radiusTiles: 0,
  });
  emit(state, {
    type: 'ProjectileHit',
    uid: 0,
    towerUid: t.uid,
    x: target.x,
    y: target.y,
    hits: 1,
  });
  const source = ctx.scratch.towerSource;
  source.uid = t.uid;
  applyDamage(state, target, damageOn(t, attack, target), attack.type, source, attack);
  applyEffects(target, tier.effects);
}

/**
 * Lobs a shell. With `lead`, it aims where the target will be after the flight time at its
 * current speed (Chilled and youngling included): `pointAt(route, dist + speed × flightTicks)`. Movement runs
 * before towers, and the shell lands on the tick its countdown starts at 0 (after that tick's
 * movement), so a target that keeps its speed is exactly at the aim point on impact.
 */
function fireShell(
  state: SimState,
  ctx: TickContext,
  t: Tower,
  tier: CompiledTier,
  attack: Extract<CompiledAttack, { kind: 'lobbed' }>,
  target: Enemy,
): void {
  let ax = target.x;
  let ay = target.y;
  if (attack.lead && target.route !== null && target.def !== null) {
    const speed = enemySpeedPerTick(target);
    const aim = ctx.scratch.point;
    pointAt(target.route, target.dist + speed * attack.flightTicks, aim, target.seg);
    ax = aim.x;
    ay = aim.y;
  }
  const p = poolAlloc(state.projectiles, PROJECTILE_BLANK, takeUid(state));
  p.towerUid = t.uid;
  p.targetUid = target.uid;
  p.originX = t.x;
  p.originY = t.y;
  p.x = t.x;
  p.y = t.y;
  p.targetX = ax;
  p.targetY = ay;
  p.flightTicks = attack.flightTicks;
  p.ticksLeft = attack.flightTicks;
  p.damage = bonusDamage(attack, t);
  p.damageVs = t.vsStatusMask === 0 ? p.damage : bonusDamageVs(attack, t);
  p.vsStatusMask = t.vsStatusMask;
  p.damageType = attack.type;
  p.armorPierce = attack.armorPierce;
  p.ignoresArmor = attack.ignoresArmor;
  p.splashSq = attack.splashSq;
  p.hitsGround = tier.targets.ground;
  p.hitsAir = tier.targets.air;
  p.effects = tier.effects;
  emit(state, {
    type: 'ProjectileFired',
    uid: p.uid,
    towerUid: t.uid,
    kind: 'lobbed',
    targetUid: target.uid,
    x: t.x,
    y: t.y,
    targetX: ax,
    targetY: ay,
    sprite: attack.projectile,
    flightTicks: attack.flightTicks,
    radiusTiles: attack.splashTiles,
  });
}

/**
 * A pulse: when ready and anything is in range, hits every enemy in range, in slot order. With the
 * spare-runners filter it waits until an unspared unit is in range. Returns whether it hit a
 * Skitterkin.
 */
function pulse(
  state: SimState,
  ctx: TickContext,
  t: Tower,
  tier: CompiledTier,
  attack: Extract<CompiledAttack, { kind: 'pulse' }>,
): boolean {
  if (t.cooldownTicks > 0) return false;
  const enemies = state.enemies;
  const layers = tier.targets;
  const range = rangeOf(ctx, t, attack);
  const victims = ctx.scratch.slots;
  victims.length = 0;
  let unspared = !t.spareRunners;
  let skitterkin = false;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (canHit(e, layers) && isInRange(distSqTo(t.x, t.y, e), range)) {
      victims.push(i);
      if (!unspared && !isSpared(e.tags)) unspared = true;
      if (e.def!.faction === 'skitterkin') skitterkin = true; // canHit checked def
    }
  }
  if (victims.length === 0 || !unspared) {
    victims.length = 0;
    return false;
  }

  emit(state, {
    type: 'ProjectileFired',
    uid: 0,
    towerUid: t.uid,
    kind: 'pulse',
    targetUid: 0,
    x: t.x,
    y: t.y,
    targetX: t.x,
    targetY: t.y,
    sprite: null,
    flightTicks: 0,
    radiusTiles: bonusRangeTiles(attack, t),
  });
  emit(state, {
    type: 'ProjectileHit',
    uid: 0,
    towerUid: t.uid,
    x: t.x,
    y: t.y,
    hits: victims.length,
  });
  const source = ctx.scratch.towerSource;
  source.uid = t.uid;
  for (let k = 0; k < victims.length; k++) {
    const e = enemies.items[victims[k]!]!; // collected slots < used
    applyDamage(state, e, damageOn(t, attack, e), attack.type, source, attack);
    applyEffects(e, tier.effects);
  }
  victims.length = 0;
  t.cooldownTicks = bonusPeriodTicks(attack, t);
  if (t.firstFiredTick < 0) t.firstFiredTick = state.tick;
  return skitterkin;
}

/**
 * The tower's range as targeting reads it: the attack's own fields when no range bonus applies,
 * else the bonus range in the tick's scratch (minimum range never changes).
 */
function rangeOf(ctx: TickContext, t: Tower, attack: CompiledAttack): RangeSpec {
  if (t.flatRange === 0 && t.pctRange === 0) return attack;
  const r = bonusRangeTiles(attack, t);
  const out = ctx.scratch.range;
  out.rangeSq = r * r;
  out.minRangeSq = attack.minRangeSq;
  return out;
}

/** One hit's damage on `e`: with the conditional `vsStatus` bonus when `e` has the status. */
function damageOn(t: Tower, attack: CompiledAttack, e: Enemy): number {
  return t.vsStatusMask !== 0 && hasStatusIn(e, t.vsStatusMask)
    ? bonusDamageVs(attack, t)
    : bonusDamage(attack, t);
}
