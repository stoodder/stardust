// When an ally lowers his weapon (T330): Sgt. Bricks on A1M5's Quiet Wave (story/campaign/act1.md
// § A1M5, *Quiet Wave*; design/core-loop.md § 2.7: "right after 'Clear it, Sprout,' Bricks visibly
// lowers his cannon for the Quiet Wave"). The cue plays as the wave starts, so a beat after any
// wave whose groups carry `quiet_wave` has started, he lowers it and keeps it lowered for the rest
// of the map (it's the last wave). Read from sim state (the waves started and when), never a sim
// rule: allies never target the wave's units anyway (D005). Pure, so it's unit-tested; BattleScene
// reads it each frame and AllyView plays `lowered_<facing>`.
import type { WaveTag } from '../../content/types.ts';
import { TICK_HZ } from '../../shared/time.ts';

/** How long after the Quiet Wave starts he lowers the cannon: a beat after "Clear it, Sprout." */
export const LOWER_DELAY_TICKS = Math.round(1.5 * TICK_HZ);

/** The wave fields this reads (a CompiledWave or an authored WaveDef satisfies it). */
export interface WaveLike {
  readonly groups: readonly { readonly tags?: readonly WaveTag[] | undefined }[];
}

/** Per wave (index = wave − 1): whether it's a Quiet Wave (any group tagged `quiet_wave`). */
export function quietWaves(waves: readonly WaveLike[]): boolean[] {
  return waves.map((w) => w.groups.some((g) => g.tags?.includes('quiet_wave') === true));
}

/**
 * Whether allies hold their weapons lowered now: the last wave started (`wave`, 1-based; 0 before
 * wave 1) is a Quiet Wave that started (`startTick[wave − 1]`) at least LOWER_DELAY_TICKS ago.
 */
export function weaponsLowered(
  quiet: readonly boolean[],
  wave: number,
  tick: number,
  startTick: readonly number[],
): boolean {
  if (wave < 1 || quiet[wave - 1] !== true) return false;
  const start = startTick[wave - 1] ?? -1;
  return start >= 0 && tick - start >= LOWER_DELAY_TICKS;
}
