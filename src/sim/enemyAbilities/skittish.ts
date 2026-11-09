// Skittish (design/enemies.md § 3; the `fleeing` modifier, D101; T400a seam, run by T402). When a
// Skitterkin within SKITTISH_RADIUS_TILES of a `fleeing` unit dies or is hushed (same layer or
// not), the unit gains Haste SKITTISH_HASTE_PCT for SKITTISH_HASTE_SEC (`Enemy.skittishTicks`,
// under HASTE_CAP; SkittishBolt). enemyAbilities ticks the haste down; the losses that trigger it
// are cleanup's kills and the hush rule's hushes.
//
// A stub until T402: createSim refuses Skittish groups beside the Hollow (`enemy.skittish`), and
// nothing sets `skittishTicks`, so it changes nothing.
import type { Enemy } from '../entities.ts';
import type { SimState } from '../state.ts';

/** Ticks a fleeing unit's Skittish haste down (T402). */
export function skittishStep(_state: SimState, _e: Enemy): void {
  // T402.
}
