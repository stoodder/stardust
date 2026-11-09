// meta/: saves, campaign progress (gating, the Shift board), modifiers, pools, and run end with
// its rewards now; the shop and R&D as they land (meta-runtime.md).
// The save API for app/ and the screens. Dev saves for `?save=` are in __fixtures__/devSaves.ts.
export type { ImportProblemCode, ImportResult } from './codec.ts';
export { CODE_LIMITS, exportCode, importCode } from './codec.ts';
export { migrate, migrations } from './migrations.ts';
export type { MetaCatalog, MetaLoadout } from './modifiers.ts';
export {
  DIFFICULTY_MODIFIERS,
  LIVE_CATALOG,
  maxRanks,
  metaModifiers,
  protocolSlots,
  saveModifiers,
} from './modifiers.ts';
export { abilityPool, protocolPool, protocolSlotCount, towerPool } from './pools.ts';
export type { MetaSystem, ShiftEntry, ShiftState } from './progress.ts';
export {
  META_SYSTEMS,
  SHIFT_BOARD_SIZE,
  SYSTEM_UNLOCKS,
  isMapWon,
  isSystemUnlocked,
  mapName,
  nextShift,
  shiftBoard,
  unlockHint,
} from './progress.ts';
export type { EarnedMedal, PayoutInput, StardustPayout, StardustSource } from './rewards.ts';
export { REWARD_RULES, medalPayout, stardustPayout } from './rewards.ts';
export type { RunEndInput, RunEndResult, RunEndSummary } from './runEnd.ts';
export { runEnd } from './runEnd.ts';
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
export { DIFFICULTIES, LIVE_KNOWN_IDS, SAVE_VERSION, createNewSave } from './saveData.ts';
export type { KeyValueStore, SlotId } from './store.ts';
export { MemoryStore, SAVE_KEYS, SLOT_IDS, isSlotId } from './store.ts';
export type { Validated } from './validate.ts';
export { validateSave } from './validate.ts';
