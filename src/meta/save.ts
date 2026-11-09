// Slot persistence: read, migrate, validate, fall back to `:bak`, and write (meta-runtime.md §
// Save system). Never silently wipes a save: an unreadable slot is reported with its raw text so
// the app can offer to export it, and a write only rotates the old value into `:bak` when that
// old value is itself readable, so a good backup is never replaced by a corrupt one.
import { migrate } from './migrations.ts';
import { withFirstPaydayCaughtUp } from './runEnd.ts';
import type { KnownIds, SaveData, SaveEnvelope } from './saveData.ts';
import { LIVE_KNOWN_IDS, SAVE_VERSION } from './saveData.ts';
import type { KeyValueStore, SlotId } from './store.ts';
import { SAVE_KEYS, SLOT_IDS, isSlotId } from './store.ts';
import { isPlainRecord, validateEnvelope, validateSave } from './validate.ts';

/** The largest save JSON we read or write (also the decompressed cap on import codes). */
export const MAX_SAVE_JSON_CHARS = 512 * 1024;

export type SaveProblemCode =
  'missing' | 'too_large' | 'json' | 'bad_version' | 'too_new' | 'migration_failed' | 'invalid';

/** Why a stored save or a code couldn't be read. `errors` lists schema errors for 'invalid'. */
export interface SaveProblem {
  readonly code: SaveProblemCode;
  readonly message: string;
  readonly errors: readonly string[];
}

export type DecodedSave =
  | { ok: true; envelope: SaveEnvelope; migratedFrom: number | null }
  | { ok: false; problem: SaveProblem };

function problem(
  code: SaveProblemCode,
  message: string,
  errors: readonly string[] = [],
): SaveProblem {
  return { code, message, errors };
}

/**
 * Migrates and validates a parsed envelope `{ v, savedAt, data }` of any known version, then applies
 * the save catch-ups no version marks (`withFirstPaydayCaughtUp`).
 */
export function decodeEnvelope(raw: unknown, known: KnownIds = LIVE_KNOWN_IDS): DecodedSave {
  if (!isPlainRecord(raw)) {
    return { ok: false, problem: problem('invalid', 'a save must be a JSON object') };
  }
  const env = raw;
  const migrated = migrate(env['v'], env['data']);
  if (!migrated.ok) return { ok: false, problem: problem(migrated.reason, migrated.message) };
  const checked = validateEnvelope(
    { ...env, v: SAVE_VERSION, data: migrated.data },
    SAVE_VERSION,
    known,
  );
  if (!checked.ok) {
    return { ok: false, problem: problem('invalid', 'the save data is malformed', checked.errors) };
  }
  // Catch-ups no schema version marks (D098): the first payday a pre-id save already had.
  const data = withFirstPaydayCaughtUp(checked.value.data);
  return {
    ok: true,
    envelope: data === checked.value.data ? checked.value : { ...checked.value, data },
    migratedFrom: migrated.from === SAVE_VERSION ? null : migrated.from,
  };
}

/** Parses save JSON text (from storage or a decoded code), then migrates and validates it. */
export function parseSaveText(text: string, known: KnownIds = LIVE_KNOWN_IDS): DecodedSave {
  if (text.length > MAX_SAVE_JSON_CHARS) {
    return {
      ok: false,
      problem: problem('too_large', `the save is larger than ${MAX_SAVE_JSON_CHARS} characters`),
    };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, problem: problem('json', 'the save is not valid JSON') };
  }
  return decodeEnvelope(raw, known);
}

/** The JSON text of a current-version envelope. */
export function serializeSave(data: SaveData, savedAt: number): string {
  const envelope: SaveEnvelope = { v: SAVE_VERSION, savedAt, data };
  return JSON.stringify(envelope);
}

export type SlotLoad =
  | { status: 'empty' }
  | {
      status: 'ok';
      save: SaveData;
      savedAt: number;
      /** 'bak' when the main key was unreadable or missing; `mainProblem` says why. */
      source: 'main' | 'bak';
      migratedFrom: number | null;
      mainProblem: SaveProblem | null;
      /** The unreadable main value, kept so the app can offer to export it. */
      mainRaw: string | null;
    }
  | {
      status: 'unreadable';
      mainProblem: SaveProblem;
      mainRaw: string | null;
      bakProblem: SaveProblem | null;
      bakRaw: string | null;
    };

/** Loads a slot: the main key, else its `:bak`. Never writes. */
export function loadSlot(
  store: KeyValueStore,
  slot: SlotId,
  known: KnownIds = LIVE_KNOWN_IDS,
): SlotLoad {
  const mainRaw = store.get(SAVE_KEYS.slot(slot));
  const bakRaw = store.get(SAVE_KEYS.bak(slot));
  if (mainRaw === null && bakRaw === null) return { status: 'empty' };

  const main: DecodedSave =
    mainRaw === null
      ? { ok: false, problem: problem('missing', 'the slot has a backup but no main save') }
      : parseSaveText(mainRaw, known);
  if (main.ok) {
    return {
      status: 'ok',
      save: main.envelope.data,
      savedAt: main.envelope.savedAt,
      source: 'main',
      migratedFrom: main.migratedFrom,
      mainProblem: null,
      mainRaw: null,
    };
  }
  const bak: DecodedSave | null = bakRaw === null ? null : parseSaveText(bakRaw, known);
  if (bak?.ok === true) {
    return {
      status: 'ok',
      save: bak.envelope.data,
      savedAt: bak.envelope.savedAt,
      source: 'bak',
      migratedFrom: bak.migratedFrom,
      mainProblem: main.problem,
      mainRaw,
    };
  }
  return {
    status: 'unreadable',
    mainProblem: main.problem,
    mainRaw,
    bakProblem: bak === null ? null : bak.problem,
    bakRaw,
  };
}

/** Loads every slot, in slot order (for the Title screen's slot list). */
export function listSlots(
  store: KeyValueStore,
  known: KnownIds = LIVE_KNOWN_IDS,
): { slot: SlotId; load: SlotLoad }[] {
  return SLOT_IDS.map((slot) => ({ slot, load: loadSlot(store, slot, known) }));
}

export type SlotWrite =
  | { ok: true }
  | {
      ok: false;
      code: 'invalid' | 'too_large' | 'storage';
      message: string;
      errors: readonly string[];
    };

/**
 * Writes a slot. The data is validated first (an invalid save is never written). A readable old
 * value rotates into `:bak`; an unreadable one is overwritten and the existing `:bak` kept. Also
 * records the slot as the last one played. `savedAt` comes from the caller's clock.
 */
export function writeSlot(
  store: KeyValueStore,
  slot: SlotId,
  data: SaveData,
  savedAt: number,
  known: KnownIds = LIVE_KNOWN_IDS,
): SlotWrite {
  const checked = validateSave(data, known);
  if (!checked.ok) {
    return {
      ok: false,
      code: 'invalid',
      message: 'refusing to write a malformed save',
      errors: checked.errors,
    };
  }
  if (!Number.isSafeInteger(savedAt) || savedAt < 0) {
    return { ok: false, code: 'invalid', message: `bad savedAt: ${savedAt}`, errors: [] };
  }
  const text = serializeSave(checked.value, savedAt);
  if (text.length > MAX_SAVE_JSON_CHARS) {
    return { ok: false, code: 'too_large', message: 'the save is too large to store', errors: [] };
  }
  try {
    const old = store.get(SAVE_KEYS.slot(slot));
    if (old !== null && parseSaveText(old, known).ok) store.set(SAVE_KEYS.bak(slot), old);
    store.set(SAVE_KEYS.slot(slot), text);
    store.set(SAVE_KEYS.lastSlot, String(slot));
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    return { ok: false, code: 'storage', message: `storage refused the write: ${why}`, errors: [] };
  }
  return { ok: true };
}

/** Deletes a slot and its backup (an explicit player action, never automatic). */
export function deleteSlot(store: KeyValueStore, slot: SlotId): void {
  store.remove(SAVE_KEYS.slot(slot));
  store.remove(SAVE_KEYS.bak(slot));
  if (getLastSlot(store) === slot) store.remove(SAVE_KEYS.lastSlot);
}

/** The slot most recently written, if it's a valid slot number. */
export function getLastSlot(store: KeyValueStore): SlotId | null {
  const raw = store.get(SAVE_KEYS.lastSlot);
  const n = raw === null ? null : Number(raw);
  return isSlotId(n) ? n : null;
}
