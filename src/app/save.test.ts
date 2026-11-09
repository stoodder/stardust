import { beforeEach, describe, expect, it } from 'vitest';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import { MemoryStore, SAVE_KEYS, createNewSave, exportCode, getLastSlot } from '../meta/index.ts';
import { campaign, slots } from '../ui/screens/state.ts';
import {
  IMPORT_MESSAGES,
  activeSave,
  browserKeyValueStore,
  checkImport,
  closeSession,
  continueSlot,
  deleteSave,
  exportActive,
  firstEmptySlot,
  importInto,
  initSaves,
  loadDevSave,
  newGame,
  nextMapId,
  openSlot,
  rawSlotText,
  recordWin,
  setDifficulty,
  systemOpen,
} from './save.ts';

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
  initSaves(store, () => 1_793_000_000_000);
});

describe('the save session', () => {
  it('starts with no save and three empty slots', () => {
    expect(activeSave()).toBeNull();
    expect(campaign.value).toBeNull();
    expect(slots.value.map((s) => s.status)).toEqual(['empty', 'empty', 'empty']);
    expect(firstEmptySlot()).toBe(1);
    expect(continueSlot()).toBeNull();
  });

  it('new game writes a fresh save, opens A1M1 next, and refuses a taken slot', () => {
    expect(newGame(2)).toEqual({ ok: true });
    expect(activeSave()).toEqual(createNewSave());
    expect(store.get(SAVE_KEYS.slot(2))).not.toBeNull();
    expect(getLastSlot(store)).toBe(2);
    expect(continueSlot()).toBe(2);
    expect(nextMapId()).toBe('a1_m01');
    expect(campaign.value).toMatchObject({ slot: 2, stardust: 0, intel: 0 });
    expect(campaign.value?.systems.base.unlocked).toBe(false);
    expect(slots.value[1]).toMatchObject({ status: 'ok', progress: 'Shift 1 · Orientation Day' });
    expect(newGame(2)).toMatchObject({ ok: false });
  });

  it('a win opens the base and R&D, and survives a reload', () => {
    newGame(1);
    expect(systemOpen('rnd')).toBe(false);
    expect(recordWin('a1_m01', 19)).toEqual({ ok: true });
    expect(systemOpen('base')).toBe(true);
    expect(systemOpen('rnd')).toBe(true);
    expect(systemOpen('shop')).toBe(false);
    expect(campaign.value?.board[0]).toMatchObject({ state: 'won' });
    closeSession();
    expect(openSlot(1)).toEqual({ ok: true });
    expect(activeSave()?.campaign.maps.a1_m01).toEqual({
      completed: true,
      medals: [],
      bestMeter: 19,
    });
  });

  it('a win on a non-campaign map (the dev battle) changes nothing', () => {
    newGame(1);
    recordWin('dev_range', 5);
    expect(activeSave()).toEqual(createNewSave());
  });

  it('difficulty persists', () => {
    expect(setDifficulty('story')).toMatchObject({ ok: false });
    newGame(1);
    setDifficulty('story');
    expect(campaign.value?.difficulty).toBe('story');
    openSlot(1);
    expect(activeSave()?.settings.difficulty).toBe('story');
  });

  it('export → import round trip into another slot', async () => {
    newGame(1);
    recordWin('a1_m01', 20);
    const code = await exportActive();
    expect(code).toMatch(/^SD1-/);
    const check = await checkImport(`\n  ${code ?? ''}  \n`);
    if (!check.ok) throw new Error(check.message);
    // The next open shift, or a count once every built shift is cleared.
    expect(check.summary).toMatch(/^(Shift 2 · Hatching Season|1 shift cleared)$/);
    expect(importInto(3, check.save)).toEqual({ ok: true });
    expect(campaign.value?.slot).toBe(3);
    expect(activeSave()?.campaign.maps.a1_m01?.completed).toBe(true);
  });

  it('import problems speak in the Act I voice', async () => {
    expect(await checkImport('')).toMatchObject({
      ok: false,
      message: 'Paste a shift code first!',
    });
    expect(await checkImport('hello')).toMatchObject({
      ok: false,
      code: 'format',
      message: IMPORT_MESSAGES.format,
    });
    const code = await exportCode(createNewSave(), 0);
    const broken = `${code.slice(0, -1)}${code.endsWith('0') ? '1' : '0'}`;
    expect(await checkImport(broken)).toMatchObject({ ok: false, code: 'checksum' });
    for (const m of Object.values(IMPORT_MESSAGES)) expect(m).toMatch(/[!.]$/);
  });

  it('delete removes a slot and leaves it if it was in play', () => {
    newGame(1);
    deleteSave(1);
    expect(activeSave()).toBeNull();
    expect(slots.value[0]?.status).toBe('empty');
  });

  it('an unreadable slot shows as such and offers its raw text', () => {
    store.set(SAVE_KEYS.slot(2), '{nope');
    initSaves(store);
    expect(slots.value[1]).toEqual({ slot: 2, status: 'unreadable', raw: '{nope' });
    expect(rawSlotText(2)).toBe('{nope');
    expect(openSlot(2)).toMatchObject({ ok: false });
    expect(newGame(2)).toMatchObject({ ok: false });
  });

  it('a storage failure is reported, not thrown', () => {
    const full = new MemoryStore();
    full.set = () => {
      throw new Error('quota');
    };
    initSaves(full);
    expect(newGame(1)).toMatchObject({ ok: false });
  });
});

describe('dev saves (?test=1&save=)', () => {
  it('load into an in-memory scratch slot that never touches the store', () => {
    expect(loadDevSave('after_a1m1')).toBe(true);
    expect(activeSave()).toEqual(DEV_SAVES.after_a1m1.build());
    expect(campaign.value?.slot).toBeNull();
    expect(store.entries.size).toBe(0);
    recordWin('a1_m01', 3);
    expect(store.entries.size).toBe(0);
  });

  it('all_unlocked opens every pane through its dev unlocks', () => {
    loadDevSave('all_unlocked');
    expect(campaign.value?.systems).toMatchObject({
      base: { unlocked: true },
      rnd: { unlocked: true },
      shop: { unlocked: true },
      engineering: { unlocked: true },
    });
  });

  it('a dev save imported as a code carries no dev unlocks', async () => {
    const code = await exportCode(DEV_SAVES.all_unlocked.build(), 0);
    const check = await checkImport(code);
    if (!check.ok) throw new Error(check.message);
    importInto(1, check.save);
    expect(systemOpen('rnd')).toBe(true);
    expect(systemOpen('shop')).toBe(false);
  });

  it('unknown ids are refused', () => {
    expect(loadDevSave('nope')).toBe(false);
    expect(loadDevSave('__proto__')).toBe(false);
  });
});

describe('browserKeyValueStore', () => {
  it('reads null and refuses writes where localStorage is missing (Node)', () => {
    const kv = browserKeyValueStore();
    expect(kv.get('x')).toBeNull();
    expect(() => kv.remove('x')).not.toThrow();
    expect(() => kv.set('x', '1')).toThrow();
  });
});
