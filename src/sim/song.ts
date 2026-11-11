// The Leaving Song (design/maps.md § 5.5, Phase 2; T800a slot, T805 fills it): a circle round the
// choir's leader (`map.song`). A Hollow unit destroyed inside it is laid to rest (`LaidToRest`,
// its `restValue` in rest points × the run's C4 multiplier; `stats.restedKills`); outside it, in
// Phase 2 only (D154), it scatters (`Scattered`; `Enemy.scatterTicks`, `scatteredOnce`) and
// re-forms once at `scatter.hpPct` (`Reformed`; no bounty again; `stats.scatteredKills`). The song
// trickles rest points each tick of Phase 2, so the countdown can't stall; its progress is
// `restProgressPct` (p = restPoints ÷ restTarget, capped at 1). `restAll` lays every live Hollow
// unit to rest (Dawn). Runs just before cleanup (tick.ts). Until T805 lands, createSim refuses a
// song (`map.song`) and its script parts (`restProgressPct`, `restAll`: SCRIPT_GATES).
import type { SimState } from './state.ts';
import type { TickContext } from './tick.ts';

export function song(_state: SimState, _ctx: TickContext): void {
  // T805.
}

/** The countdown's progress p, 0–1 (the `restProgressPct` trigger; T805). */
export function restProgress(state: Pick<SimState, 'restPoints' | 'restTarget'>): number {
  return state.restTarget > 0 ? Math.min(1, state.restPoints / state.restTarget) : 0;
}

/** Lays every live Hollow unit to rest (the `restAll` action: Dawn; T805). */
export function restAll(_state: SimState, _ctx: TickContext): void {
  // T805.
}
