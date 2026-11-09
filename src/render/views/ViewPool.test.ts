import { describe, expect, it } from 'vitest';
import { ViewPool, type PooledView } from './ViewPool.ts';

class FakeView implements PooledView {
  stamp = 0;
  released = 0;
  release(): void {
    this.released++;
  }
}

describe('ViewPool', () => {
  it('hands out one view per uid and returns the same view for the same uid', () => {
    const pool = new ViewPool(() => new FakeView());
    const a = pool.acquire(1);
    expect(pool.acquire(1)).toBe(a);
    expect(pool.acquire(2)).not.toBe(a);
    expect(pool.get(1)).toBe(a);
    expect(pool.live.size).toBe(2);
  });

  it('reuses released views instead of creating new ones', () => {
    const pool = new ViewPool(() => new FakeView());
    const a = pool.acquire(1);
    pool.release(1);
    expect(a.released).toBe(1);
    expect(pool.get(1)).toBeUndefined();
    expect(pool.acquire(7)).toBe(a);
    expect(pool.created).toBe(1);
  });

  it('ignores releasing an unknown uid, and releaseAll empties it', () => {
    const pool = new ViewPool(() => new FakeView());
    pool.release(99);
    pool.acquire(1);
    pool.acquire(2);
    pool.releaseAll();
    expect(pool.live.size).toBe(0);
    pool.acquire(3);
    pool.acquire(4);
    expect(pool.created).toBe(2);
  });

  it('handles spawn and death in the same drained batch', () => {
    const pool = new ViewPool(() => new FakeView());
    pool.acquire(5);
    pool.release(5);
    expect(pool.live.size).toBe(0);
  });

  it('sweep releases the views a sync pass did not stamp', () => {
    const pool = new ViewPool(() => new FakeView());
    pool.acquire(1).stamp = 5;
    pool.acquire(2).stamp = 4;
    pool.acquire(3).stamp = 5;
    pool.sweep(5);
    expect([...pool.live.keys()]).toEqual([1, 3]);
  });
});
