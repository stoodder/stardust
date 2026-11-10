// Haste auras (design/enemies.md § 3 and § 5.3: the Expediter; T600a slot, T603 fills it): every
// other unit of the aura's faction within its radius has Haste at its `pct`, continuously
// (`Enemy.auraHastePct`: the strongest aura covering it, under HASTE_CAP with the unit's other
// haste; enemies.md § 2.4). A pass over every unit at once, last in the enemy abilities (index.ts),
// so movement reads this tick's value. Until T603 lands, createSim refuses a haste aura
// (`enemy.hasteAura`).
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

export function hasteAuraPass(_state: SimState, _ctx: TickContext): void {
  // T603.
}
