// The damage pipeline (design/enemies.md §2.3) and on-hit statuses (§2.4). Every hit, from a
// tower, a shell's splash, a pulse, or a commander ability (T113), goes through applyDamage, so
// the matrix, shields, armor, and kill bookkeeping have one home. The numbers are rule data in
// content/rules.ts. Allocation-free except the events it emits: ShieldHit for a hit that lands on
// a shield (the ripple), and EnemyDied (and a carrier's SackBurst) for a kill.
import type { CompiledEffect } from '../../content/compiled.ts';
import type { DamageType } from '../../content/types.ts';
import {
  ARMOR_FLOOR,
  ARMOR_IGNORING_TYPES,
  BODY_MULT,
  BOSS_CHILL_MULT,
  CHILL_CAP,
  CORRODED_STACK_SEC,
  SHIELD_MULT,
  SOAKED_ENERGY_BONUS,
  SOAKED_SHIELD_MULT,
  SOAKED_SHIELD_TYPES,
  speedMult,
} from '../../content/rules.ts';
import { secToTicks } from '../../shared/time.ts';
import { assertNever } from '../../shared/types.ts';
import { burstSack } from '../carrier.ts';
import { bossDamage } from '../enemyAbilities/bossPhases.ts';
import { immune, untargetable } from '../enemyAbilities/layers.ts';
import { payBounty } from '../economy.ts';
import type { Enemy } from '../entities.ts';
import type { DamageSource } from '../events.ts';
import { countTags } from '../fireControl.ts';
import { poolKill } from '../pool.ts';
import { emit, type SimState } from '../state.ts';
import { applyMarked, applyPin, applyStasis, applyUnnerved } from '../systems/status.ts';
import { payKillIncome } from '../towerEconomy.ts';

export type { DamageSource };

/**
 * How a hit treats armor. A CompiledAttack satisfies it, so towers pass their attack (a beam's
 * `beamTickSec` prorates armor per tick, enemies.md §2.3).
 */
export interface HitMods {
  /** Armor this hit ignores (Rivet T3). */
  readonly armorPierce: number;
  /** Ignores all armor (Railspike). Psionic and DoT ignore it anyway. */
  readonly ignoresArmor: boolean;
  /** DoT ticks bypass armor (not shields). */
  readonly isDoT?: boolean;
  /** Beam ticks: armor applies at `armor × beamTickSec`. Absent or 0: not a beam. */
  readonly beamTickSec?: number;
}

/** A plain hit: full armor, not DoT, not a beam (Orbital Strike, T113). */
export const PLAIN_HIT: HitMods = Object.freeze({ armorPierce: 0, ignoresArmor: false });

/**
 * HP at or below this counts as dead. Chosen: the pipeline multiplies by fractions (shields ×0.5,
 * the 20% armor floor), so a float sum can leave a 1e-15 sliver that would need one more shot.
 */
export const DEAD_HP_EPS = 1e-9;

/** Corroded stacks last 5 s and refresh on a new hit (rules.ts). */
const CORRODED_TICKS = secToTicks(CORRODED_STACK_SEC);

/**
 * Deals one hit of `amount` raw damage (already including the tower's stat bonuses) of `type` to
 * `enemy`, through the pipeline in design/enemies.md §2.3: body multiplier, Marked, Soaked, then
 * shields (overflow converts back to raw), then armor with the 20% floor. Kills the enemy at 0 HP
 * (EnemyDied, kill stats). Returns the HP it took (0 if the shield absorbed it all or the enemy
 * was already dead). Callers apply on-hit statuses separately (applyEffects), after the damage.
 */
export function applyDamage(
  state: SimState,
  enemy: Enemy,
  amount: number,
  type: DamageType,
  source: DamageSource,
  hit: HitMods = PLAIN_HIT,
): number {
  const def = enemy.def;
  // Burrowed, leaving, or a boss between phases: nothing lands (enemyAbilities/layers.ts).
  if (!enemy.alive || def === null || amount <= 0 || immune(enemy)) return 0;

  let raw = amount * BODY_MULT[type][def.body];
  if (enemy.markTicks > 0) raw *= 1 + enemy.markPct;
  const soaked = enemy.soakedTicks > 0;
  if (soaked && type === 'energy') raw *= 1 + SOAKED_ENERGY_BONUS;

  // Any hit on an enemy with a shield restarts its regen delay, even once the shield is down, so
  // a broken shield stays down while the enemy is under fire (enemies.md §2.3).
  if (def.shield !== null) enemy.shieldRegenDelayTicks = def.shield.regenDelayTicks;
  if (enemy.shieldHp > 0) {
    const m = soaked && SOAKED_SHIELD_TYPES.includes(type) ? SOAKED_SHIELD_MULT : SHIELD_MULT[type];
    const s = raw * m;
    if (s < enemy.shieldHp) {
      enemy.shieldHp -= s;
      shieldHit(state, enemy, false);
      return 0;
    }
    raw = (s - enemy.shieldHp) / m;
    enemy.shieldHp = 0;
    shieldHit(state, enemy, true);
    if (raw <= 0) return 0;
  }

  let armor = 0;
  if (!hit.ignoresArmor && hit.isDoT !== true && !ARMOR_IGNORING_TYPES.includes(type)) {
    armor = def.armor - enemy.corrodedStacks - hit.armorPierce;
    if (armor < 0) armor = 0;
    const beamTickSec = hit.beamTickSec ?? 0;
    if (beamTickSec > 0) armor *= beamTickSec;
  }
  const floor = raw * ARMOR_FLOOR;
  const through = raw - armor;
  const damage = through > floor ? through : floor;

  // A boss never dies here: its phases and its ending take the hit (enemyAbilities/bossPhases.ts).
  if (def.boss !== null) return bossDamage(state, enemy, damage);
  const before = enemy.hp;
  enemy.hp -= damage;
  if (enemy.hp <= DEAD_HP_EPS) {
    enemy.hp = 0;
    killEnemy(state, enemy, source);
    return before;
  }
  return damage;
}

/** The ripple (ShieldHit) of a hit that landed on `enemy`'s shield; `broken` if it took it to 0. */
function shieldHit(state: SimState, enemy: Enemy, broken: boolean): void {
  emit(state, { type: 'ShieldHit', uid: enemy.uid, x: enemy.x, y: enemy.y, broken });
}

/**
 * Whether armor blunts a hit of `type` on `enemy` (ProjectileHit's `reduced`, the plink): it has
 * armor left after Corroded and the hit's pierce, and the hit doesn't ignore armor (ignore-armor,
 * DoT, Psionic). Read it before the hit lands; a dead enemy keeps its def, so after works too.
 */
export function armorReduces(enemy: Enemy, type: DamageType, hit: HitMods = PLAIN_HIT): boolean {
  const def = enemy.def;
  if (def === null || hit.ignoresArmor || hit.isDoT === true) return false;
  if (ARMOR_IGNORING_TYPES.includes(type)) return false;
  return def.armor - enemy.corrodedStacks - hit.armorPierce > 0;
}

/**
 * Kills an enemy that ran out of HP: frees it for cleanup, counts the kill (Pests Processed for
 * Skitterkin, `killsByEnemy`, `tagKilled` per wave tag), credits the bounty, and emits EnemyDied naming the killer. The one
 * place a kill is booked.
 */
function killEnemy(state: SimState, enemy: Enemy, source: DamageSource): void {
  const def = enemy.def!; // applyDamage checked it
  poolKill(state.enemies, enemy);
  const stats = state.stats;
  stats.killsByEnemy[def.id] = (stats.killsByEnemy[def.id] ?? 0) + 1;
  if (def.faction === 'skitterkin') stats.skitterkinKilled++;
  countTags(stats.tagKilled, enemy.tags);
  // Youngling units pay 0 and fleeing ones 1 (core-loop.md § 2.3), then the bounty modifiers;
  // leaks pay nothing (movement).
  const bounty = payBounty(state, def.bounty, enemy.tags);
  emit(state, {
    type: 'EnemyDied',
    uid: enemy.uid,
    enemy: def.id,
    bounty,
    // A copy: towers pass a reused scratch source.
    killer:
      source.kind === 'ability'
        ? { kind: 'ability', slot: source.slot }
        : { kind: source.kind, uid: source.uid },
    x: enemy.x,
    y: enemy.y,
  });
  burstSack(state, enemy); // a carrier's sack (the Brood Hauler): SackBurst after EnemyDied
  payKillIncome(state, enemy, source); // Crane and Reel It In kill credits (T408)
}

/**
 * Applies an attack's on-hit statuses to a live enemy (design/enemies.md §2.4). Stacking rules:
 * - Chilled: only the strongest source applies, capped at CHILL_CAP. A weaker chill while a
 *   stronger one is active does nothing; an equal one extends the duration.
 * - Soaked: refreshes (the longer of the remaining and the new duration).
 * - Corroded: adds stacks up to the attack's max (never removing stacks a higher-max source left)
 *   and refreshes the shared 5 s timer. A shield slow (Corrosive Kiss) keeps the strongest until
 *   the stacks expire (`corrodedShieldMul`).
 * - Marked: highest only, like Chilled; a Truthlight Mark also stops evading (applyMarked).
 * - Stasis: never stacks or extends, then 2× immunity; a boss takes Chilled 50% (applyStasis).
 * - Pinned: never stacks or extends, then 1 s immunity; a boss takes Chilled 50% (applyPin).
 * - Unnerved: refreshes to the longer duration; a boss is interrupted but not slowed (applyUnnerved).
 */
export function applyEffects(enemy: Enemy, effects: readonly CompiledEffect[]): void {
  if (!enemy.alive || untargetable(enemy)) return;
  for (let i = 0; i < effects.length; i++) {
    const fx = effects[i]!; // i < length
    switch (fx.status) {
      case 'chilled':
        applyChill(enemy, fx.pct, fx.durationTicks);
        break;
      case 'soaked':
        if (fx.durationTicks > enemy.soakedTicks) enemy.soakedTicks = fx.durationTicks;
        break;
      case 'corroded': {
        const stacks = enemy.corrodedStacks + fx.stacks;
        const capped = stacks < fx.maxStacks ? stacks : fx.maxStacks;
        if (capped > enemy.corrodedStacks) enemy.corrodedStacks = capped;
        enemy.corrodedTicks = CORRODED_TICKS;
        if (fx.shieldRegenMul < enemy.corrodedShieldMul) enemy.corrodedShieldMul = fx.shieldRegenMul;
        break;
      }
      case 'marked':
        // Highest only; a Truthlight Mark also stops evading (systems/status.ts; T508).
        applyMarked(enemy, fx.pct, fx.durationTicks, fx.noEvade);
        break;
      case 'stasis':
        // Frozen, or a boss's Chilled 50% (systems/status.ts; T407a).
        applyStasis(enemy, fx.durationTicks);
        break;
      case 'pinned':
        // Held in place, a flyer grounded, or a boss's Chilled 50% (systems/status.ts; T408).
        applyPin(enemy, fx.durationTicks);
        break;
      case 'unnerved':
        // Interrupted (a boss too), and a non-boss 20% slower (systems/status.ts; T507, Dread).
        applyUnnerved(enemy, fx.durationTicks);
        break;
      default:
        assertNever(fx);
    }
  }
}

/**
 * Marked X% for `ticks`: highest only, and an equal Mark extends it (enemies.md §2.4). Crow's
 * Nest's "revealed enemies take +10% damage" is a Mark-type effect through here too, so it never
 * stacks with a Mark (systems/detection.ts; T406).
 */
export function applyMark(enemy: Enemy, pct: number, ticks: number): void {
  if (pct <= 0 || ticks <= 0) return;
  if (pct > enemy.markPct || enemy.markTicks === 0) {
    enemy.markPct = pct;
    enemy.markTicks = ticks;
  } else if (pct === enemy.markPct && ticks > enemy.markTicks) {
    enemy.markTicks = ticks;
  }
}

/**
 * Chilled X% for `ticks` movement ticks: the strongest source wins (enemies.md §2.4). Bosses take
 * it at half strength (enemies.md § 6), except a `converted` Pin or Stasis (Chilled 50%), which is
 * already boss strength and isn't halved again (systems/status.ts `applyStasis`).
 */
export function applyChill(enemy: Enemy, pct: number, ticks: number, converted = false): void {
  const halved = !converted && enemy.def !== null && enemy.def.boss !== null;
  const strength = halved ? pct * BOSS_CHILL_MULT : pct;
  const p = strength < CHILL_CAP ? strength : CHILL_CAP;
  if (p <= 0 || ticks <= 0) return;
  if (p > enemy.chillPct) {
    enemy.chillPct = p;
    enemy.chillTicks = ticks;
    enemy.chillMul = speedMult(p, 0);
  } else if (p === enemy.chillPct && ticks > enemy.chillTicks) {
    enemy.chillTicks = ticks;
  }
}
