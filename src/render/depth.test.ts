import { describe, expect, it } from 'vitest';
import { KIND_BIAS, stripDepth, worldDepth } from './depth.ts';

describe('worldDepth', () => {
  it('sorts by footY first', () => {
    expect(worldDepth(10, 'tower', 255)).toBeLessThan(worldDepth(11, 'prop', 0));
  });

  it('puts towers in front of enemies in front of props at equal footY', () => {
    expect(worldDepth(10, 'prop', 7)).toBeLessThan(worldDepth(10, 'enemy', 7));
    expect(worldDepth(10, 'enemy', 7)).toBeLessThan(worldDepth(10, 'tower', 7));
    expect(worldDepth(10, 'highGround', 7)).toBeLessThan(worldDepth(10, 'prop', 7));
    // A ground strip (T232) covers enemies but never a tower, whatever their uids.
    expect(worldDepth(10, 'enemy', 255)).toBeLessThan(worldDepth(10, 'strip', 0));
    expect(worldDepth(10, 'strip', 255)).toBeLessThan(worldDepth(10, 'tower', 0));
  });

  it('breaks ties by uid without crossing kinds', () => {
    expect(worldDepth(10, 'enemy', 1)).not.toBe(worldDepth(10, 'enemy', 2));
    // The uid term stays below the gap between kind biases.
    expect(worldDepth(10, 'enemy', 255) - worldDepth(10, 'enemy', 0)).toBeLessThan(
      KIND_BIAS.tower - KIND_BIAS.enemy,
    );
    expect(worldDepth(10, 'enemy', 256)).toBe(worldDepth(10, 'enemy', 0));
  });
});

describe('stripDepth (T232)', () => {
  it('covers the enemies on its tile and stays under towers and blocks on the tile in front', () => {
    const center = 100;
    // An enemy anywhere on the strip's tile (its footY up to the bottom vertex, less a pixel).
    expect(worldDepth(center + 7, 'enemy', 255)).toBeLessThan(stripDepth(center));
    expect(worldDepth(center - 8, 'enemy', 255)).toBeLessThan(stripDepth(center));
    // The tile in front (its center a half tile lower): its tower and its high-ground block.
    expect(stripDepth(center)).toBeLessThan(worldDepth(center + 8, 'tower', 0));
    expect(stripDepth(center)).toBeLessThan(worldDepth(center + 8, 'highGround', 0));
  });
});
