// T705/T730a: Big Glorp's puddle look (puddleLook.ts): the sprite's frames over its life (bubbling,
// then drying over its last half second; held under reduced motion) and its scale.
import { describe, expect, it } from 'vitest';
import { hasAnim, hasFrame } from './spriteInfo.ts';
import {
  DRY_TICKS,
  POOL_STEP_TICKS,
  PUDDLE_SPRITE,
  puddleFrame,
  puddleScale,
} from './puddleLook.ts';

describe("Big Glorp's puddle (T705, T730a)", () => {
  it('draws T740b’s fx.puddle frames', () => {
    for (const f of ['pool_0', 'pool_1', 'dry_0', 'dry_1', 'dry_2']) {
      expect(hasFrame(PUDDLE_SPRITE, f)).toBe(true);
    }
    expect(hasAnim(PUDDLE_SPRITE, 'pool')).toBe(true);
  });

  it('bubbles while it lives, a step every POOL_STEP_TICKS', () => {
    expect(puddleFrame(180, 0, 0, false)).toBe('pool_0');
    expect(puddleFrame(180, POOL_STEP_TICKS, 0, false)).toBe('pool_1');
    expect(puddleFrame(180, 2 * POOL_STEP_TICKS, 0, false)).toBe('pool_0');
  });

  it('dries through its three frames over its last half second, then is gone', () => {
    expect(puddleFrame(DRY_TICKS, 0, 0, false)).toBe('dry_0');
    expect(puddleFrame(Math.ceil(DRY_TICKS / 2), 0, 0, false)).toBe('dry_1');
    expect(puddleFrame(1, 0, 0, false)).toBe('dry_2');
    expect(puddleFrame(0, 0, 0, false)).toBeNull();
  });

  it('holds whole under reduced motion, then vanishes', () => {
    expect(puddleFrame(180, 37, 3, true)).toBe('pool_0');
    expect(puddleFrame(1, 37, 3, true)).toBe('pool_0');
    expect(puddleFrame(0, 37, 3, true)).toBeNull();
  });

  it('scales the art for a radius other than the spec’s 1.0', () => {
    expect(puddleScale(1)).toBe(1);
    expect(puddleScale(1.5)).toBe(1.5);
  });
});
