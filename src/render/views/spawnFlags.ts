// The "incoming" flags (T326, T431; core-loop.md § 2.2: "Pulsing incoming flags sit at the active
// spawn points"; § 2.4: the player can press one to start the next wave now). Pure: which tiles
// carry a flag now, read from the map and the wave schedule. A flag stands on the first tile of
// each ground route the next wave sends a group down, during the setup (before wave 1) and while
// a countdown runs; never while a wave is spawning or held, before the Quiet Wave (it can't be
// called, D097), or once the waves are done.
import type { CompiledMapDef } from '../../content/compiled.ts';
import type { IdSpace } from '../../content/types.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { SimState } from '../../sim/index.ts';

/** The schedule as the flags read it. */
export type FlagState = DeepReadonly<Pick<SimState, 'wave' | 'schedule' | 'outcome'>>;

/** The wave the flags announce (1-based), or 0 while none is coming that a click could call. */
export function incomingWave(map: Pick<CompiledMapDef<IdSpace>, 'waves'>, s: FlagState): number {
  if (s.outcome !== 'playing') return 0;
  const phase = s.schedule.phase;
  const next = phase === 'setup' ? 1 : phase === 'countdown' ? s.schedule.countdownWave : 0;
  if (next < 1 || next > map.waves.length) return 0;
  // The Quiet Wave walks in on its own time (D097): nothing to call, so no flag either.
  for (const g of map.waves[next - 1]!.groups) if (g.tags.includes('quiet_wave')) return 0;
  return next;
}

/**
 * Fills `out` with the row-major tile index of each spawn the next wave sends a ground group from
 * (each once, in first-appearance order) and returns how many; 0 while no wave is incoming. Air
 * groups come in over the map's edge on their lanes and carry no flag.
 */
export function incomingSpawns(
  map: Pick<CompiledMapDef<IdSpace>, 'waves' | 'cols' | 'rows'>,
  s: FlagState,
  out: number[],
): number {
  const wave = incomingWave(map, s); // 0, or 1 ≤ wave ≤ waves.length
  if (wave === 0) return 0;
  let n = 0;
  for (const g of map.waves[wave - 1]!.groups) {
    if (g.route.kind === 'air') continue;
    const first = g.route.tiles[0];
    if (first === undefined) continue;
    const at = first[1] * map.cols + first[0];
    let seen = false;
    for (let i = 0; i < n; i++) if (out[i] === at) seen = true;
    if (!seen) out[n++] = at;
  }
  return n;
}

/** Scratch for `incomingAt`: maps have a handful of spawns. */
const scratch: number[] = [];

/** Whether tile `index` carries an incoming flag now (a click there calls the wave). */
export function incomingAt(
  map: Pick<CompiledMapDef<IdSpace>, 'waves' | 'cols' | 'rows'>,
  s: FlagState,
  index: number,
): boolean {
  const n = incomingSpawns(map, s, scratch);
  for (let i = 0; i < n; i++) if (scratch[i] === index) return true;
  return false;
}
