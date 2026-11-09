// Burrowing (design/enemies.md § 3, § 5.1; the `burrower` tell): every `everyTicks` the unit
// sprays dirt for `tellTicks`, then digs in for `durationTicks` at `speedMul`, untargetable but for
// the burrowed answers (Scuttle Den, Underfoot; § 2.6), and surfaces. Stasis or Unnerved block the
// dig (the interrupt rule, § 2.4). State: `Enemy.burrowed`, `Enemy.abilityTicks`.
import type { CompiledBurrow } from '../../content/compiled.ts';
import type { Enemy } from '../entities.ts';
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

/** One tick of a burrower's cycle. TODO(T304c): the tell, the dig, and the surfacing. */
export function burrowStep(
  _state: SimState,
  _ctx: TickContext,
  _e: Enemy,
  _burrow: CompiledBurrow,
): void {
  // TODO(T304c)
}
