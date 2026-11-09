// The `specialize` command: tier 3 → tier 4, choosing spec A or B (design/towers.md § 3.1).
// A seam for T202b, wired into applyCommands; until it lands every specialize is rejected.
import type { IdSpace } from '../content/types.ts';
import type { Command, RejectReason } from './commands.ts';
import type { SimState } from './state.ts';
import type { TickContext } from './tick.ts';

type SpecializeCommand = Extract<Command<IdSpace>, { type: 'specialize' }>;

/**
 * Validates and applies a `specialize` command; returns null on success, else why it was
 * rejected (`noSuchTower`, `noSpecs`, `specLocked`, `needsTier3`, `alreadySpecialized`,
 * `cantAfford`). On success it sets `tower.spec`, tier 4, and `state.linksDirty`, and emits
 * TowerSpecialized.
 */
export function applySpecialize(
  _state: SimState,
  _ctx: TickContext,
  _cmd: SpecializeCommand,
): RejectReason | null {
  // TODO(T202b): specializations (spec patches compile to a tier-4 CompiledTier).
  return 'notImplemented';
}
