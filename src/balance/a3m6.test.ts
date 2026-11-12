// A3M6's tuning (T722). As tuned, par (Sproing Pad, Lookout, Mindspike, Harpoon; Suppressing Fire
// in slot 1, Zibzab's Clearance Sale in slot 2) wins at 32 of 54 Sheltered (59.3%, the Escort chain
// after A3M1's 66.7; act3.md § A3M6) under the convoy, with its losses the late exam: W9's gunships
// and Operatives, W10's surge, and W17–W18, the road filling behind the Gathering Maw. Every door ×
// C4 cell plays in band (the warren mans no militia posts; Purge's −2 Everglow armor carries from
// A3M5). Without air (the gunships, the Rift Moths) or armor (the gunships, the drones, the Maws)
// the map is lost by W11; doing nothing loses. Detection is exempt from #5/#6 (D146 addendum):
// canon gives the Operatives one teach wave and one test wave, too few to decide the map by W12, so
// this file pins what it costs instead. Both alts win, Story wins, alwaysCallEarly stays fair, and a
// run is 12–18 minutes.
//
// The Gathering Maw (4400 HP; D146 addendum) walks alone in W16 behind the last group: par burns it
// through the split (50%, after its 1.5 s telegraph), lets the three parts merge 12 s later, and
// kills the merged Maw with road to spare; a part that reaches the gate is defeat.
//
// The beats (act3.md § A3M6): each group sets off on its wave (two in W13, the last in W16); the
// first refugee is sheltered before W2's countdown, so the knock-knock (`a3_m06_w02`) comes after
// it, and QUILL's `a3_m06_cue_sheltered` plays the tick after (a script trigger's next tick) with
// no one lost before it; the
// rifts crack as W11 starts and open as W12 does, nothing walking them before; the Maw is in W16's
// preview for its whole countdown, a wave ahead, and walks in BOSS_SEC s after the wave starts.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { REFUGEES } from '../content/maps/a3_m06/map.ts';
import { REFERENCE_PROFILES, REFERENCE_STORY_PRICING } from '../content/upgrades/reference.ts';
import { escortMaxLost } from '../sim/escort.ts';
import { ALT_ROAD_LEFT_MIN, a3m6Beats, beatProblems, TICK_HZ } from './__fixtures__/a3m6Beats.ts';
import { expectCounterCost } from './__fixtures__/counterCost.ts';
import { flagsFor } from './checks.ts';
import { runMap } from './harness.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a3_m06;
/** Par's sheltered refugees, of 54. */
const PAR_SHELTERED = 32;

// Each test re-runs a whole map's harness (or a few runs): seconds, not milliseconds.
describe('A3M6 balance', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  const report = runMap(content, 'a3_m06', { seeds: 1 });
  const rec = (build: string) => report.runs.find((r) => r.build === build && !r.repeat)!;

  it(`passes every harness check as tuned, par sheltering ${PAR_SHELTERED} of ${REFUGEES}`, () => {
    expect(report.checks.filter((k) => !k.ok).map((k) => k.id)).toEqual([]);
    const par = rec('par').result!;
    expect(par.outcome).toBe('won');
    expect(REFUGEES).toBe(54);
    expect(par.stats.evacuated).toBe(PAR_SHELTERED);
    expect(rec('par').marginPct).toBeCloseTo((PAR_SHELTERED / REFUGEES) * 100, 5);
    // The cap is generous: 30 of 54, and par loses 22.
    expect(escortMaxLost({ refugeeTotal: REFUGEES }, map)).toBe(30);
    // Par holds the opening (W1–W4): the power trip starts clean.
    expect(par.waves.slice(0, 4).every((w) => w.leaked === 0)).toBe(true);
    expect(map.builds.counterExemptions.map((x) => x.counter)).toEqual(['detection']);
  });

  it('loses without air or armor by W11, and doing nothing loses', () => {
    for (const c of ['air', 'armor']) {
      const r = rec(`noCounter:${c}`).result!;
      expect(r.outcome, c).toBe('lost');
      expect(r.lostAtWave, c).toBeLessThanOrEqual(11);
    }
    expect(rec('none').result!.outcome).toBe('lost');
  });

  it('makes detection matter (exempt from #5/#6): no-detection loses, ≥ 10 under par', () => {
    // The harness skips #5/#6 for it, so it runs here.
    const blind = a3m6Beats(content, 'noCounter:detection');
    expect(blind.outcome).toBe('lost');
    expect(rec('par').marginPct).toBeGreaterThanOrEqual(10); // a loss's margin is 0
    expectCounterCost({
      map: 'a3_m06',
      counter: 'detection',
      par: rec('par').marginPct,
      // The harness doesn't run an exempted build: a loss's margin is 0, a win's its Sheltered %.
      without: blind.outcome === 'lost' ? 0 : (blind.evacuated / REFUGEES) * 100,
      minPoints: 10,
    });
    // Nothing Repossessed is out of its reach (an Operative reached the gate), and more Operatives
    // reach the gate than par's in both their waves.
    const par = a3m6Beats(content, 'par');
    for (const w of [5, 9]) {
      expect(blind.operativesLeaked[w] ?? 0, `W${w}`).toBeGreaterThan(par.operativesLeaked[w] ?? 0);
    }
  });

  it('wins both alts (≥ 20), Story, and alwaysCallEarly (within par + 10)', () => {
    for (const alt of ['alt:hooks', 'alt:bonk_and_bust']) {
      expect(rec(alt).result!.outcome, alt).toBe('won');
      expect(rec(alt).marginPct, alt).toBeGreaterThanOrEqual(20);
    }
    expect(rec('par@story').result!.outcome).toBe('won');
    const early = rec('alwaysCallEarly');
    expect(early.result!.outcome).toBe('won');
    expect(early.marginPct).toBeLessThanOrEqual(rec('par').marginPct + 10);
  });

  it('plays every door × C4 cell in band, the militia manned only under the convoy', () => {
    for (const door of ['convoy', 'warren'] as const) {
      for (const quill of ['keep', 'purge', 'rewrite'] as const) {
        const label = `flags:door_choice=${door},quill_choice=${quill}`;
        expect(flagsFor(label, map), label).toEqual({ door_choice: door, quill_choice: quill });
        const b = a3m6Beats(content, label);
        expect(beatProblems(b, label)).toEqual([]);
        const pct = (b.evacuated / REFUGEES) * 100;
        expect(pct, label).toBeGreaterThanOrEqual(50);
        expect(pct, label).toBeLessThanOrEqual(70);
      }
    }
    // Militia posts: three, each gated on the convoy.
    expect(map.allies.map((a) => [a.kind, a.when])).toEqual(
      Array.from({ length: 3 }, () => ['militia', { flag: 'door_choice', eq: 'convoy' }]),
    );
  });

  it("carries Zibzab's crate in the reference profile (every owned Vrell tune-up at its top rank)", () => {
    const shop = REFERENCE_PROFILES.a3_m06.shop;
    expect(shop).toMatchObject({ tune_harpoon: 3, tune_lookout: 3, tune_zapcoil: 3 });
    expect(REFERENCE_STORY_PRICING.a3_m06.convoy.giftedShop).toEqual({
      tune_zapcoil: 1,
      tune_lookout: 3,
      tune_harpoon: 1,
    });
    expect(map.builds.referenceProfile.shop).toMatchObject(shop);
    expect(map.builds.referenceProfileByFlag).toEqual([]); // the same profile in every cell
  });

  it('runs 12–18 minutes at 1×', () => {
    const minutes = rec('par').result!.ticks / (TICK_HZ * 60);
    expect(minutes).toBeGreaterThan(12);
    expect(minutes).toBeLessThan(18);
  });

  it('lands every beat in par, both alts, Story and alwaysCallEarly', () => {
    for (const label of ['par', 'par@story']) {
      expect(beatProblems(a3m6Beats(content, label), label)).toEqual([]);
    }
    for (const label of ['alt:hooks', 'alt:bonk_and_bust', 'alwaysCallEarly']) {
      expect(beatProblems(a3m6Beats(content, label), label, ALT_ROAD_LEFT_MIN)).toEqual([]);
    }
  });

  it('lets the Gathering Maw through without armor answers, even with no loss cap', () => {
    // No-armor loses by W10 on the losses; with the cap lifted it lives to W16, and the Maw (armor
    // 4, the void body Psionic would ignore) walks through its shells and bonks to the gate.
    const raw = RAW_CONTENT.maps.a3_m06;
    const uncapped = compileContent({
      ...RAW_CONTENT,
      maps: { ...RAW_CONTENT.maps, a3_m06: { ...raw, maxLostPct: 1 } },
    });
    const b = a3m6Beats(uncapped, 'noCounter:armor');
    expect(b.at['MawSpawned']).toHaveLength(1);
    expect(b.bossAtGate).toBe(true);
    expect(b.outcome).toBe('lost');
  });

  it('loses the moment a part of the Maw reaches the gate', () => {
    // Par, holding fire on every tower from the split: the parts walk the last bend untouched.
    const b = a3m6Beats(content, 'par', {
      afterSplit: [{ type: 'holdFire', target: 'all', on: true }],
    });
    expect(b.at['BossSplit']).toHaveLength(1);
    expect(b.bossAtGate).toBe(true);
    expect(b.outcome).toBe('lost');
  });
});
