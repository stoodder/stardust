import { describe, expect, it } from 'vitest';
import { KEEP_CLEAR_TILES, KeepClear } from './keepClear.ts';

describe('KeepClear (D134 K2)', () => {
  it('keeps nothing clear until a spot is added', () => {
    const k = new KeepClear();
    expect(k.size).toBe(0);
    expect(k.near(3.5, 4.5)).toBe(false);
  });

  it('keeps everything within 1.5 tiles of a spot clear, and nothing past it', () => {
    const k = new KeepClear();
    k.add(10.5, 6.5);
    expect(KEEP_CLEAR_TILES).toBe(1.5);
    expect(k.near(10.5, 6.5)).toBe(true);
    // A tile over, a diagonal neighbour (√2 ≈ 1.41), and exactly 1.5 away: kept clear.
    expect(k.near(11.5, 6.5)).toBe(true);
    expect(k.near(11.5, 7.5)).toBe(true);
    expect(k.near(12, 6.5)).toBe(true);
    // Two tiles over, or a knight's move (√5): drawn as usual.
    expect(k.near(12.5, 6.5)).toBe(false);
    expect(k.near(11.5, 8.5)).toBe(false);
  });

  it('refills each frame: a cleared list keeps nothing clear', () => {
    const k = new KeepClear();
    k.add(1.5, 1.5);
    k.add(8.5, 8.5);
    expect(k.size).toBe(2);
    expect(k.near(8.5, 9.5)).toBe(true);
    k.clear();
    expect(k.size).toBe(0);
    expect(k.near(8.5, 9.5)).toBe(false);
  });

  it('holds a fixed number of spots and drops extras (no allocation)', () => {
    const k = new KeepClear();
    for (let i = 0; i < 20; i++) k.add(i * 10 + 0.5, 0.5);
    expect(k.size).toBe(8);
    expect(k.near(70.5, 0.5)).toBe(true);
    expect(k.near(80.5, 0.5)).toBe(false);
  });
});
