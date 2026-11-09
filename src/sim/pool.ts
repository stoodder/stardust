// Typed entity pools (architecture.md § Entity model): a preallocated array of plain objects with
// every field initialized (monomorphic shapes), plus a free list. No per-tick allocation once a
// pool is warm.
//
// Slot lifecycle: free (uid 0) → live (alive) → dead (killed this tick: alive false, uid kept, so
// later systems and events can still name it) → free again when cleanup releases dead slots at
// the end of the tick. Systems iterate slots 0..used in ascending order and skip `!alive`.

/** The fields every pooled entity has. */
export interface PoolEntity {
  /** Index in `pool.items`; fixed for the object's lifetime. */
  slot: number;
  /** Monotonic within a run, never reused; 0 marks a free slot. */
  uid: number;
  alive: boolean;
}

export interface Pool<T extends PoolEntity> {
  /** Every slot ever created; only indices below `used` have been handed out. */
  readonly items: T[];
  /** Released slots, used last-in first-out. */
  readonly free: number[];
  /** Slots handed out at least once: iterate `0 ≤ i < used`. */
  used: number;
  /** Live entities right now. */
  live: number;
}

/** Creates a pool with `capacity` preallocated copies of `blank`. */
export function createPool<T extends PoolEntity>(blank: Readonly<T>, capacity: number): Pool<T> {
  const items: T[] = [];
  for (let i = 0; i < capacity; i++) items.push(createItem(blank, i));
  return { items, free: [], used: 0, live: 0 };
}

function createItem<T extends PoolEntity>(blank: Readonly<T>, slot: number): T {
  const item: T = { ...blank };
  item.slot = slot;
  return item;
}

/**
 * Takes a free slot, resets every field to `blank`, and makes it live with `uid`. The pool grows
 * by one slot when it's full (an allocation, but deterministic and rare: capacities are sized
 * for the design's peak counts).
 */
export function poolAlloc<T extends PoolEntity>(pool: Pool<T>, blank: Readonly<T>, uid: number): T {
  let slot = pool.free.pop();
  if (slot === undefined) {
    slot = pool.used++;
    if (slot === pool.items.length) pool.items.push(createItem(blank, slot));
  }
  // slot < used ≤ items.length: popped slots were handed out before, and new ones exist above.
  const item = pool.items[slot]!;
  Object.assign(item, blank);
  item.slot = slot;
  item.uid = uid;
  item.alive = true;
  pool.live++;
  return item;
}

/** Marks a live entity dead. Its slot is released by the end-of-tick cleanup. */
export function poolKill<T extends PoolEntity>(pool: Pool<T>, item: T): void {
  if (!item.alive) return;
  item.alive = false;
  pool.live--;
}

/** Returns every dead slot to the free list, in ascending slot order. Returns how many. */
export function poolReleaseDead<T extends PoolEntity>(pool: Pool<T>): number {
  let released = 0;
  for (let i = 0; i < pool.used; i++) {
    const item = pool.items[i]!; // i < used ≤ items.length
    if (!item.alive && item.uid !== 0) {
      item.uid = 0;
      pool.free.push(i);
      released++;
    }
  }
  return released;
}

/** The live entity with `uid`, or null. A linear scan: for commands, never for hot loops. */
export function poolFind<T extends PoolEntity>(pool: Pool<T>, uid: number): T | null {
  if (uid === 0) return null;
  for (let i = 0; i < pool.used; i++) {
    const item = pool.items[i]!; // i < used ≤ items.length
    if (item.alive && item.uid === uid) return item;
  }
  return null;
}
