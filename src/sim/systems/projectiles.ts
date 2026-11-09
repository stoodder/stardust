// System 8: projectiles. Flies lobbed shells and straight shots (Skyhook's flak, T304a) and lands
// them as splash (design/enemies.md §2.3:
// every enemy whose center is within the radius takes full damage, no falloff). A shell's ground
// point moves linearly from its tower to its aim point; render draws the arc. A shell lands on the
// tick its countdown starts at 0, after that tick's movement, so it lands `flightTicks` ticks
// after the tick it was fired. Its victims are all chosen before any damage, so the order of
// hits within one impact can't change who is in the blast. A shot with no splash (none in the
// content yet) hits only its target, if it is still alive and on the shot's layers.
// Neutral units (Gerald; combat/neutral.ts): a shot fired at one plinks off it if it lands with
// the unit in the burst (NeutralHit; the burst still hits the enemies around it), and every other
// burst passes neutral units by.
// Homing missiles (Seeker Swarm, design/towers.md § 7; T407b): a homing shot ignores the
// countdown above and steers instead. Each tick, in slot order:
// - **Its target** is the enemy it was fired at while that one is alive, on a layer the shot hits,
//   and not burrowed, leaving, or cloaked out (`untargetable`). A neutral target (Gerald) is kept:
//   the shot was aimed at him, so it plinks off him (D072).
// - **Retarget:** when its target dies, leaks, burrows, cloaks, or leaves, it picks the nearest
//   hittable enemy within HOMING_RETARGET_TILES of itself (squared distances; ties to the lowest
//   uid), never a neutral unit and, if its tower spared runners when it fired, never a spared one.
//   With none, it flies on to where it last saw its target and fizzles there (a hit on nothing).
// - **Pursuit:** it moves `speedTilesPerTick` straight at its target's position this tick (after
//   movement), so it closes on anything slower than it. When the target is within one step it
//   arrives and lands like a shot (above): its target only, or a burst with splash.
// - **Lifetime:** after HOMING_LIFE_TICKS without arriving it fizzles where it is.
// Deterministic: + − × ÷ and sqrt only, and the target lookups scan in slot order.
// Bomblets (Cluster Thumper, design/towers.md § 7): a shell that carries them scatters them after
// every shell has landed this tick, so where a bomblet's pool slot falls never changes its flight.
// Each flies from the impact point to a point drawn uniformly in the scatter disc (rejection
// sampling on the `projectiles` RNG stream, in slot order) and lands `flightTicks` ticks after its
// shell, as its own splash on the shell's layers with the shell's effects. Bomblets don't scatter.
import { nextFloat } from '../../shared/rng.ts';
import { secToTicks } from '../../shared/time.ts';
import { hasStatusIn } from '../bonuses.ts';
import { applyDamage, applyEffects, armorReduces } from '../combat/damage.ts';
import { hitNeutral, isNeutral } from '../combat/neutral.ts';
import { untargetable } from '../enemyAbilities/layers.ts';
import { PROJECTILE_BLANK, type Enemy, type Projectile } from '../entities.ts';
import { isSpared } from '../fireControl.ts';
import { poolAlloc, poolKill } from '../pool.ts';
import { emit, takeUid, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

/** Marks a landed shell whose bomblets are still to scatter (it's killed once they have). */
const SCATTER_PENDING = -1;

/** How long a homing shot flies before it gives up (3 s; a Seeker at 6 tiles/s covers 18 tiles). */
export const HOMING_LIFE_TICKS = secToTicks(3);
/** How far from itself a homing shot looks for a new target when it loses its own (tiles). */
export const HOMING_RETARGET_TILES = 3;
const RETARGET_SQ = HOMING_RETARGET_TILES * HOMING_RETARGET_TILES;

export function projectiles(state: SimState, ctx: TickContext): void {
  const pool = state.projectiles;
  let scatter = false;
  for (let i = 0; i < pool.used; i++) {
    const p = pool.items[i]!; // i < used ≤ items.length
    if (!p.alive || p.ticksLeft < 0) continue;
    if (p.homing) {
      if (steer(state, ctx, p)) poolKill(pool, p);
      continue;
    }
    if (p.ticksLeft === 0) {
      land(state, ctx, p);
      if (p.bomblets === null) {
        poolKill(pool, p);
      } else {
        p.ticksLeft = SCATTER_PENDING;
        scatter = true;
      }
      continue;
    }
    p.ticksLeft--;
    const t = p.flightTicks > 0 ? 1 - p.ticksLeft / p.flightTicks : 1;
    p.x = p.originX + (p.targetX - p.originX) * t;
    p.y = p.originY + (p.targetY - p.originY) * t;
  }
  if (!scatter) return;
  // New bomblets never match SCATTER_PENDING, so this pass only reaches the shells landed above.
  for (let i = 0; i < pool.used; i++) {
    const p = pool.items[i]!; // i < used ≤ items.length
    if (!p.alive || p.ticksLeft !== SCATTER_PENDING) continue;
    scatterBomblets(state, p);
    poolKill(pool, p);
  }
}

/**
 * One tick of a homing shot (see the header): find or keep its target, close on it, and land on
 * arrival or when its lifetime runs out. Returns whether it landed (the caller frees it).
 */
function steer(state: SimState, ctx: TickContext, p: Projectile): boolean {
  let e = chased(state, p);
  if (e === null) {
    e = retarget(state, p);
    p.targetUid = e === null ? 0 : e.uid;
    p.targetSlot = e === null ? -1 : e.slot;
  }
  if (e !== null) {
    p.targetX = e.x;
    p.targetY = e.y;
  }
  const dx = p.targetX - p.x;
  const dy = p.targetY - p.y;
  const d2 = dx * dx + dy * dy;
  const step = p.speedTilesPerTick;
  if (d2 <= step * step) {
    p.x = p.targetX;
    p.y = p.targetY;
    land(state, ctx, p);
    return true;
  }
  const d = Math.sqrt(d2);
  p.x += (dx / d) * step;
  p.y += (dy / d) * step;
  p.ticksLeft--;
  if (p.ticksLeft > 0) return false;
  // Out of fuel: it fizzles where it is, on nothing.
  p.targetUid = 0;
  p.targetSlot = -1;
  p.targetX = p.x;
  p.targetY = p.y;
  land(state, ctx, p);
  return true;
}

/** Whether a shot that hits these layers can touch `e` at all (alive, hittable, its layer). */
function reachable(p: Projectile, e: Enemy): boolean {
  if (!e.alive || e.def === null || untargetable(e)) return false;
  return e.def.layer === 'air' ? p.hitsAir : p.hitsGround;
}

/** The homing shot's own target, if it's still one it can chase; else null. */
function chased(state: SimState, p: Projectile): Enemy | null {
  if (p.targetUid === 0 || p.targetSlot < 0 || p.targetSlot >= state.enemies.used) return null;
  const e = state.enemies.items[p.targetSlot]!; // 0 ≤ slot < used ≤ items.length
  return e.uid === p.targetUid && reachable(p, e) ? e : null;
}

/** The nearest enemy a homing shot may switch to (see the header), or null. */
function retarget(state: SimState, p: Projectile): Enemy | null {
  const enemies = state.enemies;
  let best: Enemy | null = null;
  let bD2 = 0;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (!reachable(p, e) || isNeutral(e)) continue;
    if (p.spare && isSpared(e.tags)) continue;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > RETARGET_SQ) continue;
    if (best === null || d2 < bD2 || (d2 === bD2 && e.uid < best.uid)) {
      best = e;
      bD2 = d2;
    }
  }
  return best;
}

/**
 * Fires a landed shell's bomblets from its impact point. A bomblet starts one tick into its
 * flight (the projectiles system has run this tick), so it lands `flightTicks` after its shell.
 */
function scatterBomblets(state: SimState, shell: Projectile): void {
  const b = shell.bomblets!; // only shells with bomblets are pending
  const rng = state.rng.projectiles;
  for (let k = 0; k < b.count; k++) {
    // Uniform in the unit disc: draw in the square until a point falls inside.
    let dx: number;
    let dy: number;
    do {
      dx = nextFloat(rng) * 2 - 1;
      dy = nextFloat(rng) * 2 - 1;
    } while (dx * dx + dy * dy > 1);
    const p = poolAlloc(state.projectiles, PROJECTILE_BLANK, takeUid(state));
    p.towerUid = shell.towerUid;
    p.originX = shell.targetX;
    p.originY = shell.targetY;
    p.targetX = shell.targetX + dx * b.scatterTiles;
    p.targetY = shell.targetY + dy * b.scatterTiles;
    p.flightTicks = b.flightTicks;
    p.ticksLeft = b.flightTicks > 1 ? b.flightTicks - 1 : 0;
    // compile refuses flightTicks < 1; the guard keeps a 0 from making NaN positions.
    const t = p.flightTicks > 0 ? 1 - p.ticksLeft / p.flightTicks : 1;
    p.x = p.originX + (p.targetX - p.originX) * t;
    p.y = p.originY + (p.targetY - p.originY) * t;
    p.damage = shell.bombletDamage;
    p.damageVs = shell.bombletDamageVs;
    p.vsStatusMask = shell.vsStatusMask;
    p.damageType = shell.damageType;
    p.armorPierce = shell.armorPierce;
    p.ignoresArmor = shell.ignoresArmor;
    p.splashSq = b.splashSq;
    p.hitsGround = shell.hitsGround;
    p.hitsAir = shell.hitsAir;
    p.effects = shell.effects;
    emit(state, {
      type: 'ProjectileFired',
      uid: p.uid,
      towerUid: p.towerUid,
      kind: 'lobbed',
      targetUid: 0,
      x: p.originX,
      y: p.originY,
      targetX: p.targetX,
      targetY: p.targetY,
      sprite: b.projectile,
      flightTicks: b.flightTicks,
      radiusTiles: b.splashTiles,
    });
  }
}

/**
 * Splash at the aim point: every hittable enemy within the radius, in ascending slot order (with
 * no splash, its target only). A burrowed or leaving unit is never a victim (`untargetable`). A neutral unit is never a victim; the shot's own neutral target in
 * the burst is plinked (NeutralHit) after the impact.
 */
function land(state: SimState, ctx: TickContext, p: Projectile): void {
  const enemies = state.enemies;
  const victims = ctx.scratch.slots;
  victims.length = 0;
  let plinked = -1;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (!e.alive || e.def === null) continue;
    if (!(e.def.layer === 'air' ? p.hitsAir : p.hitsGround)) continue;
    if (untargetable(e)) continue; // burrowed or leaving: no hit, no armor `reduced` tell
    if (p.splashSq === 0) {
      if (e.uid !== p.targetUid) continue;
    } else {
      const dx = e.x - p.targetX;
      const dy = e.y - p.targetY;
      if (dx * dx + dy * dy > p.splashSq) continue;
    }
    if (isNeutral(e)) {
      if (e.uid === p.targetUid) plinked = i;
      continue;
    }
    victims.push(i);
  }
  const hit = {
    type: 'ProjectileHit' as const,
    uid: p.uid,
    towerUid: p.towerUid,
    x: p.targetX,
    y: p.targetY,
    hits: victims.length,
    damage: 0,
    reduced: false,
  };
  emit(state, hit);
  const source = ctx.scratch.towerSource;
  source.uid = p.towerUid;
  for (let k = 0; k < victims.length; k++) {
    const e = enemies.items[victims[k]!]!; // collected slots < used
    if (!hit.reduced && armorReduces(e, p.damageType, p)) hit.reduced = true;
    // A link's conditional bonus (Sitting Ducks) is checked per victim, as the shell lands.
    const damage = p.vsStatusMask !== 0 && hasStatusIn(e, p.vsStatusMask) ? p.damageVs : p.damage;
    // Summed into the emitted event as each victim takes its damage (events.ts, ProjectileHit).
    hit.damage += applyDamage(state, e, damage, p.damageType, source, p);
    applyEffects(e, p.effects);
  }
  victims.length = 0;
  if (plinked >= 0) hitNeutral(state, enemies.items[plinked]!, p.towerUid); // a slot < used
}
