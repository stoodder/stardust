import { describe, expect, it } from 'vitest';
import { CAMPAIGN_PLAN } from '../content/campaign.ts';
import { DEV_SAVES } from './__fixtures__/devSaves.ts';
import {
  META_SYSTEMS,
  SYSTEM_UNLOCKS,
  isMapWon,
  isSystemUnlocked,
  markMapWon,
  mapName,
  nextShift,
  shiftBoard,
  unlockHint,
} from './progress.ts';
import { createNewSave } from './saveData.ts';
import { validateSave } from './validate.ts';

describe('the campaign plan', () => {
  it('every gate names a planned map', () => {
    const ids: readonly string[] = CAMPAIGN_PLAN.map((m) => m.id);
    for (const map of Object.values(SYSTEM_UNLOCKS)) expect(ids).toContain(map);
  });

  it('names maps', () => {
    expect(mapName('a1_m01')).toBe('Orientation Day');
    expect(mapName('dev_range')).toBe('dev_range');
  });
});

describe('gating', () => {
  it('a new save has nothing open', () => {
    const save = createNewSave();
    for (const s of META_SYSTEMS) expect(isSystemUnlocked(save, s)).toBe(false);
  });

  it('A1M1 won opens the base and R&D Command only', () => {
    const save = DEV_SAVES.after_a1m1.build();
    expect(META_SYSTEMS.filter((s) => isSystemUnlocked(save, s))).toEqual(['base', 'rnd']);
  });

  it('a map record that is not completed opens nothing', () => {
    const save = createNewSave();
    save.campaign.maps.a1_m01 = { completed: false, medals: [], bestMeter: 0 };
    expect(isMapWon(save, 'a1_m01')).toBe(false);
    expect(isSystemUnlocked(save, 'rnd')).toBe(false);
  });

  it('dev unlocks open systems regardless of progress', () => {
    const save = createNewSave();
    expect(isSystemUnlocked(save, 'engineering', ['engineering'])).toBe(true);
    expect(isSystemUnlocked(save, 'shop', ['engineering'])).toBe(false);
    const all = DEV_SAVES.all_unlocked;
    for (const s of META_SYSTEMS)
      expect(isSystemUnlocked(all.build(), s, all.devUnlocks)).toBe(true);
  });

  it('hints name the map that opens a system', () => {
    expect(unlockHint('rnd')).toBe('Opens after Orientation Day');
    expect(unlockHint('shop')).toBe('Opens after Special Delivery');
    expect(unlockHint('engineering')).toBe('Opens after The Audit');
  });
});

const registered = (ids: readonly string[]) => (id: string) => ids.includes(id);

describe('the Shift board', () => {
  it('a new save: the first map open, the second locked', () => {
    const board = shiftBoard(createNewSave(), 2, registered(['a1_m01', 'a1_m02']));
    expect(board.map((e) => [e.id, e.index, e.state])).toEqual([
      ['a1_m01', 1, 'open'],
      ['a1_m02', 2, 'locked'],
    ]);
    expect(nextShift(board)?.id).toBe('a1_m01');
  });

  it('after A1M1: it shows won with its medals, and opens the next', () => {
    const save = DEV_SAVES.after_a1m1.build();
    const board = shiftBoard(save, 2, registered(['a1_m01', 'a1_m02']));
    expect(board[0]).toMatchObject({ state: 'won', name: 'Orientation Day' });
    expect(board[0]?.medals).toHaveLength(3);
    expect(board[1]?.state).toBe('open');
    expect(nextShift(board)?.id).toBe('a1_m02');
  });

  it('an unregistered map is coming soon', () => {
    const board = shiftBoard(DEV_SAVES.after_a1m1.build(), 2, registered(['a1_m01']));
    expect(board[1]?.state).toBe('coming_soon');
    expect(nextShift(board)?.id).toBe('a1_m01');
  });

  it('lists the live campaign by default', () => {
    const board = shiftBoard(createNewSave());
    expect(board.map((e) => e.id)).toEqual(['a1_m01', 'a1_m02']);
    expect(board[0]?.state).toBe('open');
  });
});

describe('markMapWon', () => {
  it('marks the map won, keeps medals and the best meter, and stays valid', () => {
    const save = DEV_SAVES.after_a1m1.build();
    const before = DEV_SAVES.after_a1m1.build();
    const next = markMapWon(save, 'a1_m01', 5);
    expect(save).toEqual(before);
    expect(next.campaign.maps.a1_m01?.medals).toEqual(before.campaign.maps.a1_m01?.medals);
    expect(next.campaign.maps.a1_m01?.bestMeter).toBe(before.campaign.maps.a1_m01?.bestMeter);
    const fresh = markMapWon(createNewSave(), 'a1_m01', 17);
    expect(fresh.campaign.maps.a1_m01).toEqual({ completed: true, medals: [], bestMeter: 17 });
    expect(validateSave(fresh).ok).toBe(true);
  });
});
