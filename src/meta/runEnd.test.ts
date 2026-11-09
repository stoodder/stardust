// Run end and its rewards (meta-runtime.md § Run end; progression.md § 2–3): the payout table,
// medal Intel paid once, the lifetime Pests Processed, and the order's records.
import { describe, expect, it } from 'vitest';
import type { FlagRule } from '../content/dialogue/flags.ts';
import type { WaveTag } from '../content/types.ts';
import type { FlagRuleStats } from '../story/flags.ts';
import { REWARD_RULES, medalPayout, stardustPayout } from './rewards.ts';
import { runEnd, type RunEndInput } from './runEnd.ts';
import { createNewSave, type SaveData } from './saveData.ts';
import { SAVE_LIMITS, clampCurrency, validateSave } from './validate.ts';

/** A run on A1M1, priced like a 120-Stardust map with 8 waves (the real A1M1 pays 0). */
const RUN: RunEndInput = {
  mapId: 'a1_m01',
  outcome: 'won',
  mapStardust: 120,
  waveCount: 8,
  wavesResolved: 8,
  earnedMedals: ['victory', 'perfect_core'],
  skitterkinKilled: 50,
  meter: 18,
};

const lost = (wavesResolved: number): RunEndInput => ({
  ...RUN,
  outcome: 'lost',
  wavesResolved,
  earnedMedals: [],
  meter: 0,
});

/** A save after `runs` run ends, one after another. */
function after(...runs: RunEndInput[]): SaveData {
  return runs.reduce((save, r) => runEnd(save, r).save, createNewSave());
}

describe('stardustPayout (progression.md § 2)', () => {
  const p = { stardust: 120, wavesResolved: 8, waveCount: 8, veteranBonus: 0 };
  it.each([
    // [case, won, wonBefore, wavesResolved, source, amount]
    ['first victory pays the full value', true, false, 8, 'first_clear', 120],
    ['a replay victory pays 40%', true, true, 8, 'replay', 48],
    ['a defeat pays 25% of the waves resolved', false, false, 4, 'defeat', 15],
    ['a defeat at wave 1 pays nothing', false, false, 0, 'defeat', 0],
    ['a defeat rounds (25% × 120 × 3/8 = 11.25)', false, false, 3, 'defeat', 11],
    ['a defeat on a won map pays 0', false, true, 7, 'defeat_replay', 0],
  ] as const)('%s', (_, won, wonBefore, wavesResolved, source, amount) => {
    const out = stardustPayout({ ...p, won, wonBefore, wavesResolved });
    expect(out.source).toBe(source);
    expect(out.amount).toBe(amount);
  });

  it('scales a replay by the veteran bonus (Σ +120% → 0.4 × 2.2)', () => {
    const out = stardustPayout({ ...p, won: true, wonBefore: true, veteranBonus: 1.2 });
    expect(out.amount).toBe(Math.round(0.4 * 120 * 2.2));
  });

  it('clamps waves resolved to the map', () => {
    const out = stardustPayout({ ...p, won: false, wonBefore: false, wavesResolved: 99 });
    expect(out).toMatchObject({ amount: 30, wavesResolved: 8 });
  });

  it('pays a 0-Stardust map nothing on any outcome (A1M1)', () => {
    for (const won of [true, false]) {
      for (const wonBefore of [true, false]) {
        expect(stardustPayout({ ...p, stardust: 0, won, wonBefore }).amount).toBe(0);
      }
    }
  });
});

describe('medalPayout (progression.md § 3)', () => {
  it('pays Intel only for medals the save does not hold', () => {
    expect(medalPayout(['victory'], ['victory', 'perfect_core'])).toEqual([
      { id: 'victory', isNew: false, intel: 0 },
      { id: 'perfect_core', isNew: true, intel: REWARD_RULES.medalIntel },
    ]);
  });

  it('counts a medal once even if listed twice', () => {
    expect(medalPayout([], ['victory', 'victory'])).toHaveLength(1);
  });
});

describe('runEnd (meta-runtime.md § Run end)', () => {
  it('first victory: full Stardust, Intel per medal, the map completed with its medals', () => {
    const { save, summary } = runEnd(createNewSave(), RUN);
    expect(summary).toMatchObject({
      outcome: 'won',
      wonBefore: false,
      stardust: { source: 'first_clear', amount: 120 },
      intel: 2,
      pestsProcessed: { run: 50, lifetime: 50 },
    });
    expect(summary.medals.map((m) => m.isNew)).toEqual([true, true]);
    expect(save.currencies).toEqual({ stardust: 120, intel: 2 });
    expect(save.campaign.maps.a1_m01).toEqual({
      completed: true,
      medals: ['victory', 'perfect_core'],
      bestMeter: 18,
    });
    expect(save.stats).toEqual({ pestsProcessed: 50, runs: 1 });
  });

  it('a replay victory pays the replay share and only the new medal Intel', () => {
    const before = after(RUN);
    const { save, summary } = runEnd(before, {
      ...RUN,
      earnedMedals: ['victory', 'perfect_core', 'teamwork'],
      meter: 20,
    });
    expect(summary.stardust).toMatchObject({ source: 'replay', amount: 48 });
    expect(summary.medals).toEqual([
      { id: 'victory', isNew: false, intel: 0 },
      { id: 'perfect_core', isNew: false, intel: 0 },
      { id: 'teamwork', isNew: true, intel: 1 },
    ]);
    expect(summary.intel).toBe(1);
    expect(save.currencies).toEqual({ stardust: 168, intel: 3 });
    expect(save.campaign.maps.a1_m01?.medals).toEqual(['victory', 'perfect_core', 'teamwork']);
    expect(save.campaign.maps.a1_m01?.bestMeter).toBe(20);
  });

  it('medal Intel is paid once: the same medals again pay 0 Intel', () => {
    const twice = after(RUN, RUN);
    expect(twice.currencies.intel).toBe(2);
    expect(twice.campaign.maps.a1_m01?.medals).toEqual(['victory', 'perfect_core']);
  });

  it('a worse replay keeps the best meter', () => {
    expect(after(RUN, { ...RUN, meter: 3 }).campaign.maps.a1_m01?.bestMeter).toBe(18);
  });

  it('a defeat on an unwon map pays its share and records the map as played, not won', () => {
    const { save, summary } = runEnd(createNewSave(), lost(4));
    expect(summary).toMatchObject({
      outcome: 'lost',
      stardust: { source: 'defeat', amount: 15 },
      medals: [],
      intel: 0,
    });
    expect(save.currencies).toEqual({ stardust: 15, intel: 0 });
    expect(save.campaign.maps.a1_m01).toEqual({ completed: false, medals: [], bestMeter: 0 });
  });

  it('a defeat on a won map pays 0 and keeps the record', () => {
    const before = after(RUN);
    const { save, summary } = runEnd(before, lost(7));
    expect(summary.stardust).toMatchObject({ source: 'defeat_replay', amount: 0 });
    expect(summary.wonBefore).toBe(true);
    expect(save.currencies).toEqual(before.currencies);
    expect(save.campaign.maps.a1_m01).toEqual(before.campaign.maps.a1_m01);
  });

  it('a defeat pays no medal Intel even if the input lists medals', () => {
    const { summary } = runEnd(createNewSave(), { ...lost(2), earnedMedals: ['victory'] });
    expect(summary.medals).toEqual([]);
    expect(summary.intel).toBe(0);
  });

  it('a defeat then a first win pays the full first-clear value', () => {
    const s = after(lost(5), RUN);
    expect(s.currencies.stardust).toBe(Math.round(0.25 * 120 * (5 / 8)) + 120);
  });

  it('adds every run to the lifetime Pests Processed and the run count', () => {
    const s = after(RUN, lost(3), { ...RUN, skitterkinKilled: 7 });
    expect(s.stats).toEqual({ pestsProcessed: 107, runs: 3 });
    const { summary } = runEnd(s, { ...lost(1), skitterkinKilled: 3 });
    expect(summary.pestsProcessed).toEqual({ run: 3, lifetime: 110 });
  });

  it('pays Story difficulty in full (progression.md § 9)', () => {
    const story = { ...createNewSave(), settings: { difficulty: 'story' as const } };
    expect(runEnd(story, RUN).save.currencies).toEqual({ stardust: 120, intel: 2 });
  });

  it('leaves the input save untouched and returns a valid save', () => {
    const before = createNewSave();
    const frozen: unknown = JSON.parse(JSON.stringify(before));
    const { save } = runEnd(before, RUN);
    expect(before).toEqual(frozen);
    expect(validateSave(save).ok).toBe(true);
    expect(validateSave(runEnd(save, lost(2)).save).ok).toBe(true);
  });

  it('clamps the bank to the save limit, so a run end never writes a save validation refuses', () => {
    const rich = createNewSave();
    rich.currencies = { stardust: SAVE_LIMITS.currency - 10, intel: SAVE_LIMITS.currency };
    const { save } = runEnd(rich, RUN);
    expect(save.currencies).toEqual({
      stardust: SAVE_LIMITS.currency,
      intel: SAVE_LIMITS.currency,
    });
    expect(validateSave(save).ok).toBe(true);
    expect(clampCurrency(-3)).toBe(0);
    expect(clampCurrency(Number.NaN)).toBe(0);
    expect(clampCurrency(12.7)).toBe(12);
  });

  it('issues the next map\'s towers on the first win of the map before it (meta/issued.ts)', () => {
    const first = runEnd(createNewSave(), RUN);
    expect(first.summary.issued).toEqual(['sprinkler']);
    expect(first.save.unlocks.towers).toEqual(['rivet', 'thumper', 'sprinkler']);
    expect(runEnd(first.save, RUN).summary.issued).toEqual([]);
    // A loss issues nothing (the map isn't won).
    const loss = runEnd(createNewSave(), lost(3));
    expect(loss.summary.issued).toEqual([]);
    expect(loss.save.unlocks.towers).toEqual(['rivet', 'thumper']);
  });
});

/** Per-tag counts with `n` quiet-wave units (step 2's stats). */
const tags = (n: number): Record<WaveTag, number> => ({
  quiet_wave: n,
  youngling: 0,
  fleeing: 0,
  medal_exempt: 0,
});

/** A finished run's stats with `leaked` of 5 quiet-wave units leaked. */
const stats = (leaked: number): FlagRuleStats => ({
  holdFireUses: 1,
  holdFireTicks: 90,
  integrityLost: 5,
  towersBuilt: 4,
  creditsSpent: 300,
  abilityUses: 1,
  tagSpawned: tags(5),
  tagLeaked: tags(leaked),
  tagKilled: tags(5 - leaked),
});

describe('runEnd step 2: story run-end flag rules (story-runtime.md § Flags)', () => {
  // A1M5's Quiet Wave rule, moved onto A1M1 (the only maps a RunEndInput can name in M2).
  const RULES: FlagRule[] = [
    {
      flag: 'spared_quiet_wave',
      onMapEnd: 'a1_m01',
      value: { tagRatio: { tag: 'quiet_wave', of: 'leaked', gte: 0.75 } },
    },
  ];
  const spare = { ...RUN, stats: stats(5) };
  const clear = { ...RUN, stats: stats(0) };

  it('the run that first wins the map sets the flag, true or false, and says so', () => {
    const spared = runEnd(createNewSave(), spare, RULES);
    expect(spared.save.story.flags).toEqual({ spared_quiet_wave: true });
    expect(spared.summary.flags).toEqual({ spared_quiet_wave: true });
    const cleared = runEnd(createNewSave(), clear, RULES);
    expect(cleared.save.story.flags).toEqual({ spared_quiet_wave: false });
    expect(validateSave(spared.save).ok).toBe(true);
  });

  it('replays and losses never change it', () => {
    const won = runEnd(createNewSave(), spare, RULES).save;
    const replay = runEnd(won, clear, RULES);
    expect(replay.save.story.flags).toEqual({ spared_quiet_wave: true });
    expect(replay.summary.flags).toEqual({});
    const lostFirst = runEnd(createNewSave(), { ...lost(3), stats: stats(5) }, RULES);
    expect(lostFirst.save.story.flags).toEqual({});
    // A loss, then the first win: the win's run decides.
    expect(runEnd(lostFirst.save, clear, RULES).save.story.flags).toEqual({
      spared_quiet_wave: false,
    });
  });

  it('keeps the save’s other flags, and sets nothing without stats or a rule for the map', () => {
    const base = createNewSave();
    const held = { ...base, story: { ...base.story, flags: { door_choice: 'warren' as const } } };
    expect(runEnd(held, spare, RULES).save.story.flags).toEqual({
      door_choice: 'warren',
      spared_quiet_wave: true,
    });
    expect(runEnd(base, RUN, RULES).save.story.flags).toEqual({});
    // The live rules name A1M5 and A2M3, not A1M1.
    expect(runEnd(base, spare).save.story.flags).toEqual({});
  });
});
