// The Silencer's tendril (design/enemies.md § 4 and § 5.4; D146; T702): a `tendril` jammer
// (`EnemyDef.jam`, the `disabler` tell). Run by the jams slot (sim/jam.ts), after the jam
// countdowns and before the towers fire, over every unit in slot order. In ticks, so it's
// deterministic; state on the Enemy: `jamTicks` (the period's countdown), `jamTellTicks` (the
// tell's ticks left; > 0 only while it shows, render's tendril), `jamTarget` (the picked tower).
// - **The cycle** ("every 12 s, a 2 s tell"), as a gather's: the first tick alive sets `jamTicks`
//   to the period, so the first tell starts `periodTicks − tellTicks` after the spawn. With
//   `tellTicks` left it is **ready**: it picks a target and starts its tell, or, with none in
//   reach, waits ready (scanning the towers each ready tick, and only then) until one is. The tell
//   runs `tellTicks`, the Silencer **holding still** (`paceMul` 0, as a gather's or a blink's
//   tell: the tendril reaches out from where it stands, and it is a still target to kill); at its
//   end the jam lands, and the period starts over.
// - **The pick** (at the tell's start; `pickTendrilTarget`): among the live towers within
//   `radiusTiles` (centre to centre) that a jam may land on (sim/jam.ts `canJam`: not Jammed, not
//   jam-immune: post-jam or System Reboot immunity, or a Rally Chorus), a **Hum Choir** first (a
//   tower projecting a `choir` aura) when the jam `preferChoir`s; else any. Then the highest tier
//   (a spec is 4), ties to the lowest uid. JamTell `tendril` names it.
// - **The landing** (at the tell's end): on that tower if it still stands within the radius (a
//   Gravity Well's pull can carry the Silencer out) and a jam may land on it (a System Reboot or a
//   Rally Chorus during the tell spends the tell on nothing; so does selling the tower). `jamTower` scales it by the tower's `jamMul` then.
// - **Interrupts** (§ 2.4; the gather rule): while `isInterrupted` holds (Stasis on a non-boss,
//   Unnerved), a tell can't start or go on: one under way is cancelled (JamInterrupted) and the
//   full period restarts from zero; a ready Silencer interrupted restarts it too. A unit out of
//   reach (leaving, burrowed, Phased) or standing down drops its tell quietly and restarts.
// - **Lulled** (a Lullaby): the wait before the tell runs ×1.5 (`cooldownHeld`), never the tell.
// - No allocation but the JamTell event's one-tower list, on a tell's start.
import type { CompiledJam } from '../../content/compiled.ts';
import type { Enemy, Tower } from '../entities.ts';
import { canJam, JAM_FIRST_READY_TICKS, jamTower, towerByUid } from '../jam.ts';
import { emit, type SimState } from '../state.ts';
import { projectsAura } from '../systems/auras.ts';
import { cooldownHeld, isInterrupted } from '../systems/status.ts';
import type { TickContext } from '../tick.ts';
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

/** Whether tower `t` stands within the jam's radius of `e` (centre to centre). */
export function inJamReach(e: Readonly<Enemy>, t: Readonly<Tower>, j: CompiledJam): boolean {
  const dx = t.x - e.x;
  const dy = t.y - e.y;
  return dx * dx + dy * dy <= j.radiusSq;
}

/** Whether candidate `t` beats `best` (see the header: a Choir first, then tier, then uid). */
function beats(t: Tower, best: Tower | null, preferChoir: boolean): boolean {
  if (best === null) return true;
  if (preferChoir) {
    const c = projectsAura(t, 'choir');
    const b = projectsAura(best, 'choir');
    if (c !== b) return c;
  }
  if (t.tier !== best.tier) return t.tier > best.tier;
  return t.uid < best.uid;
}

/** The tower `e`'s tendril picks now, or null when none in reach may be jammed (the header). */
export function pickTendrilTarget(
  state: SimState,
  e: Readonly<Enemy>,
  j: CompiledJam,
): Tower | null {
  const pool = state.towers;
  let best: Tower | null = null;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (!canJam(t) || !inJamReach(e, t, j)) continue;
    if (beats(t, best, j.preferChoir)) best = t;
  }
  return best;
}

/** Whether `e` is showing its tendril tell this tick (render reads it). */
export function tendrilTelling(e: Readonly<Enemy>): boolean {
  return e.alive && e.jamTarget !== 0 && e.jamTellTicks > 0;
}

/** Drops a tell under way (no event) and restarts the period. */
function restart(e: Enemy, j: CompiledJam): void {
  e.jamTicks = periodTicksOf(j);
  e.jamTellTicks = 0;
  e.jamTarget = 0;
}

/** One tick of a tendril jammer (see the header). */
export function tendrilStep(state: SimState, e: Enemy, j: CompiledJam): void {
  const tell = tellTicksOf(j);
  if (outOfReach(e) || e.standDownTicks > 0) {
    if (e.jamTarget !== 0) restart(e, j);
    return;
  }
  if (e.jamTarget !== 0) {
    // A tell under way.
    if (isInterrupted(e)) {
      restart(e, j);
      emit(state, { type: 'JamInterrupted', uid: e.uid });
      return;
    }
    e.jamTicks--;
    e.jamTellTicks = e.jamTicks;
    if (e.jamTicks > 0) {
      e.paceMul = 0; // it holds still through its tell (movement reads this tick's)
      return;
    }
    const t = towerByUid(state, e.jamTarget);
    if (t !== null && inJamReach(e, t, j)) jamTower(state, t, j.durationTicks, e.uid);
    restart(e, j);
    return;
  }
  if (e.jamTicks <= 0) {
    e.jamTicks = JAM_FIRST_READY_TICKS < 0 ? periodTicksOf(j) : tell + JAM_FIRST_READY_TICKS; // EXPTMP first tick alive: ready (T760)
    return;
  }
  if (e.jamTicks > tell && !cooldownHeld(e)) e.jamTicks--; // Lulled (T607): its beat
  if (e.jamTicks > tell) return;
  if (isInterrupted(e)) {
    e.jamTicks = periodTicksOf(j); // a tell can't start: the period restarts from zero
    return;
  }
  const target = pickTendrilTarget(state, e, j);
  if (target === null) return; // ready: it waits for a tower in reach
  e.jamTarget = target.uid;
  e.jamTellTicks = e.jamTicks;
  e.paceMul = 0;
  emit(state, { type: 'JamTell', uid: e.uid, kind: 'tendril', towers: [target.uid] });
}

/** Every tendril jammer's tick, in slot order (the jams slot; sim/jam.ts). */
export function jamTendrilPass(state: SimState, _ctx: TickContext): void {
  const pool = state.enemies;
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    const j = e.def?.jam ?? null;
    if (!e.alive || j === null || j.kind !== 'tendril') continue;
    tendrilStep(state, e, j);
  }
}
