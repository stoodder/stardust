// System 7b: allies. Friendly non-tower units (design/maps.md § 5.4): movement by mode, attacks,
// and (later) hushes and song auras. It runs after the towers, so towers pick their targets
// first. Allies never target `quiet_wave`, `youngling`, or `fleeing` units. M2 has Bricks's post.
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

export function allies(_state: SimState, _ctx: TickContext): void {
  // TODO(T207a): the allies system (Bricks's post), spawned with the companion.
}
