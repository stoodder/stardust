// The per-act presentation dials (core-loop.md § 6.7): the table's rows are the doc's defaults, the
// overrides name campaign maps, the tips fit their limit, and a map resolves to its act's row
// with its own overrides on top.
import { describe, expect, it } from 'vitest';
import { CAMPAIGN_PLAN_IDS } from '../content/campaign.ts';
import { TEXT_LIMITS, tokenProblems, worstCaseLength } from '../content/dialogue/rules.ts';
import { PRESENTATION, type PresentationTable } from '../content/presentation.ts';
import { actOf } from './conditions.ts';
import {
  loadingTip,
  presentationBetweenMaps,
  presentationFor,
  presentationOfMap,
  storyActOf,
} from './presentation.ts';

describe('the presentation table', () => {
  it("has core-loop § 6.7's defaults for every act", () => {
    const { byAct } = PRESENTATION;
    expect(byAct[1]).toMatchObject({ counter: 'starred', evie: 'beaming', tidybots: 'on' });
    expect(byAct[2]).toMatchObject({ counter: 'plain', evie: 'peeling', jingle: 'minor_bridges' });
    expect(byAct[3]).toMatchObject({ counter: 'meter', evie: 'dark', tidybots: 'off' });
    expect(byAct[3].jingle).toBe('none');
    expect(byAct.finale).toMatchObject({ counter: 'remembered', jingle: 'song' });
    for (const act of [1, 2, 3, 'finale'] as const) expect(byAct[act].theme).toBe(act);
  });

  it('keeps every loading tip within its limit and free of tokens', () => {
    for (const dials of Object.values(PRESENTATION.byAct)) {
      expect(dials.loadingTips.length).toBeGreaterThan(0);
      for (const tip of dials.loadingTips) {
        expect(tokenProblems(tip)).toEqual([]);
        expect(worstCaseLength(tip)).toBeLessThanOrEqual(TEXT_LIMITS.tip);
      }
    }
  });

  it('overrides only campaign maps', () => {
    for (const map of Object.keys(PRESENTATION.byMap)) expect(CAMPAIGN_PLAN_IDS).toContain(map);
  });
});

describe('presentationFor', () => {
  it("gives each map its act's row, with its overrides on top", () => {
    for (const map of CAMPAIGN_PLAN_IDS) {
      const own = PRESENTATION.byMap[map] ?? {};
      expect(presentationFor(map)).toEqual({ ...PRESENTATION.byAct[actOf(map)], ...own });
    }
    expect(presentationFor('a2_m03').jingle).toBe('minor_bridges');
    expect(presentationFor('a2_m04')).toMatchObject({ jingle: 'minor', tidybots: 'unloading' });
    expect(presentationFor('a2_m05').tidybots).toBe('on');
    expect(presentationFor('a3_m03').holdRewardToasts).toBe(true);
  });

  it("reads Act I's row before A1M1, and a table it's given", () => {
    expect(presentationFor(null)).toBe(PRESENTATION.byAct[1]);
    const table: PresentationTable = {
      byAct: PRESENTATION.byAct,
      byMap: { a1_m02: { evie: 'dark' } },
    };
    expect(presentationFor('a1_m02', table).evie).toBe('dark');
    expect(presentationFor('a1_m03', table)).toBe(PRESENTATION.byAct[1]);
  });
});

describe('presentationOfMap', () => {
  it("reads a campaign map's own dials, whatever act it claims", () => {
    expect(presentationOfMap({ id: 'a2_m04', act: 2 })).toEqual(presentationFor('a2_m04'));
    expect(presentationOfMap({ id: 'a2_m03', act: 1 })).toEqual(presentationFor('a2_m03'));
  });

  it("gives a dev map its act's row, and post-game maps the finale's", () => {
    expect(presentationOfMap({ id: 'dev_act2', act: 2 })).toBe(PRESENTATION.byAct[2]);
    expect(presentationOfMap({ id: 'dev_range', act: 1 })).toBe(PRESENTATION.byAct[1]);
    expect(presentationOfMap({ id: 'endless_x', act: 'endless' })).toBe(PRESENTATION.byAct.finale);
    expect(storyActOf('challenge')).toBe('finale');
  });
});

describe('between maps', () => {
  it("reads the frontier's dials: Act II's from A1M5 won, the post-game's after the finale", () => {
    expect(presentationBetweenMaps('a1_m05')).toBe(PRESENTATION.byAct[1]);
    expect(presentationBetweenMaps('a2_m01').loadingTips).toEqual(['Remember: a clean perimeter.']);
    expect(presentationBetweenMaps(null).loadingTips).toEqual(['Remember them.']);
  });

  it('picks a stable tip from the pool, wrapping', () => {
    const dials = { ...PRESENTATION.byAct[1], loadingTips: ['a', 'b', 'c'] };
    expect([0, 1, 2, 3, -1, Number.NaN].map((n) => loadingTip(dials, n))).toEqual([
      'a',
      'b',
      'c',
      'a',
      'b',
      'a',
    ]);
    expect(loadingTip(PRESENTATION.byAct[2], 7)).toBe('Remember: a clean perimeter.');
  });
});
