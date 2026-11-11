// Lighting sets (design/maps.md § 7; T806): the light a map script's `setLighting` action turns to
// at a story moment, apart from the wave-paced schedule (MapDef.lighting). The finale's one is
// Dawn: from the tick `setLighting: 'dawn'` runs, the world eases to the `finale` env's dawn
// ramps over 8 s of sim time (render/views/LightingView.ts: the sky and the grade; stepped under
// reduced motion), and a Sundown darkness lifts to 0 over the same 8 s (sim/darkness.ts, so what
// is lit on screen stays what the sim treats as lit, D137). The sim keeps the key and the tick it
// ran (`state.lightingKey`, `state.lightingTick`; `LightingSet`), so a replay or a resumed run
// stands in the same light. [script] holds `setLighting` to these keys (validateFinale.ts).
import { secToTicks } from '../shared/time.ts';
import type { EnvPaletteId } from './types.ts';

export interface LightingSetDef {
  /** The env palette the light turns to (its sky and its grade). */
  readonly env: EnvPaletteId;
  /** How long the turn takes, in seconds of sim time (any darkness lifts over the same span). */
  readonly easeSec: number;
}

/** The lighting sets by key. */
export const LIGHTING_SETS: Readonly<Record<string, LightingSetDef>> = Object.freeze({
  /** The First Dawn (finale Phase 3; art-direction.md § Finale): sunrise from the east, ~8 s. */
  dawn: Object.freeze({ env: 'finale', easeSec: 8 }),
});

/** The lighting set named `key`, or null for none. */
export function lightingSet(key: string | null): LightingSetDef | null {
  if (key === null || !Object.hasOwn(LIGHTING_SETS, key)) return null;
  return LIGHTING_SETS[key] ?? null;
}

/**
 * How far into lighting set `key`'s turn the light stands at `tick` (0–1), having been set at
 * `setTick`; 0 with no set. A function of sim state alone (it holds while paused).
 */
export function lightingSetProgress(key: string | null, setTick: number, tick: number): number {
  const set = lightingSet(key);
  if (set === null) return 0;
  const ticks = secToTicks(set.easeSec);
  return ticks === 0 ? 1 : Math.min(1, Math.max(0, tick - setTick) / ticks);
}

/** The lighting sets a map's script turns to, in first-use order (render builds their stops). */
export function lightingSetsOf(map: {
  readonly events: readonly { readonly actions: readonly object[] }[];
}): string[] {
  const out: string[] = [];
  for (const ev of map.events) {
    for (const a of ev.actions) {
      if (!('setLighting' in a)) continue;
      const key = a.setLighting;
      if (typeof key === 'string' && lightingSet(key) !== null && !out.includes(key)) out.push(key);
    }
  }
  return out;
}
