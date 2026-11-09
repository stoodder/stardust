// The damage pipeline (design/enemies.md §2.3) and on-hit statuses (§2.4). Every hit, from a
// tower, a shell's splash, a pulse, or a commander ability (T113), goes through applyDamage, so
// the matrix, shields, armor, and kill bookkeeping have one home. The numbers are rule data in
// content/rules.ts. Allocation-free except the EnemyDied (and a carrier's SackBurst) event a kill
// emits.
import type { CompiledEffect } from '../../content/compiled.ts';
import type { DamageType } from '../../content/types.ts';
import {
  ARMOR_FLOOR,
  ARMOR_IGNORING_TYPES,
  BODY_MULT,
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
import { splitOnDeath } from '../enemyAbilities/split.ts';
import { payBounty } from '../economy.ts';
import type { Enemy } from '../entities.ts';
import type { DamageSource } from '../events.ts';
import { countTags } from '../fireControl.ts';
import { poolKill } from '../pool.ts';
import { emit, type SimState } from '../state.ts';

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
  if (!enemy.alive || def === null || amount <= 0) return 0;

  let raw = amount * BODY_MULT[type][def.body];
  if (enemy.markTicks > 0) raw *= 1 + enemy.markPct;
  const soaked = enemy.soakedTicks > 0;
  if (soaked && type === 'energy') raw *= 1 + SOAKED_ENERGY_BONUS;

  // Chosen: any hit on an enemy with a shield restarts its regen delay, even once the shield is
  // down, so a broken shield stays down while the enemy is under fire (enemies.md §2.3 says
  // "without shield damage" and is silent on hits to a broken shield).
  if (def.shield !== null) enemy.shieldRegenDelayTicks = def.shield.regenDelayTicks;
  if (enemy.shieldHp > 0) {
    const m = soaked && SOAKED_SHIELD_TYPES.includes(type) ? SOAKED_SHIELD_MULT : SHIELD_MULT[type];
    const s = raw * m;
    if (s <= enemy.shieldHp) {
      enemy.shieldHp -= s;
      return 0;
    }
    raw = (s - enemy.shieldHp) / m;
    enemy.shieldHp = 0;
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

  const before = enemy.hp;
  enemy.hp -= damage;
  if (enemy.hp <= DEAD_HP_EPS) {
    enemy.hp = 0;
    killEnemy(state, enemy, source);
    return before;
  }
  return damage;
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
  if (def.split !== null) splitOnDeath(state, enemy, def.split); // the Bunchling (T304c)
}

/**
 * Applies an attack's on-hit statuses to a live enemy (design/enemies.md §2.4). Stacking rules:
 * - Chilled: only the strongest source applies, capped at CHILL_CAP. A weaker chill while a
 *   stronger one is active does nothing; an equal one extends the duration.
 * - Soaked: refreshes (the longer of the remaining and the new duration).
 * - Corroded: adds stacks up to the attack's max (never removing stacks a higher-max source left)
 *   and refreshes the shared 5 s timer.
 * - Marked: highest only, like Chilled.
 */
export function applyEffects(enemy: Enemy, effects: readonly CompiledEffect[]): void {
  if (!enemy.alive) return;
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
        break;
      }
      case 'marked':
        if (fx.pct > enemy.markPct || enemy.markTicks === 0) {
          enemy.markPct = fx.pct;
          enemy.markTicks = fx.durationTicks;
        } else if (fx.pct === enemy.markPct && fx.durationTicks > enemy.markTicks) {
          enemy.markTicks = fx.durationTicks;
        }
        break;
      // TODO(T2xx): Pinned, Stasis, and Unnerved arrive with the towers that apply them (none in
      // M1 content).
      case 'pinned':
      case 'stasis':
      case 'unnerved':
        break;
      default:
        assertNever(fx);
    }
  }
}

/** Chilled X% for `ticks` movement ticks: the strongest source wins (enemies.md §2.4). */
export function applyChill(enemy: Enemy, pct: number, ticks: number): void {
  const p = pct < CHILL_CAP ? pct : CHILL_CAP;
  if (p <= 0 || ticks <= 0) return;
  // TODO(T304): bosses take Chilled at half strength (BOSS_CHILL_MULT); M1 has no bosses.
  if (p > enemy.chillPct) {
    enemy.chillPct = p;
    enemy.chillTicks = ticks;
    enemy.chillMul = speedMult(p, 0);
  } else if (p === enemy.chillPct && ticks > enemy.chillTicks) {
    enemy.chillTicks = ticks;
  }
}
