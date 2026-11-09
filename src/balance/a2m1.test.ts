// A2M1's tuning is robust where it matters (T420). As tuned, par wins at 17/21 (81.0%, Act II's
// re-baseline after A1M5's boss) on every seed, and all four of its leaks come down the yard cut
// (one in W9, three in W10: its packed cluster, which par's strike breaks, and the column behind
// it), the bore road's short way to the lift along the dark east edge, out of reach of par's
// towers at the merge. Splash is the map's one answer: par's two Thumpers at the merge sweep the
// packed clusters (no Mote gets through the merge), while the no-splash build loses to W6's
// clusters and, with the full catalog, to W7's double cluster (both roads at once). Spare runners
// cost nothing. With W7's double cluster shifted ±0.2 s par stays at 17/21; with W8's or W10's
// cut group shifted, every verdict holds and par loses at most two more (W9's cut group, checked
// in T420, holds at 17/21; trimmed for the gate's time). The waves and builds are documented in
// docs/story/campaign/act2.md § A2M1.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { RawContent, WaveDef, WaveGroup } from '../content/types.ts';
import { runMap } from './harness.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const raw = RAW_CONTENT.maps.a2_m01;
const content = compileContent(RAW_CONTENT);
const PAR_INTEGRITY = 17;

/** The content with each group of wave `wave` (1-based) that `pick` selects shifted `d` s later. */
function shifted(wave: number, pick: (g: WaveGroup) => boolean, d: number): typeof content {
  const ws = raw.waves.map((w: WaveDef, i): WaveDef =>
    i + 1 !== wave
      ? w
      : {
          ...w,
          groups: w.groups.map((g) =>
            pick(g) ? { ...g, delaySec: Math.max(0, (g.delaySec ?? 0) + d) } : g,
          ),
        },
  );
  const next: RawContent = {
    ...RAW_CONTENT,
    maps: { ...RAW_CONTENT.maps, a2_m01: { ...raw, waves: ws } },
  };
  return compileContent(next);
}

/** Every failing check, and par's integrity left on the seed. */
function judge(c: typeof content): { failed: string[]; par: number } {
  const report = runMap(c, 'a2_m01', { seeds: 1 });
  const par = report.runs.find((r) => r.build === 'par' && !r.repeat)?.result?.integrity ?? -1;
  return { failed: report.checks.filter((k) => !k.ok).map((k) => `#${k.id} ${k.title}`), par };
}

/** The Mote groups on `route`. */
const motesOn =
  (route: string) =>
  (g: WaveGroup): boolean =>
    g.enemy === 'mote' && g.route === route;
/** W7's double cluster: the Spires road's and the bore's, released to meet at the merge. */
const doubleCluster = (g: WaveGroup): boolean =>
  g.enemy === 'mote' && (g.delaySec ?? 0) < 10 && g.route !== 'cut';

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
    // Every leak is a Mote, so par earns neither Perfect Core nor Hiccup Contained.
    expect(par.medals.challenge).not.toBe('earned');
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

  it('holds with W7’s double cluster ±0.2 s, par still at 17/21', () => {
    for (const d of [-0.2, 0.2]) {
      expect({ d, ...judge(shifted(7, doubleCluster, d)) }).toEqual({
        d,
        failed: [],
        par: PAR_INTEGRITY,
      });
    }
  });

  // The cut's leaks ride on where the strike and the Zapcoil's chains land in its column, so a 0.2 s
  // shift may cost par one or two more (76.2 or 71.4, inside the band): every verdict still holds.
  it.each([
    ['W8’s', 8],
    ['W10’s', 10],
  ] as const)('holds with %s cut group ±0.2 s', (_name, wave) => {
    for (const d of [-0.2, 0.2]) {
      const { failed, par } = judge(shifted(wave, motesOn('cut'), d));
      expect({ d, failed }).toEqual({ d, failed: [] });
      expect(par).toBeGreaterThanOrEqual(PAR_INTEGRITY - 2);
      expect(par).toBeLessThanOrEqual(PAR_INTEGRITY);
    }
  });
});
