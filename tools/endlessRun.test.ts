// Endless runs on the sim (T861; design/maps.md § 8): a seed's first 60 waves run inside the
// balance harness's assertion 13 (a run's CPU time, conventions.md § Balance sims), the reference
// build (content/maps/end_m01/builds.ts) holds well past the warm-up, and doing nothing loses in
// it. Endless isn't a campaign map, so `npm run sim` doesn't judge it; this file is its harness.
// CPU time from tools/simClock.ts, as the CLI's: another process's load doesn't trip it. A run over
// the budget runs once more and the faster of the two counts (`fasterOfTwo`): a GC pause or a cold
// JIT can land in one run's CPU time, never in the run's work.
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

// The live content, with Endless's map as the finale chunk registers it (vitestSetup registers
// every act before a test runs).
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

/**
 * Assertion 13's budget for a run of `ticks`: `RUN_BUDGET_MS` is sized for the finale's run
 * (about 63,000 ticks, conventions.md § Balance sims), so a longer run (60 Endless waves are about
 * 123,000) gets the same budget per tick, never less than a finale's.
 */
const FINALE_RUN_TICKS = 63_000;
function budgetFor(ticks: number): number {
  return RUN_BUDGET_MS * Math.max(1, ticks / FINALE_RUN_TICKS);
}

/**
 * `go()`'s result with the faster CPU time of two runs: run once, and again only when the first is
 * over `budgetMs` (the sim is deterministic, so both results are the same run).
 */
function fasterOfTwo(
  go: () => { readonly result: HeadlessResult; readonly cpuMs: number },
  budgetMs: number = RUN_BUDGET_MS,
): { readonly result: HeadlessResult; readonly cpuMs: number } {
  const first = go();
  if (first.cpuMs < budgetMs) return first;
  const again = go();
  return again.cpuMs < first.cpuMs ? again : first;
}

describe('Endless on the sim', () => {
  it(
    "runs a seed's 60 waves inside assertion 13's CPU budget",
    () => {
      // A core that can't fall to leaks (a boss's leak still drains it all), so the run plays all
      // 60 waves: seed 3's reference build drives off all four bosses (W25–W55; seeds 2 and 4–8
      // fall to the second "Shareholder Value", at W55).
      const { result, cpuMs } = fasterOfTwo(() =>
        run(3, 60, [
          { kind: 'economy', stat: 'coreIntegrity', flat: 1_000_000, source: 'test:endless' },
        ]),
      );
      expect(result.outcome).toBe('won');
      expect(held(result)).toBe(60);
      // ~1.0 s on the T861 machine (60 waves, ~123,000 ticks, ~2,000 units); seed 3 since D156's
      // roster ~1.1–1.2 s where seed 2 had taken 1.4–1.7 s on the same machine. Twice a finale's
      // length, so twice its budget (`budgetFor`): ~3.9 s.
      expect(cpuMs).toBeLessThan(budgetFor(result.ticks));
    },
    HARNESS_TEST_TIMEOUT_MS,
  );

  it(
    'holds past the warm-up with the reference build, and loses in it doing nothing',
    () => {
      // Held on Standard (D156's roster, first boss W25): seed 1 40, seed 2 41, seed 3 28 (seeds
      // 1–8: 22–43).
      for (const seed of [1, 2, 3]) {
        const { result, cpuMs } = fasterOfTwo(() => run(seed, ENDLESS.waves));
        expect(result.outcome).toBe('lost');
        expect(held(result)).toBeGreaterThanOrEqual(20);
        expect(cpuMs).toBeLessThan(budgetFor(result.ticks));
      }
      const idle = run(1, ENDLESS.waves, [], 'none').result;
      expect(idle.outcome).toBe('lost');
      expect(held(idle)).toBeLessThan(ENDLESS.blockWaves);
    },
    HARNESS_TEST_TIMEOUT_MS,
  );
});
