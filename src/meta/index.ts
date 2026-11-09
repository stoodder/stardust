// meta/: saves now; progression, shop, R&D, and modifiers as they land (meta-runtime.md).
// The save API for app/ and the screens. Dev saves for `?save=` are in __fixtures__/devSaves.ts.
export type { ImportProblemCode, ImportResult } from './codec.ts';
export { CODE_LIMITS, exportCode, importCode } from './codec.ts';
export { migrate, migrations } from './migrations.ts';
export type { DecodedSave, SaveProblem, SaveProblemCode, SlotLoad, SlotWrite } from './save.ts';
export {
  MAX_SAVE_JSON_CHARS,
  deleteSlot,
  getLastSlot,
  listSlots,
  loadSlot,
  parseSaveText,
  serializeSave,
  writeSlot,
} from './save.ts';
export type { KnownIds, MapRecord, SaveData, SaveEnvelope, StoryFlagId } from './saveData.ts';
export { LIVE_KNOWN_IDS, SAVE_VERSION, createNewSave } from './saveData.ts';
export type { KeyValueStore, SlotId } from './store.ts';
export { MemoryStore, SAVE_KEYS, SLOT_IDS, isSlotId } from './store.ts';
export type { Validated } from './validate.ts';
export { validateSave } from './validate.ts';
