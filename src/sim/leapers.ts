// Leapers (design/towers.md § 7, the Sproing Pad; T700a slot, T704 fills it): each pad keeps its
// `leapers` (owner allies from the swarmling pool, kind 'leaper'), which boing to a target in
// range (always a flyer when one is in reach; Lookie Here: a Marked one first), bonk it
// (`LeaperBonk`; Big Bonk's splash), Pin a bonked flyer (`FlyerGrounded`: grounded, so ground
// towers hit it; a boss Chilled 50% instead), and boing home. They can't be harmed and always come
// home. Runs after the towers and the swarmlings (tick.ts). Until T704 lands, createSim refuses
// the leaper attack (`attack.leaper`; the Sproing Pad is also a stub, STUB_TOWER_TASKS), so this
// pass has nothing to do.
import type { SimState } from './state.ts';
import type { TickContext } from './tick.ts';

export function leapers(_state: SimState, _ctx: TickContext): void {
  // T704.
}
