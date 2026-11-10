// Blockers (design/maps.md § 5.4: Bricks at the Gap; T600a slot, T605 fills it): an ally post with
// `block` holds up to `capacity` non-boss ground units at a time where the path passes its post
// (`Enemy.blockerUid`; they stand still instead of passing), and its health follows its map's
// wave timeline only (`block.health`, never below BLOCKER_HEALTH_FLOOR; D141). Runs after the
// enemy abilities and before movement (tick.ts), so a held unit doesn't step this tick. Until T605
// lands, createSim refuses a blocker (`ally.blocker`), so this pass has nothing to do.
import type { SimState } from './state.ts';
import type { TickContext } from './tick.ts';

export function blockers(_state: SimState, _ctx: TickContext): void {
  // T605.
}
