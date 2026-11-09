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
import type { CompiledAttack, CompiledTier } from '../../content/compiled.ts';
import { assertNever } from '../../shared/types.ts';
import { applyDamage, applyEffects } from '../combat/damage.ts';
import { canHit, distSqTo, isInRange, isStillTarget, pickTarget } from '../combat/targeting.ts';
import { PROJECTILE_BLANK, type Enemy, type Tower } from '../entities.ts';
import { pointAt } from '../path.ts';
import { poolAlloc } from '../pool.ts';
import { emit, takeUid, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

export function towers(state: SimState, ctx: TickContext): void {
  const pool = state.towers;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (!t.alive || t.tierDef === null) continue;
    const tier = t.tierDef;
    const attack = tier.attack;
    if (attack === null) continue;
    if (t.cooldownTicks > 0) t.cooldownTicks--;
    // TODO(T105b+): stat modifiers (towers.md §4) scale damage, rate, and range here once
    // modifiers land; M1 configs have none (createSim refuses them).
    switch (attack.kind) {
      case 'hitscan':
      case 'lobbed':
        aimAndFire(state, ctx, t, tier, attack);
        break;
      case 'pulse':
        pulse(state, ctx, t, tier, attack);
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
}

/** Single-target towers: keep or pick a target, spin up, and fire when the cooldown allows. */
function aimAndFire(
  state: SimState,
  ctx: TickContext,
  t: Tower,
  tier: CompiledTier,
  attack: Extract<CompiledAttack, { kind: 'hitscan' | 'lobbed' }>,
): void {
  const enemies = state.enemies;
  const layers = tier.targets;
  let target: Enemy | null = null;
  if (t.cooldownTicks > 0) {
    target = isStillTarget(enemies, t.targetSlot, t.targetUid, t.x, t.y, layers, attack);
  }
  if (target === null) {
    target = pickTarget(enemies, t.x, t.y, layers, attack, t.priority ?? 'first');
  }
  if (target === null) {
    t.targetUid = 0;
    t.targetSlot = -1;
    return;
  }
  // Spin-up (Rivet Storm) counts from acquiring a target after having none; retargeting
  // between live targets keeps the barrels spinning.
  if (t.targetUid === 0) t.spinTicks = attack.spinUpTicks;
  t.targetUid = target.uid;
  t.targetSlot = target.slot;
  if (t.spinTicks > 0) {
    t.spinTicks--;
    return;
  }
  if (t.cooldownTicks > 0) return;

  if (attack.kind === 'hitscan') fireHitscan(state, ctx, t, tier, attack, target);
  else fireShell(state, ctx, t, tier, attack, target);
  t.cooldownTicks = attack.cooldownTicks;
  if (t.firstFiredTick < 0) t.firstFiredTick = state.tick;
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
  applyDamage(state, target, attack.damage, attack.type, source, attack);
  applyEffects(target, tier.effects);
}

/**
 * Lobs a shell. With `lead`, it aims where the target will be after the flight time at its
 * current speed (Chilled included): `pointAt(route, dist + speed × flightTicks)`. Movement runs
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
    const speed = target.def.speedTilesPerTick * target.chillMul;
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
  p.damage = attack.damage;
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
  });
}

/** A pulse: when ready and anything is in range, hits every enemy in range, in slot order. */
function pulse(
  state: SimState,
  ctx: TickContext,
  t: Tower,
  tier: CompiledTier,
  attack: Extract<CompiledAttack, { kind: 'pulse' }>,
): void {
  if (t.cooldownTicks > 0) return;
  const enemies = state.enemies;
  const layers = tier.targets;
  const victims = ctx.scratch.slots;
  victims.length = 0;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (canHit(e, layers) && isInRange(distSqTo(t.x, t.y, e), attack)) victims.push(i);
  }
  if (victims.length === 0) return;

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
    applyDamage(state, e, attack.damage, attack.type, source, attack);
    applyEffects(e, tier.effects);
  }
  victims.length = 0;
  t.cooldownTicks = attack.cooldownTicks;
  if (t.firstFiredTick < 0) t.firstFiredTick = state.tick;
}
