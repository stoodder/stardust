// A boss's phases and its ending, as hits drive them (design/enemies.md § 6, § 6.1). The damage
// pipeline hands a boss's HP damage here instead of killing it (combat/damage.ts), and the map
// script's `bossEnd` action calls startBossEnding (systems/triggers.ts). This module spawns
// nothing, so the damage pipeline can import it without the wave spawner.
// - Phases by HP share: when a hit takes the boss to its next HP phase's `fromPct`, the HP stops
//   at the threshold (no burst skips a phase), the phase begins (BossPhase), and the boss is
//   invulnerable for BOSS_PHASE_INVULNERABLE_SEC: its telegraph. Phase 1 begins as it spawns
//   (BossPhase 1, no invulnerability), from the abilities system. A shield-broken phase
//   (`onShieldBroken`: the Penitent's phase 2) is never reached by HP: it begins when the boss's
//   shield breaks (shieldBroken.ts, which also spawns its shards), so the HP path skips it.
// - The ending: at `endAtPct` (0 for `driveOff`) the HP stops there and the boss's ending starts.
//   `driveOff` and `retreat` set it leaving (`Enemy.leaving`: untargetable, off by the nearest
//   map edge, never a leak or a kill; BossEnded). `driveOff` takes its brood along: every other
//   live unit of its wave leaves too. `retreat` leaves alone (its remaining wave groups still
//   spawn). `pivot` (T506; pivot.ts) stands its faction down and leaves its ward in its place.
//   `layToRest` (the Unsung, T808) is never reached by HP: its last phase's floor holds it, and
//   unsung.ts lays it to rest when the song's countdown completes.
// - A phase's HP floor (`floorPct`, the Unsung's Song; T808): a hit stops at the floor, so the HP
//   never falls below it while the phase lasts (the damage past it still feeds the song: song.ts).
// - A phase's time floor (`notBeforeTicks`, the Unsung's forms 3 and 4; D156): reached by HP before
//   it is that long into the map's script phase, the HP holds at the phase's threshold and the
//   phase waits; the next hit after the time comes begins it (`phaseWaitTicks`). A split boss's
//   rise into such a phase is bossMerge.ts's.
import {
  BOSS_BURROW_GAP_SEC,
  BOSS_LEAVE_MAX_SEC,
  BOSS_PHASE_INVULNERABLE_SEC,
} from '../../content/rules.ts';
import type { CompiledBoss } from '../../content/compiled.ts';
import { secToTicks } from '../../shared/time.ts';
import type { Enemy } from '../entities.ts';
import { emit, type SimState } from '../state.ts';
import { pivotBoss } from './pivot.ts';

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
    p.burrow !== null
      ? BOSS_BURROW_GAP_TICKS
      : p.spawn !== null
        ? p.spawn.everyTicks
        : p.adds !== null
          ? p.adds.everyTicks // T808: the Song's first adds one period in
          : 0;
  boss.digToDist = -1; // T808
  if (boss.def!.phase === null) {
    boss.phased = false; // T808: a phase-scoped Phased cycle starts afresh (unsung.ts)
    boss.phaseTicks = 0;
  }
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
  const next = nextHpPhase(def, boss.bossPhase);
  if (next > 0 && before - damage <= def.phases[next - 1]!.fromPct * max + HP_EPS) {
    boss.hp = def.phases[next - 1]!.fromPct * max; // nextHpPhase returns 0 or a phase number
    // D156: a phase with a time floor holds the HP at its threshold until its time comes.
    if (phaseWaitTicks(state, def.phases[next - 1]!) > 0) {
      if (before < boss.hp) boss.hp = before;
      return before - boss.hp;
    }
    enterBossPhase(state, boss, def, next, true);
    return before - boss.hp;
  }
  const floor = def.phases[boss.bossPhase - 1]!.floorPct * max; // 1 ≤ bossPhase ≤ phases.length
  if (floor > 0 && before - damage <= floor + HP_EPS) {
    // T808: the HP floor holds (the Unsung's Song).
    boss.hp = before > floor ? floor : before;
    return before - boss.hp;
  }
  const end = def.endAtPct * max;
  if (before - damage <= end + HP_EPS) {
    boss.hp = end;
    if (def.ending !== 'layToRest') startBossEnding(state, boss); // the song ends it (unsung.ts)
    return before - end;
  }
  boss.hp = before - damage;
  return damage;
}

/**
 * The ticks before boss phase `p` may begin (its `notBeforeTicks` into the map's current script
 * phase, `state.phaseTick`; D156), 0 when it may now or has no time floor.
 */
export function phaseWaitTicks(
  state: Pick<SimState, 'tick' | 'phaseTick'>,
  p: Pick<CompiledBoss['phases'][number], 'notBeforeTicks'>,
): number {
  if (p.notBeforeTicks <= 0) return 0;
  const left = p.notBeforeTicks - (state.tick - state.phaseTick);
  return left > 0 ? left : 0;
}

/**
 * The number (1-based) of the first phase after `phase` that HP reaches (not a shield-broken
 * one), or 0 for none.
 */
export function nextHpPhase(def: CompiledBoss, phase: number): number {
  for (let i = phase; i < def.phases.length; i++) {
    if (!def.phases[i]!.onShieldBroken) return i + 1; // i < length
  }
  return 0;
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
 * action): a `pivot` hands over to pivot.ts; otherwise BossEnded, then it leaves, with its brood
 * for `driveOff`. Does nothing to a boss already leaving.
 */
export function startBossEnding(
  state: SimState,
  boss: Enemy,
  how: 'driveOff' | 'retreat' | 'pivot' = defaultEnding(boss),
): void {
  if (!boss.alive || boss.leaving) return;
  if (how === 'pivot') {
    pivotBoss(state, boss);
    return;
  }
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

/** A boss's own ending as startBossEnding runs it (`layToRest` is unsung.ts's, never this). */
function defaultEnding(boss: Enemy): 'driveOff' | 'retreat' | 'pivot' {
  const ending = boss.def!.boss!.ending; // startBossEnding's callers pass a boss
  return ending === 'retreat' || ending === 'pivot' ? ending : 'driveOff';
}
