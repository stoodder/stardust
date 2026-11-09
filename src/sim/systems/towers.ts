// System 7: towers. Targeting, cooldowns, and firing (design/towers.md §5), in ascending slot
// order. Four attack kinds run here:
// - hitscan (Rivet): damage lands the tick it fires.
// - lobbed (Thumper): a shell aimed with lead targeting at the target's predicted route position
//   after the flight time, fixed when it fires; the projectiles system lands it as splash.
// - projectile (Skyhook's flak, T304a): a straight shot at `speedTilesPerTick` to the intercept
//   point, where the target will be when it arrives (`interceptInto`), fixed when it fires; the
//   projectiles system bursts it there (splash on the tier's layers) or, with no splash, hits its
//   target. A `homing` shot (Seeker Swarm, T407b) is aimed at its target itself and steered there
//   by the projectiles system. A `volley` fires that many shots at once, each at its own target
//   where it can: the tower's target, then the next best by its priority among the others in range
//   (the spare-runners filter applies), and with too few targets the extras go round the same
//   ones again, the tower's target first.
// - pulse (Sprinkler): every period, hits every enemy in range; no target, no priority. It waits
//   (cooldown 0) until an enemy is in range, so its first pulse always affects one.
// - chain (Zapcoil, T304b): sim/attacks/chain.ts.
// - charge (Capacitor Bank, T407b): sim/attacks/charge.ts. Holding fire vents its charge.
// A link's statuses (Conductive's Soak; systems/status.ts `applyLinkStatuses`) land after the
// tier's own on hitscan, pulse, and chain hits.
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
// Layers (design/enemies.md §2.6): a tower targets and splashes only the layers its tier hits
// (`targets`), so a ground-only tower never sees a flyer. Neutral units (Gerald) are targeted like
// any enemy, but a hit on one plinks off (combat/neutral.ts); a pulse passes them by.
import type { CompiledAttack, CompiledTier } from '../../content/compiled.ts';
import { stackedStat } from '../../content/rules.ts';
import { assertNever } from '../../shared/types.ts';
import {
  bonusDamage,
  bonusDamageVs,
  bonusPeriodTicks,
  bonusRangeTiles,
  hasStatusIn,
} from '../bonuses.ts';
import { chainAttack } from '../attacks/chain.ts';
import { chargeAttack } from '../attacks/charge.ts';
import { applyDamage, applyEffects, armorReduces } from '../combat/damage.ts';
import { hitNeutral, isNeutral } from '../combat/neutral.ts';
import {
  canHit,
  distSqTo,
  isInRange,
  isStillTarget,
  pickTarget,
  type RangeSpec,
} from '../combat/targeting.ts';
import { PROJECTILE_BLANK, type Enemy, type Projectile, type Tower } from '../entities.ts';
import { isSpared, trackNotFiring } from '../fireControl.ts';
import { pointAt } from '../path.ts';
import { poolAlloc } from '../pool.ts';
import { emit, takeUid, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { enemySpeedPerTick } from './movement.ts';
import { HOMING_LIFE_TICKS } from './projectiles.ts';
import { applyLinkStatuses } from './status.ts';

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
    if (t.burstTicks > 0) t.burstTicks--;
    if (t.holdFire) {
      t.targetUid = 0;
      t.targetSlot = -1;
      t.chargeTicks = 0;
      continue;
    }
    switch (attack.kind) {
      case 'hitscan':
      case 'lobbed':
      case 'projectile':
        if (aimAndFire(state, ctx, t, tier, attack)) firedAtSkitterkin = true;
        break;
      case 'pulse':
        if (pulse(state, ctx, t, tier, attack)) firedAtSkitterkin = true;
        break;
      case 'chain':
        if (chainAttack(state, ctx, t, tier, attack)) firedAtSkitterkin = true;
        break;
      case 'charge':
        if (chargeAttack(state, ctx, t, tier, attack)) firedAtSkitterkin = true;
        break;
      // Beams (Prism, M5), spawners (Scuttle Den, M6), and lines (Skewer, T408) arrive with their
      // towers and specs. createSim refuses each until then (FEATURE_GATES).
      case 'beam':
      case 'spawner':
      case 'line':
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
  attack: Extract<CompiledAttack, { kind: 'hitscan' | 'lobbed' | 'projectile' }>,
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
  else if (attack.kind === 'lobbed') fireShell(state, ctx, t, tier, attack, target);
  else fireShots(state, ctx, t, tier, attack, target);
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
  const neutral = isNeutral(target);
  const hit = {
    type: 'ProjectileHit' as const,
    uid: 0,
    towerUid: t.uid,
    x: target.x,
    y: target.y,
    hits: neutral ? 0 : 1,
    damage: 0,
    reduced: !neutral && armorReduces(target, attack.type, attack),
  };
  emit(state, hit);
  if (neutral) {
    hitNeutral(state, target, t.uid);
    return;
  }
  const source = ctx.scratch.towerSource;
  source.uid = t.uid;
  // Filled in after the damage lands (events.ts, ProjectileHit).
  hit.damage = applyDamage(state, target, damageOn(t, attack, target), attack.type, source, attack);
  applyEffects(target, tier.effects);
  applyLinkStatuses(t, target);
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
  const p = launch(state, t, tier, attack, target, ax, ay, attack.flightTicks);
  const bomblets = attack.bomblets;
  if (bomblets !== null) {
    // Bomblets take the tower's damage bonuses on their own base damage (Cluster Thumper).
    p.bomblets = bomblets;
    p.bombletDamage = stackedStat('damage', bomblets.damage, t.flatDamage, t.pctDamage);
    p.bombletDamageVs =
      t.vsStatusMask === 0
        ? p.bombletDamage
        : stackedStat('damage', bomblets.damage, t.flatDamage, t.pctDamage + t.vsStatusPct);
  }
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

/** Ticks for a straight shot at `speed` (tiles per tick) to cover (x0, y0) → (x1, y1); at least 1. */
function flightTicksTo(x0: number, y0: number, x1: number, y1: number, speed: number): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const ticks = Math.ceil(Math.sqrt(dx * dx + dy * dy) / speed);
  return ticks > 1 ? ticks : 1;
}

/**
 * The intercept for a straight shot at `speed` from (x, y): writes the aim point into `out` and
 * returns the flight in whole ticks. It times the flight to the target's position now, predicts
 * where it will be after that long at its current speed (`pointAt(route, dist + v × ticks)`, as
 * lead targeting does), re-times the flight to that point, and predicts again for the final
 * flight, so a target that holds its speed is exactly at the aim point on the tick the shot lands
 * (after that tick's movement). Deterministic: + − × ÷, sqrt, and ceil only.
 */
export function interceptInto(
  x: number,
  y: number,
  speed: number,
  target: Enemy,
  out: { x: number; y: number },
): number {
  let ticks = flightTicksTo(x, y, target.x, target.y, speed);
  if (target.route === null || target.def === null) {
    out.x = target.x;
    out.y = target.y;
    return ticks;
  }
  const v = enemySpeedPerTick(target);
  pointAt(target.route, target.dist + v * ticks, out, target.seg);
  ticks = flightTicksTo(x, y, out.x, out.y, speed);
  pointAt(target.route, target.dist + v * ticks, out, target.seg);
  return ticks;
}

/**
 * Fires a projectile attack's shots: one at `target`, or a volley (see the header), each a flak
 * round or a homing missile.
 */
function fireShots(
  state: SimState,
  ctx: TickContext,
  t: Tower,
  tier: CompiledTier,
  attack: Extract<CompiledAttack, { kind: 'projectile' }>,
  target: Enemy,
): void {
  const fire = attack.homing ? fireHoming : fireFlak;
  if (attack.volley <= 1) {
    fire(state, ctx, t, tier, attack, target);
    return;
  }
  const enemies = state.enemies;
  const range = rangeOf(ctx, t, attack);
  const chosen = ctx.scratch.slots;
  chosen.length = 0;
  chosen.push(target.slot);
  const priority = t.priority ?? 'first';
  while (chosen.length < attack.volley) {
    const next = pickTarget(
      enemies,
      t.x,
      t.y,
      tier.targets,
      range,
      priority,
      t.spareRunners,
      chosen,
    );
    if (next === null) break;
    chosen.push(next.slot);
  }
  const n = chosen.length;
  for (let k = 0; k < attack.volley; k++) {
    fire(state, ctx, t, tier, attack, enemies.items[chosen[k % n]!]!); // collected slots < used
  }
  chosen.length = 0;
}

/**
 * Fires a homing missile (Seeker Swarm) at `target`: it starts at the tower and is steered to its
 * target each tick by the projectiles system, for at most HOMING_LIFE_TICKS.
 */
function fireHoming(
  state: SimState,
  _ctx: TickContext,
  t: Tower,
  tier: CompiledTier,
  attack: Extract<CompiledAttack, { kind: 'projectile' }>,
  target: Enemy,
): void {
  const p = launch(state, t, tier, attack, target, target.x, target.y, HOMING_LIFE_TICKS);
  p.homing = true;
  p.speedTilesPerTick = attack.speedTilesPerTick;
  p.targetSlot = target.slot;
  p.spare = t.spareRunners;
  emit(state, {
    type: 'ProjectileFired',
    uid: p.uid,
    towerUid: t.uid,
    kind: 'projectile',
    targetUid: target.uid,
    x: t.x,
    y: t.y,
    targetX: target.x,
    targetY: target.y,
    sprite: attack.projectile,
    // It steers: render follows its pool position (flightTicks is a lobbed shell's arc).
    flightTicks: 0,
    radiusTiles: attack.splashTiles,
  });
}

/**
 * Fires a straight shot (Skyhook's flak) at the target's intercept point. With splash it bursts
 * there on the tier's layers; with none it hits its target on arrival (systems/projectiles.ts).
 */
function fireFlak(
  state: SimState,
  ctx: TickContext,
  t: Tower,
  tier: CompiledTier,
  attack: Extract<CompiledAttack, { kind: 'projectile' }>,
  target: Enemy,
): void {
  const aim = ctx.scratch.point;
  const flight = interceptInto(t.x, t.y, attack.speedTilesPerTick, target, aim);
  const p = launch(state, t, tier, attack, target, aim.x, aim.y, flight);
  emit(state, {
    type: 'ProjectileFired',
    uid: p.uid,
    towerUid: t.uid,
    kind: 'projectile',
    targetUid: target.uid,
    x: t.x,
    y: t.y,
    targetX: p.targetX,
    targetY: p.targetY,
    sprite: attack.projectile,
    // A straight shot: render follows its pool position (flightTicks is a lobbed shell's arc).
    flightTicks: 0,
    radiusTiles: attack.splashTiles,
  });
}

/**
 * Allocates a shot from `t` at `target`, aimed at (ax, ay), landing `flight` ticks from now, with
 * everything its impact needs copied from the firing tier and the tower's bonuses (so a sell or
 * upgrade mid-flight changes nothing).
 */
function launch(
  state: SimState,
  t: Tower,
  tier: CompiledTier,
  attack: Extract<CompiledAttack, { kind: 'lobbed' | 'projectile' }>,
  target: Enemy,
  ax: number,
  ay: number,
  flight: number,
): Projectile {
  const p = poolAlloc(state.projectiles, PROJECTILE_BLANK, takeUid(state));
  p.towerUid = t.uid;
  p.targetUid = target.uid;
  p.originX = t.x;
  p.originY = t.y;
  p.x = t.x;
  p.y = t.y;
  p.targetX = ax;
  p.targetY = ay;
  p.flightTicks = flight;
  p.ticksLeft = flight;
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
  return p;
}

/**
 * A pulse: when ready and anything is in range, hits every enemy in range, in slot order. With the
 * spare-runners filter it waits until an unspared unit is in range. Its burst (Flash Freeze), if
 * any, runs on its own timer over the same victims: when ready it applies the burst's effects
 * (after the pulse's hit when both go off together) and emits PulseBurst. Returns whether it hit
 * a Skitterkin.
 */
function pulse(
  state: SimState,
  ctx: TickContext,
  t: Tower,
  tier: CompiledTier,
  attack: Extract<CompiledAttack, { kind: 'pulse' }>,
): boolean {
  const burst = attack.burst;
  const bursting = burst !== null && t.burstTicks === 0;
  const firing = t.cooldownTicks === 0;
  if (!firing && !bursting) return false;
  const enemies = state.enemies;
  const layers = tier.targets;
  const range = rangeOf(ctx, t, attack);
  const victims = ctx.scratch.slots;
  victims.length = 0;
  let unspared = !t.spareRunners;
  let skitterkin = false;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    // A pulse is an area hit: it passes a neutral unit by (combat/neutral.ts).
    if (canHit(e, layers) && !isNeutral(e) && isInRange(distSqTo(t.x, t.y, e), range)) {
      victims.push(i);
      if (!unspared && !isSpared(e.tags)) unspared = true;
      if (e.def!.faction === 'skitterkin') skitterkin = true; // canHit checked def
    }
  }
  if (victims.length === 0 || !unspared) {
    victims.length = 0;
    return false;
  }
  if (firing) pulseHit(state, ctx, t, tier, attack, victims);
  if (bursting) pulseBurst(state, t, attack, burst, victims);
  victims.length = 0;
  if (t.firstFiredTick < 0) t.firstFiredTick = state.tick;
  return skitterkin;
}

/** The pulse's own hit on `victims` (enemy slots): damage, its tier's effects, link statuses. */
function pulseHit(
  state: SimState,
  ctx: TickContext,
  t: Tower,
  tier: CompiledTier,
  attack: Extract<CompiledAttack, { kind: 'pulse' }>,
  victims: readonly number[],
): void {
  const enemies = state.enemies;
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
  const hit = {
    type: 'ProjectileHit' as const,
    uid: 0,
    towerUid: t.uid,
    x: t.x,
    y: t.y,
    hits: victims.length,
    damage: 0,
    reduced: false,
  };
  emit(state, hit);
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
  t.cooldownTicks = bonusPeriodTicks(attack, t);
}

/**
 * A pulse's burst (Flash Freeze's Stasis; T407a) on `victims` still alive: its effects, then
 * PulseBurst with how many entered Stasis. It deals no damage; its period takes no rate bonus.
 */
function pulseBurst(
  state: SimState,
  t: Tower,
  attack: Extract<CompiledAttack, { kind: 'pulse' }>,
  burst: NonNullable<Extract<CompiledAttack, { kind: 'pulse' }>['burst']>,
  victims: readonly number[],
): void {
  const enemies = state.enemies;
  let frozen = 0;
  for (let k = 0; k < victims.length; k++) {
    const e = enemies.items[victims[k]!]!; // collected slots < used
    if (!e.alive) continue; // the pulse's hit may have killed it
    const before = e.stasisTicks;
    applyEffects(e, burst.effects);
    if (e.stasisTicks > before) frozen++;
  }
  t.burstTicks = burst.everyTicks;
  emit(state, {
    type: 'PulseBurst',
    towerUid: t.uid,
    x: t.x,
    y: t.y,
    radiusTiles: bonusRangeTiles(attack, t),
    frozen,
  });
}

/**
 * The tower's range as targeting reads it: the attack's own fields when no range bonus applies,
 * else the bonus range in the tick's scratch (minimum range never changes).
 */
export function rangeOf(ctx: TickContext, t: Tower, attack: CompiledAttack): RangeSpec {
  if (t.flatRange === 0 && t.pctRange === 0) return attack;
  const r = bonusRangeTiles(attack, t);
  const out = ctx.scratch.range;
  out.rangeSq = r * r;
  out.minRangeSq = attack.minRangeSq;
  return out;
}

/** One hit's damage on `e`: with the conditional `vsStatus` bonus when `e` has the status. */
export function damageOn(t: Tower, attack: CompiledAttack, e: Enemy): number {
  return t.vsStatusMask !== 0 && hasStatusIn(e, t.vsStatusMask)
    ? bonusDamageVs(attack, t)
    : bonusDamage(attack, t);
}
