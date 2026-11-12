// A challenge map's run end (meta/challengeRunEnd.ts; T803d): medals pay Intel once, never
// Stardust, and the campaign stays as it was.
import { describe, expect, it } from 'vitest';
import { challengeRunEnd } from './challengeRunEnd.ts';
import type { RunEndInput } from './runEnd.ts';
import { createNewSave, type SaveData } from './saveData.ts';

const WIN: RunEndInput = {
  mapId: 'ch_m01',
  outcome: 'won',
  // A challenge pays no Stardust whatever the input says.
  mapStardust: 500,
  waveCount: 10,
  wavesResolved: 10,
  earnedMedals: ['victory', 'perfect_core', 'ch_m01_grounded'],
  skitterkinKilled: 30,
  meter: 17,
};

function save(): SaveData {
  return { ...createNewSave(), currencies: { stardust: 120, intel: 4 } };
}

describe('challengeRunEnd', () => {
  it('a win stores its medals and best meter, and pays 1 Intel per new medal, no Stardust', () => {
    const before = save();
    const { save: after, summary } = challengeRunEnd(before, WIN);
    expect(after.campaign.maps.ch_m01).toEqual({
      completed: true,
      medals: ['victory', 'perfect_core', 'ch_m01_grounded'],
      bestMeter: 17,
    });
    expect(summary.intel).toBe(3);
    expect(summary.stardust.amount).toBe(0);
    expect(after.currencies).toEqual({ stardust: 120, intel: 7 });
    expect(summary.medals.every((m) => m.isNew)).toBe(true);
  });

  it('a replay pays only a medal new to the save, and keeps the best meter', () => {
    const once = challengeRunEnd(save(), { ...WIN, earnedMedals: ['victory'], meter: 9 }).save;
    const { save: twice, summary } = challengeRunEnd(once, { ...WIN, meter: 5 });
    expect(summary.wonBefore).toBe(true);
    expect(summary.intel).toBe(2);
    expect(twice.campaign.maps.ch_m01?.medals).toEqual([
      'victory',
      'perfect_core',
      'ch_m01_grounded',
    ]);
    expect(twice.campaign.maps.ch_m01?.bestMeter).toBe(9);
    const again = challengeRunEnd(twice, WIN);
    expect(again.summary.intel).toBe(0);
    expect(again.save.currencies.intel).toBe(twice.currencies.intel);
    expect(again.save.campaign.maps.ch_m01?.bestMeter).toBe(17);
  });

  it('a checkpoint retry keeps Victory only; a loss records the attempt and pays nothing', () => {
    const retry = challengeRunEnd(save(), { ...WIN, usedCheckpoint: true, resumedFromWave: 5 });
    expect(retry.save.campaign.maps.ch_m01?.medals).toEqual(['victory']);
    expect(retry.summary.intel).toBe(1);
    const lost = challengeRunEnd(save(), {
      ...WIN,
      outcome: 'lost',
      wavesResolved: 4,
      earnedMedals: [],
      meter: 0,
    });
    expect(lost.save.campaign.maps.ch_m01).toEqual({ completed: false, medals: [], bestMeter: 0 });
    expect(lost.summary.intel).toBe(0);
    expect(lost.summary.stardust.amount).toBe(0);
    expect(lost.save.currencies).toEqual(save().currencies);
  });

  it('never touches the campaign: story, stats, unlocks, other maps, veteran records', () => {
    const before = save();
    const { save: after, summary } = challengeRunEnd(before, WIN);
    expect(after.story).toEqual(before.story);
    expect(after.stats).toEqual(before.stats);
    expect(after.unlocks).toEqual(before.unlocks);
    expect(after.veteran).toEqual(before.veteran);
    expect(Object.keys(after.campaign.maps)).toEqual(['ch_m01']);
    expect(after.campaign.seenEnemies).toEqual(before.campaign.seenEnemies);
    expect(summary).toMatchObject({
      firstPayday: false,
      flags: {},
      issued: [],
      memos: [],
      codex: [],
      transactions: [],
      revocations: [],
      pestsProcessed: { run: 30, lifetime: before.stats.pestsProcessed },
    });
  });
});
