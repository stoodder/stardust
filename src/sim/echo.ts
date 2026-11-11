// Thrum's echo (design/maps.md § 5.5, `spared_quiet_wave = false`; T800a slot, T807 fills it): a
// scripted ally of kind `echo` (`spawnEcho`) that drifts out of the Unsung into the song on its
// own. Untargetable and unhurt, it is laid to rest in gold where it stands (`EchoArrived`), for no
// rest points either way. Runs after the choir (tick.ts). Until T807 lands, createSim refuses
// `spawnEcho` (SCRIPT_GATES), so this pass has nothing to do.
import type { SimState } from './state.ts';
import type { TickContext } from './tick.ts';

export function echo(_state: SimState, _ctx: TickContext): void {
  // T807.
}

/** The `spawnEcho` action (T807). */
export function spawnEcho(_state: SimState, _ctx: TickContext, _id: string): void {
  // T807.
}
