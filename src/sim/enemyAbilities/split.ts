// Splitting (design/enemies.md § 3, § 5.1; the `splitter` tell): when a splitter is killed it
// releases `count` of `enemy` where it died, in its wave and with its tags (brood.ts: they count
// toward the wave's resolution and spawn with full HP). Overkill doesn't help; splash near the
// death point does. Only a kill splits: a splitter that leaks, or leaves with a driven-off boss,
// releases nothing.
//
// It runs from cleanup, over the tick's dead, not from the kill itself: cleanup has the run's
// context, so the children get the run's scaled def (Story HP) as wave-spawned units do, and they
// arrive before the wave's resolution is judged. They first move on the next tick.
import type { CompiledSplit } from '../../content/compiled.ts';
import type { Enemy } from '../entities.ts';
import { leakedThisTick } from '../medals.ts';
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { spawnBrood } from './brood.ts';

/** Whether a dead enemy was killed (not leaked, not gone with a leaving boss). */
export function wasKilled(e: Enemy): boolean {
  return !e.alive && e.uid !== 0 && !e.leaving && !leakedThisTick(e);
}

/** Spawns a killed splitter's children on its route (cleanup, for each dead splitter). */
export function splitOnDeath(
  state: SimState,
  ctx: TickContext,
  parent: Enemy,
  split: CompiledSplit,
): void {
  if (!wasKilled(parent)) return;
  spawnBrood(state, ctx, split.enemy, split.count, parent);
}
