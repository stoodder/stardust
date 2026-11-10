// System 4: status. Ticks enemy status timers and shield regeneration (design/enemies.md §2.3–2.4;
// M1: Chilled, Soaked, Corroded, Marked, shields), in ascending slot order. Runs before movement,
// so a Chilled of N ticks slows exactly N movement ticks: it's applied by a tower after movement,
// counts down on the next N status passes, and clears on the one after.
//
// Soaked (enemies.md § 2.4): the damage pipeline reads `soakedTicks` (combat/damage.ts: +25%
// Energy, Kinetic and Explosive strip shields at ×0.8), a new Soak refreshes to the longer
// duration, and this pass counts it down. Its sources: the Sprinkler's tier 3 and Cloudburst
// (its own effects, T407a) and the Conductive link (`applyLinkStatuses`, from tier 1).
//
// Stasis (enemies.md § 2.4; T407a, Flash Freeze): `applyStasis` is the one way in.
// - **A non-boss** is frozen (speed 0, movement.ts `enemySpeedPerTick`) and still takes damage for
//   `stasisTicks`, counting the tick it lands (towers hit after movement, so a 1.0 s Stasis holds
//   it through the next 59 steps). While it runs, `isInterrupted` is true: every enemy ability
//   asks it, so a tell can't start or go on, and the ability's cooldown restarts from zero.
// - **Immunity:** applying sets `stasisImmuneTicks` to STASIS_IMMUNITY_MULT × the duration; it
//   counts down only once the Stasis is over, and a new Stasis lands only when both are 0. So a
//   Stasis never extends or stacks (two Flash Freezes can't chain a unit frozen).
// - **A boss** never enters Stasis: it takes Chilled BOSS_CONVERTED_CHILL for the same duration
//   (not halved again), which interrupts nothing (D101). No immunity follows.
//
// Pinned (enemies.md § 2.4; T408: Tether, Magnet Crane): `applyPin` is the one way in, the same
// shape as Stasis's.
// - **A non-boss** is held in place (speed 0, movement.ts) for `pinnedTicks`, counting the tick it
//   lands, and a pinned flyer is **grounded**: a tier that hits ground can hit it too
//   (enemyAbilities/layers.ts `onLayers`), splash and allies included. A Pin doesn't interrupt
//   abilities (§ 2.4 gives that to Stasis and Unnerved only): a pulse, dig, or hush goes on.
// - **Immunity:** a Pin lands only on a unit neither pinned nor immune, so it never extends or
//   stacks; once it ends the unit is immune to Pin for PIN_IMMUNITY_SEC (1 s).
// - **A boss** takes Chilled 50% for the same duration instead (not halved again, no immunity).
//
// Unnerved (enemies.md § 2.4; T507, Mindspike [Dread]): `applyUnnerved` is the one way in.
// - **Any unit, a boss too**, is interrupted for `unnervedTicks`, counting the tick it lands:
//   `isInterrupted` holds, so every ability with a tell (a pulse, a blink, a dig, a phase, a hush)
//   can't start or go on and its cooldown restarts from zero. That is how a boss's tell is
//   interrupted at all (its Stasis converts to Chilled, which interrupts nothing).
// - **A non-boss** also moves UNNERVED_SLOW (20%) slower: its own factor in the speed rule
//   (movement.ts `enemySpeedPerTick` × `unnervedSpeedMul`), multiplied with Chilled and outside
//   the chill cap, never a chill source (so it never competes with the strongest chill). A boss
//   isn't slowed (§ 6: interrupt only).
// - **Stacking:** a new Unnerved refreshes it to the longer of the remaining and the new duration
//   (Soaked's rule); there is no immunity.
import {
  BOSS_CONVERTED_CHILL,
  PIN_IMMUNITY_SEC,
  STASIS_IMMUNITY_MULT,
  UNNERVED_SLOW,
} from '../../content/rules.ts';
import { secToTicks } from '../../shared/time.ts';
import { applyChill } from '../combat/damage.ts';
import type { Enemy, Tower } from '../entities.ts';
import type { SimState } from '../state.ts';

/**
 * **The interrupt hook** (enemies.md § 2.4's interrupt rule): whether a status interrupts and
 * blocks `e`'s active abilities this tick. Every enemy ability with a tell asks it each tick (the
 * shield pulse, the blink, the dig, the phase, the hush): while it's true, a tell can't start, a
 * tell under way is cancelled, and the ability's cooldown restarts from zero. Stasis on a non-boss
 * (a boss's converted Chilled interrupts nothing, D101), and Unnerved on any unit, a boss too
 * (T507).
 */
export function isInterrupted(e: Readonly<Enemy>): boolean {
  return e.unnervedTicks > 0 || (e.stasisTicks > 0 && e.def !== null && e.def.boss === null);
}

/** Whether `e` is Unnerved this tick (render's mark reads it). */
export function isUnnerved(e: Readonly<Enemy>): boolean {
  return e.unnervedTicks > 0;
}

/** Unnerved's factor in the speed rule: 1 − UNNERVED_SLOW on an Unnerved non-boss, else 1. */
export function unnervedSpeedMul(e: Readonly<Enemy>): number {
  return e.unnervedTicks > 0 && e.def !== null && e.def.boss === null ? 1 - UNNERVED_SLOW : 1;
}

/**
 * Unnerved for `ticks` (enemies.md § 2.4; see the header): any live unit, a boss too, refreshed
 * to the longer of the remaining and the new duration. Returns whether it landed (false for a
 * dead unit or a shorter refresh).
 */
export function applyUnnerved(e: Enemy, ticks: number): boolean {
  if (!e.alive || e.def === null || ticks <= e.unnervedTicks) return false;
  e.unnervedTicks = ticks;
  return true;
}

/** Whether `e` is frozen in Stasis this tick (render and movement read it). */
export function inStasis(e: Readonly<Enemy>): boolean {
  return e.stasisTicks > 0;
}

/**
 * Stasis for `ticks` (enemies.md § 2.4; see the header): a non-boss is frozen unless it's already
 * in Stasis or immune; a boss takes Chilled 50% instead. Returns whether a Stasis landed (false
 * for a boss's conversion, immunity, or a dead unit).
 */
export function applyStasis(e: Enemy, ticks: number): boolean {
  if (!e.alive || e.def === null || ticks <= 0) return false;
  if (e.def.boss !== null) {
    applyChill(e, BOSS_CONVERTED_CHILL, ticks, true);
    return false;
  }
  if (e.stasisTicks > 0 || e.stasisImmuneTicks > 0) return false;
  e.stasisTicks = ticks;
  e.stasisImmuneTicks = ticks * STASIS_IMMUNITY_MULT;
  return true;
}

/** Pin immunity after a Pin ends (PIN_IMMUNITY_SEC), in ticks. */
export const PIN_IMMUNITY_TICKS = secToTicks(PIN_IMMUNITY_SEC);

/** Whether `e` is Pinned this tick (held in place; a pinned flyer is grounded). */
export function isPinned(e: Readonly<Enemy>): boolean {
  return e.pinnedTicks > 0;
}

/**
 * Pinned for `ticks` (enemies.md § 2.4; see the header): a non-boss is held unless it's already
 * pinned or immune; a boss takes Chilled 50% instead. Returns whether a Pin landed.
 */
export function applyPin(e: Enemy, ticks: number): boolean {
  if (!e.alive || e.def === null || ticks <= 0) return false;
  if (e.def.boss !== null) {
    applyChill(e, BOSS_CONVERTED_CHILL, ticks, true);
    return false;
  }
  if (e.pinnedTicks > 0 || e.pinImmuneTicks > 0) return false;
  e.pinnedTicks = ticks;
  return true;
}

/**
 * The statuses a tower's links add to its hits (Conductive: the Sprinkler Soaks from tier 1),
 * applied after the hit's damage like its tier's own effects. Soaked refreshes to the longer of
 * the remaining and the new duration (combat/damage.ts `applyEffects`' rule).
 */
export function applyLinkStatuses(t: Tower, e: Enemy): void {
  const soak = t.linkSoakedTicks;
  if (soak > e.soakedTicks && e.alive) e.soakedTicks = soak;
}

export function status(state: SimState): void {
  const enemies = state.enemies;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (!e.alive || e.def === null) continue;

    if (e.chillPct > 0) {
      if (e.chillTicks > 0) {
        e.chillTicks--;
      } else {
        e.chillPct = 0;
        e.chillMul = 1;
      }
    }
    if (e.soakedTicks > 0) e.soakedTicks--;
    if (e.unnervedTicks > 0) e.unnervedTicks--;
    if (e.stasisTicks > 0) e.stasisTicks--;
    else if (e.stasisImmuneTicks > 0) e.stasisImmuneTicks--;
    // A Pin's immunity starts the pass it ends, so the next Pin waits PIN_IMMUNITY_TICKS passes.
    if (e.pinnedTicks > 0) {
      if (--e.pinnedTicks === 0) e.pinImmuneTicks = PIN_IMMUNITY_TICKS;
    } else if (e.pinImmuneTicks > 0) e.pinImmuneTicks--;
    if (e.corrodedTicks > 0 && --e.corrodedTicks === 0) e.corrodedStacks = 0;
    if (e.markTicks > 0 && --e.markTicks === 0) e.markPct = 0;

    // Shields regenerate after the delay without damage (applyDamage resets the delay), unless
    // the enemy's data gives no regen.
    const shield = e.def.shield;
    if (shield !== null && e.shieldHp < shield.hp) {
      if (e.shieldRegenDelayTicks > 0) {
        e.shieldRegenDelayTicks--;
      } else {
        const next = e.shieldHp + shield.regenPerTick;
        e.shieldHp = next < shield.hp ? next : shield.hp;
      }
    }
  }
}
