import { describe, expect, it } from 'vitest';
import saveV0 from './__fixtures__/save.v0.json' with { type: 'json' };
import {
  MAX_SAVE_JSON_CHARS,
  deleteSlot,
  getLastSlot,
  listSlots,
  loadSlot,
  parseSaveText,
  serializeSave,
  writeSlot,
} from './save.ts';
import type { SaveData } from './saveData.ts';
import { createNewSave } from './saveData.ts';
import type { KeyValueStore } from './store.ts';
import { MemoryStore, SAVE_KEYS } from './store.ts';

function progressed(intel: number): SaveData {
  const save = createNewSave();
  save.campaign.maps.a1_m01 = { completed: true, medals: ['victory'], bestMeter: 18 };
  save.currencies.intel = intel;
  return save;
}

function loaded(store: KeyValueStore, slot: 1 | 2 | 3 = 1): SaveData {
  const r = loadSlot(store, slot);
  if (r.status !== 'ok') throw new Error(`slot ${slot} is ${r.status}`);
  return r.save;
}

describe('slot saves', () => {
  it('reads an empty slot as empty', () => {
    expect(loadSlot(new MemoryStore(), 1)).toEqual({ status: 'empty' });
  });

  it('writes and reads back a save, and remembers the slot', () => {
    const store = new MemoryStore();
    expect(writeSlot(store, 2, progressed(1), 1000)).toEqual({ ok: true });
    expect(loadSlot(store, 2)).toMatchObject({
      status: 'ok',
      save: progressed(1),
      savedAt: 1000,
      source: 'main',
      migratedFrom: null,
    });
    expect(getLastSlot(store)).toBe(2);
    expect(store.get(SAVE_KEYS.bak(2))).toBeNull();
  });

  it('rotates the previous good write into :bak', () => {
    const store = new MemoryStore();
    writeSlot(store, 1, progressed(1), 1000);
    const first = store.get(SAVE_KEYS.slot(1));
    writeSlot(store, 1, progressed(2), 2000);
    expect(store.get(SAVE_KEYS.bak(1))).toBe(first);
    expect(loaded(store).currencies.intel).toBe(2);
  });

  it('falls back to :bak when the main save is corrupt, and keeps the corrupt text', () => {
    const store = new MemoryStore();
    writeSlot(store, 1, progressed(1), 1000);
    writeSlot(store, 1, progressed(2), 2000);
    const broken = store.get(SAVE_KEYS.slot(1))?.slice(0, 40) ?? '';
    store.set(SAVE_KEYS.slot(1), broken);
    const r = loadSlot(store, 1);
    expect(r).toMatchObject({ status: 'ok', source: 'bak', savedAt: 1000, mainRaw: broken });
    if (r.status !== 'ok') return;
    expect(r.save.currencies.intel).toBe(1);
    expect(r.mainProblem?.code).toBe('json');
    // Loading never writes.
    expect(store.get(SAVE_KEYS.slot(1))).toBe(broken);
  });

  it('falls back to :bak when the main save fails validation', () => {
    const store = new MemoryStore();
    writeSlot(store, 1, progressed(1), 1000);
    writeSlot(store, 1, progressed(2), 2000);
    const tampered = store.get(SAVE_KEYS.slot(1))?.replace('"intel":2', '"intel":-2') ?? '';
    store.set(SAVE_KEYS.slot(1), tampered);
    const r = loadSlot(store, 1);
    expect(r).toMatchObject({ status: 'ok', source: 'bak' });
    if (r.status !== 'ok') return;
    expect(r.mainProblem?.code).toBe('invalid');
    expect(r.mainProblem?.errors.join()).toContain('data.currencies.intel');
  });

  it('reports an unreadable slot with both raw values when :bak is bad too', () => {
    const store = new MemoryStore();
    store.set(SAVE_KEYS.slot(1), '{"v":1');
    store.set(SAVE_KEYS.bak(1), '{"v":99,"savedAt":0,"data":{}}');
    expect(loadSlot(store, 1)).toMatchObject({
      status: 'unreadable',
      mainProblem: { code: 'json' },
      mainRaw: '{"v":1',
      bakProblem: { code: 'too_new' },
      bakRaw: '{"v":99,"savedAt":0,"data":{}}',
    });
  });

  it('loads from :bak when only the backup exists', () => {
    const store = new MemoryStore();
    store.set(SAVE_KEYS.bak(3), serializeSave(progressed(4), 5));
    expect(loadSlot(store, 3)).toMatchObject({
      status: 'ok',
      source: 'bak',
      mainProblem: { code: 'missing' },
    });
  });

  it('never rotates a corrupt main save over a good :bak', () => {
    const store = new MemoryStore();
    writeSlot(store, 1, progressed(1), 1000);
    writeSlot(store, 1, progressed(2), 2000);
    const goodBak = store.get(SAVE_KEYS.bak(1));
    store.set(SAVE_KEYS.slot(1), 'garbage');
    writeSlot(store, 1, progressed(3), 3000);
    expect(store.get(SAVE_KEYS.bak(1))).toBe(goodBak);
    expect(loaded(store).currencies.intel).toBe(3);
  });

  it('migrates an old stored save on load', () => {
    const store = new MemoryStore();
    store.set(SAVE_KEYS.slot(1), JSON.stringify(saveV0));
    expect(loadSlot(store, 1)).toMatchObject({ status: 'ok', migratedFrom: 0, source: 'main' });
  });

  it('refuses to write an invalid save or a bad timestamp', () => {
    const store = new MemoryStore();
    const bad = createNewSave();
    bad.currencies.stardust = -5;
    expect(writeSlot(store, 1, bad, 0)).toMatchObject({ ok: false, code: 'invalid' });
    expect(writeSlot(store, 1, createNewSave(), -1)).toMatchObject({ ok: false, code: 'invalid' });
    expect(store.entries.size).toBe(0);
  });

  it('reports a storage failure instead of throwing', () => {
    const full: KeyValueStore = {
      get: () => null,
      set: () => {
        throw new Error('QuotaExceededError');
      },
      remove: () => undefined,
    };
    expect(writeSlot(full, 1, createNewSave(), 0)).toMatchObject({
      ok: false,
      code: 'storage',
      message: expect.stringContaining('QuotaExceededError'),
    });
  });

  it('caps the size of stored text it parses', () => {
    const r = parseSaveText(' '.repeat(MAX_SAVE_JSON_CHARS + 1));
    expect(r.ok ? null : r.problem.code).toBe('too_large');
  });

  it('deletes a slot and its backup, and forgets it as the last slot', () => {
    const store = new MemoryStore();
    writeSlot(store, 1, progressed(1), 1);
    writeSlot(store, 1, progressed(2), 2);
    deleteSlot(store, 1);
    expect(loadSlot(store, 1)).toEqual({ status: 'empty' });
    expect(getLastSlot(store)).toBeNull();
  });

  it('lists every slot and ignores a junk last-slot value', () => {
    const store = new MemoryStore();
    writeSlot(store, 3, progressed(1), 1);
    expect(listSlots(store).map((s) => [s.slot, s.load.status])).toEqual([
      [1, 'empty'],
      [2, 'empty'],
      [3, 'ok'],
    ]);
    store.set(SAVE_KEYS.lastSlot, '7');
    expect(getLastSlot(store)).toBeNull();
  });
});
