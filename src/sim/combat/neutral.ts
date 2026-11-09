// Neutral units (Gerald the mail drone; design/core-loop.md § 2.7, T304a). Towers that aren't
// holding fire target a neutral unit like an enemy (combat/targeting.ts treats it as any other),
// but it can't be hurt. The rules, settled by T304a:
// - **A shot aimed at it** (a hitscan shot whose target it is, or a shell or flak burst fired at
//   it that lands with it inside) plinks off: no damage, no status, one `NeutralHit`, and
//   `stats.neutralHits` + 1 (the Return to Sender Challenge reads it). A burst fired at it still
//   hits the real enemies around it.
// - **Area hits pass it by**: a burst aimed at someone else, a pulse, and a chain's jumps neither
//   hurt it nor count. The medal measures the player's choice to hold fire, and only a shot the
//   tower picked him for is a choice; flak catching him beside a Puffwing is not.
// - It never leaks (systems/movement.ts: `NeutralExited`) and is never killed, so it pays nothing.
// The damage pipeline (combat/damage.ts) never sees a neutral unit: each attack checks here first.
import type { Enemy } from '../entities.ts';
import { emit, type SimState } from '../state.ts';

/** Whether `e` is a neutral unit (its definition says `neutral`). */
export function isNeutral(e: Enemy): boolean {
  return e.def !== null && e.def.neutral;
}

/** A tower's aimed shot hit neutral unit `e`: it plinks off (NeutralHit, `stats.neutralHits`). */
export function hitNeutral(state: SimState, e: Enemy, towerUid: number): void {
  state.stats.neutralHits++;
  emit(state, {
    type: 'NeutralHit',
    uid: e.uid,
    enemy: e.def === null ? '' : e.def.id,
    towerUid,
    x: e.x,
    y: e.y,
  });
}
