// Act III part two's Results (T712; core-loop.md § 6.2, style-guide.md § 2): A3M5's counter line
// is its bearers carried home ("Carried: {n} of {total}."), beside its Bearers row; A3M6's meter
// is Sheltered (its row says it once); the report is auto-filed on A3M4–A3M6, a win's and a
// loss's alike, with no system "!".
import { describe, expect, it } from 'vitest';
import { CAMPAIGN_PLAN } from '../content/campaign.ts';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import { meterCounter, resultsCounter } from '../story/counter.ts';
import { medalViews, perfectMedalName } from './hudViews.ts';
import { presentationFor } from '../story/presentation.ts';
import { medalMarks, resultsHeader, spokenCounter } from '../ui/screens/presentationText.ts';
import { bearerTotal } from '../sim/index.ts';
import { battleConfig } from './battleSetup.ts';
import type { RunEscort } from '../ui/screens/state.ts';
import { fixtureResult } from './resultsFixture.ts';
import { bearersAtEnd } from './resultsStory.ts';
import {
  counterRepeatsStat,
  meterOf,
  offeredMedals,
  resultsStats,
  runResultOf,
  type RunEndInput,
} from './runResult.ts';

const PROTECT: RunEndInput = {
  mapId: 'a3_m05',
  act: 3,
  waveCount: 17,
  maxIntegrity: 20,
  integrity: 14,
  asset: { name: 'Bearers', value: 9, max: 12 },
  bearers: { home: 23, lost: 3, total: 26 },
  skitterkinKilled: 0,
  wavesCleared: 17,
  firstLeakAgo: null,
  stardust: 0,
  medals: offeredMedals({ medals: null }),
  earnedMedals: [],
};

describe("A3M5's Carried line", () => {
  it('reads the bearers home of the run\'s: "Carried: {n} of {total}."', () => {
    const c = meterCounter({ kind: 'carried', n: 23, total: 26 });
    expect(c).toMatchObject({ label: 'Carried:', n: 23, end: ' of 26.', career: null });
    expect(c.line).toBe('Carried: 23 of 26.');
    expect(spokenCounter(c)).toBe('Carried: 23 of 26.');
    expect(meterCounter({ kind: 'carried', n: 1200, total: 1500 }).line).toBe(
      'Carried: 1,200 of 1,500.',
    );
  });

  it("is the run's meter on a map with bearers; an Escort's meter still wins", () => {
    expect(meterOf({ bearers: PROTECT.bearers! })).toEqual({ kind: 'carried', n: 23, total: 26 });
    const escort: RunEscort = {
      kind: 'evacuated',
      label: 'Evacuated',
      evacuated: 5,
      total: 9,
      lost: 4,
    };
    expect(meterOf({ escort, bearers: PROTECT.bearers! })).toEqual({
      kind: 'evacuated',
      n: 5,
    });
    const r = runResultOf(PROTECT, 'won');
    expect(r.counter).toBe('meter');
    expect(r.meter).toEqual({ kind: 'carried', n: 23, total: 26 });
    const line = resultsCounter(r.counter, 0, 0, r.meter);
    expect(line?.line).toBe('Carried: 23 of 26.');
    // Beside the Bearers row (the asset's integrity, a different count), never a repeat of it.
    const rows = resultsStats(r);
    expect(rows.map((s) => `${s.label} ${s.value}`)).toEqual([
      'Core integrity 14 / 20',
      'Bearers 9 / 12',
    ]);
    expect(counterRepeatsStat(line!, rows)).toBe(false);
  });

  it('reads the finished battle through bearersCarried; none on a map without bearers', () => {
    const save = DEV_SAVES.after_a3m4_keep.build();
    const config = battleConfig('a3_m05', 0, save);
    const map = config.content.maps.a3_m05!;
    const total = bearerTotal(map, config.scriptFlags);
    const bearerGroups = (map.escort?.groups ?? []).map((g) => g.kind === 'bearer');
    // One bearer lost from the first bearer group; a lost refugee elsewhere would not count.
    const lostByGroup = bearerGroups.map((b, i) => (b && i === bearerGroups.indexOf(true) ? 1 : 0));
    const state = { stats: { bearersHome: 5, lostByGroup } };
    expect(bearersAtEnd({ state, map, config })).toEqual({
      bearers: { home: 5, lost: 1, total },
    });
    const other = battleConfig('a3_m02', 0, save);
    expect(bearersAtEnd({ state, map: other.content.maps.a3_m02!, config: other })).toEqual({});
  });

  it('the results fixture walks every bearer home on a win, half on a loss', () => {
    const save = DEV_SAVES.after_a3m4_keep.build();
    const config = battleConfig('a3_m05', 0, save);
    const total = bearerTotal(config.content.maps.a3_m05!, config.scriptFlags);
    expect(total).toBeGreaterThan(0);
    const won = fixtureResult({ map: 'a3_m05', outcome: 'won' }, save);
    // The meter is named for what it guards, the bearers' road home (D150).
    expect(won.asset).toEqual({ name: 'Long Walk', value: 12, max: 12 });
    expect(won.meter).toEqual({ kind: 'carried', n: total, total });
    expect(resultsCounter(won.counter, 0, 0, won.meter)?.line).toBe(
      `Carried: ${total} of ${total}.`,
    );
    // Its Perfect is plain "Perfect" (core and bearers undamaged, act3.md § A3M5), not Perfect Core.
    expect(won.rewards?.medals.map((m) => m.name)).toEqual(['Victory', 'Perfect', 'Declined']);
    const lost = fixtureResult({ map: 'a3_m05', outcome: 'lost' }, save);
    expect(lost.meter).toEqual({ kind: 'carried', n: Math.floor(total / 2), total });
    expect(lost.asset?.value).toBe(6);
    const told = fixtureResult({ map: 'a3_m05', outcome: 'won', bearers: { home: 20 } }, save);
    expect(resultsCounter(told.counter, 0, 0, told.meter)?.line).toBe(`Carried: 20 of ${total}.`);
    // A Protect map with no bearers (A2M2's rigs) has its asset row and no meter.
    const rigs = fixtureResult({ map: 'a2_m02', outcome: 'won' }, DEV_SAVES.after_a2m1.build());
    expect(rigs.asset).not.toBeNull();
    expect(rigs.meter).toBeNull();
    expect(rigs.rewards?.medals.map((m) => m.name)).toContain('Perfect Core');
  });

  it("the results fixture's asset is out of the run's max: Story's ×1.5 (D151)", () => {
    const base = DEV_SAVES.after_a3m4_keep.build();
    const story = { ...base, settings: { ...base.settings, difficulty: 'story' as const } };
    const won = fixtureResult({ map: 'a3_m05', outcome: 'won' }, story);
    expect(won.asset).toEqual({ name: 'Long Walk', value: 18, max: 18 });
    expect(fixtureResult({ map: 'a3_m05', outcome: 'lost' }, story).asset?.value).toBe(9);
  });
});

describe("A3M6's Sheltered", () => {
  it('is its meter: the row names it "Sheltered", and the card says it once', () => {
    const r = fixtureResult(
      { map: 'a3_m06', outcome: 'won', escort: { evacuated: 40 } },
      DEV_SAVES.after_a3m5_keep.build(),
    );
    expect(r.escort).toMatchObject({ kind: 'sheltered', label: 'Sheltered', evacuated: 40 });
    expect(r.meter).toEqual({ kind: 'sheltered', n: 40 });
    const rows = resultsStats(r);
    expect(rows.find((s) => s.id === 'escort')).toMatchObject({
      label: 'Sheltered',
      value: `40 / ${r.escort!.total}`,
      note: `lost ${r.escort!.total - 40}`,
    });
    const line = resultsCounter(r.counter, 0, 0, r.meter);
    expect(line?.line).toBe('Sheltered: 40.');
    expect(counterRepeatsStat(line!, rows)).toBe(true);
  });
});

describe("Act III part two's kickers", () => {
  const maps = CAMPAIGN_PLAN.map((m) => m.id).filter((id) =>
    ['a3_m04', 'a3_m05', 'a3_m06'].includes(id),
  );
  it('are auto-filed on a win and a loss, the headline and marks with no "!"', () => {
    expect(maps).toHaveLength(3);
    for (const id of maps) {
      const style = presentationFor(id).counter;
      expect(style).toBe('meter');
      for (const outcome of ['won', 'lost'] as const) {
        const h = resultsHeader(style, outcome);
        expect(h.kicker).toBe('Shift report · Auto-filed');
        expect(h.headline).not.toContain('!');
      }
      expect(medalMarks(style)).toEqual({ new: 'New', nextTime: 'Next time.' });
    }
  });
});

describe("A3M5's Perfect", () => {
  it('is plain "Perfect" on a Protect map whose bearers walk; Perfect Core on the rigs', () => {
    const save = DEV_SAVES.after_a3m4_keep.build();
    const map = battleConfig('a3_m05', 0, save).content.maps.a3_m05!;
    expect(perfectMedalName(map)).toBe('Perfect');
    const open = { victory: 'open', perfectCore: 'open', challenge: 'open' } as const;
    expect(medalViews(map, open, [])[1]).toMatchObject({
      name: 'Perfect',
      description: 'Win with the core and the bearers unhurt.',
    });
    expect(perfectMedalName({ objective: 'protect', escort: null })).toBe('Perfect Core');
  });
});

describe("the finale's Perfect (T871)", () => {
  it('is plain "Perfect" on a choir map, no singer hushed, in the briefing and on Results', () => {
    const save = DEV_SAVES.after_a3m6.build();
    const map = battleConfig('fin_m01', 0, save).content.maps.fin_m01!;
    expect(perfectMedalName(map)).toBe('Perfect');
    const open = { victory: 'open', perfectCore: 'open', challenge: 'open' } as const;
    expect(medalViews(map, open, [])[1]).toMatchObject({
      name: 'Perfect',
      description: 'Win with no singer hushed.',
    });
    expect(offeredMedals(map)[1]?.name).toBe('Perfect');
  });
});
