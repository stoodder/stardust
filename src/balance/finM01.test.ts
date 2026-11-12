// FIN Phase 1, the Descent (T820; story/campaign/finale.md § FIN, design/maps.md § 5.5). As tuned,
// par (Mindspike with Echo Spike and Dread, Hum Choir, Sproing Pad, Scuttle Den; Ves'thara;
// Suppressing Fire) walks the convoy's 16 singers to the Halls mouth with 8 still singing (50%,
// the reference cell: inside 40–60 and ≤ A3M6's 59.3 + 5), its halts a sliver of the walk and its
// waits at each leg's end under ~40% of it, the four waymark lanterns relit, and the Bore short of
// full. Without air (the gate falls to the flyers), jam, or splash, the choir is lost by W17;
// Story wins with more Voices. The alts and the warren cell are pending T821
// (BuildsDef.pendingChecks).
//
// The beats keep time with the waves (the choir's `walkWaves`): the memorial cue plays in W9 on
// Standard, Story, and veteran Rush Hour; under alwaysCallEarly the choir lags its allowance and
// passes it later. Phase 2 starts at the later of W18 cleared and the choir at the Halls mouth
// (`{ choirAt, afterWave: 18 }`): on Standard, Story, and Rush Hour the choir is there first and
// Phase 2 starts the tick after W18 clears; under alwaysCallEarly W18 clears first (the order
// happens naturally there) and Phase 2 starts the tick after she arrives. Both run on a stand-in
// W19 (balance/__fixtures__/finM01Beats.ts) until T821's waves exist.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { finM01Beats, TICK_HZ, withStandInW19 } from './__fixtures__/finM01Beats.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);
/** A3M6's par Sheltered % (balance/a3m6.test.ts): the escort chain's previous map. */
const A3M6_PAR_PCT = (32 / 54) * 100;
const pct = (b: { voices: number; singers: number }): number => (100 * b.voices) / b.singers;

describe('FIN Phase 1 balance', { timeout: HARNESS_TEST_TIMEOUT_MS * 2 }, () => {
  const par = finM01Beats(content, 'par');

  it('walks par to the Halls mouth with 8 of 16 singing, in the reference band', () => {
    expect(par.outcome).toBe('won');
    expect([par.voices, par.singers]).toEqual([8, 16]);
    expect(pct(par)).toBeGreaterThanOrEqual(40);
    expect(pct(par)).toBeLessThanOrEqual(60);
    expect(pct(par)).toBeLessThanOrEqual(A3M6_PAR_PCT + 5);
    expect(par.waymarks).toBe('done');
    expect(par.borePct).toBeLessThan(100); // no breakthrough for par
    expect(RAW_CONTENT.maps.fin_m01.marginBand).toEqual({ minPct: 40, maxPct: 70 });
  });

  it("keeps par's halts a sliver of Phase 1 (≤ 15%, but some) and its waits under ~40%", () => {
    expect(par.haltTicks).toBeGreaterThan(0);
    expect(par.haltTicks / par.arrivedTick).toBeLessThanOrEqual(0.15);
    expect(par.waitTicks / par.arrivedTick).toBeLessThanOrEqual(0.4);
    // Phase 1 runs 12–18 minutes at 1×.
    const minutes = par.ticks / (TICK_HZ * 60);
    expect(minutes).toBeGreaterThan(12);
    expect(minutes).toBeLessThan(18);
  });

  it('loses the choir without air, jam, or splash by W17, and Story wins with more Voices', () => {
    for (const c of ['air', 'jam', 'splash']) {
      const b = finM01Beats(content, `noCounter:${c}`);
      expect(b.outcome, c).toBe('lost');
      expect(b.wave, c).toBeLessThanOrEqual(17);
    }
    const story = finM01Beats(content, 'par@story');
    expect(story.outcome).toBe('won');
    expect(story.voices).toBeGreaterThanOrEqual(par.voices);
  });

  it('plays the memorial cue in W9 on Standard, Story, and Rush Hour; later under early calls', () => {
    const runs = {
      par,
      story: finM01Beats(content, 'par@story'),
      rush: finM01Beats(content, 'par', { rushHour: true }),
    };
    for (const [name, b] of Object.entries(runs)) {
      expect(b.memorial?.wave, name).toBe(9);
      expect(b.memorial!.sec, name).toBeLessThan(15);
    }
    const early = finM01Beats(content, 'alwaysCallEarly');
    expect(early.memorial!.wave).toBeGreaterThan(9);
  });
});

describe('FIN Phase 2 start: the later of W18 cleared and the choir at the Halls', () => {
  const c = withStandInW19();
  const opts = { untilPhase2: true } as const;

  it.each([
    ['par', {}],
    ['par@story', {}],
    ['par', { rushHour: true }],
  ] as const)('%s %o: the choir first, Phase 2 the tick after W18 clears', (label, extra) => {
    const b = finM01Beats(c, label, { ...opts, ...extra });
    expect(b.arrivedTick).toBeGreaterThan(0);
    expect(b.arrivedTick).toBeLessThan(b.w18ClearedTick);
    expect(b.phase2Tick).toBe(b.w18ClearedTick + 1);
    expect(b.checkpoint).toEqual({ label: 'halls', wave: 18 });
    expect(b.boreRateAtPhase2).toBe(0); // the Bore stops, fixing the Unsung's bonus
  });

  it('alwaysCallEarly: W18 first (it happens naturally there), Phase 2 the tick after she arrives', () => {
    const b = finM01Beats(c, 'alwaysCallEarly', opts);
    expect(b.w18ClearedTick).toBeGreaterThan(0);
    expect(b.w18ClearedTick).toBeLessThan(b.arrivedTick);
    expect(b.phase2Tick).toBe(b.arrivedTick + 1);
    expect(b.checkpoint).toEqual({ label: 'halls', wave: 18 });
  });
});
