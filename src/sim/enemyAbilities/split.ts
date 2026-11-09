// Splitting (design/enemies.md § 3, § 5.1; the `splitter` tell): on death the unit releases
// `count` of `enemy` at its route distance, in its wave (they count toward the wave's
// resolution), with full HP. Overkill doesn't help; splash near the death point does. Called from
// killEnemy (combat/damage.ts) for an enemy whose definition has `split`.
import type { CompiledSplit } from '../../content/compiled.ts';
import type { Enemy } from '../entities.ts';
import type { SimState } from '../state.ts';

/** Spawns a dead splitter's children. TODO(T304c): spawn them on the parent's route. */
export function splitOnDeath(_state: SimState, _parent: Enemy, _split: CompiledSplit): void {
  // TODO(T304c)
}
