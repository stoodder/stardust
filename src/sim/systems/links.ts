// System 4b: links. Recomputes the synergy links (design/towers.md § 6) and every tower's dynamic
// bonuses (`linkMask`, `flat*`, `pct*`: links, auras, tiles) when `state.linksDirty` says
// something changed, then clears it, emitting LinkFormed and LinkBroken. It runs after status (a
// jam expiring changes links) and before the towers fire. Never per tick: only when dirty.
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

export function links(state: SimState, _ctx: TickContext): void {
  if (!state.linksDirty) return;
  // TODO(T202a): links, tile bonuses, and the stacking caps.
  state.linksDirty = false;
}
