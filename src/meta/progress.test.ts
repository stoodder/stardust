import { describe, expect, it } from 'vitest';
import { CAMPAIGN, CAMPAIGN_PLAN } from '../content/campaign.ts';
import { STAR_MAP_AFTER } from '../content/starMap.ts';
import { DEV_SAVES } from './__fixtures__/devSaves.ts';
import {
  META_SYSTEMS,
  SHIFT_BOARD_SIZE,
  SYSTEM_UNLOCKS,
  frontierOf,
  isMapWon,
  isSystemUnlocked,
  mapName,
  mapShown,
  nextShift,
  onStarMap,
  shiftBoard,
  mapMilestone,
  starMapEntries,
  unlockHint,
} from './progress.ts';
import { createNewSave } from './saveData.ts';

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

  it('hints name the map that opens a system, once the campaign screen shows it', () => {
    expect(unlockHint('rnd')).toBe('Opens after Orientation Day');
    expect(unlockHint('shop')).toBe('Opens after Special Delivery');
    expect(unlockHint('loadout')).toBe('Opens after Special Delivery');
    expect(unlockHint('engineering')).toBe('Opens after The Audit');
    expect(unlockHint('spareRunners')).toBe('Opens after Record Quarter');
    // G8: never a map name the campaign screen doesn't show yet (A2M5 is built, not yet shown).
    expect(unlockHint('xenotech')).toBe('Opens after Shift 10');
    expect(mapMilestone('a1_m02')).toBe('Hatching Season');
    expect(mapMilestone('dev_range')).toBe('dev_range');
  });

  it('names a later map only once it is won or the frontier (D102)', () => {
    const fresh = createNewSave();
    // Act I always; a built Act II map by its position until the star map shows it.
    expect(mapMilestone('a1_m05', fresh)).toBe('Record Quarter');
    expect(mapMilestone('a2_m01', fresh)).toBe('Shift 6');
    expect(mapMilestone('a2_m01')).toBe('Shift 6');
    const actOne = DEV_SAVES.after_a1m5_ref.build();
    expect(mapMilestone('a2_m01', actOne)).toBe('Rig Nine');
    expect(mapMilestone('a2_m02', actOne)).toBe('Shift 7');
    expect(mapShown('a2_m02', actOne)).toBe(false);
    const a2m3 = DEV_SAVES.after_a2m3.build();
    expect(mapMilestone('a2_m02', a2m3)).toBe('The Glass Witch');
    // The frontier is named; the maps after it are not (built, by their position).
    expect(mapMilestone('a2_m04', a2m3)).toBe('Second Harvest');
    expect(mapMilestone('a2_m05', a2m3)).toBe('Shift 10');
    expect(unlockHint('xenotech', a2m3)).toBe('Opens after Shift 10');
    expect(mapShown('dev_range', a2m3)).toBe(false);
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

  it('a gap in the registry is coming soon, and locks the map after it', () => {
    const save = DEV_SAVES.after_a1m1.build();
    const board = shiftBoard(save, 3, registered(['a1_m01', 'a1_m03']));
    expect(board.map((e) => e.state)).toEqual(['won', 'coming_soon', 'locked']);
  });
});

describe('the live Shift board', () => {
  it('runs through Act I, and no further once Act II maps are registered (D102)', () => {
    expect(CAMPAIGN).toContain('a2_m01');
    expect(SHIFT_BOARD_SIZE).toBeLessThan(CAMPAIGN.length);
    expect(SHIFT_BOARD_SIZE).toBe(CAMPAIGN_PLAN.findIndex((m) => m.id === STAR_MAP_AFTER) + 1);
    expect(STAR_MAP_AFTER).toBe('a1_m05');
    const board = shiftBoard(createNewSave());
    expect(board.map((e) => e.id)).toEqual(['a1_m01', 'a1_m02', 'a1_m03', 'a1_m04', 'a1_m05']);
    expect(board.map((e) => e.state)).toEqual(['open', 'locked', 'locked', 'locked', 'locked']);
    expect(board.some((e) => e.state === 'coming_soon')).toBe(false);
  });

  it('winning A1M2 offers A1M3 next (the M2 cut no longer stops the board)', () => {
    const save = DEV_SAVES.after_a1m1.build();
    save.campaign.maps.a1_m02 = { completed: true, medals: ['victory'], bestMeter: 1 };
    const board = shiftBoard(save);
    expect(board[2]).toMatchObject({ id: 'a1_m03', state: 'open', name: 'Special Delivery' });
    expect(nextShift(board)?.id).toBe('a1_m03');
  });

  it('chains A1M4 to A1M5, and with all of Act I won the next shift is a replay', () => {
    const save = createNewSave();
    const won = { completed: true, medals: ['victory'], bestMeter: 1 };
    for (const id of ['a1_m01', 'a1_m02', 'a1_m03', 'a1_m04'] as const)
      save.campaign.maps[id] = { ...won, medals: [...won.medals] };
    expect(nextShift(shiftBoard(save))?.id).toBe('a1_m05');
    save.campaign.maps.a1_m05 = { ...won, medals: [...won.medals] };
    const board = shiftBoard(save);
    expect(board).toHaveLength(5);
    expect(board.every((e) => e.state === 'won')).toBe(true);
    // No sixth map to look for: the last won shift is the one offered.
    expect(nextShift(board)?.id).toBe('a1_m05');
  });
});

describe('the star map', () => {
  it('takes over once A1M5 is won', () => {
    expect(onStarMap(DEV_SAVES.after_a1m4.build())).toBe(false);
    expect(onStarMap(DEV_SAVES.after_a1m5.build())).toBe(true);
  });

  it('after A1M5: Act I cleared with medals, and Rig Nine next up; nothing later', () => {
    const save = DEV_SAVES.after_a1m5_ref.build();
    const entries = starMapEntries(save);
    expect(entries.map((e) => [e.id, e.index, e.state])).toEqual([
      ['a1_m01', 1, 'won'],
      ['a1_m02', 2, 'won'],
      ['a1_m03', 3, 'won'],
      ['a1_m04', 4, 'won'],
      ['a1_m05', 5, 'won'],
      ['a2_m01', 6, 'open'],
    ]);
    expect(entries[0]?.medals.length).toBeGreaterThan(0);
    expect(entries[5]?.medals).toEqual([]);
    expect(frontierOf(save)).toBe('a2_m01');
  });

  it('after A2M3: the frontier is the Second Harvest teaser while A2M4 is unbuilt', () => {
    const entries = starMapEntries(DEV_SAVES.after_a2m3.build(), registered(['a2_m03']));
    expect(entries.at(-1)).toMatchObject({ id: 'a2_m04', index: 9, state: 'coming_soon' });
    expect(entries.map((e) => e.id)).not.toContain('a2_m05');
    // Built, the same frontier is next up.
    const built = starMapEntries(DEV_SAVES.after_a2m3.build(), () => true);
    expect(built.at(-1)).toMatchObject({ id: 'a2_m04', state: 'open' });
  });

  it('after the finale: every map cleared, no frontier', () => {
    const save = createNewSave();
    const maps: Record<string, unknown> = save.campaign.maps;
    for (const m of CAMPAIGN_PLAN) maps[m.id] = { completed: true, medals: [], bestMeter: 1 };
    expect(frontierOf(save)).toBeNull();
    const entries = starMapEntries(save);
    expect(entries).toHaveLength(CAMPAIGN_PLAN.length);
    expect(entries.every((e) => e.state === 'won')).toBe(true);
  });
});
