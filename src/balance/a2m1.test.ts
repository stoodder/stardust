// A2M1's tuning is robust where it matters (T420). As tuned, par wins at 17/21 (81.0%, Act II's
// re-baseline after A1M5's boss) on every seed, and all four of its leaks come down the yard cut
// (one in W9, three in W10: its packed cluster, which par's strike breaks, and the column behind
// it), the bore road's short way to the lift along the dark east edge, out of reach of par's
// towers at the merge. Splash is the map's one answer: par's two Thumpers at the merge sweep the
// packed clusters (no Mote gets through the merge), while the no-splash build loses to W6's
// clusters and, with the full catalog, to W7's double cluster (both roads at once). Spare runners
// cost nothing. Hiccup Contained is "no Heavy Mote leaks" (D113, T460): the cut's Motes hush no one,
// so par earns it without Perfect Core. With W7's double cluster and W8's and W10's cut groups
// shifted ±0.2 s together, every verdict holds, W7 costs par nothing, and par loses at most two
// more (T420 checked each alone, and W9's cut group). The waves and builds are documented in
// docs/story/campaign/act2.md § A2M1.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { WaveGroup } from '../content/types.ts';
import { bothWays, delay, judgeShift, shiftedContent } from './__fixtures__/shifts.ts';
import { runMap } from './harness.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);
const PAR_INTEGRITY = 17;

/** The Mote groups on `route`. */
const motesOn =
  (route: string) =>
  (g: WaveGroup): boolean =>
    g.enemy === 'mote' && g.route === route;
/** W7's double cluster: the Spires road's and the bore's, released to meet at the merge. */
const doubleCluster = (g: WaveGroup): boolean =>
  g.enemy === 'mote' && (g.delaySec ?? 0) < 10 && g.route !== 'cut';

/** The compound shift, run both ways (`s` = ±1). */
const SHIFTS = {
  'W7’s double cluster and W8’s and W10’s cut groups': (s: number) => ({
    7: delay(doubleCluster, 0.2 * s),
    8: delay(motesOn('cut'), 0.2 * s),
    10: delay(motesOn('cut'), 0.2 * s),
  }),
} as const;

// Each test re-runs a whole map's harness: seconds, not milliseconds.
describe('A2M1 balance', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  const report = runMap(content, 'a2_m01', { seeds: 1 });
  const run = (build: string) => report.runs.find((r) => r.build === build && !r.repeat)!;

  it('passes every harness check as tuned, par at 17/21 with its leaks in W9–W10', () => {
    expect(report.checks.filter((k) => !k.ok).map((k) => k.id)).toEqual([]);
    const par = run('par').result!;
    expect(par.integrity).toBe(PAR_INTEGRITY);
    expect(par.maxIntegrity).toBe(21); // Reinforced Core 1
    expect(par.waves.map((w) => w.integrityLost)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 1, 3]);
    // Every leak is a plain Mote down the cut: no Perfect Core, but Hiccup Contained (D113).
    expect(par.medals.perfectCore).not.toBe('earned');
    expect([par.stats.leaksByFaction.hollow, par.stats.heavyLeaks]).toEqual([4, 0]);
    expect(par.medals.challenge).toBe('earned');
    // Par sends the drone to both crew-log rigs before W1: Crew Logs is done.
    expect(par.objectives).toEqual(['done']);
  });

  it('makes splash the answer: no-splash loses by W7, with and without the full catalog', () => {
    const lostAt = (build: string): number => {
      const r = run(build).result!;
      expect(r.outcome).toBe('lost');
      // The wave it lost in: the last one that spawned anything.
      return r.waves.findLastIndex((w) => w.spawned > 0) + 1;
    };
    expect(lostAt('noCounter:splash')).toBeLessThanOrEqual(7);
    expect(run('noCounter:splash').result!.waves[5]!.integrityLost).toBe(21); // W6's clusters
    expect(lostAt('noCounter:splash@fullCatalog')).toBeLessThanOrEqual(7);
  });

  it('lets the player spare the runners for nothing, and hushes them when nobody does', () => {
    const par = run('par').result!;
    const spared = run('spareFleeing').result!;
    expect(spared.outcome).toBe('won');
    expect(spared.integrity).toBeGreaterThanOrEqual(par.integrity - 1); // ≥ par − 5 points
    // The Motes catch the runners on the Spires road: the hush is on screen every Mote wave.
    expect(par.hushes).toBeGreaterThan(0);
    expect(spared.hushes).toBeGreaterThan(0);
  });

  // The cut's leaks ride on where the strike and the Zapcoil's chains land in its column, so a 0.2 s
  // shift may cost par one or two more (76.2 or 71.4, inside the band): every verdict still holds.
  it.each(bothWays(SHIFTS))('holds with %s shifted %s', (_name, _way, patches) => {
    const { failed, par } = judgeShift(shiftedContent('a2_m01', patches), 'a2_m01');
    expect(failed).toEqual([]);
    expect(par.result!.waves[6]!.integrityLost).toBe(0); // W7's double cluster
    expect(par.result!.integrity).toBeGreaterThanOrEqual(PAR_INTEGRITY - 2);
    expect(par.result!.integrity).toBeLessThanOrEqual(PAR_INTEGRITY);
  });
});
