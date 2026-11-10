// Swarmlings (design/towers.md § 7, the Scuttle Den; T600a slot, T604 fills it): each Den keeps up
// to its `maxAlive` swarmlings or Champions (owner allies), which rest at home, dash to a ground
// enemy in range (a burrowed one too; Champions leap onto flyers), latch on for the DoT and chill,
// then run home. They can't be harmed and always come home. Runs after the towers (tick.ts), so a
// Den sold this tick calls its swarmlings home first. Until T604 lands, createSim refuses the
// spawner attack (`attack.spawner`), so this pass has nothing to do.
import type { SimState } from './state.ts';
import type { TickContext } from './tick.ts';

export function swarmlings(_state: SimState, _ctx: TickContext): void {
  // T604.
}
