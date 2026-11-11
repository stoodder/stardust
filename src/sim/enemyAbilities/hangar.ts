// A boss's hangar (design/enemies.md § 6; D146; T707): "Shareholder Value"'s phase 1 launches
// `count` Compliance Drones (`enemy`) every `everyTicks` from its position (BossPhaseDef.hangar),
// run from boss.ts in the boss's phase step. The sneeze's rules (boss.ts), on the boss's
// `abilityTicks`:
// - The first launch comes `everyTicks` into the phase, and one every `everyTicks` after.
// - **The tell** (every boss ability's, at least BOSS_MIN_TELL_SEC): the timer's last
//   BOSS_ABILITY_TELL_SEC, the hangar door opening (`hangarTelling`; render's TakeoverView).
// - **The interrupt** (§ 2.4, § 6): while `isInterrupted` holds (on a boss, Unnerved), a launch's
//   tell can't start or go on: it's cancelled and its timer restarts from zero. Lulled holds the
//   wait (not the tell) on its beat (`cooldownHeld`).
// - **The drones** are born through spawnBrood (brood.ts), so they join the boss's wave, carry its
//   tags, walk its route, and spawn from the run's scaled def (`broodDef`): C4 Purge's −2 Everglow
//   armor and Story difficulty reach them like any other unit. A `driveOff` takes them along.
// - A phase change resets the timer (bossPhases.ts `enterBossPhase`; its invulnerability waits).
import type { CompiledBossPhase } from '../../content/compiled.ts';
import { BOSS_ABILITY_TELL_SEC } from '../../content/rules.ts';
import { secToTicks } from '../../shared/time.ts';
import type { Enemy } from '../entities.ts';
import type { SimState } from '../state.ts';
import { cooldownHeld, isInterrupted } from '../systems/status.ts';
import type { TickContext } from '../tick.ts';
import { spawnBrood } from './brood.ts';

type CompiledHangar = NonNullable<CompiledBossPhase['hangar']>;

/** A launch's tell (boss.ts's BOSS_ABILITY_TELL_TICKS; not imported: boss.ts imports this). */
const BOSS_ABILITY_TELL_TICKS = secToTicks(BOSS_ABILITY_TELL_SEC);

/** Whether the boss's hangar door is opening this tick (its launch's tell). */
export function hangarTelling(boss: Readonly<Enemy>, h: CompiledHangar | null): boolean {
  return (
    h !== null &&
    !boss.leaving &&
    boss.invulnerableTicks === 0 &&
    boss.abilityTicks > 0 &&
    boss.abilityTicks <= BOSS_ABILITY_TELL_TICKS
  );
}

/** One tick of a boss's hangar (after its invulnerability; see the header). */
export function hangarStep(state: SimState, ctx: TickContext, boss: Enemy, h: CompiledHangar): void {
  if (boss.abilityTicks <= 0) boss.abilityTicks = h.everyTicks; // the phase began
  if (boss.abilityTicks > BOSS_ABILITY_TELL_TICKS && cooldownHeld(boss)) return; // Lulled
  const left = --boss.abilityTicks;
  if (left <= BOSS_ABILITY_TELL_TICKS && isInterrupted(boss)) {
    boss.abilityTicks = h.everyTicks; // cancelled: the timer restarts from zero
    return;
  }
  if (left > 0) return;
  spawnBrood(state, ctx, h.enemy, h.count, boss);
  boss.abilityTicks = h.everyTicks;
}
