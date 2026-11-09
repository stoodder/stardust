// System 1b: wreckage. The salvage drone (design/maps.md § 3, the clearing rules): a `clear`
// command queues a wreckage tile; the drone clears the queue's head in WRECKAGE_CLEAR_SEC of sim
// time (a Salvage Crane in range: twice as fast, +25% salvage; Salvage Rights and Salvage Expert:
// `economy.salvage` and `economy.clearSpeed` modifiers), one tile at a time, at no cost. A cleared
// tile becomes its `underWreckage` tile (a pad, high ground, or a hidden power node), pays its
// `salvage`, counts `stats.wreckageCleared`, and emits `WreckageCleared`. State:
// `state.wreckage` (state.ts).
//
// T300a seam: declared and wired into the tick, a no-op until T304b. Until then a map's wreckage
// stays put (it is never buildable), `clear` is rejected `notImplemented`, and createSim refuses
// the salvage modifiers (FEATURE_GATES `modifier.economy.salvage`, `clearSpeed`).
import type { IdSpace } from '../../content/types.ts';
import type { Command, RejectReason } from '../commands.ts';
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

/** Advances the salvage drone. TODO(T304b): clear the queue's head; pay and announce it. */
export function wreckage(_state: SimState, _ctx: TickContext): void {
  // TODO(T304b): the drone and its queue.
}

/**
 * Validates and applies a `clear` command: the tile is uncleared wreckage not already queued,
 * and joins the drone's queue. TODO(T304b): rejected `notImplemented` until then.
 */
export function applyClearCommand(
  _state: SimState,
  _ctx: TickContext,
  _cmd: Extract<Command<IdSpace>, { type: 'clear' }>,
): RejectReason | null {
  return 'notImplemented';
}
