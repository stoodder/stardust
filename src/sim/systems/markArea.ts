// Area Marks (design/towers.md § Seer's Lantern [All-Seeing]; T508), run by the detection system
// (systems/detection.ts) right after the reveals, so every tower that fires this tick sees them and
// a cloaked unit the Lantern just revealed is Marked too. The rules:
// - Each live tower whose tier has a `markArea` Marks every enemy whose centre is within its
//   radius (inclusive) at `pct` + its Lightsong `linkMarkPct`, for AREA_MARK_TICKS, every tick,
//   so a Mark lasts AREA_MARK_SEC after the unit walks out (the Lantern's beam Marks' 1 s).
// - It reaches what the tower's layers could touch: a live unit on a layer the tier hits (ground
//   and air for the Lantern), not burrowed, Phased, leaving, or cloaked out (layers.ts
//   `untargetable`), and never a neutral one (Gerald: a Mark is no shot at him, but nothing lands
//   on him either).
// - The radius is the tier's alone: high ground, power nodes, and the darkness change attack range,
//   not this (detection's rule).
// - It's sight, not fire: a tower holding fire keeps Marking (as it keeps detecting).
// - Highest only (combat/damage.ts `applyMark`): a stronger Mark (the beam's +20%) holds over it.
// Allocation-free; a map with no area-Mark tower costs one pass over the tower pool.
import { AREA_MARK_SEC } from '../../content/rules.ts';
import { secToTicks } from '../../shared/time.ts';
import { isNeutral } from '../combat/neutral.ts';
import { canHit } from '../combat/targeting.ts';
import type { Tower } from '../entities.ts';
import type { SimState } from '../state.ts';
import { applyMarked } from './status.ts';

/** How long an area Mark outlasts the unit leaving the radius, in ticks (AREA_MARK_SEC). */
export const AREA_MARK_TICKS = secToTicks(AREA_MARK_SEC);

/** Every area-Mark tower Marks the enemies in its radius (see the header). */
export function markAreas(state: SimState): void {
  const towers = state.towers;
  for (let j = 0; j < towers.used; j++) {
    const t = towers.items[j]!; // j < used ≤ items.length
    const area = t.alive ? (t.tierDef?.markArea ?? null) : null;
    if (area !== null) markAround(state, t, area.radiusSq, area.pct + t.linkMarkPct);
  }
}

function markAround(state: SimState, t: Tower, radiusSq: number, pct: number): void {
  const layers = t.tierDef!.targets; // markAreas checked tierDef
  const enemies = state.enemies;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (!canHit(e, layers) || isNeutral(e)) continue;
    const dx = e.x - t.x;
    const dy = e.y - t.y;
    if (dx * dx + dy * dy <= radiusSq) applyMarked(e, pct, AREA_MARK_TICKS, false);
  }
}
