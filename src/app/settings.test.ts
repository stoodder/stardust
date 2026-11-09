import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  parseSettings,
  saveSettings,
  SETTINGS_KEY,
  SETTINGS_VERSION,
  type SettingsStore,
} from './settings.ts';

function memoryStore(): SettingsStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
  };
}

const throwing: SettingsStore = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('quota');
  },
};

describe('settings', () => {
  it('round-trips through storage as { v, savedAt, data }', () => {
    const store = memoryStore();
    const s = { audio: { muted: true, master: 0.5, music: 0.25, sfx: 1 } };
    expect(saveSettings(s, store)).toBe(true);
    const raw: unknown = JSON.parse(store.data.get(SETTINGS_KEY)!);
    expect(raw).toMatchObject({ v: SETTINGS_VERSION, savedAt: expect.any(String) });
    expect(loadSettings(store)).toEqual(s);
  });

  it('falls back to the defaults when storage is missing, blocked, or holds junk', () => {
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(throwing)).toEqual(DEFAULT_SETTINGS);
    expect(saveSettings(DEFAULT_SETTINGS, throwing)).toBe(false);
    expect(saveSettings(DEFAULT_SETTINGS, null)).toBe(false);
    expect(parseSettings('{not json')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('42')).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps the good fields of a damaged save and clamps volumes', () => {
    const raw = JSON.stringify({
      v: 1,
      data: { audio: { muted: 'yes', master: 3, music: -1, sfx: 'loud' } },
    });
    expect(parseSettings(raw)).toEqual({
      audio: { muted: false, master: 1, music: 0, sfx: DEFAULT_SETTINGS.audio.sfx },
    });
  });
});
