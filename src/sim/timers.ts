// Secondary timers (design/maps.md § 5.1, § 5.5: the Deep Bore; T806). The rules as built:
// - **Filling.** Each of `map.timers` (index-aligned with `state.timers`) fills on sim time once a
//   `startTimer` action starts it: `filled` grows by its rate each tick (1 = 100%, the default)
//   until it reaches the timer's `fillTicks`. `setTimerRate` sets the rate, a share in [0, 1]
//   (C4 Purge's 0.75 is an event `when` the flag is `purge`; 0 stops it), before or after the
//   start. A full timer stays full (the bar stays full); nothing ever ends the map.
// - **Full.** The tick it fills it fires `TimerFull` and the `{ timerFull }` trigger. This system
//   runs before the triggers (tick.ts), so that trigger fires on the same tick (the Bore's
//   breakthrough: an event that runs `spawnWave`).
// - **The boss bonus.** As a started timer stops (its rate set to 0, or full), its HP bonus is
//   fixed: `bossHpPerTenth` × whole tenths filled (`TimerState.bossHpPct`; the Bore: +5% per 10%,
//   +50% full). A boss that spawns while it holds (systems/waves.ts `spawn`, wave or script group)
//   has its max HP × (1 + the sum over the map's timers; `timerBossHpPct`): the Unsung at Phase 2
//   (T808). Restarting the timer clears its bonus. State alone, so a resumed run reproduces it.
// - **Stats.** `stats.boreProgress` keeps the first timer's highest fill in whole percent.
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import { emit, type SimState, type TimerState } from './state.ts';
import type { TickContext } from './tick.ts';

/** What the timers read of the map: its timers, in order. */
type TimerMap = Pick<CompiledMapDef<IdSpace>, 'timers'>;

/** System 2c (before the triggers): every started timer fills at its rate. */
export function timers(state: SimState, ctx: TickContext): void {
  const defs = ctx.map.timers;
  for (let i = 0; i < defs.length; i++) {
    const t = state.timers[i]!; // index-aligned with map.timers
    if (!t.running || t.full || t.ratePct <= 0) continue;
    const def = defs[i]!; // i < length
    t.filled = Math.min(def.fillTicks, t.filled + t.ratePct);
    if (t.filled >= def.fillTicks) {
      t.full = true;
      fixBossBonus(t, def);
      emit(state, { type: 'TimerFull', id: def.id });
    }
    if (i === 0) {
      const pct = Math.floor((100 * t.filled) / def.fillTicks + 1e-9);
      if (pct > state.stats.boreProgress) state.stats.boreProgress = pct;
    }
  }
}

/** How full timer `t` is (0–1). */
export function timerFill(
  t: Pick<TimerState, 'filled'>,
  def: { readonly fillTicks: number },
): number {
  return def.fillTicks > 0 ? Math.min(1, t.filled / def.fillTicks) : 0;
}

/** Fixes a stopped timer's boss bonus: `bossHpPerTenth` per whole tenth filled. */
function fixBossBonus(
  t: TimerState,
  def: { readonly fillTicks: number; readonly bossHpPerTenth: number },
): void {
  const tenths = Math.floor((10 * t.filled) / def.fillTicks + 1e-9);
  // Rounded to 1e-9, so +5% × 7 reads 0.35 (the HUD and the tests show it), not 0.35000000000000003.
  t.bossHpPct = Math.round(def.bossHpPerTenth * Math.min(10, tenths) * 1e9) / 1e9;
}

/** The HP share a boss spawning now gains from the map's stopped timers (0 for none). */
export function timerBossHpPct(state: Pick<SimState, 'timers'>): number {
  let pct = 0;
  for (let i = 0; i < state.timers.length; i++) pct += state.timers[i]!.bossHpPct; // i < length
  return pct;
}

/** Whether timer `id` has filled (the `{ timerFull }` trigger). */
export function timerFull(state: SimState, map: TimerMap, id: string): boolean {
  const i = map.timers.findIndex((t) => t.id === id);
  return i >= 0 && state.timers[i]?.full === true;
}

/** The `startTimer` action: timer `id` starts filling at its rate (a no-op once started). */
export function startTimer(state: SimState, map: TimerMap, id: string): void {
  const i = map.timers.findIndex((t) => t.id === id);
  const t = state.timers[i];
  if (t === undefined || t.running) return;
  t.running = true;
  if (t.ratePct <= 0) fixBossBonus(t, map.timers[i]!); // started stopped: i found
}

/**
 * The `setTimerRate` action: timer `id` fills at `pct` of full speed from now (0 stops it, which
 * fixes its boss bonus; a rate above 0 again clears the bonus while it runs).
 */
export function setTimerRate(state: SimState, map: TimerMap, id: string, pct: number): void {
  const i = map.timers.findIndex((t) => t.id === id);
  const t = state.timers[i];
  if (t === undefined) return;
  t.ratePct = pct;
  if (!t.running || t.full) return;
  if (pct <= 0)
    fixBossBonus(t, map.timers[i]!); // i found
  else t.bossHpPct = 0;
}
