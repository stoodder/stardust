// A1M4's tuning is robust where it matters (T304f, T315): with W1's Zoomer rush ±0.2 s later or
// 0.05 s looser or tighter, W5's Chonks ±0.2 s apart, W7's Haulers 1 s closer or further apart,
// W9's convoys 1 s closer or further apart (the Bunchlings behind them move with them; the tail
// keeps its own time), W9's Elders and its tail ±0.2 s, and W3–W9's other groups shifted ±0.2 s,
// the harness's verdicts still hold and par stays at 85: it holds W1 whole, its one leak is a
// Hauler of W9's tail, it earns Asset Recovery and completes Clean Audit, its casts and Orbital
// Strike Mk II still change its result (T228), both no-counter builds lose (also on the full
// catalog), early calls stay fair, and the alt builds keep their floors and the no-single-wave-
// wall rule. The waves and builds are documented in docs/story/campaign/act1.md § A1M4.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { RawContent, WaveDef, WaveGroup } from '../content/types.ts';
import { TAIL_DELAY } from '../content/maps/a1_m04/waves.ts';
import { runMap } from './harness.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const raw = RAW_CONTENT.maps.a1_m04;
const content = compileContent(RAW_CONTENT);

/** The content with each group in `waves` (1-based) passed through `patch`. */
function shifted(waves: readonly number[], patch: (g: WaveGroup) => WaveGroup): typeof content {
  const ws = raw.waves.map((w: WaveDef, i): WaveDef =>
    waves.includes(i + 1) ? { ...w, groups: w.groups.map(patch) } : w,
  );
  const next: RawContent = {
    ...RAW_CONTENT,
    maps: { ...RAW_CONTENT.maps, a1_m04: { ...raw, waves: ws } },
  };
  return compileContent(next);
}

/** Every failing check, and par's margin on the seed. */
function judge(c: typeof content): { failed: string[]; par: number } {
  const report = runMap(c, 'a1_m04', { seeds: 1 });
  const par = report.runs.find((r) => r.build === 'par' && !r.repeat)?.marginPct ?? -1;
  return { failed: report.checks.filter((k) => !k.ok).map((k) => `#${k.id} ${k.title}`), par };
}

/** W9's tail: the Haulers that walk in behind the convoys, on their own clock. */
const isTail = (g: WaveGroup): boolean => g.enemy === 'hauler' && (g.delaySec ?? 0) >= TAIL_DELAY;
/** Shifts `enemy`'s groups `d` s later (a group at the wave's start stays there). */
const delay =
  (enemy: string, d: number, only: (g: WaveGroup) => boolean = () => true) =>
  (g: WaveGroup): WaveGroup =>
    g.enemy === enemy && only(g) ? { ...g, delaySec: Math.max(0, (g.delaySec ?? 0) + d) } : g;
/** Spaces `enemy`'s groups `d` s further apart. */
const spaced =
  (enemy: string, d: number) =>
  (g: WaveGroup): WaveGroup =>
    g.enemy === enemy && g.intervalSec !== undefined ? { ...g, intervalSec: g.intervalSec + d } : g;

const HOLDS = { failed: [], par: 85 };

// Each test re-runs a whole map's harness (with its R&D pick): seconds, not milliseconds.
describe('A1M4 balance', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  it('passes every harness check as tuned: par at 85 from one W9 Hauler, with Clean Audit', () => {
    const report = runMap(content, 'a1_m04', { seeds: 1 });
    expect(report.checks.filter((k) => !k.ok).map((k) => k.id)).toEqual([]);
    const par = report.runs.find((r) => r.build === 'par' && !r.repeat)!;
    expect(par.marginPct).toBe(85);
    expect(par.result?.objectives).toEqual(['done']);
    expect(par.result?.stats.lateSells).toBe(0);
    // D090: the margin is late, not W1's rush; the only leak is a tail Hauler (3 integrity).
    expect(par.result?.waves.map((w) => w.integrityLost)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 3]);
  });

  it.each([-0.2, 0.2])('holds with W1’s Zoomer rush %s s later', (d) => {
    expect(judge(shifted([1], delay('zoomer', d)))).toEqual(HOLDS);
  });

  it.each([-0.05, 0.05])('holds with W1’s Zoomers %s s further apart', (d) => {
    expect(judge(shifted([1], spaced('zoomer', d)))).toEqual(HOLDS);
  });

  it.each([-0.2, 0.2])('holds with W5’s Chonks %s s further apart', (d) => {
    expect(judge(shifted([5], spaced('chonk', d)))).toEqual(HOLDS);
  });

  it.each([-1, 1])('holds with W7’s Haulers and W9’s convoys %s s further apart', (d) => {
    expect(judge(shifted([7], spaced('hauler', d)))).toEqual(HOLDS);
    // Each convoy (and the trailing Bunchlings) moves by d per 12 s convoy gap; the tail doesn't.
    const convoys = (g: WaveGroup): WaveGroup =>
      isTail(g) ? g : delay(g.enemy, (d * (g.delaySec ?? 0)) / 12)(g);
    expect(judge(shifted([9], convoys))).toEqual(HOLDS);
  });

  it.each([-0.2, 0.2])('holds with W9’s Elders and its tail %s s later', (d) => {
    expect(judge(shifted([9], delay('elder', d)))).toEqual(HOLDS);
    expect(judge(shifted([9], delay('hauler', d, isTail)))).toEqual(HOLDS);
  });

  it.each([
    [3, 'zoomer'],
    [5, 'bunchling'],
    [6, 'bunchling'],
    [8, 'bunchling'],
    [9, 'bunchling'],
  ] as const)('holds with W%i’s %s groups ±0.2 s later', (wave, enemy) => {
    for (const d of [-0.2, 0.2]) {
      expect({ d, ...judge(shifted([wave], delay(enemy, d))) }).toEqual({ d, ...HOLDS });
    }
  });

  it('releases W7’s Haulers further apart than a strike covers, and W9’s in huddles (D052)', () => {
    const strike = content.abilities.orbital_strike.effect;
    expect(strike.kind).toBe('strike');
    const radius = strike.kind === 'strike' ? strike.radiusTiles + 0.5 : Infinity; // Mk II
    const h = raw.waves[6]!.groups.find((g) => g.enemy === 'hauler')!;
    expect(h.intervalSec! * content.enemies.hauler.speedTilesPerTick * 60).toBeGreaterThan(
      2 * radius,
    );
    // W9's convoy Haulers walk in pairs inside an Elder's huddle: no strike kills one.
    expect(strike.kind === 'strike' && strike.damage).toBeLessThan(content.enemies.hauler.hp);
    const w9 = raw.waves[8]!.groups;
    const convoyHaulers = w9.filter((g) => g.enemy === 'hauler' && !isTail(g));
    expect(convoyHaulers.map((g) => g.count)).toEqual([2, 2, 2]);
    expect(w9.filter((g) => g.enemy === 'elder')).toHaveLength(3);
    // The tail walks in after the last convoy, with no Elder to heal it.
    expect(w9.filter(isTail)).toHaveLength(1);
  });
});
