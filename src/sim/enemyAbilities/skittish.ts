// Skittish (design/enemies.md § 3; the `fleeing` modifier, D101). A `fleeing` Skitterkin unit
// bolts when a Skitterkin within SKITTISH_RADIUS_TILES dies or is hushed (on any layer): Haste
// SKITTISH_HASTE_PCT (under HASTE_CAP) for SKITTISH_HASTE_SEC (`Enemy.skittishTicks`). A loss while
// it's already bolting starts the haste over; only a fresh bolt emits SkittishBolt (the panic
// squeak). The losses come from cleanup (the tick's kills; a leak or a boss's leaving is no loss)
// and from the hush rule (hush.ts), so the haste runs from the next tick for its whole length.
// Units on the field only: a leaving unit (a driven-off boss's brood) doesn't bolt.
import {
  HASTE_CAP,
  SKITTISH_HASTE_PCT,
  SKITTISH_HASTE_SEC,
  SKITTISH_RADIUS_TILES,
} from '../../content/rules.ts';
import { secToTicks } from '../../shared/time.ts';
import type { Enemy } from '../entities.ts';
import { emit, type SimState } from '../state.ts';

export const SKITTISH_HASTE_TICKS = secToTicks(SKITTISH_HASTE_SEC);
const RADIUS_SQ = SKITTISH_RADIUS_TILES * SKITTISH_RADIUS_TILES;
const HASTE_MUL = 1 + (SKITTISH_HASTE_PCT < HASTE_CAP ? SKITTISH_HASTE_PCT : HASTE_CAP);

/** Whether `e` is Skittish: a `fleeing` Skitterkin unit (the tag is Skitterkin-only, D101). */
export function isSkittish(e: Enemy): boolean {
  return e.def !== null && e.def.faction === 'skitterkin' && e.tags.includes('fleeing');
}

/** One tick of a bolting unit's haste (enemyAbilities calls it while `skittishTicks` > 0). */
export function skittishStep(_state: SimState, e: Enemy): void {
  e.paceMul *= HASTE_MUL;
  e.skittishTicks--;
}

/** A Skitterkin died or was hushed at (x, y): every Skittish unit within the radius bolts. */
export function boltNear(state: SimState, x: number, y: number): void {
  const pool = state.enemies;
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    if (!e.alive || e.leaving || !isSkittish(e)) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    if (dx * dx + dy * dy > RADIUS_SQ) continue;
    if (e.skittishTicks === 0) emit(state, { type: 'SkittishBolt', uid: e.uid });
    e.skittishTicks = SKITTISH_HASTE_TICKS;
  }
}
