// Act III part two's Results (T712; core-loop.md § 6.2, style-guide.md § 2): A3M5's counter line
// is its bearers carried home ("Carried: {n} of {total}."), beside its Bearers row; A3M6's meter
// is Sheltered (its row says it once); the report is auto-filed on A3M4–A3M6, a win's and a
// loss's alike, with no system "!".
import { describe, expect, it } from 'vitest';
import { CAMPAIGN_PLAN } from '../content/campaign.ts';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import { meterCounter, resultsCounter } from '../story/counter.ts';
import { presentationFor } from '../story/presentation.ts';
import { medalMarks, resultsHeader, spokenCounter } from '../ui/screens/presentationText.ts';
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
    const escort = { kind: 'evacuated', label: 'Evacuated', evacuated: 5, total: 9, lost: 4 };
    expect(meterOf({ escort: escort as never, bearers: PROTECT.bearers! })).toEqual({
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
      'Waves survived 17 / 17',
      'Core integrity 14 / 20',
      'Bearers 9 / 12',
    ]);
    expect(counterRepeatsStat(line!, rows)).toBe(false);
  });

  it('reads the finished battle through bearersCarried; none on a map without bearers', () => {
    const map = {
      escort: {
        groups: [
          { kind: 'bearer', count: 6, when: null },
          { kind: 'refugee', count: 4, when: null },
          { kind: 'bearer', count: 8, when: { flag: 'door_choice', eq: 'warren' } },
        ],
      },
    };
    const state = { stats: { bearersHome: 5, lostByGroup: [1, 2, 0] } };
    const sim = (flags: Record<string, string>) =>
      ({ state, map, config: { scriptFlags: flags } }) as unknown as Parameters<
        typeof bearersAtEnd
      >[0];
    expect(bearersAtEnd(sim({ door_choice: 'convoy' }))).toEqual({
      bearers: { home: 5, lost: 1, total: 6 },
    });
    expect(bearersAtEnd(sim({ door_choice: 'warren' }))).toEqual({
      bearers: { home: 5, lost: 1, total: 14 },
    });
    const none = { state, map: { escort: null }, config: { scriptFlags: {} } };
    expect(bearersAtEnd(none as unknown as Parameters<typeof bearersAtEnd>[0])).toEqual({});
  });

  it('the results fixture walks every bearer home on a win, half on a loss', () => {
    const save = DEV_SAVES.after_a3m4_keep.build();
    const won = fixtureResult({ map: 'a3_m05', outcome: 'won' }, save);
    expect(won.asset).toEqual({ name: 'Bearers', value: 12, max: 12 });
    expect(won.meter).toEqual({ kind: 'carried', n: 26, total: 26 });
    expect(resultsCounter(won.counter, 0, 0, won.meter)?.line).toBe('Carried: 26 of 26.');
    const lost = fixtureResult({ map: 'a3_m05', outcome: 'lost' }, save);
    expect(lost.meter).toEqual({ kind: 'carried', n: 13, total: 26 });
    expect(lost.asset?.value).toBe(6);
    const told = fixtureResult({ map: 'a3_m05', outcome: 'won', bearers: { home: 20 } }, save);
    expect(resultsCounter(told.counter, 0, 0, told.meter)?.line).toBe('Carried: 20 of 26.');
    // A Protect map with no bearers (A2M2's rigs) has its asset row and no meter.
    const rigs = fixtureResult(
      { map: 'a2_m02', outcome: 'won' },
      DEV_SAVES.after_a2m1.build(),
    );
    expect(rigs.asset).not.toBeNull();
    expect(rigs.meter).toBeNull();
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
