// A1M4's tuning is robust where it matters (T304f, T315): with W1's Zoomer rush ±0.2 s later or
// 0.05 s looser or tighter, W5's Chonks ±0.2 s apart, W7's Haulers 1 s closer or further apart,
// W9's convoys 1 s closer or further apart (the Bunchlings behind them move with them; the tail
// keeps its own time), W9's Elders and its tail ±0.2 s, and W3–W9's other groups shifted ±0.2 s,
// the harness's verdicts still hold and par stays at 85: it holds W1 whole, its one leak is a
// Hauler of W9's tail, it earns Asset Recovery and completes Clean Audit, its casts and Orbital
// Strike Mk II still change its result (T228), both no-counter builds lose (also on the full
// catalog), early calls stay fair, and the alt builds keep their floors and the no-single-wave-
// wall rule. The shifts run as three compound shifts, each moving several groups at once (T460: the
// gate's time; T315 checked each one alone). The waves and builds are documented in
// docs/story/campaign/act1.md § A1M4.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { WaveGroup } from '../content/types.ts';
import { TAIL_DELAY } from '../content/maps/a1_m04/waves.ts';
import {
  both,
  bothWays,
  delay,
  enemy,
  judgeShift,
  shiftedContent,
  spaced,
} from './__fixtures__/shifts.ts';
import { runMap } from './harness.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const raw = RAW_CONTENT.maps.a1_m04;
const content = compileContent(RAW_CONTENT);

/** W9's tail: the Haulers that walk in behind the convoys, on their own clock. */
const isTail = (g: WaveGroup): boolean => g.enemy === 'hauler' && (g.delaySec ?? 0) >= TAIL_DELAY;
/** W9's convoys `d` s further apart: each group but the tail moves by d per 12 s convoy gap. */
const convoys =
  (d: number) =>
  (g: WaveGroup): WaveGroup =>
    isTail(g) ? g : delay(() => true, (d * (g.delaySec ?? 0)) / 12)(g);

/**
 * The compound shifts, each run both ways (`s` = ±1). W9's groups move in pairs that hold together
 * (convoys and tail, Elders and Bunchlings); not every pair does: the convoys 1 s closer with the
 * Bunchlings 0.2 s earlier cost par a second Hauler (70), though each alone holds (T460).
 */
const SHIFTS = {
  'W1’s rush (later and looser), W3–W8, and W7’s Haulers': (s: number) => ({
    1: both(delay(enemy('zoomer'), 0.2 * s), spaced(enemy('zoomer'), 0.05 * s)),
    3: delay(enemy('zoomer'), 0.2 * s),
    5: both(spaced(enemy('chonk'), 0.2 * s), delay(enemy('bunchling'), 0.2 * s)),
    6: delay(enemy('bunchling'), 0.2 * s),
    7: spaced(enemy('hauler'), s),
    8: delay(enemy('bunchling'), 0.2 * s),
  }),
  'W9’s convoys (1 s) and its tail': (s: number) => ({
    9: both(convoys(s), delay(isTail, 0.2 * s)),
  }),
  'W9’s Elders and Bunchlings': (s: number) => ({
    9: both(delay(enemy('elder'), 0.2 * s), delay(enemy('bunchling'), 0.2 * s)),
  }),
} as const;

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

  it.each(bothWays(SHIFTS))('holds with %s shifted %s', (_name, _way, patches) => {
    const { failed, par } = judgeShift(shiftedContent('a1_m04', patches), 'a1_m04');
    expect({ failed, par: par.marginPct }).toEqual({ failed: [], par: 85 });
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
