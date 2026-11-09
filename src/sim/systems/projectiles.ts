// System 8: projectiles. Flies lobbed shells and lands them as splash (design/enemies.md §2.3:
// every enemy whose center is within the radius takes full damage, no falloff). A shell's ground
// point moves linearly from its tower to its aim point; render draws the arc. A shell lands on the
// tick its countdown starts at 0, after that tick's movement, so it lands `flightTicks` ticks
// after the tick it was fired. Its victims are all chosen before any damage, so the order of
// hits within one impact can't change who is in the blast.
import { hasStatusIn } from '../bonuses.ts';
import { applyDamage, applyEffects } from '../combat/damage.ts';
import type { Projectile } from '../entities.ts';
import { poolKill } from '../pool.ts';
import { emit, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

export function projectiles(state: SimState, ctx: TickContext): void {
  const pool = state.projectiles;
  for (let i = 0; i < pool.used; i++) {
    const p = pool.items[i]!; // i < used ≤ items.length
    if (!p.alive) continue;
    if (p.ticksLeft <= 0) {
      land(state, ctx, p);
      poolKill(pool, p);
      continue;
    }
    p.ticksLeft--;
    const t = p.flightTicks > 0 ? 1 - p.ticksLeft / p.flightTicks : 1;
    p.x = p.originX + (p.targetX - p.originX) * t;
    p.y = p.originY + (p.targetY - p.originY) * t;
  }
}

/** Splash at the aim point: every hittable enemy within the radius, in ascending slot order. */
function land(state: SimState, ctx: TickContext, p: Projectile): void {
  const enemies = state.enemies;
  const victims = ctx.scratch.slots;
  victims.length = 0;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (!e.alive || e.def === null) continue;
    if (!(e.def.layer === 'air' ? p.hitsAir : p.hitsGround)) continue;
    const dx = e.x - p.targetX;
    const dy = e.y - p.targetY;
    if (dx * dx + dy * dy <= p.splashSq) victims.push(i);
  }
  emit(state, {
    type: 'ProjectileHit',
    uid: p.uid,
    towerUid: p.towerUid,
    x: p.targetX,
    y: p.targetY,
    hits: victims.length,
  });
  const source = ctx.scratch.towerSource;
  source.uid = p.towerUid;
  for (let k = 0; k < victims.length; k++) {
    const e = enemies.items[victims[k]!]!; // collected slots < used
    // A link's conditional bonus (Sitting Ducks) is checked per victim, as the shell lands.
    const damage = p.vsStatusMask !== 0 && hasStatusIn(e, p.vsStatusMask) ? p.damageVs : p.damage;
    applyDamage(state, e, damage, p.damageType, source, p);
    applyEffects(e, p.effects);
  }
  victims.length = 0;
}
