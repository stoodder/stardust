// The Auditor's ring (design/enemies.md § 4 and § 5.3; D146; T707): a `ring` jammer
// (`EnemyDef.jam`, the `disabler` tell). Run by the jams slot (sim/jam.ts) after the Silencer's
// tendril, over every unit in slot order. In ticks, so it's deterministic; state on the Enemy:
// `jamTicks` (the period's countdown) and `jamTellTicks` (the tell's ticks left; > 0 only while the
// ring shows, render's JamRingView). No target is picked (`jamTarget` stays 0).
// - **The cycle** ("every 10 s, a 2 s ring"), the tendril's: the first tick alive sets `jamTicks`
//   to the period, so the first tell starts `periodTicks − tellTicks` after the spawn (8 s). With
//   `tellTicks` left it is **ready**: if a jam may land on some tower within `radiusTiles` (centre
//   to centre; sim/jam.ts `canJam`) the ring starts, else it waits ready (scanning the towers each
//   ready tick, and only then) until one is in reach. The tell runs `tellTicks`, the Auditor
//   **holding still** (`paceMul` 0, as the Silencer: the ring is drawn where the jams will land,
//   and it is a still target to kill); at its end every tower then within the radius that a jam
//   may land on is jammed for `durationTicks` × its `jamMul` (`jamTower`), and the period starts
//   over (landing to landing). JamTell `ring` lists the towers in reach as the ring starts (the
//   ones it would jam now); a tower built, sold, or made immune during the tell counts at its end.
// - **Interrupts** (§ 2.4; the gather rule): while `isInterrupted` holds (Stasis, Unnerved), a
//   ring can't start or go on: one under way is cancelled (JamInterrupted) and the full period
//   restarts from zero. A unit out of reach (leaving, burrowed, Phased) or standing down drops its
//   ring quietly and restarts. Lulled stretches the wait before the ring ×1.5 (`cooldownHeld`),
//   never the ring.
// - No allocation but the JamTell event's tower list, on a ring's start.
import type { CompiledJam } from '../../content/compiled.ts';
import type { Enemy } from '../entities.ts';
import { canJam, JAM_FIRST_READY_TICKS, jamTower } from '../jam.ts';
import { emit, type SimState } from '../state.ts';
import { cooldownHeld, isInterrupted } from '../systems/status.ts';
import type { TickContext } from '../tick.ts';
import { inJamReach } from './jamTendril.ts';
import { outOfReach } from './layers.ts';

/** The tell's length in ticks (at least 1). */
function tellTicksOf(j: CompiledJam): number {
  return j.tellTicks > 0 ? j.tellTicks : 1;
}

/** The period in ticks (at least the tell and 1). */
function periodTicksOf(j: CompiledJam): number {
  const t = tellTicksOf(j);
  return j.periodTicks > t ? j.periodTicks : t + 1;
}

/** Whether `e`'s ring is showing this tick (render reads it). */
export function ringTelling(e: Readonly<Enemy>): boolean {
  const j = e.def?.jam ?? null;
  return e.alive && j !== null && j.kind === 'ring' && e.jamTellTicks > 0;
}

/** How far the ring has grown (0–1): 0 as the tell starts, 1 as it lands. */
export function ringGrowth(e: Readonly<Enemy>): number {
  const j = e.def?.jam ?? null;
  if (j === null || e.jamTellTicks <= 0) return 0;
  const f = 1 - e.jamTellTicks / tellTicksOf(j);
  return f < 0 ? 0 : f > 1 ? 1 : f;
}

/** The towers a jam may land on within `e`'s ring now (uids, slot order); `max` stops the scan. */
function towersInRing(state: SimState, e: Readonly<Enemy>, j: CompiledJam, max: number): number[] {
  const out: number[] = [];
  const pool = state.towers;
  for (let i = 0; i < pool.used && out.length < max; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (canJam(t) && inJamReach(e, t, j)) out.push(t.uid);
  }
  return out;
}

/** Whether a jam may land on some tower within `e`'s ring now (no allocation). */
function anyInRing(state: SimState, e: Readonly<Enemy>, j: CompiledJam): boolean {
  const pool = state.towers;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (canJam(t) && inJamReach(e, t, j)) return true;
  }
  return false;
}

/** Drops a ring under way (no event) and restarts the period. */
function restart(e: Enemy, j: CompiledJam): void {
  e.jamTicks = periodTicksOf(j);
  e.jamTellTicks = 0;
}

/** One tick of a ring jammer (see the header). */
export function ringStep(state: SimState, e: Enemy, j: CompiledJam): void {
  const tell = tellTicksOf(j);
  if (outOfReach(e) || e.standDownTicks > 0) {
    if (e.jamTellTicks > 0) restart(e, j);
    return;
  }
  if (e.jamTellTicks > 0) {
    // A ring under way.
    if (isInterrupted(e)) {
      restart(e, j);
      emit(state, { type: 'JamInterrupted', uid: e.uid });
      return;
    }
    if (--e.jamTellTicks > 0) {
      e.paceMul = 0; // it holds still through its ring (movement reads this tick's)
      return;
    }
    const pool = state.towers;
    for (let i = 0; i < pool.used; i++) {
      const t = pool.items[i]!; // i < used ≤ items.length
      if (canJam(t) && inJamReach(e, t, j)) jamTower(state, t, j.durationTicks, e.uid);
    }
    restart(e, j);
    return;
  }
  if (e.jamTicks <= 0) {
    e.jamTicks = JAM_FIRST_READY_TICKS < 0 ? periodTicksOf(j) : tell + JAM_FIRST_READY_TICKS; // EXPTMP first tick alive: ready (T760)
    return;
  }
  if (e.jamTicks > tell && !cooldownHeld(e)) e.jamTicks--; // Lulled: its beat
  if (e.jamTicks > tell) return;
  if (isInterrupted(e)) {
    e.jamTicks = periodTicksOf(j); // a ring can't start: the period restarts from zero
    return;
  }
  if (!anyInRing(state, e, j)) return; // ready: it waits for a tower in reach
  e.jamTellTicks = tell;
  e.paceMul = 0;
  emit(state, {
    type: 'JamTell',
    uid: e.uid,
    kind: 'ring',
    towers: towersInRing(state, e, j, state.towers.used),
  });
}

/** Every ring jammer's tick, in slot order (the jams slot; sim/jam.ts). */
export function jamRingPass(state: SimState, _ctx: TickContext): void {
  const pool = state.enemies;
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    const j = e.def?.jam ?? null;
    if (!e.alive || j === null || j.kind !== 'ring') continue;
    ringStep(state, e, j);
  }
}
