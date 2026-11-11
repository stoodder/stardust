// Burrowing (design/enemies.md § 3, § 5.1; the `burrower` tell). The Digger's cycle, a state
// machine on `Enemy.burrowed` and `Enemy.abilityTicks`:
// - Surface: it walks for `everyTicks − durationTicks` (so it digs in once every `everyTicks`: the
//   Digger's "every 6 s, for 2 s" is 4 s up, 2 s down). The last `tellTicks` of it are the tell
//   (the 0.8 s dirt spray; `burrowTelling`).
// - Underground for `durationTicks` at `speedMul` (`Enemy.paceMul`): untargetable, and no hit,
//   splash, or status reaches it (layers.ts) but the burrowed answers (Scuttle Den, Underfoot;
//   § 2.6), none of which is in Act I. It keeps following its route, and leaks normally.
// - Then it surfaces and the cycle restarts. A fresh spawn starts at the top of a surface stretch.
// - The interrupt (§ 2.4; T407a): while the interrupt hook (systems/status.ts `isInterrupted`:
//   Stasis on a non-boss; Unnerved since T507) holds, the dig tell can't start or go on: the dig is
//   cancelled and the surface stretch restarts from zero. A boss's own burrows are boss.ts's.
// - Truthlight (T508): a unit under a Truthlight Mark (`noEvadeTicks`) can't dig either: the check
//   is systems/status.ts `evadeBlocked` (the interrupt or the Mark), with the interrupt's outcome.
import type { CompiledBurrow } from '../../content/compiled.ts';
import type { Enemy } from '../entities.ts';
import { cooldownHeld, evadeBlocked } from '../systems/status.ts';

/** Ticks a burrower spends on the surface between digs (at least its tell, and 1). */
export function surfaceTicks(burrow: CompiledBurrow): number {
  const up = burrow.everyTicks - burrow.durationTicks;
  const min = burrow.tellTicks + 1;
  return up > min ? up : min;
}

/** One tick of a burrower's cycle: count down, dig in, or surface; underground, its pace. */
export function burrowStep(e: Enemy, burrow: CompiledBurrow): void {
  if (e.burrowed) {
    if (--e.abilityTicks <= 0) {
      e.burrowed = false;
      e.abilityTicks = surfaceTicks(burrow);
    }
  } else if (e.abilityTicks <= 0) {
    e.abilityTicks = surfaceTicks(burrow); // first tick alive
  } else if (e.abilityTicks > burrow.tellTicks && cooldownHeld(e)) {
    // Lulled (T607): the surface stretch holds still on its beat; the tell runs at full speed.
  } else {
    const left = --e.abilityTicks;
    if (left <= burrow.tellTicks && evadeBlocked(e)) {
      e.abilityTicks = surfaceTicks(burrow); // the dig is cancelled; its cooldown restarts
    } else if (left <= 0) {
      e.burrowed = true;
      e.abilityTicks = burrow.durationTicks;
    }
  }
  if (e.burrowed) e.paceMul *= burrow.speedMul;
}

/** Whether a burrower is showing its dig tell (the dirt spray) this tick: render reads it. */
export function burrowTelling(e: Enemy, burrow: CompiledBurrow): boolean {
  return !e.burrowed && e.abilityTicks > 0 && e.abilityTicks <= burrow.tellTicks;
}
