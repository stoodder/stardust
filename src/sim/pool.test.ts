import { describe, expect, it } from 'vitest';
import {
  createPool,
  poolAlloc,
  poolFind,
  poolKill,
  poolReleaseDead,
  type PoolEntity,
} from './pool.ts';

interface Thing extends PoolEntity {
  hp: number;
  label: string;
}
const BLANK: Readonly<Thing> = Object.freeze({ slot: 0, uid: 0, alive: false, hp: 10, label: '' });

function setup(capacity = 4) {
  const pool = createPool(BLANK, capacity);
  let nextUid = 1;
  const alloc = (): Thing => poolAlloc(pool, BLANK, nextUid++);
  return { pool, alloc };
}

describe('createPool', () => {
  it('preallocates distinct, unfrozen copies of the blank with their slot set', () => {
    const { pool } = setup(3);
    expect(pool.items).toHaveLength(3);
    expect(pool.items.map((t) => t.slot)).toEqual([0, 1, 2]);
    expect(new Set(pool.items).size).toBe(3);
    for (const t of pool.items) {
      expect(Object.isFrozen(t)).toBe(false);
      expect(t).toMatchObject({ uid: 0, alive: false, hp: 10 });
    }
    expect(pool.used).toBe(0);
    expect(pool.live).toBe(0);
  });
});

describe('poolAlloc / poolKill / poolReleaseDead', () => {
  it('hands out slots in order with the given uids', () => {
    const { pool, alloc } = setup();
    const a = alloc();
    const b = alloc();
    expect([a.slot, b.slot]).toEqual([0, 1]);
    expect([a.uid, b.uid]).toEqual([1, 2]);
    expect(a.alive && b.alive).toBe(true);
    expect(pool.used).toBe(2);
    expect(pool.live).toBe(2);
  });

  it('keeps a killed entity in its slot (uid intact) until release', () => {
    const { pool, alloc } = setup();
    const a = alloc();
    poolKill(pool, a);
    expect(a.alive).toBe(false);
    expect(a.uid).toBe(1);
    expect(pool.live).toBe(0);
    const b = alloc();
    expect(b.slot).toBe(1); // slot 0 isn't free yet
    expect(poolReleaseDead(pool)).toBe(1);
    expect(a.uid).toBe(0);
    expect(pool.free).toEqual([0]);
  });

  it('reuses released slots last-in first-out, resetting every field', () => {
    const { pool, alloc } = setup();
    const [a, b, c] = [alloc(), alloc(), alloc()];
    a.hp = 1;
    a.label = 'stale';
    c.hp = 3;
    poolKill(pool, a);
    poolKill(pool, c);
    poolReleaseDead(pool);
    expect(pool.free).toEqual([0, 2]);
    const d = alloc();
    expect(d).toBe(c); // slot 2, released last, comes back first
    expect(d.hp).toBe(10);
    const e = alloc();
    expect(e).toBe(a);
    expect(e).toMatchObject({ slot: 0, hp: 10, label: '', alive: true });
    expect(b.alive).toBe(true);
  });

  it('never reuses a uid: uids stay monotonic through churn', () => {
    const { pool, alloc } = setup(2);
    const seen: number[] = [];
    for (let i = 0; i < 50; i++) {
      const t = alloc();
      seen.push(t.uid);
      poolKill(pool, t);
      if (i % 3 === 0) poolReleaseDead(pool);
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThan(seen[i - 1] ?? 0);
  });

  it('grows past its capacity when full', () => {
    const { pool, alloc } = setup(2);
    alloc();
    alloc();
    const c = alloc();
    expect(c.slot).toBe(2);
    expect(pool.items).toHaveLength(3);
    expect(pool.items[2]).toBe(c);
    expect(pool.used).toBe(3);
  });

  it('ignores a second kill of the same entity', () => {
    const { pool, alloc } = setup();
    const a = alloc();
    poolKill(pool, a);
    poolKill(pool, a);
    expect(pool.live).toBe(0);
  });

  it('releases nothing when nothing died', () => {
    const { pool, alloc } = setup();
    alloc();
    expect(poolReleaseDead(pool)).toBe(0);
    expect(pool.free).toEqual([]);
  });
});

describe('poolFind', () => {
  it('finds live entities by uid only', () => {
    const { pool, alloc } = setup();
    const a = alloc();
    const b = alloc();
    expect(poolFind(pool, b.uid)).toBe(b);
    poolKill(pool, a);
    expect(poolFind(pool, 1)).toBeNull();
    expect(poolFind(pool, 0)).toBeNull();
    expect(poolFind(pool, 99)).toBeNull();
  });
});
