// Phasing (design/enemies.md § 2.6, § 3, § 5.4; the `phasing` tell; T503): the Rift Moth's cycle,
// a state machine on `Enemy.phased` and `Enemy.phaseTicks`, burrow.ts's shape:
// - **Solid:** it flies for `everyTicks − durationTicks` (so it phases once every `everyTicks`: the
//   Moth's "1.5 s every 5 s" is 3.5 s solid, 1.5 s Phased). The last `tellTicks` of it are the
//   tell (the 0.5 s flicker; `phaseTelling`). It keeps moving through the tell.
// - **Phased** for `durationTicks`: on the Phased layer (layers.ts `untargetable`), so nothing the
//   player sends targets or reaches it: no tower, ally, splash, chain, status, or ability hit (the
//   damage pipeline's `immune`). It keeps flying its lane and leaks normally. Time Dilation still
//   slows it (map-wide, never aimed, as for a burrowed unit).
// - Then it is solid again and the cycle restarts. A fresh spawn starts at the top of a solid
//   stretch, so a unit spawned on tick t first tells on t + solid − tell and is Phased on ticks
//   t + solid … t + solid + duration − 1 (all in ticks: deterministic).
// - **The interrupt** (§ 2.4; D137): while the interrupt hook holds (systems/status.ts
//   `isInterrupted`: Stasis on a non-boss; Unnerved on any unit), the tell can't start or go on:
//   the phase is cancelled, even mid-tell (PhaseShift `interrupted` if its tell had begun), and its
//   solid stretch restarts from zero. Nothing interrupts a unit already Phased: no status reaches
//   it.
// - **Truthlight** (T508; towers.md § Seer's Lantern): a unit under a Truthlight Mark can't phase
//   either. `phaseBlocked` is systems/status.ts `evadeBlocked` (the interrupt, or `noEvadeTicks`),
//   so the Mark cancels a tell under way and restarts the solid stretch, as an interrupt does.
// Events: PhaseShift `tell` as the tell begins, `in` as it phases, `out` as it's back, and
// `interrupted`. Story difficulty changes no phase number (systems/waves.ts `scaledEnemy` keeps it).
import type { CompiledPhase } from '../../content/compiled.ts';
import type { Enemy } from '../entities.ts';
import { emit, type SimState } from '../state.ts';
import { cooldownHeld, evadeBlocked } from '../systems/status.ts';

/** Ticks a phaser stays solid between phases (at least its tell, and 1). */
export function solidTicks(phase: CompiledPhase): number {
  const up = phase.everyTicks - phase.durationTicks;
  const min = phase.tellTicks + 1;
  return up > min ? up : min;
}

/** Whether a tell can't start or go on this tick: interrupted, or under Truthlight (T508). */
export function phaseBlocked(e: Readonly<Enemy>): boolean {
  return evadeBlocked(e);
}

/** Whether `e` is showing its phase tell (the flicker) this tick: render reads it. */
export function phaseTelling(e: Readonly<Enemy>, phase: CompiledPhase): boolean {
  return e.alive && !e.phased && e.phaseTicks > 0 && e.phaseTicks <= phase.tellTicks;
}

/** One tick of a phaser's cycle: count down, tell, phase in or out, or be interrupted. */
export function phaseStep(state: SimState, e: Enemy, phase: CompiledPhase): void {
  if (e.phased) {
    if (--e.phaseTicks > 0) return;
    e.phased = false;
    e.phaseTicks = solidTicks(phase);
    shift(state, e, 'out');
    return;
  }
  if (e.phaseTicks <= 0) {
    e.phaseTicks = solidTicks(phase); // first tick alive
    return;
  }
  if (e.phaseTicks > phase.tellTicks && cooldownHeld(e)) return; // Lulled (T607): its beat
  const wasTelling = e.phaseTicks <= phase.tellTicks;
  const left = --e.phaseTicks;
  if (left <= phase.tellTicks && phaseBlocked(e)) {
    e.phaseTicks = solidTicks(phase); // cancelled; the cooldown restarts from zero
    if (wasTelling) shift(state, e, 'interrupted');
    return;
  }
  if (left > 0) {
    if (left === phase.tellTicks) shift(state, e, 'tell');
    return;
  }
  e.phased = true;
  e.phaseTicks = phase.durationTicks;
  shift(state, e, 'in');
}

function shift(state: SimState, e: Enemy, phase: 'tell' | 'in' | 'out' | 'interrupted'): void {
  emit(state, { type: 'PhaseShift', uid: e.uid, enemy: e.def!.id, phase, x: e.x, y: e.y });
}
