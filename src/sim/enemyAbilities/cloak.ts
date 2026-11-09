// Cloaks (design/enemies.md § 2.5; T406). The rule: an undetected cloaked unit is untouchable (no
// targeting, splash, auras, or links; it still leaks), and a Revealed one is open to every tower.
// systems/detection.ts keeps `Enemy.revealedTicks`; layers.ts folds `cloakedOut` into
// `untargetable` and `immune`, so targeting, splash, chains, on-hit statuses, allies, and every
// hit through the damage pipeline (Orbital Strike, Suppressing Fire's ticks included) pass it by.
// A leaf module: it imports nothing from the sim.
import type { Enemy } from '../entities.ts';

/** Whether a unit is hidden by its cloak right now: cloaked and not Revealed. */
export function cloakedOut(e: Enemy): boolean {
  return e.def !== null && e.def.cloaked && e.revealedTicks <= 0;
}
