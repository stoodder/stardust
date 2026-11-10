// Stillness, Ves'thara's companion ability (design/core-loop.md § 3.2; T507): a `stasisArea` effect.
// - **Targeted, instant:** cast on any tile of the map, it lands on the cast's tick (no zone, no
//   delay): every unit whose centre is within its radius of the tile's centre (inclusive, like a
//   strike) goes into Stasis for its duration through `applyStasis`, so the Stasis rules hold: it
//   lands only on a unit neither in Stasis nor immune (then 2× immunity), interrupts abilities
//   (enemies.md § 2.4: a tell under way is cancelled), and a boss takes Chilled 50% instead.
// - **Who:** ground and air alike (Ves'thara's stillness isn't a shell; A2M6's Rift Moth flocks
//   are its target). Never a unit no status can reach: cloaked out, burrowed, Phased, or leaving
//   (enemyAbilities/layers.ts `untargetable`). Never a neutral unit (Gerald): he isn't an enemy.
// - **Radius:** the effect's, through `abilityStats` (a `radius` modifier naming it would apply).
// - **Events:** AbilityUsed (by the abilities system), then StasisArea with how many units entered
//   Stasis (a boss's converted chill doesn't count).
import type { CompiledAbilityEffect } from '../../content/compiled.ts';
import { isNeutral } from '../combat/neutral.ts';
import { untargetable } from '../enemyAbilities/layers.ts';
import { emit, type SimState } from '../state.ts';
import { applyStasis } from '../systems/status.ts';

type StasisAreaEffect = Extract<CompiledAbilityEffect, { kind: 'stasisArea' }>;

/**
 * Stillness cast from `slot` at tile (col, row) with radius `radiusTiles`: Stasis on every unit
 * it reaches there, then StasisArea. Returns how many entered Stasis.
 */
export function castStillness(
  state: SimState,
  e: StasisAreaEffect,
  col: number,
  row: number,
  radiusTiles: number,
  slot: 1 | 2,
): number {
  const x = col + 0.5;
  const y = row + 0.5;
  const r2 = radiusTiles * radiusTiles;
  const enemies = state.enemies;
  let frozen = 0;
  // Stasis changes no unit's place, so one pass in slot order picks and freezes alike.
  for (let i = 0; i < enemies.used; i++) {
    const u = enemies.items[i]!; // i < used ≤ items.length
    if (!u.alive || u.def === null || untargetable(u) || isNeutral(u)) continue;
    const dx = u.x - x;
    const dy = u.y - y;
    if (dx * dx + dy * dy > r2) continue;
    if (applyStasis(u, e.durationTicks)) frozen++;
  }
  emit(state, { type: 'StasisArea', slot, x, y, radiusTiles, frozen });
  return frozen;
}
