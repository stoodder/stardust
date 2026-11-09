// A1M1's tuning is robust, not a knife edge (D026, D028; T127, T130): the harness's verdicts,
// the under-built alts' `gradual` checks among them, survive ±0.2 s shifts of the clump spacing
// in W5–W7; a player who stops building after three Rivets loses gradually, never more than half
// the integrity in one wave; and W7's strike is worth 4–6 integrity to par. The waves and builds
// are documented in docs/story/campaign/act1.md § A1M1.
import { describe, expect, it } from 'vitest';
import type { CompiledBuild } from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { RawContent, WaveDef, WaveGroup } from '../content/types.ts';
import { runHeadless, type HeadlessResult } from '../sim/index.ts';
import { notGradual } from './checks.ts';
import { runMap } from './harness.ts';
import { runConfig } from './profile.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a1_m01;
const par = map.builds.parBuild;
/** The greenhouse roof (high ground). */
const ROOF = [7, 2] as const;

/** A clump: a Nibbler group fired at most 0.25 s apart. */
const isClump = (g: WaveGroup): boolean =>
  g.enemy === 'nibbler' && g.intervalSec !== undefined && g.intervalSec <= 0.25;

/** The content with wave `wave`'s k-th clump (from 0) starting k × `shiftSec` later. */
function shiftClumps(wave: number, shiftSec: number): typeof content {
  const raw = RAW_CONTENT.maps.a1_m01;
  const waves = raw.waves.map((w: WaveDef, i): WaveDef => {
    if (i !== wave - 1) return w;
    let k = 0;
    const groups = w.groups.map((g) =>
      isClump(g) ? { ...g, delaySec: (g.delaySec ?? 0) + shiftSec * k++ } : g,
    );
    return { ...w, groups };
  });
  const shifted: RawContent = {
    ...RAW_CONTENT,
    maps: { ...RAW_CONTENT.maps, a1_m01: { ...raw, waves } },
  };
  return compileContent(shifted);
}

/** One headless run of `build` on A1M1 (seed 1; A1M1's runs don't vary by seed). */
function run(build: CompiledBuild): HeadlessResult {
  return runHeadless(runConfig(content, map, build, [], 1), build);
}

describe('A1M1 balance', () => {
  it.each([5, 6, 7])('every harness check still passes with W%i’s clumps ±0.2 s apart', (wave) => {
    for (const shiftSec of [-0.2, -0.1, 0.1, 0.2]) {
      const report = runMap(shiftClumps(wave, shiftSec), 'a1_m01', { seeds: 1 });
      const failed = report.checks.filter((c) => !c.ok).map((c) => `#${c.id} ${c.title}`);
      expect({ shiftSec, failed }).toEqual({ shiftSec, failed: [] });
    }
  });

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

  it('W7’s strike on the first big clump is worth 4–6 integrity to par', () => {
    const withStrike = run(par);
    const noW7Strike = run({
      ...par,
      steps: par.steps.filter((s) => !(s.kind === 'ability' && s.wave === 7)),
    });
    const saved = withStrike.integrity - noW7Strike.integrity;
    expect(saved).toBeGreaterThanOrEqual(4);
    expect(saved).toBeLessThanOrEqual(6);
  });
});
