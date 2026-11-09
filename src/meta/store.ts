// Persistence behind a tiny key-value interface (meta-runtime.md § Save system). The browser adapter
// wraps localStorage (it lives in app/, the only module that touches the DOM); tests and the dev
// tools use MemoryStore. Everything in meta/ that reads or writes goes through a KeyValueStore.

/** A synchronous string store with localStorage's semantics. `set` may throw (quota, privacy mode). */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** An in-memory KeyValueStore for tests and headless tools. */
export class MemoryStore implements KeyValueStore {
  readonly entries = new Map<string, string>();

  get(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.entries.set(key, value);
  }

  remove(key: string): void {
    this.entries.delete(key);
  }
}

/** The campaign save slots. */
export type SlotId = 1 | 2 | 3;
export const SLOT_IDS: readonly SlotId[] = [1, 2, 3];

/** Every key the save system uses (meta-runtime.md § Save system, Keys). */
export const SAVE_KEYS = {
  slot: (slot: SlotId): string => `stardust:slot:${slot}`,
  /** The previous good write of a slot. */
  bak: (slot: SlotId): string => `stardust:slot:${slot}:bak`,
  /** The settings blob (owned by app/settings, not by meta). */
  settings: 'stardust:settings',
  lastSlot: 'stardust:lastSlot',
} as const;

/** True for 1, 2, or 3. */
export function isSlotId(x: unknown): x is SlotId {
  return x === 1 || x === 2 || x === 3;
}
