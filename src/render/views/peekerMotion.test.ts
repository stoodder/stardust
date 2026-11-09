// The Peeker's behaviour (T309; design/core-loop.md § 6.9): peeks every 20–40 s of play, shy of
// enemies and the cursor, ducks when poked.
import { describe, expect, it } from 'vitest';
import {
  DUCK_MS,
  enemyNear,
  PEEK_EVERY_MAX_MS,
  PEEK_EVERY_MIN_MS,
  PEEK_HOLD_MS,
  PeekerMotion,
  SHY_RADIUS_TILES,
} from './peekerMotion.ts';

/** Runs `ms` of play in 100 ms frames (real time = play time). */
function run(m: PeekerMotion, ms: number, shy = false): void {
  for (let t = 0; t < ms; t += 100) m.update(100, 100, shy);
}

describe('PeekerMotion', () => {
  it('waits 20–40 s of play between peeks, from its own random source', () => {
    expect(new PeekerMotion(() => 0).untilPeek).toBe(PEEK_EVERY_MIN_MS);
    expect(new PeekerMotion(() => 0.5).untilPeek).toBe(30_000);
    expect(new PeekerMotion(() => 0.999).untilPeek).toBeLessThan(PEEK_EVERY_MAX_MS);
    // A broken source can't make it peek constantly or never.
    expect(new PeekerMotion(() => Number.NaN).untilPeek).toBe(30_000);
    expect(new PeekerMotion(() => 7).untilPeek).toBe(PEEK_EVERY_MAX_MS);
  });

  it('peeks once the wait is played, holds the peek, then hides', () => {
    const m = new PeekerMotion(() => 0);
    run(m, PEEK_EVERY_MIN_MS - 100);
    expect(m.pose).toBe('hidden');
    run(m, 100);
    expect(m.pose).toBe('peek');
    run(m, PEEK_HOLD_MS - 100);
    expect(m.pose).toBe('peek');
    run(m, 100);
    expect(m.pose).toBe('hidden');
  });

  it("counts only play time: paused, it doesn't peek", () => {
    const m = new PeekerMotion(() => 0);
    for (let t = 0; t < 60_000; t += 100) m.update(100, 0, false);
    expect(m.pose).toBe('hidden');
  });

  it('stays down while shy, and a peek in progress ducks, then hides', () => {
    const m = new PeekerMotion(() => 0);
    run(m, PEEK_EVERY_MIN_MS * 2, true);
    expect(m.pose).toBe('hidden');
    expect(m.untilPeek).toBe(PEEK_EVERY_MIN_MS); // the wait doesn't run while shy
    run(m, PEEK_EVERY_MIN_MS);
    expect(m.pose).toBe('peek');
    m.update(16, 16, true);
    expect(m.pose).toBe('duck');
    m.update(DUCK_MS, DUCK_MS, true);
    expect(m.pose).toBe('hidden');
  });

  it('ducks on every poke, even from hiding, and the next peek waits afresh', () => {
    const m = new PeekerMotion(() => 0);
    run(m, PEEK_EVERY_MIN_MS - 1000);
    m.poke();
    expect(m.pose).toBe('duck');
    expect(m.untilPeek).toBe(PEEK_EVERY_MIN_MS);
    const s = m.serial;
    m.poke(); // a second poke mid-duck replays it
    expect(m.pose).toBe('duck');
    expect(m.serial).toBe(s + 1);
    m.update(DUCK_MS, 0, false);
    expect(m.pose).toBe('hidden');
  });
});

const at = (x: number, y: number, alive = true) => ({ alive, x, y });

describe('enemyNear', () => {
  it('sees live enemies within the shy radius of the rock only', () => {
    const r = SHY_RADIUS_TILES;
    expect(enemyNear([at(3.5 + r, 1.5)], 1, 3.5, 1.5)).toBe(true);
    expect(enemyNear([at(3.5 + r + 0.01, 1.5)], 1, 3.5, 1.5)).toBe(false);
    expect(enemyNear([at(3.5, 1.5, false)], 1, 3.5, 1.5)).toBe(false);
    // Only the pool's used entries count.
    expect(enemyNear([at(9, 9), at(3.5, 1.5)], 1, 3.5, 1.5)).toBe(false);
  });
});
