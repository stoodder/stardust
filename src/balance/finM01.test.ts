// FIN Phase 1, the Descent (T820, retuned with the whole map by T821; story/campaign/finale.md
// § FIN, design/maps.md § 5.5). As tuned, par (Mindspike with Echo Spike and Dread, Hum Choir,
// Sproing Pad, Scuttle Den; Ves'thara; Suppressing Fire) walks the convoy's 16 singers to the Halls
// mouth with 7 still singing (9 hushed), its halts a sliver of the walk and its waits at each leg's
// end under ~40% of it, the four waymark lanterns relit, and the Bore short of full. Without air
// (the gate falls to the flyers), jam, or splash, the choir is lost in Phase 1 (by W18); Story
// arrives with more Voices. The whole map's margins, Phase 2, and Dawn are finM01Phase2.test.ts's
// and the harness parts' (finM01Part*.test.ts).
//
// The beats keep time with the waves (the choir's `walkWaves`): the memorial cue plays in W9 on
// Standard, Story, and veteran Rush Hour; under alwaysCallEarly the choir lags its allowance and
// passes it later. Phase 2 starts at the later of W18 cleared and the choir at the Halls mouth
// (`{ choirAt, afterWave: 18 }`): on Standard the choir is there first and Phase 2 starts the tick
// after W18 clears; under Story, veteran Rush Hour, and alwaysCallEarly W18 clears first and Phase
// 2 starts the tick after she arrives.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { finM01Beats, TICK_HZ } from './__fixtures__/finM01Beats.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);

describe('FIN Phase 1 balance', { timeout: HARNESS_TEST_TIMEOUT_MS * 2 }, () => {
  const par = finM01Beats(content, 'par', { untilPhase2: true });

  it('walks par to the Halls mouth with 7 of 16 singing, the lanterns relit, the Bore short', () => {
    expect(par.outcome).toBe('playing');
    expect([par.voices, par.singers]).toEqual([7, 16]);
    expect(par.waymarks).toBe('done');
    expect(par.borePct).toBeLessThan(100); // no breakthrough for par
    expect(RAW_CONTENT.maps.fin_m01.marginBand).toBeUndefined(); // the finale's own 40–60
  });

  it("keeps par's halts a sliver of Phase 1 (≤ 15%, but some) and its waits under ~40%", () => {
    expect(par.haltTicks).toBeGreaterThan(0);
    expect(par.haltTicks / par.arrivedTick).toBeLessThanOrEqual(0.15);
    expect(par.waitTicks / par.arrivedTick).toBeLessThanOrEqual(0.4);
    // Phase 1 runs 12–18 minutes at 1×.
    const minutes = par.arrivedTick / (TICK_HZ * 60);
    expect(minutes).toBeGreaterThan(12);
    expect(minutes).toBeLessThan(18);
  });

  it('loses the choir without air, jam, or splash in Phase 1, and Story keeps more Voices', () => {
    for (const c of ['air', 'jam', 'splash']) {
      const b = finM01Beats(content, `noCounter:${c}`);
      expect(b.outcome, c).toBe('lost');
      expect(b.wave, c).toBeLessThanOrEqual(18);
    }
    const story = finM01Beats(content, 'par@story', { untilPhase2: true });
    expect(story.phase2Tick).toBeGreaterThan(0);
    expect(story.voices).toBeGreaterThan(par.voices);
  });

  it('plays the memorial cue in W9 on Standard, Story, and Rush Hour; later under early calls', () => {
    const runs = {
      par,
      story: finM01Beats(content, 'par@story', { untilPhase2: true }),
      rush: finM01Beats(content, 'par', { rushHour: true, untilPhase2: true }),
    };
    for (const [name, b] of Object.entries(runs)) {
      expect(b.memorial?.wave, name).toBe(9);
      expect(b.memorial!.sec, name).toBeLessThan(15);
    }
    const early = finM01Beats(content, 'alwaysCallEarly', { untilPhase2: true });
    expect(early.memorial!.wave).toBeGreaterThan(9);
  });
});

describe('FIN Phase 2 start: the later of W18 cleared and the choir at the Halls', () => {
  const opts = { untilPhase2: true } as const;

  it('par: the choir first, Phase 2 the tick after W18 clears', () => {
    const b = finM01Beats(content, 'par', opts);
    expect(b.arrivedTick).toBeGreaterThan(0);
    expect(b.arrivedTick).toBeLessThan(b.w18ClearedTick);
    expect(b.phase2Tick).toBe(b.w18ClearedTick + 1);
    expect(b.checkpoint).toEqual({ label: 'halls', wave: 18 });
    expect(b.boreRateAtPhase2).toBe(0); // the Bore stops, fixing the Unsung's bonus
  });

  it.each([
    ['par@story', {}],
    ['par', { rushHour: true }],
    ['alwaysCallEarly', {}],
  ] as const)('%s %o: W18 clears first, Phase 2 the tick after she arrives', (label, extra) => {
    const b = finM01Beats(content, label, { ...opts, ...extra });
    expect(b.w18ClearedTick).toBeGreaterThan(0);
    expect(b.w18ClearedTick).toBeLessThan(b.arrivedTick);
    expect(b.phase2Tick).toBe(b.arrivedTick + 1);
    expect(b.checkpoint).toEqual({ label: 'halls', wave: 18 });
  });
});
