// Secondary timers (design/maps.md § 5.1, § 5.5: the Deep Bore; T800a slot, T806 fills it): each
// of `map.timers` fills on sim time once `startTimer` starts it, at the rate `setTimerRate` sets
// (C4 Purge: 75%; 0 stops it), into `state.timers` (index-aligned); it fires `TimerFull` and the
// `{ timerFull }` trigger when full, and never ends the map. `stats.boreProgress` keeps the first
// timer's highest fill in whole percent. A boss spawning once it has stopped gains the timer's
// `bossHpPerTenth` per tenth filled. Runs before the triggers (tick.ts), so a timer that fills
// this tick fires this tick. Until T806 lands, createSim refuses timers (`map.timers`).
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import type { SimState } from './state.ts';
import type { TickContext } from './tick.ts';

export function timers(_state: SimState, _ctx: TickContext): void {
  // T806.
}

/** Whether timer `id` has filled (the `{ timerFull }` trigger; T806). */
export function timerFull(state: SimState, map: CompiledMapDef<IdSpace>, id: string): boolean {
  const i = map.timers.findIndex((t) => t.id === id);
  return i >= 0 && state.timers[i]?.full === true;
}

/** The `startTimer` action (T806). */
export function startTimer(_state: SimState, _map: CompiledMapDef<IdSpace>, _id: string): void {
  // T806.
}

/** The `setTimerRate` action (T806): `pct` of full speed, 0 to stop it. */
export function setTimerRate(
  _state: SimState,
  _map: CompiledMapDef<IdSpace>,
  _id: string,
  _pct: number,
): void {
  // T806.
}
