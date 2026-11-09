// Cloaks (design/enemies.md § 2.5; T400a seam, run by T406). The rule: an undetected cloaked unit
// is untouchable (no targeting, splash, auras, or links; it still leaks), and a Revealed one is
// open to every tower. systems/detection.ts keeps `Enemy.revealTicks`; targeting and the damage
// pipeline ask `cloakedOut` (T406 wires it into layers.ts beside burrowing).
//
// A stub until T406: no live unit is cloaked yet, and createSim refuses one (`enemy.cloak`).
import type { Enemy } from '../entities.ts';

/** Whether a unit is hidden by its cloak right now (cloaked and not Revealed). T406. */
export function cloakedOut(_e: Enemy): boolean {
  return false;
}
