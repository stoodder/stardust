// Player settings (architecture.md § Modules: app owns settings): today the audio volumes and mute.
// Saved to localStorage under `stardust:settings` (tech/meta-runtime.md § Save system) as
// `{ v, savedAt, data }`, read once at boot. Storage can be missing or throw (private windows,
// blocked storage, Node tests), so every read and write is guarded and the defaults always work.
import { signal } from '@preact/signals';

export const SETTINGS_KEY = 'stardust:settings';
export const SETTINGS_VERSION = 1;

export interface AudioSettings {
  readonly muted: boolean;
  /** Volumes, 0–1. */
  readonly master: number;
  readonly music: number;
  readonly sfx: number;
}

export interface Settings {
  readonly audio: AudioSettings;
}

export const DEFAULT_SETTINGS: Settings = {
  audio: { muted: false, master: 0.8, music: 0.7, sfx: 0.8 },
};

/** The storage the settings use (localStorage in the browser; a map in tests). */
export interface SettingsStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** The browser's localStorage, or null where it's missing or blocked. */
export function browserStore(): SettingsStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const volume = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;

/** Settings from a stored JSON string: anything missing or malformed falls back to the default. */
export function parseSettings(raw: string | null): Settings {
  if (raw === null) return DEFAULT_SETTINGS;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_SETTINGS;
  }
  const data = isRecord(parsed) && isRecord(parsed['data']) ? parsed['data'] : null;
  const audio = data !== null && isRecord(data['audio']) ? data['audio'] : {};
  const d = DEFAULT_SETTINGS.audio;
  return {
    audio: {
      muted: typeof audio['muted'] === 'boolean' ? audio['muted'] : d.muted,
      master: volume(audio['master'], d.master),
      music: volume(audio['music'], d.music),
      sfx: volume(audio['sfx'], d.sfx),
    },
  };
}

/** Reads the settings (the defaults when there are none or storage fails). */
export function loadSettings(store: SettingsStore | null = browserStore()): Settings {
  if (store === null) return DEFAULT_SETTINGS;
  try {
    return parseSettings(store.getItem(SETTINGS_KEY));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Writes the settings; returns false if storage refused (the game carries on with them in memory). */
export function saveSettings(s: Settings, store: SettingsStore | null = browserStore()): boolean {
  if (store === null) return false;
  try {
    store.setItem(
      SETTINGS_KEY,
      JSON.stringify({ v: SETTINGS_VERSION, savedAt: new Date().toISOString(), data: s }),
    );
    return true;
  } catch {
    return false;
  }
}

/** The live settings. The UI reads them; change them only through the functions below. */
export const settings = signal<Settings>(DEFAULT_SETTINGS);

/** Loads the saved settings into `settings` (boot). */
export function initSettings(store: SettingsStore | null = browserStore()): void {
  settings.value = loadSettings(store);
}

/** Changes audio settings and saves them. */
export function setAudioSettings(patch: Partial<AudioSettings>): void {
  settings.value = { ...settings.value, audio: { ...settings.value.audio, ...patch } };
  saveSettings(settings.value);
}

/** M, or the HUD's speaker button: mutes or unmutes all audio. */
export function toggleMute(): void {
  setAudioSettings({ muted: !settings.value.audio.muted });
}
