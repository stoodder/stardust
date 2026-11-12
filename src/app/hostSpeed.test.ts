// T863: 3× speed (the post-game unlock; design/core-loop.md § 2.8) changes only how many fixed
// ticks the host runs per real frame, never the tick itself, so a run is the same at 1×, 2×, and 3×:
// the same state hash at every tick a frame ends on.
import { describe, expect, it } from 'vitest';
import { fixtureSim } from '../sim/__fixtures__/sim.ts';
import { createHost, TICK_MS } from './host.ts';
import type { Speed } from './testHookTypes.ts';

/** Well before the fixture map ends (tick 1251), so every frame still ticks. */
const TICKS = 1200;

/**
 * A fixture run at `speed`: a tower, wave 1 called, then real frames until TICKS ticks. Returns
 * the state hash at the ticks it samples: those in `at`, else every 25th frame's and the last.
 */
function runAt(
  speed: Exclude<Speed, 0>,
  at: ReadonlySet<number> | null = null,
  until = TICKS,
): { hashes: Map<number, string>; frames: number } {
  const sim = fixtureSim();
  const host = createHost(sim, { now: () => 0, speed: 0 });
  host.enqueue({ type: 'build', tile: [1, 1], tower: 'fx_gun' });
  host.enqueue({ type: 'callWave' });
  host.fastForward(0);
  host.setSpeed(speed);
  const hashes = new Map<number, string>();
  let frames = 0;
  // Bounded: a map that ends stops ticking, and the test should fail, not hang.
  while (sim.state.tick < until && frames < until * 2) {
    host.frame(TICK_MS);
    frames++;
    const t = sim.state.tick;
    // Hashing is the slow part, so only at the sampled ticks.
    const sample = at === null ? frames % 25 === 0 || t >= until : at.has(t);
    if (sample) hashes.set(t, sim.hash());
  }
  return { hashes, frames };
}

describe('game speed is ticks per frame, never the tick (3x, T863)', () => {
  it('the same state hash at the same tick at 1x, 2x, and 3x', () => {
    const two = runAt(2);
    const three = runAt(3);
    // 1x visits every tick: hash it where the faster runs were sampled.
    const ticks = new Set([...two.hashes.keys(), ...three.hashes.keys()]);
    const one = runAt(1, ticks, Math.max(...ticks));
    for (const [speed, run] of [
      [2, two],
      [3, three],
    ] as const) {
      expect(run.hashes.size).toBeGreaterThan(5);
      for (const [tick, hash] of run.hashes) {
        expect(hash, `tick ${tick} at ${speed}x`).toBe(one.hashes.get(tick));
      }
      // Faster speeds get there in fewer frames: about a half, a third.
      expect(run.frames).toBeLessThanOrEqual(Math.ceil(TICKS / speed) + 1);
    }
  });
});
