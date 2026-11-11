// A3M6 is robust where it matters (T722): par with every group of one kind shifted ±0.2 s stays in
// the band, lands every beat (the groups' releases, the knock-knock after the first refugee home,
// QUILL's sheltered cue, the rifts, the Gathering Maw a wave ahead, split and merge on their ticks,
// the merged Maw dead with road to spare), and no-detection still costs at least 10 points. One
// compound shift per row.
import { describe, expect, it } from 'vitest';
import type { WaveGroup } from '../content/types.ts';
import { REFUGEES } from '../content/maps/a3_m06/map.ts';
import { a3m6Beats, expectBeats } from './__fixtures__/a3m6Beats.ts';
import { bothWays, delay, shiftedContent } from './__fixtures__/shifts.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const WAVES = 18;

/** Every group of `enemy`, in every wave, `d` s later. */
const allOf = (enemy: string, d: number) =>
  Object.fromEntries(
    Array.from({ length: WAVES }, (_, i) => [i + 1, delay((g: WaveGroup) => g.enemy === enemy, d)]),
  );

/** The compound shifts, each run both ways (`s` = ±1). */
const SHIFTS = {
  'every drone group': (s: number) => allOf('compliance', 0.2 * s),
  'every Expediter group': (s: number) => allOf('expediter', 0.2 * s),
  'every gunship group': (s: number) => allOf('gunship', 0.2 * s),
  'every Operative group': (s: number) => allOf('blackbudget', 0.2 * s),
  'every Rift Moth group': (s: number) => allOf('riftmoth', 0.2 * s),
  'every Maw group': (s: number) => allOf('maw', 0.2 * s),
  'every Mote group': (s: number) => allOf('mote', 0.2 * s),
  'the Gathering Maw': (s: number) => allOf('gathering_maw', 0.2 * s),
} as const;

describe('A3M6 under ±0.2 s shifts', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  it.each(bothWays(SHIFTS))(
    'par stays in band and lands every beat, no-detection ≥ 10 under, with %s shifted %s',
    (_name, _way, patches) => {
      const c = shiftedContent('a3_m06', patches);
      const b = a3m6Beats(c, 'par');
      expectBeats(b, 'par');
      const pct = (b.evacuated / REFUGEES) * 100;
      expect(pct).toBeGreaterThanOrEqual(50);
      expect(pct).toBeLessThanOrEqual(70);
      // No detection costs at least 10 points (a loss's margin is 0).
      const blind = a3m6Beats(c, 'noCounter:detection');
      const blindPct = blind.outcome === 'won' ? (blind.evacuated / REFUGEES) * 100 : 0;
      expect(pct - blindPct).toBeGreaterThanOrEqual(10);
    },
  );
});
