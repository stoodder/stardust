// A3M5's robustness (T721): with every group of one enemy shifted ±0.2 s across the map (a compound
// shift, conventions.md § Gate time), par still wins in band, lands every beat (the bearer groups
// on their waves' starts, the platform's three cues on its phases, W15 after it), and drives the
// platform off short of the core; the worst-case tile is pinned. alwaysCallEarly too.
import { describe, expect, it } from 'vitest';
import type { WaveGroup } from '../content/types.ts';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { ROAD_TILES, beatMisses, runA3m5 } from './__fixtures__/a3m5.ts';
import { bothWays, delay, shiftedContent } from './__fixtures__/shifts.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const WAVES = 17;
const BAND = compileContent(RAW_CONTENT).maps.a3_m05.builds.marginBand!;
/** The furthest down the road (of 38 tiles) any shifted par drives the platform off. */
const WORST_DRIVE_OFF = 37.5;

/** Every group of `enemy`, in every wave, `d` s later. */
const allOf = (enemy: string, d: number) =>
  Object.fromEntries(
    Array.from({ length: WAVES }, (_, i) => [i + 1, delay((g: WaveGroup) => g.enemy === enemy, d)]),
  );

const SHIFTS = {
  'every Mote group': (s: number) => allOf('mote', 0.2 * s),
  'every Fracture group': (s: number) => allOf('fracture', 0.2 * s),
  'every drone group': (s: number) => allOf('compliance', 0.2 * s),
  'every Associate group': (s: number) => allOf('associate', 0.2 * s),
  'every Auditor group': (s: number) => allOf('auditor', 0.2 * s),
  'every Liability group': (s: number) => allOf('liability', 0.2 * s),
  'every Silencer group': (s: number) => allOf('silencer', 0.2 * s),
  'every Expediter and Maw group': (s: number) => ({
    ...allOf('expediter', 0.2 * s),
    ...Object.fromEntries(
      Array.from({ length: WAVES }, (_, i) => [
        i + 1,
        delay((g: WaveGroup) => g.enemy === 'expediter' || g.enemy === 'maw', 0.2 * s),
      ]),
    ),
  }),
  'the platform': (s: number) => ({
    14: delay((g: WaveGroup) => g.enemy === 'shareholder_value', 0.2 * s),
  }),
} as const;

describe('A3M5 shifts', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  it.each(bothWays(SHIFTS))('wins par in band with %s shifted %s', (_name, _way, patches) => {
    const c = shiftedContent('a3_m05', patches);
    const r = runA3m5(c, 'par');
    expect(beatMisses(r), 'par').toEqual([]);
    const margin = Math.min(r.integrity / 22, r.asset / 12) * 100;
    // The map's band (50–75: its marginBand; T760's par sits at 63.6 and moves 58.3–72.7 here).
    expect(margin).toBeGreaterThanOrEqual(BAND.minPct);
    expect(margin).toBeLessThanOrEqual(BAND.maxPct);
    expect(r.droveOffAt!).toBeLessThan(WORST_DRIVE_OFF);
    expect(WORST_DRIVE_OFF).toBeLessThan(ROAD_TILES);
  });

  it('lands every beat with every wave called the instant it can be', () => {
    expect(
      beatMisses(runA3m5(compileContent(RAW_CONTENT), 'alwaysCallEarly')),
      'alwaysCallEarly',
    ).toEqual([]);
  });
});
