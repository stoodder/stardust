import { beforeEach, describe, expect, it } from 'vitest';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import { MemoryStore, SAVE_KEYS, createNewSave, exportCode, getLastSlot } from '../meta/index.ts';
import { campaign, lastStarMapMarker, rememberStarMapMarker, slots } from '../ui/screens/state.ts';
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
  hintShown,
  importInto,
  initSaves,
  loadDevSave,
  markHintsShown,
  markNewTowersShown,
  newGame,
  newTowersIn,
  nextMapId,
  openSlot,
  rawSlotText,
  recordRun,
  setDifficulty,
  systemOpen,
} from './save.ts';

/** A run end on `mapId`: a win with Victory and Perfect Core unless overridden. */
const run = (mapId: string, meter: number, over: Partial<Parameters<typeof recordRun>[0]> = {}) =>
  recordRun({
    mapId,
    outcome: 'won',
    mapStardust: 0,
    waveCount: 7,
    wavesResolved: 7,
    earnedMedals: ['victory', 'perfect_core'],
    skitterkinKilled: 40,
    meter,
    ...over,
  });

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

  it('a win opens the base and R&D, pays its medals, and survives a reload', () => {
    newGame(1);
    expect(systemOpen('rnd')).toBe(false);
    expect(run('a1_m01', 19)).toMatchObject({ intel: 2, pestsProcessed: { lifetime: 40 } });
    expect(systemOpen('base')).toBe(true);
    expect(systemOpen('rnd')).toBe(true);
    // Xenotech opens after A2M5, far past every map the dev save can have won (A1M3 opens the shop).
    expect(systemOpen('xenotech')).toBe(false);
    expect(campaign.value?.board[0]).toMatchObject({ state: 'won' });
    closeSession();
    expect(openSlot(1)).toEqual({ ok: true });
    expect(activeSave()?.campaign.maps.a1_m01).toEqual({
      completed: true,
      medals: ['victory', 'perfect_core'],
      bestMeter: 19,
    });
    expect(activeSave()?.currencies.intel).toBe(2);
    expect(activeSave()?.stats).toEqual({ pestsProcessed: 40, runs: 1 });
    expect(campaign.value).toMatchObject({ intel: 2, pestsProcessed: 40 });
  });

  it('a loss is a run end too: Pests Processed and the run count, no win', () => {
    newGame(1);
    expect(run('a1_m01', 0, { outcome: 'lost', earnedMedals: [], wavesResolved: 3 })).toMatchObject(
      {
        stardust: { source: 'defeat', amount: 0 },
        intel: 0,
      },
    );
    expect(activeSave()?.stats).toEqual({ pestsProcessed: 40, runs: 1 });
    expect(systemOpen('base')).toBe(false);
    openSlot(1);
    expect(activeSave()?.stats.runs).toBe(1);
  });

  it('a run on a non-campaign map (the dev battle) changes nothing and pays nothing', () => {
    newGame(1);
    expect(run('dev_range', 5)).toBeNull();
    expect(activeSave()).toEqual(createNewSave());
  });

  it('a run with no save in play records nothing', () => {
    expect(run('a1_m01', 5)).toBeNull();
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
    run('a1_m01', 20);
    const code = await exportActive();
    expect(code).toMatch(/^SD3-/);
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

  it("forgets the star map's marker when the save in play changes, not when it is saved (T461)", () => {
    newGame(1);
    rememberStarMapMarker('a1_m05');
    run('a1_m01', 20); // the same save, written
    expect(lastStarMapMarker()).toBe('a1_m05');
    newGame(2); // another slot
    expect(lastStarMapMarker()).toBeNull();
    rememberStarMapMarker('a1_m05');
    closeSession(); // back to the Title
    expect(lastStarMapMarker()).toBeNull();
    rememberStarMapMarker('a1_m05');
    expect(loadDevSave('after_a2m1')).toBe(true);
    expect(lastStarMapMarker()).toBeNull();
  });

  it('an unreadable slot shows as such and offers its raw text', () => {
    store.set(SAVE_KEYS.slot(2), '{nope');
    initSaves(store);
    expect(slots.value[1]).toEqual({ slot: 2, status: 'unreadable', raw: '{nope' });
    expect(rawSlotText(2)).toBe('{nope');
    expect(openSlot(2)).toMatchObject({ ok: false });
    expect(newGame(2)).toMatchObject({ ok: false });
  });

  it("a win issues the next map's towers (the Sprinkler after A1M1), once", () => {
    newGame(1);
    expect(run('a1_m01', 20)).toMatchObject({ issued: ['sprinkler'] });
    expect(activeSave()?.unlocks.towers).toEqual(['rivet', 'thumper', 'sprinkler']);
    expect(run('a1_m01', 20)).toMatchObject({ issued: [] });
    expect(activeSave()?.unlocks.towers).toEqual(['rivet', 'thumper', 'sprinkler']);
  });

  it('a newly issued tower is new for its first battle only, and the upgrade teach once (D061)', () => {
    expect(newTowersIn(['rivet', 'sprinkler'])).toEqual([]); // no save: nothing is new
    newGame(1);
    run('a1_m01', 20);
    const loadout = ['rivet', 'thumper', 'sprinkler'];
    expect(newTowersIn(loadout)).toEqual(['sprinkler']);
    markNewTowersShown(loadout);
    expect(newTowersIn(loadout)).toEqual([]);
    expect(hintShown('upgrade')).toBe(false);
    markHintsShown(['upgrade']);
    expect(hintShown('upgrade')).toBe(true);
    // Both survive a reload.
    closeSession();
    expect(openSlot(1)).toEqual({ ok: true });
    expect(newTowersIn(loadout)).toEqual([]);
    expect(hintShown('upgrade')).toBe(true);
  });

  it('a save written before its towers were issued catches up when loaded or imported', async () => {
    const old = createNewSave();
    old.campaign.maps.a1_m01 = { completed: true, medals: ['victory'], bestMeter: 20 };
    const w = await exportCode(old, 0);
    const check = await checkImport(w);
    if (!check.ok) throw new Error(check.message);
    expect(importInto(2, check.save)).toEqual({ ok: true });
    expect(activeSave()?.unlocks.towers).toContain('sprinkler');
    closeSession();
    expect(openSlot(2)).toEqual({ ok: true });
    expect(activeSave()?.unlocks.towers).toContain('sprinkler');
  });

  it('a run end reports a failed write, and notes where unspendable Stardust goes', () => {
    newGame(1);
    expect(run('a1_m01', 20)).toMatchObject({ writeFailed: null, stardustNote: null });
    store.set = () => {
      throw new Error('quota');
    };
    const r = run('a1_m02', 20, { mapStardust: 130 });
    expect(r?.writeFailed).toMatch(/Records couldn't file that/);
    expect(r?.stardustNote).toBe("Banked for Zibzab's shop. Opens after Special Delivery.");
    // The session keeps the run.
    expect(activeSave()?.currencies.stardust).toBe(130);
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
    run('a1_m01', 3);
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
    // Xenotech opens after A2M5: with that win taken out, only a dev unlock could open it.
    const save = DEV_SAVES.all_unlocked.build();
    const maps: Record<string, unknown> = save.campaign.maps;
    delete maps.a2_m05;
    const code = await exportCode(save, 0);
    const check = await checkImport(code);
    if (!check.ok) throw new Error(check.message);
    importInto(1, check.save);
    expect(systemOpen('rnd')).toBe(true);
    expect(systemOpen('xenotech')).toBe(false);
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
