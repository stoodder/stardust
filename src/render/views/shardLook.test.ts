// D139 S4: a boss's shards sort over the boss that shed them, and nothing else is changed.
import { describe, expect, it } from 'vitest';
import { worldDepth } from '../depth.ts';
import { SHARD_DEPTH_STEP, shardDepthFloor } from './shardLook.ts';

describe('a shard in the depth sort (D139 S4)', () => {
  it('has no floor without an owner', () => {
    expect(shardDepthFloor(null, 9)).toBe(Number.NEGATIVE_INFINITY);
  });

  it('sorts a shard just behind its owner over the owner, and its rim and bubble too', () => {
    const owner = worldDepth(200, 'enemy', 5);
    const behind = worldDepth(196, 'enemy', 9); // a step up the road: under the giant on its own
    expect(behind).toBeLessThan(owner);
    const floor = shardDepthFloor(owner, 9);
    const drawn = Math.max(behind, floor);
    expect(drawn).toBeGreaterThan(owner + 2e-5); // over the owner's shield bubble
    expect(drawn - 2e-5).toBeGreaterThan(owner + 2e-5); // its own rim too
    // Under the next unit a uid tiebreak up, so nothing slips between the boss and its shards.
    expect(drawn).toBeLessThan(owner + 1e-4);
  });

  it('leaves a shard already in front of its owner where it is, and splits shards apart', () => {
    const owner = worldDepth(200, 'enemy', 5);
    const ahead = worldDepth(210, 'enemy', 9);
    expect(Math.max(ahead, shardDepthFloor(owner, 9))).toBe(ahead);
    expect(shardDepthFloor(owner, 9)).not.toBe(shardDepthFloor(owner, 10));
    expect(shardDepthFloor(owner, 8)).toBeCloseTo(owner + SHARD_DEPTH_STEP, 9);
  });
});
