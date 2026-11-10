// A1M1's tuning is robust, not a knife edge (D026, D028; T127, T130, T125): the harness's
// verdicts, the under-built alts' `gradual` checks and par's Teamwork medal among them, survive
// ±0.2 s shifts of the clump spacing in W5–W7; a player who stops building after three Rivets
// loses gradually, never more than half the integrity in one wave; and W7's strike is what holds
// the finale for par (it's worth 6–10 integrity). The waves and builds are documented in
// docs/story/campaign/act1.md § A1M1.
import { describe, expect, it } from 'vitest';
import type { CompiledBuild } from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { WaveGroup } from '../content/types.ts';
import { runHeadless, type HeadlessResult } from '../sim/index.ts';
import { notGradual } from './checks.ts';
import { judgeShift, shiftedContent, type GroupPatch } from './__fixtures__/shifts.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';
import { NO_PURCHASES, runConfig } from './profile.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a1_m01;
const par = map.builds.parBuild;
/** The greenhouse roof (high ground). */
const ROOF = [7, 2] as const;

/** A clump: a Nibbler group fired at most 0.25 s apart. */
const isClump = (g: WaveGroup): boolean =>
  g.enemy === 'nibbler' && g.intervalSec !== undefined && g.intervalSec <= 0.25;

/** Each clump of a wave (the k-th from 0) starts k × `shiftSec` later. */
function clumpsApart(shiftSec: number): GroupPatch {
  let k = 0; // shiftedContent patches a wave's groups in order, a fresh patch per wave
  return (g) => (isClump(g) ? { ...g, delaySec: (g.delaySec ?? 0) + shiftSec * k++ } : g);
}

/** One headless run of `build` on A1M1 (seed 1; A1M1's runs don't vary by seed). */
function run(build: CompiledBuild): HeadlessResult {
  return runHeadless(runConfig(content, map, build, NO_PURCHASES, 1), build);
}

// Each test re-runs a whole map's harness (A1M2 also runs its R&D picks, T313): seconds, not
// milliseconds, and slower while other suites share the machine.
describe('A1M1 balance', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  // W5–W7's clumps move together, one harness run per spacing (T460: the gate's time; T127
  // checked each wave alone).
  it.each([-0.2, -0.1, 0.1, 0.2])(
    'every harness check still passes with W5–W7’s clumps %s s further apart',
    (shiftSec) => {
      const shifted = shiftedContent('a1_m01', {
        5: clumpsApart(shiftSec),
        6: clumpsApart(shiftSec),
        7: clumpsApart(shiftSec),
      });
      expect(judgeShift(shifted, 'a1_m01').failed).toEqual([]);
    },
  );

  it('three Rivets in the setup and nothing else lose gradually, never to one wave', () => {
    const tiles: readonly (readonly [number, number])[] = [ROOF, [10, 4], [3, 5]];
    const steps = tiles.map((tile) => ({
      wave: 1,
      kind: 'build' as const,
      tower: 'rivet' as const,
      tile,
    }));
    const r = run({ ...par, loadout: ['rivet'], steps });
    expect(r.outcome).toBe('lost');
    expect(r.lostAtWave!).toBeGreaterThanOrEqual(6); // not before the final waves
    // The harness's `gradual` check, which every alt build passes too (D028): no wave costs
    // over half the integrity, and the leaks start at least a wave before the loss.
    expect(notGradual(r)).toBeNull();
  });

  it('W7’s strike on the first big clump is worth 6–10 integrity to par', () => {
    const withStrike = run(par);
    const noW7Strike = run({
      ...par,
      steps: par.steps.filter((s) => !(s.kind === 'ability' && s.wave === 7)),
    });
    const saved = withStrike.integrity - noW7Strike.integrity;
    expect(saved).toBeGreaterThanOrEqual(6);
    expect(saved).toBeLessThanOrEqual(10);
  });
});
