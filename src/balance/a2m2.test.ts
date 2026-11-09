// A2M2's tuning is robust where it matters (T421). As tuned, par wins at 16/21 (76.2%) with both rigs
// intact on every seed (the Protect margin is min(core %, asset %), so the core decides), its five
// leaks late: two from W8's first cluster, one from W10's, and two from W11's surge, the Hollow
// pouring down the road while the Glass Witch turns back along the branch. Par's Orbital Strike
// lands on her at the hairpin in her second phase, so she retreats after one blink (Glass Half
// Empty); without its casts she reaches the rigs. QUILL's Rapport (Time Dilation 60 s → 51 s, T401)
// has par's second Time Dilation ready for the surge: 85.7. The no-shield build loses the rigs to
// the Glimmer columns and the no-splash build loses the relay to the Mote clusters, both by W8 with
// and without the full catalog. With the Witch shifted ±0.2 s the fight plays out the same; with
// W11's surge (and its runners) or W8 shifted, every verdict holds and par stays within one leak.
// The waves and builds are documented in docs/story/campaign/act2.md § A2M2.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { RawContent, WaveDef, WaveGroup } from '../content/types.ts';
import { runMap } from './harness.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const raw = RAW_CONTENT.maps.a2_m02;
const content = compileContent(RAW_CONTENT);
const PAR_INTEGRITY = 16;

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
    maps: { ...RAW_CONTENT.maps, a2_m02: { ...raw, waves: ws } },
  };
  return compileContent(next);
}

/** Every failing check, and par's integrity left and Challenge medal on the seed. */
function judge(c: typeof content): { failed: string[]; par: number; ghe: string } {
  const report = runMap(c, 'a2_m02', { seeds: 1 });
  const par = report.runs.find((r) => r.build === 'par' && !r.repeat)?.result;
  return {
    failed: report.checks.filter((k) => !k.ok).map((k) => `#${k.id} ${k.title}`),
    par: par?.integrity ?? -1,
    ghe: par?.medals.challenge ?? 'none',
  };
}

const isWitch = (g: WaveGroup): boolean => g.enemy === 'glass_witch';
/** W11's surge: the Motes and their runners down the main road, late in the wave. */
const isSurge = (g: WaveGroup): boolean => g.route === 'main' && (g.delaySec ?? 0) > 20;

// Each test re-runs a whole map's harness: seconds, not milliseconds.
describe('A2M2 balance', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  const report = runMap(content, 'a2_m02', { seeds: 1 });
  const run = (build: string) => report.runs.find((r) => r.build === build && !r.repeat)!;
  /** The wave a losing run lost in: the last one that spawned anything. */
  const lostAt = (build: string): number => {
    const r = run(build).result!;
    expect(r.outcome).toBe('lost');
    return r.waves.findLastIndex((w) => w.spawned > 0) + 1;
  };

  it('passes every harness check as tuned, par at 16/21 with the rigs intact', () => {
    expect(report.checks.filter((k) => !k.ok).map((k) => k.id)).toEqual([]);
    const par = run('par').result!;
    expect(par.integrity).toBe(PAR_INTEGRITY);
    expect(par.maxIntegrity).toBe(21); // Reinforced Core 1
    expect([par.asset, par.maxAsset]).toEqual([10, 10]);
    expect(par.waves.map((w) => w.integrityLost)).toEqual([0, 0, 0, 0, 0, 0, 0, 2, 0, 1, 2]);
  });

  it('makes the strike on her second phase earn Glass Half Empty, and the casts hold the rigs', () => {
    const par = run('par').result!;
    expect(par.medals.challenge).toBe('earned');
    expect(par.stats.bossBlinks).toBeLessThanOrEqual(2);
    // Without its casts, she walks the branch to the rigs and drains them.
    const bare = run('parNoAbilities').result!;
    expect(bare.outcome).toBe('lost');
    expect(bare.asset).toBe(0);
    expect(bare.medals.challenge).not.toBe('earned');
  });

  it('lets QUILL’s Rapport catch the surge (T401): 16/21 → 18/21', () => {
    const rapport = run('par@rnd:rapport_quill').result!;
    expect(rapport.integrity).toBe(PAR_INTEGRITY + 2);
    expect(rapport.waves[10]!.integrityLost).toBe(0);
  });

  it('makes shields and splash the answers: each no-counter build loses by W8', () => {
    for (const build of ['noCounter:shield', 'noCounter:shield@fullCatalog']) {
      expect(lostAt(build)).toBeLessThanOrEqual(8);
      expect(run(build).result!.asset).toBe(0); // the Glimmers reach the rigs
    }
    for (const build of ['noCounter:splash', 'noCounter:splash@fullCatalog']) {
      expect(lostAt(build)).toBeLessThanOrEqual(8);
      expect(run(build).result!.integrity).toBe(0); // the clusters reach the relay
    }
  });

  it('holds with the Witch ±0.2 s: the same fight, one blink', () => {
    for (const d of [-0.2, 0.2]) {
      expect({ d, ...judge(shifted(11, isWitch, d)) }).toEqual({
        d,
        failed: [],
        par: PAR_INTEGRITY,
        ghe: 'earned',
      });
    }
  });

  // The surge's leaks and W8's ride on where the Thumpers' shells land in a packed cluster, so a
  // 0.2 s shift may cost par one more or save it one (71.4–81.0, inside the band).
  it.each([
    ['W11’s surge', 11, isSurge],
    ['W8', 8, () => true],
  ] as const)('holds with %s ±0.2 s', (_name, wave, pick) => {
    for (const d of [-0.2, 0.2]) {
      const { failed, par, ghe } = judge(shifted(wave, pick, d));
      expect({ d, failed, ghe }).toEqual({ d, failed: [], ghe: 'earned' });
      expect(par).toBeGreaterThanOrEqual(PAR_INTEGRITY - 1);
      expect(par).toBeLessThanOrEqual(PAR_INTEGRITY + 1);
    }
  });
});
