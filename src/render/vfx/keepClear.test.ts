import { describe, expect, it } from 'vitest';
import { worldDepth } from '../depth.ts';
import { HALF_H } from '../iso.ts';
import {
  KEEP_CLEAR_HALF_H_PX,
  KEEP_CLEAR_HALF_W_PX,
  KEEP_CLEAR_RAISE_PX,
  KEEP_CLEAR_TILES,
  KeepClear,
} from './keepClear.ts';

const AT = { x: 200, y: 100 };

describe('KeepClear (D134 K2)', () => {
  it('keeps nothing clear until a spot is added', () => {
    const k = new KeepClear();
    expect(k.size).toBe(0);
    expect(k.near(3.5, 4.5)).toBe(false);
  });

  it('keeps everything within 1.5 tiles of a spot clear, and nothing past it', () => {
    const k = new KeepClear();
    k.add(10.5, 6.5, AT);
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
    k.add(1.5, 1.5, AT);
    k.add(8.5, 8.5, AT);
    expect(k.size).toBe(2);
    expect(k.near(8.5, 9.5)).toBe(true);
    k.clear();
    expect(k.size).toBe(0);
    expect(k.near(8.5, 9.5)).toBe(false);
  });

  it('holds a fixed number of spots and drops extras (no allocation)', () => {
    const k = new KeepClear();
    for (let i = 0; i < 20; i++) k.add(i * 10 + 0.5, 0.5, AT);
    expect(k.size).toBe(8);
    expect(k.near(70.5, 0.5)).toBe(true);
    expect(k.near(80.5, 0.5)).toBe(false);
  });

  it('keeps the 1.5-tile footprint and the art above it clear on screen', () => {
    const k = new KeepClear();
    // The rock's art (with the lift's rise) stands 30 px over its tile center.
    k.add(10.5, 6.5, AT, { left: 190, top: 70, right: 210, bottom: 104 });
    expect(KEEP_CLEAR_HALF_W_PX).toBe(34);
    expect(KEEP_CLEAR_HALF_H_PX).toBe(17);
    // A name plate standing over a tower further off, reaching up across the art: covered.
    expect(k.covers(150, 62, 196, 72)).toBe(true);
    // A floater on the footprint's edge: covered; one just past it: clear.
    expect(k.covers(230, 110, 250, 117)).toBe(true);
    expect(k.covers(234, 110, 260, 117)).toBe(false);
    // Above the art: clear.
    expect(k.covers(190, 50, 210, 70)).toBe(false);
    k.clear();
    expect(k.covers(190, 80, 210, 100)).toBe(false);
  });

  it('raises an armed rock over the walkers round it, but not over the world further in front', () => {
    // The rock's foot at y; it sorts as a prop KEEP_CLEAR_RAISE_PX further forward (PeekerView).
    const y = 300;
    const rock = worldDepth(y + KEEP_CLEAR_RAISE_PX, 'prop', 0xff);
    // A walker anywhere in the footprint, or on the tile row in front of it (its head reaches up
    // over the rock's base), sorts behind it, whatever its uid's tie-break.
    for (let dy = -KEEP_CLEAR_HALF_H_PX; dy <= KEEP_CLEAR_HALF_H_PX + 2 * HALF_H; dy++) {
      expect(worldDepth(y + dy, 'enemy', 0xff)).toBeLessThan(rock);
    }
    // A tower three rows in front still draws over it; so does a walker two rows past the footprint.
    expect(worldDepth(y + 6 * HALF_H, 'tower', 0)).toBeGreaterThan(rock);
    expect(worldDepth(y + KEEP_CLEAR_HALF_H_PX + 4 * HALF_H, 'enemy', 0)).toBeGreaterThan(rock);
  });
});
