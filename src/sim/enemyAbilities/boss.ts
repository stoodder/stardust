// Bosses (design/enemies.md § 6, § 6.1), one tick at a time. Phase changes and the ending are
// driven by hits (bossPhases.ts); this runs each phase's abilities, in this order:
// - Phase 1 begins as the boss spawns (BossPhase 1).
// - While invulnerable after a phase change, its ability timer waits.
// - A phase's `burrow`s come first: BOSS_BURROW_GAP_SEC into the phase (and after each
//   surfacing), it digs in for `durationTicks` (untargetable, at its own pace) and surfaces with
//   `surfaceSpawn`, `times` times (`Enemy.abilityCount` left).
// - Then its `spawn` (the sneeze): `count` of `enemy` every `everyTicks`, the first one
//   `everyTicks` into the phase (or after the last surfacing).
// - Every ability's tell is its timer's last BOSS_ABILITY_TELL_SEC (`bossTelling`).
// - **The interrupt** (enemies.md § 2.4; T508): while `isInterrupted` holds (on a boss, only
//   Unnerved: its Stasis converts to Chilled), a dig's or a sneeze's tell can't start or go on: the
//   ability is cancelled and its timer restarts from zero (a dig's BOSS_BURROW_GAP_SEC, a sneeze's
//   period).
//   A dig is an evade, so a Truthlight Mark (`noEvadeTicks`) blocks it the same way
//   (systems/status.ts `evadeBlocked`). A surfacing has no tell: nothing holds a boss underground.
// - `hastePct` speeds the boss (`Enemy.paceMul`, under HASTE_CAP), and `huddle` makes it a huddle
//   leader for its young (the abilities system runs it with the other huddles).
// - A shield-broken phase (the Penitent's phase 2; T506) begins when the shield breaks and
//   releases its shards; its shield re-forms while they live (shieldBroken.ts, run first, before
//   the invulnerability wait, since its re-form clock runs through everything).
// - M7 (T707): a `jettison` phase sheds its plating as it begins and hastes (jettison.ts, before
//   the invulnerability wait: the shedding is the phase's telegraph); a `hangar` phase launches
//   drones on its own timer (hangar.ts, after the wait). Hostile Takeover runs in the jams slot
//   (takeover.ts), so its jams land after the countdowns.
// Young are born in the boss's wave with its tags (brood.ts). A leaving boss is moved by leave.ts.
// Chitterbloom: (1) 100–60% sneezes 2 Nibblers every 5 s; (2) 60–25% burrows twice for 3 s and
// surfaces with a Bunchling each time; (3) 25–0% Haste 50% and a huddle on her young; `driveOff`
// at 0%.
import type { CompiledBoss, CompiledBossPhase, CompiledHuddle } from '../../content/compiled.ts';
import { BOSS_ABILITY_TELL_SEC, HASTE_CAP } from '../../content/rules.ts';
import { secToTicks } from '../../shared/time.ts';
import type { Enemy } from '../entities.ts';
import type { SimState } from '../state.ts';
import { cooldownHeld, evadeBlocked, isInterrupted } from '../systems/status.ts';
import type { TickContext } from '../tick.ts';
import { BOSS_BURROW_GAP_TICKS, enterBossPhase } from './bossPhases.ts';
import { spawnBrood } from './brood.ts';
import { hangarStep } from './hangar.ts'; // T707
import { jettisonStep } from './jettison.ts'; // T707
import { shieldBrokenStep } from './shieldBroken.ts';

export const BOSS_ABILITY_TELL_TICKS = secToTicks(BOSS_ABILITY_TELL_SEC);

/** The boss's current phase def, or null before phase 1. */
export function bossPhaseDef(boss: Enemy): CompiledBossPhase | null {
  const def = boss.def?.boss ?? null;
  if (def === null || boss.bossPhase === 0) return null;
  return def.phases[boss.bossPhase - 1] ?? null;
}

/** The huddle a boss leads in its current phase (Chitterbloom's phase 3), or null. */
export function bossHuddle(boss: Enemy): CompiledHuddle | null {
  return bossPhaseDef(boss)?.huddle ?? null;
}

/** What the boss's ability timer does when it runs out: render's tell picks its art from it. */
export type BossAbility = 'burrow' | 'surface' | 'spawn';

/** The ability the boss's timer leads to, or null if none is pending. */
export function bossNextAbility(boss: Enemy): BossAbility | null {
  const p = bossPhaseDef(boss);
  if (p === null || boss.leaving || boss.abilityTicks <= 0) return null;
  if (boss.burrowed) return 'surface';
  if (boss.abilityCount > 0 && p.burrow !== null) return 'burrow';
  return p.spawn !== null ? 'spawn' : null;
}

/** Whether the boss is telegraphing a dig or a sneeze this tick (a surfacing has no tell). */
export function bossTelling(boss: Enemy): boolean {
  const next = bossNextAbility(boss);
  return (
    (next === 'burrow' || next === 'spawn') &&
    boss.invulnerableTicks === 0 &&
    boss.abilityTicks <= BOSS_ABILITY_TELL_TICKS
  );
}

/**
 * Whether the boss's pending `next` ability can't tell this tick: a dig under the evade hook
 * (an interrupt or Truthlight), a sneeze under the interrupt; a surfacing never.
 */
function bossTellBlocked(boss: Readonly<Enemy>, next: BossAbility | null): boolean {
  if (next === 'burrow') return evadeBlocked(boss);
  if (next === 'spawn') return isInterrupted(boss);
  return false;
}

/** One tick of a live boss that isn't leaving. */
export function bossStep(state: SimState, ctx: TickContext, boss: Enemy, def: CompiledBoss): void {
  if (boss.bossPhase === 0) enterBossPhase(state, boss, def, 1, false);
  shieldBrokenStep(state, ctx, boss, def);
  const p = def.phases[boss.bossPhase - 1]!; // 1 ≤ bossPhase ≤ phases.length
  if (p.hastePct > 0) boss.paceMul *= 1 + (p.hastePct < HASTE_CAP ? p.hastePct : HASTE_CAP);
  if (p.jettison !== null) jettisonStep(state, boss, p.jettison); // T707: as the phase begins
  if (boss.invulnerableTicks > 0) {
    boss.invulnerableTicks--;
    return;
  }
  if (p.hangar !== null) {
    hangarStep(state, ctx, boss, p.hangar); // T707: its own launch timer
    return;
  }
  if (boss.abilityTicks <= 0) return;
  // Lulled (T607): a sneeze's or a dig's wait holds still on its beat (never underground).
  if (!boss.burrowed && boss.abilityTicks > BOSS_ABILITY_TELL_TICKS && cooldownHeld(boss)) return;
  const next = bossNextAbility(boss);
  const left = --boss.abilityTicks;
  if (left <= BOSS_ABILITY_TELL_TICKS && bossTellBlocked(boss, next)) {
    // Cancelled; its timer restarts from zero (next is 'burrow' or 'spawn' here).
    boss.abilityTicks = next === 'burrow' ? BOSS_BURROW_GAP_TICKS : (p.spawn?.everyTicks ?? 0);
    return;
  }
  if (left > 0) return;
  if (boss.burrowed) {
    boss.burrowed = false;
    boss.abilityCount--;
    const surface = p.burrow?.surfaceSpawn ?? null;
    if (surface !== null) spawnBrood(state, ctx, surface.enemy, surface.count, boss);
    boss.abilityTicks =
      boss.abilityCount > 0 ? BOSS_BURROW_GAP_TICKS : p.spawn !== null ? p.spawn.everyTicks : 0;
  } else if (boss.abilityCount > 0 && p.burrow !== null) {
    boss.burrowed = true;
    boss.abilityTicks = p.burrow.durationTicks;
  } else if (p.spawn !== null) {
    spawnBrood(state, ctx, p.spawn.enemy, p.spawn.count, boss);
    boss.abilityTicks = p.spawn.everyTicks;
  }
}
