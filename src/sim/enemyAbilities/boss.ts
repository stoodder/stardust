// Bosses (design/enemies.md § 6, § 6.1): phases by HP share (`BossPhase` on each change, with at
// most BOSS_MAX_INVULNERABLE_SEC of invulnerability and a telegraph), each phase's abilities (a
// sneeze of young, burrows that surface with a Bunchling, haste, a huddle on nearby young), and the
// ending: at `endAtPct` a `driveOff` boss turns untargetable (`Enemy.leaving`) and leaves by the
// nearest map edge within BOSS_LEAVE_MAX_SEC with its young (`BossEnded`; no leak, no death). A
// leaking boss drains all integrity (BOSS_LEAK_DRAINS_ALL, movement), and a boss wave's clear
// bonus is tripled (BOSS_CLEAR_BONUS_MULT, cleanup). State: `Enemy.bossPhase`,
// `invulnerableTicks`, `leaving`, `abilityTicks`.
import type { CompiledBoss } from '../../content/compiled.ts';
import type { Enemy } from '../entities.ts';
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

/** One tick of a boss. TODO(T304c): phases, their abilities, and the ending. */
export function bossStep(
  _state: SimState,
  _ctx: TickContext,
  _boss: Enemy,
  _def: CompiledBoss,
): void {
  // TODO(T304c)
}
