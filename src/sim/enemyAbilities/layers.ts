// Who an enemy ability puts out of reach (design/enemies.md § 2.6, § 6). A leaf module: targeting
// (combat/targeting.ts), the damage pipeline (combat/damage.ts), and allies import it, so it imports
// nothing from the sim but its fellow leaf cloak.ts.
// - Burrowed (a Digger underground, Chitterbloom's phase-2 burrows): untargetable, and no hit,
//   splash, or status reaches it. Only the burrow answers may (Scuttle Den, Underfoot; none is in
//   Act I, so nothing reaches it yet).
// - Leaving (a boss's `driveOff` or `retreat`, and a driven-off boss's brood): untargetable, and
//   nothing reaches it; it heads off the map and never leaks (enemies.md § 6.1).
// - A boss's phase-change invulnerability: it can still be targeted (the shots that plink off are
//   the tell), but it takes no damage.
// - Cloaked and not Revealed (T406; cloak.ts): untouchable, as burrowed, but it still leaks.
import type { Enemy } from '../entities.ts';
import { cloakedOut } from './cloak.ts';

/** Whether no tower, ally, splash, or status can touch `e` (burrowed, leaving, or cloaked out). */
export function untargetable(e: Enemy): boolean {
  return e.burrowed || e.leaving || cloakedOut(e);
}

/** Whether a hit on `e` deals nothing: untargetable, or a boss between phases. */
export function immune(e: Enemy): boolean {
  return untargetable(e) || e.invulnerableTicks > 0;
}
