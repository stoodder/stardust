// Rift lanes (design/maps.md § 4; T602): Hollow ground routes through decor that open at their
// `opensAtWave`, telegraphed one wave ahead. Runs after the waves system (tick.ts), so it sees a
// wave that started this tick.
// - **The telegraph** (RiftOpening): a lane opening at wave W starts to crack as wave W − 1 starts,
//   so its crack shows through the whole wave before (the air lane's "current or next wave" rule);
//   a lane open from W1 cracks in the setup phase (the run's first tick).
// - **Open** (RiftOpened): as wave W starts. Content validation already holds every group on a
//   rift lane to the Hollow and to waves from its `opensAtWave` (validateWaves.ts), so the sim
//   gates no spawn here.
// - **Status** is a function of the wave (`riftStatus`), not stored state: a checkpoint replay or
//   a mid-map boot reads the same cracks, and render (the crack view) reads it every frame.
import type { CompiledRoute } from '../content/compiled.ts';
import { emit, type SimState } from './state.ts';
import type { TickContext } from './tick.ts';

export type RiftStatus = 'closed' | 'opening' | 'open';

/** A rift lane's status while the current wave is `wave` (0: the setup phase). */
export function riftStatus(route: Pick<CompiledRoute, 'opensAtWave'>, wave: number): RiftStatus {
  const at = route.opensAtWave ?? 1;
  if (wave >= at) return 'open';
  return wave >= at - 1 ? 'opening' : 'closed';
}

export function rifts(state: SimState, ctx: TickContext): void {
  const routes = ctx.map.routeList;
  const first = state.tick === 0;
  const s = state.schedule;
  const started = state.wave >= 1 && s.startTick[state.wave - 1] === state.tick;
  if (!first && !started) return;
  for (let i = 0; i < routes.length; i++) {
    const r = routes[i]!; // i < length
    if (r.kind !== 'rift') continue;
    const at = r.opensAtWave ?? 1;
    // The setup phase's telegraph comes first, so a W1 lane called at once still cracks, then opens.
    if (first && at <= 1) emit(state, { type: 'RiftOpening', route: r.id, wave: at });
    if (!started) continue;
    if (at === state.wave) emit(state, { type: 'RiftOpened', route: r.id, wave: at });
    else if (at === state.wave + 1) emit(state, { type: 'RiftOpening', route: r.id, wave: at });
  }
}
