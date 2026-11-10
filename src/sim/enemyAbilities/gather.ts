// Gathering (design/enemies.md § 5.4, the `consumer` tell: the Maw; T600a slot, T602 fills it):
// every `gather.everyTicks`, after its tendril tell, a gatherer draws in the nearest eligible unit
// within its radius (a non-boss Hollow unit, or at most one Skitterkin enemy or refugee: its one
// hush), adding that unit's current HP to its own HP and max HP (`Enemy.bonusMaxHp`), its leak
// and bounty by the rule (GatherTell, Gathered). Never an Everglow or Aelari unit, a boss, or a
// Skitterkin tower's swarmlings. A pass over every unit at once, after the hush rule's (enemy
// abilities' index.ts). Until T602 lands, createSim refuses a gatherer (`enemy.gather`).
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

export function gatherPass(_state: SimState, _ctx: TickContext): void {
  // T602.
}
