// T530a: refugees walk as a crowd, a third carry a little one, and Pebble walks on the near side.
import { describe, expect, it } from 'vitest';
import { nearSide, PEBBLE_SIDE_PX, refugeeAnim, refugeeLanePx } from './refugeeLook.ts';

describe('refugees on screen (T530a)', () => {
  it('spread across the road by uid, and Pebble keeps to the near side', () => {
    expect([0, 1, 2, 3, 4, 5].map((u) => refugeeLanePx(u, false))).toEqual([
      -3, -1.5, 0, 1.5, 3, -3,
    ]);
    expect(refugeeLanePx(7, true)).toBe(PEBBLE_SIDE_PX);
  });

  it('mixes in parents carrying a little one, never Pebble', () => {
    const anims = [0, 1, 2, 3, 4, 5].map((u) => refugeeAnim(u, false));
    expect(anims).toEqual(['walk', 'carry', 'walk', 'walk', 'carry', 'walk']);
    expect(refugeeAnim(1, true)).toBe('walk');
  });

  it('turns a side vector toward the viewer', () => {
    expect(nearSide({ x: 0.4, y: -0.9 })).toEqual({ x: -0.4, y: 0.9 });
    expect(nearSide({ x: -0.4, y: 0.9 })).toEqual({ x: -0.4, y: 0.9 });
    expect(nearSide({ x: -1, y: 0 })).toEqual({ x: 1, y: -0 });
  });
});
