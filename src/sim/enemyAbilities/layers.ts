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
// - Phased (T503; phase.ts, the Rift Moth mid-phase): the Phased layer, which nothing can target
//   or reach (§ 2.6); it keeps flying its lane and leaks normally.
// - Pinned (T408; systems/status.ts): a pinned flyer is grounded, so a tier that hits ground can
//   hit it as well as one that hits air (`onLayers`).
// - Scattered (T805; sim/song.ts, the finale's Phase 2): motes drifting back to re-form, out of
//   play like a leaving unit until they do (`scatterTicks`).
import type { Enemy } from '../entities.ts';
import { cloakedOut } from './cloak.ts';

/**
 * Whether no tower, ally, splash, or status can touch `e` (burrowed, Phased, leaving, scattered,
 * or cloaked out).
 */
export function untargetable(e: Enemy): boolean {
  return e.burrowed || e.phased || e.leaving || e.scatterTicks > 0 || cloakedOut(e);
}

/**
 * Whether `e` is off the field for enemy-side effects too (a shield pulse or aura): burrowed,
 * Phased, leaving, or scattered (enemies.md § 2.6: nothing reaches those layers). A cloaked unit
 * isn't: it hides from the player's towers, not from its own side (§ 2.5).
 */
export function outOfReach(e: Enemy): boolean {
  return e.burrowed || e.phased || e.leaving || e.scatterTicks > 0;
}

/** Whether a hit on `e` deals nothing: untargetable, or a boss between phases. */
export function immune(e: Enemy): boolean {
  return untargetable(e) || e.invulnerableTicks > 0;
}

/**
 * Whether `e` (with a def) is on a layer a tier hitting `ground` and `air` can touch: a flyer is
 * air, a walker ground, and a pinned flyer is grounded, so ground towers hit it too
 * (design/enemies.md § 2.4, § 2.6; T408).
 */
export function onLayers(e: Enemy, ground: boolean, air: boolean): boolean {
  if (e.def === null) return false;
  if (e.def.layer !== 'air') return ground;
  return air || (ground && e.pinnedTicks > 0);
}
