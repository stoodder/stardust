// Huddle (design/enemies.md § 3, § 5.1; the `huddle` tell): allies within the leader's radius
// move at its pace (`Enemy.huddleUid`, which movement reads) and regenerate `regenPerTick` HP. Kill
// the leader to scatter them. The Elder's in Act I; Chitterbloom's phase 3 huddles her young.
import type { CompiledHuddle } from '../../content/compiled.ts';
import type { Enemy } from '../entities.ts';
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

/** One tick of a huddle leader's aura. TODO(T304c): pace and regeneration for nearby allies. */
export function huddleStep(
  _state: SimState,
  _ctx: TickContext,
  _leader: Enemy,
  _huddle: CompiledHuddle,
): void {
  // TODO(T304c)
}
