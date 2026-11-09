// Fire control: the `holdFire` and `spareRunners` commands (design/core-loop.md § 2.7). Seams for
// T206a, wired into applyCommands; until it lands both are rejected.
import type { IdSpace } from '../content/types.ts';
import type { Command, RejectReason } from './commands.ts';
import type { SimState } from './state.ts';
import type { TickContext } from './tick.ts';

type HoldFireCommand = Extract<Command<IdSpace>, { type: 'holdFire' }>;
type SpareRunnersCommand = Extract<Command<IdSpace>, { type: 'spareRunners' }>;

/**
 * Sets Hold Fire on one tower (`tower.holdFire`) or on all (`state.holdFireAll`, inherited by
 * towers built while it's on), counts `stats.holdFireUses`, and emits HoldFireChanged. Returns
 * null on success, else why it was rejected (`noSuchTower`).
 */
export function applyHoldFire(
  _state: SimState,
  _ctx: TickContext,
  _cmd: HoldFireCommand,
): RejectReason | null {
  // TODO(T206a): Hold Fire.
  return 'notImplemented';
}

/**
 * Sets the spare-runners filter on one tower (`tower.spareRunners`) or on all
 * (`state.spareRunnersAll`, inherited by towers built while it's on), and emits
 * SpareRunnersChanged. Returns null on success, else why it was rejected (`noSuchTower`).
 */
export function applySpareRunners(
  _state: SimState,
  _ctx: TickContext,
  _cmd: SpareRunnersCommand,
): RejectReason | null {
  // TODO(T206a): the spare-runners filter.
  return 'notImplemented';
}
