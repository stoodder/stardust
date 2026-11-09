// A boss's phases and its ending, as hits drive them (design/enemies.md § 6, § 6.1). The damage
// pipeline hands a boss's HP damage here instead of killing it (combat/damage.ts), and the map
// script's `bossEnd` action calls startBossEnding (systems/triggers.ts). This module spawns
// nothing, so the damage pipeline can import it without the wave spawner.
// - Phases by HP share: when a hit takes the boss to its next phase's `fromPct`, the HP stops at
//   the threshold (no burst skips a phase), the phase begins (BossPhase), and the boss is
//   invulnerable for BOSS_PHASE_INVULNERABLE_SEC: its telegraph. Phase 1 begins as it spawns
//   (BossPhase 1, no invulnerability), from the abilities system.
// - The ending: at `endAtPct` (0 for `driveOff`) the HP stops there and the boss starts leaving
//   (`Enemy.leaving`: untargetable, off by the nearest map edge, never a leak or a kill;
//   BossEnded). `driveOff` takes its brood along: every other live unit of its wave leaves too.
//   `retreat` leaves alone (its remaining wave groups still spawn). `pivot` and `layToRest` are
//   refused at createSim until their maps (FEATURE_GATES `enemy.boss.pivot`, `.layToRest`).
import {
  BOSS_BURROW_GAP_SEC,
  BOSS_LEAVE_MAX_SEC,
  BOSS_PHASE_INVULNERABLE_SEC,
} from '../../content/rules.ts';
import type { CompiledBoss } from '../../content/compiled.ts';
import { secToTicks } from '../../shared/time.ts';
import type { Enemy } from '../entities.ts';
import { emit, type SimState } from '../state.ts';

export const BOSS_PHASE_INVULNERABLE_TICKS = secToTicks(BOSS_PHASE_INVULNERABLE_SEC);
export const BOSS_BURROW_GAP_TICKS = secToTicks(BOSS_BURROW_GAP_SEC);
export const LEAVE_MAX_TICKS = secToTicks(BOSS_LEAVE_MAX_SEC);

/** HP at or below a threshold plus this counts as reaching it (float slack, as DEAD_HP_EPS). */
const HP_EPS = 1e-9;

/**
 * Begins phase `phase` (1-based): its timers and burrow count, and BossPhase. `invulnerable` for
 * a change of phase (not for phase 1, which begins as the boss spawns).
 */
export function enterBossPhase(
  state: SimState,
  boss: Enemy,
  def: CompiledBoss,
  phase: number,
  invulnerable: boolean,
): void {
  const p = def.phases[phase - 1]!; // callers pass 1 ≤ phase ≤ phases.length
  boss.bossPhase = phase;
  boss.invulnerableTicks = invulnerable ? BOSS_PHASE_INVULNERABLE_TICKS : 0;
  boss.burrowed = false;
  boss.abilityCount = p.burrow === null ? 0 : p.burrow.times;
  boss.abilityTicks =
    p.burrow !== null ? BOSS_BURROW_GAP_TICKS : p.spawn !== null ? p.spawn.everyTicks : 0;
  emit(state, { type: 'BossPhase', uid: boss.uid, enemy: boss.def!.id, phase });
}

/**
 * Applies `damage` (after shields and armor) to a live boss: phase thresholds, then the ending.
 * Never kills. Returns the HP it took.
 */
export function bossDamage(state: SimState, boss: Enemy, damage: number): number {
  const enemy = boss.def!; // applyDamage checked it
  const def = enemy.boss!; // only bosses come here
  if (boss.bossPhase === 0) enterBossPhase(state, boss, def, 1, false);
  const before = boss.hp;
  const max = enemy.hp;
  const next = def.phases[boss.bossPhase]; // the phase after the current one, if any
  if (next !== undefined && before - damage <= next.fromPct * max + HP_EPS) {
    boss.hp = next.fromPct * max;
    enterBossPhase(state, boss, def, boss.bossPhase + 1, true);
    return before - boss.hp;
  }
  const end = def.endAtPct * max;
  if (before - damage <= end + HP_EPS) {
    boss.hp = end;
    startBossEnding(state, boss);
    return before - end;
  }
  boss.hp = before - damage;
  return damage;
}

/**
 * Sets a unit leaving: untargetable, off by the nearest map edge within LEAVE_MAX_TICKS (the
 * abilities system moves it; enemyAbilities/leave.ts).
 */
export function setLeaving(e: Enemy): void {
  e.leaving = true;
  e.burrowed = false;
  e.invulnerableTicks = 0;
  e.huddleUid = 0;
  e.abilityTicks = LEAVE_MAX_TICKS;
}

/**
 * Ends a live boss's fight its own way (`def.boss.ending`, or `how` from a `bossEnd` script
 * action): BossEnded, then it leaves, with its brood for `driveOff`. Does nothing to a boss
 * already leaving.
 */
export function startBossEnding(
  state: SimState,
  boss: Enemy,
  how: 'driveOff' | 'retreat' = boss.def!.boss!.ending === 'retreat' ? 'retreat' : 'driveOff',
): void {
  if (!boss.alive || boss.leaving) return;
  setLeaving(boss);
  emit(state, { type: 'BossEnded', uid: boss.uid, enemy: boss.def!.id, how });
  if (how !== 'driveOff') return;
  const pool = state.enemies;
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    if (!e.alive || e === boss || e.leaving || e.wave !== boss.wave) continue;
    if (e.def === null || e.def.neutral || e.def.boss !== null) continue;
    setLeaving(e);
  }
}
