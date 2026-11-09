import { describe, expect, it } from 'vitest';
import { KIND_BIAS, worldDepth } from './depth.ts';

describe('worldDepth', () => {
  it('sorts by footY first', () => {
    expect(worldDepth(10, 'tower', 255)).toBeLessThan(worldDepth(11, 'prop', 0));
  });

  it('puts towers in front of enemies in front of props at equal footY', () => {
    expect(worldDepth(10, 'prop', 7)).toBeLessThan(worldDepth(10, 'enemy', 7));
    expect(worldDepth(10, 'enemy', 7)).toBeLessThan(worldDepth(10, 'tower', 7));
    expect(worldDepth(10, 'highGround', 7)).toBeLessThan(worldDepth(10, 'prop', 7));
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
