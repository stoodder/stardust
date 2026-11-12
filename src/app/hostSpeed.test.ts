// T863: 3× speed (the post-game unlock; design/core-loop.md § 2.8) changes only how many fixed
// ticks the host runs per real frame, never the tick itself, so a run is the same at 1×, 2×, and 3×:
// the same state hash after the same ticks.
import { describe, expect, it } from 'vitest';
import { fixtureSim } from '../sim/__fixtures__/sim.ts';
import { hashState } from '../sim/hashState.ts';
import { createHost, TICK_MS } from './host.ts';
import type { Speed } from './testHookTypes.ts';

const TICKS = 1800;

/** A fixture run at `speed`: a tower, wave 1 called, then real frames until TICKS ticks. */
function runAt(speed: Exclude<Speed, 0>): { tick: number; hash: string; frames: number } {
  const sim = fixtureSim();
  const host = createHost(sim, { now: () => 0, speed: 0 });
  host.enqueue({ type: 'build', tile: [1, 1], tower: 'fx_gun' });
  host.enqueue({ type: 'callWave' });
  host.fastForward(0);
  host.setSpeed(speed);
  let frames = 0;
  while (sim.state.tick < TICKS) {
    host.frame(TICK_MS);
    frames++;
  }
  return { tick: sim.state.tick, hash: hashState(sim.state), frames };
}

describe('game speed is ticks per frame, never the tick (3x, T863)', () => {
  it('the same state hash after the same ticks at 1x, 2x, and 3x', () => {
    const one = runAt(1);
    const two = runAt(2);
    const three = runAt(3);
    expect(one.tick).toBe(TICKS);
    expect(two.tick).toBe(TICKS);
    expect(three.tick).toBe(TICKS);
    expect(two.hash).toBe(one.hash);
    expect(three.hash).toBe(one.hash);
    // 3x gets there in a third of the frames.
    expect(three.frames).toBe(one.frames / 3);
  });
});
