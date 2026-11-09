// System 9: cleanup. Releases dead slots back to their pools' free lists, last in the tick, so
// every system this tick could still see (and name in events) what died.
import { poolReleaseDead } from '../pool.ts';
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

export function cleanup(state: SimState, ctx: TickContext): void {
  // A dead tower (sold or revoked) frees its tile before its slot can be reused.
  const towers = state.towers;
  for (let i = 0; i < towers.used; i++) {
    const t = towers.items[i]!; // i < used ≤ items.length
    if (!t.alive && t.uid !== 0) {
      const idx = t.row * ctx.map.cols + t.col;
      if (state.towerAtTile[idx] === t.slot) state.towerAtTile[idx] = -1;
    }
  }
  poolReleaseDead(towers);
  poolReleaseDead(state.enemies);
  poolReleaseDead(state.projectiles);
  poolReleaseDead(state.zones);
  poolReleaseDead(state.allies);
  // TODO(T105b): win/lose (set state.outcome, emit MapWon / MapLost).
}
