// Bearers (design/maps.md § 5.2: A3M5's Brood Hauler bearers; T700a slot, T706 fills it): a
// refugee group of `kind: 'bearer'` walks its route carrying the vats' dead home; one hushed costs
// the Protect asset 1 (`AssetHit`), and one that reaches its exit is home (`BearerHome`,
// `stats.bearersHome`; no meter change). Runs after the allies system (tick.ts), which walks them.
// Until T706 lands, createSim refuses bearer groups (`map.bearers`), so this pass has nothing to
// do.
import type { SimState } from './state.ts';
import type { TickContext } from './tick.ts';

export function bearers(_state: SimState, _ctx: TickContext): void {
  // T706.
}
