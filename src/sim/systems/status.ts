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
//
// Marked (enemies.md § 2.4; T508, the Seer's Lantern): `applyMarked` is a tower's way in (a tier's
// `marked` effect through combat/damage.ts `applyEffects`, Lightsong's extra here, All-Seeing's
// area in systems/markArea.ts); the highest-only rule itself is combat/damage.ts `applyMark`.
// - **Truthlight** (`noEvade`): a `noEvade` Mark also sets `noEvadeTicks` to its duration (the
//   longer of the remaining and the new, whichever Mark wins on `markPct`), counting the tick it
//   lands, on any unit, a boss too (Marked is "Normal" on bosses). While it lasts the unit can't
//   evade: `evadeBlocked` holds, so a blink, a phase, a dig (a unit's or a boss's) can't start or go
//   on and its cooldown restarts from zero, as an interrupt does; and a cloaked unit stays Revealed
//   (systems/detection.ts). Its other abilities (a shield pulse, a hush, a sneeze) go on.
// - **Lightsong** (`Tower.linkMarkPct`, systems/links.ts): each of the tower's own Marks lands
//   again at + linkMarkPct (`applyLinkStatuses`), so the stronger one wins.
//
// Lulled (enemies.md § 2.4; T607, the Hum Choir [Lullaby]): `lullPass`, at the end of this pass,
// sets `Enemy.lulled` on every unit inside a Lullaby's radius this tick (a tier's `lull`, centre
// to centre, × its `supportStat` radius tune-up; both layers: a song reaches flyers). Never on a neutral unit, nor on one nothing the
// player sends reaches (layers.ts `untargetable`: burrowed, Phased, leaving, or cloaked and
// unrevealed, the cloak's "no auras"). It doesn't stack: one Lullaby or three, the same.
// - **The beat:** a Lulled unit's ability cooldowns run LULLED_COOLDOWN_MULT (×1.5) longer, a boss's
//   LULLED_COOLDOWN_MULT_BOSS (×1.25), in whole ticks: `lullBeat` counts the Lulled ticks round
//   `lullPeriod` (3; a boss's 5) and `cooldownHeld` holds every cooldown still on the tick it comes
//   back to 0, so a cooldown advances on 2 ticks of 3 (a boss's 4 of 5). Leaving the radius
//   resets the beat.
// - **What it stretches:** the wait before a tell, never the tell itself or a duration: the
//   Digger's surface stretch (burrow.ts), a shield pulse (pulse.ts), a blink (blink.ts), a phase's
//   solid stretch (phase.ts), a boss's sneezes and digs (boss.ts), and a Maw's gather (gather.ts).
//   Auras (a haste ring, a shield aura, a huddle) have no cooldown, so it doesn't touch them; nor a
//   hush (contact, no timer) or a shield's own regeneration (a status, not an ability).
// - It interrupts nothing (the interrupt hook is Stasis's and Unnerved's).
//
// Gravity Well (towers.md § Stasis Bloom; T608): a Bloom's pull (systems/fields.ts) sets
// `pullImmuneTicks` to the spec's 20 s, and this pass counts it down, so a unit is pulled at most
// once every 20 s whichever Bloom pulses it. The field's chill and Stasis go in through
// `applyChill` and `applyStasis` like any other.
import {
  BOSS_CONVERTED_CHILL,
  LULLED_COOLDOWN_MULT,
  LULLED_COOLDOWN_MULT_BOSS,
  PIN_IMMUNITY_SEC,
  STASIS_IMMUNITY_MULT,
  UNNERVED_SLOW,
} from '../../content/rules.ts';
import { secToTicks } from '../../shared/time.ts';
import { applyChill, applyMark } from '../combat/damage.ts';
import { distSqTo } from '../combat/targeting.ts';
import { untargetable } from '../enemyAbilities/layers.ts';
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

/**
 * **The evade hook** (towers.md § Seer's Lantern [Truthlight]): whether `e` can't evade this tick:
 * interrupted (`isInterrupted`), or under a Truthlight Mark (`noEvadeTicks`). The evasive abilities
 * ask it in place of `isInterrupted`: the blink (blink.ts), the phase (phase.ts `phaseBlocked`),
 * and the dig (burrow.ts; a boss's in boss.ts). The cloak's half is systems/detection.ts.
 */
export function evadeBlocked(e: Readonly<Enemy>): boolean {
  return e.noEvadeTicks > 0 || isInterrupted(e);
}

/** Whether `e` is Marked this tick (render's mark reads it). */
export function isMarked(e: Readonly<Enemy>): boolean {
  return e.markTicks > 0 && e.markPct > 0;
}

/**
 * Marked `pct` for `ticks` (enemies.md § 2.4: highest only; combat/damage.ts `applyMark`), and
 * with `noEvade` (Truthlight) no evading for `ticks` (see the header). A dead unit takes nothing.
 */
export function applyMarked(e: Enemy, pct: number, ticks: number, noEvade: boolean): void {
  if (!e.alive || e.def === null) return;
  applyMark(e, pct, ticks);
  if (noEvade && ticks > e.noEvadeTicks) e.noEvadeTicks = ticks;
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
 * The statuses a tower's links add to its hits (Conductive: the Sprinkler Soaks from tier 1;
 * Lightsong: the Lantern's Marks +5%), applied after the hit's damage and its tier's own effects.
 * Soaked refreshes to the longer of the remaining and the new duration (combat/damage.ts
 * `applyEffects`' rule); each of the tier's Marks lands again at + `linkMarkPct` (highest only, so
 * the linked Mark is the one that holds), carrying its `noEvade`.
 */
export function applyLinkStatuses(t: Tower, e: Enemy): void {
  const soak = t.linkSoakedTicks;
  if (soak > e.soakedTicks && e.alive) e.soakedTicks = soak;
  const plus = t.linkMarkPct;
  if (plus <= 0 || t.tierDef === null || !e.alive || untargetable(e)) return;
  const effects = t.tierDef.effects;
  for (let i = 0; i < effects.length; i++) {
    const fx = effects[i]!; // i < length
    if (fx.status === 'marked') applyMarked(e, fx.pct + plus, fx.durationTicks, fx.noEvade);
  }
}

/**
 * Lulled's beat period in ticks for a cooldown run `mult` times longer: a cooldown holds still on
 * one tick of each period, so it advances on (period − 1) of them (×1.5: 3; ×1.25: 5).
 */
export function lullPeriod(mult: number): number {
  return Math.round(mult / (mult - 1));
}

const LULL_PERIOD = lullPeriod(LULLED_COOLDOWN_MULT);
const LULL_PERIOD_BOSS = lullPeriod(LULLED_COOLDOWN_MULT_BOSS);

/** Whether `e` is Lulled this tick (render's marker reads it). */
export function isLulled(e: Readonly<Enemy>): boolean {
  return e.lulled;
}

/**
 * **The Lulled hook** (see the header): whether `e`'s ability cooldowns hold still this tick. Every
 * enemy ability with a cooldown asks it while its timer is still above its tell.
 */
export function cooldownHeld(e: Readonly<Enemy>): boolean {
  return e.lulled && e.lullBeat === 0;
}

/**
 * A Lullaby's reach, squared, in tiles²: its radius × its tower's `supportStat` radius tune-up
 * (`Tower.detectPct`, which systems/links.ts sets to it for every tower; the Choir's rank 3).
 */
export function lullReachSq(
  lull: { readonly radiusTiles: number; readonly radiusSq: number },
  radiusPct: number,
): number {
  if (radiusPct === 0) return lull.radiusSq;
  const r = lull.radiusTiles * (1 + radiusPct);
  return r * r;
}

/** Sets `lulled` and steps `lullBeat` for every live unit (see the header). */
export function lullPass(state: SimState): void {
  const towers = state.towers;
  let any = false;
  for (let j = 0; j < towers.used; j++) {
    const t = towers.items[j]!; // j < used ≤ items.length
    if (t.alive && t.tierDef !== null && t.tierDef.lull !== null) any = true;
  }
  const enemies = state.enemies;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    let lulled = false;
    if (any && e.alive && e.def !== null && !e.def.neutral && !untargetable(e)) {
      for (let j = 0; j < towers.used && !lulled; j++) {
        const t = towers.items[j]!; // j < used ≤ items.length
        const lull = t.alive && t.tierDef !== null ? t.tierDef.lull : null;
        if (lull !== null && distSqTo(t.x, t.y, e) <= lullReachSq(lull, t.detectPct)) lulled = true;
      }
    }
    e.lulled = lulled;
    if (!lulled) e.lullBeat = 0;
    else {
      const period = e.def!.boss !== null ? LULL_PERIOD_BOSS : LULL_PERIOD; // lulled: has a def
      e.lullBeat = (e.lullBeat + 1) % period;
    }
  }
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
    if (e.corrodedTicks > 0 && --e.corrodedTicks === 0) {
      e.corrodedStacks = 0;
      e.corrodedShieldMul = 1;
    }
    if (e.markTicks > 0 && --e.markTicks === 0) e.markPct = 0;
    if (e.noEvadeTicks > 0) e.noEvadeTicks--;
    if (e.pullImmuneTicks > 0) e.pullImmuneTicks--; // Gravity Well's (T608; systems/fields.ts)

    // Shields regenerate after the delay without damage (applyDamage resets the delay), unless
    // the enemy's data gives no regen; Corrosive Kiss's Corroded slows it (`corrodedShieldMul`).
    const shield = e.def.shield;
    if (shield !== null && e.shieldHp < shield.hp) {
      if (e.shieldRegenDelayTicks > 0) {
        e.shieldRegenDelayTicks--;
      } else {
        const next = e.shieldHp + shield.regenPerTick * e.corrodedShieldMul;
        e.shieldHp = next < shield.hp ? next : shield.hp;
      }
    }
  }
  lullPass(state);
}
