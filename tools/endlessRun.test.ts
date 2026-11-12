// Endless runs on the sim (T861; design/maps.md § 8): a seed's first 60 waves run inside the
// balance harness's assertion 13 (a run's CPU time, conventions.md § Balance sims), the reference
// build (content/maps/end_m01/builds.ts) holds well past the warm-up, and doing nothing loses in
// it. Endless isn't a campaign map, so `npm run sim` doesn't judge it; this file is its harness.
// CPU time from tools/simClock.ts, as the CLI's: another process's load doesn't trip it.
import { describe, expect, it } from 'vitest';
import { HARNESS_TEST_TIMEOUT_MS, RUN_BUDGET_MS } from '../src/balance/rules.ts';
import { referenceRunProfile, runConfig } from '../src/balance/profile.ts';
import { compileContent } from '../src/content/compile.ts';
import { ENDLESS } from '../src/content/maps/end_m01/endless.ts';
import { RAW_CONTENT } from '../src/content/registry.ts';
import type { SimConfig } from '../src/sim/config.ts';
import { endlessContent } from '../src/sim/endless.ts';
import { runHeadless, type HeadlessResult } from '../src/sim/index.ts';
import { cpuClockMs } from './simClock.ts';

const base = compileContent(RAW_CONTENT);

/** Waves held: every wave resolved. */
const held = (r: HeadlessResult): number => r.waves.filter((w) => w.clearedTick >= 0).length;

/** The reference build's run on `seed` (`waves` long), with extra modifiers. */
function run(
  seed: number,
  waves: number,
  extra: SimConfig['modifiers'] = [],
  build: 'par' | 'none' = 'par',
): { readonly result: HeadlessResult; readonly cpuMs: number } {
  const { content } = endlessContent({ ...ENDLESS, waves }, base, seed);
  const map = content.maps.end_m01;
  const par = map.builds.parBuild;
  const b = build === 'par' ? par : { ...par, steps: [] };
  const cfg = runConfig(content, map, b, referenceRunProfile(map, content), seed);
  const c0 = cpuClockMs();
  const result = runHeadless({ ...cfg, modifiers: [...cfg.modifiers, ...extra] }, b, {
    maxTicks: 60 * 60 * 60,
  });
  return { result, cpuMs: cpuClockMs() - c0 };
}

describe('Endless on the sim', () => {
  it(
    "runs a seed's 60 waves inside assertion 13's CPU budget",
    () => {
      // A core that can't fall to leaks (a boss's leak still drains it all), so the run plays all
      // 60 waves: seed 2's reference build drives off all five bosses (W20–W60).
      const { result, cpuMs } = run(2, 60, [
        { kind: 'economy', stat: 'coreIntegrity', flat: 1_000_000, source: 'test:endless' },
      ]);
      expect(result.outcome).toBe('won');
      expect(held(result)).toBe(60);
      // ~1.0 s on the T861 machine (60 waves, ~123,000 ticks, ~2,000 units).
      expect(cpuMs).toBeLessThan(RUN_BUDGET_MS);
    },
    HARNESS_TEST_TIMEOUT_MS,
  );

  it(
    'holds past the warm-up with the reference build, and loses in it doing nothing',
    () => {
      // Held on Standard (T861, growth 1.07): seed 1 29, seed 2 22, seed 3 24 (seeds 1–8: 22–47).
      for (const seed of [1, 2, 3]) {
        const { result, cpuMs } = run(seed, ENDLESS.waves);
        expect(result.outcome).toBe('lost');
        expect(held(result)).toBeGreaterThanOrEqual(20);
        expect(cpuMs).toBeLessThan(RUN_BUDGET_MS);
      }
      const idle = run(1, ENDLESS.waves, [], 'none').result;
      expect(idle.outcome).toBe('lost');
      expect(held(idle)).toBeLessThan(ENDLESS.blockWaves);
    },
    HARNESS_TEST_TIMEOUT_MS,
  );
});
