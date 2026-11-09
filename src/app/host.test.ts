import { describe, expect, it } from 'vitest';
import { fixtureSim, type FixtureIds } from '../sim/__fixtures__/sim.ts';
import type { Sim } from '../sim/index.ts';
import { createHost, MAX_FRAME_DELTA_MS, MAX_STEPS_PER_FRAME, TICK_MS } from './host.ts';

/** A real sim with step counting. */
function counted(): { sim: Sim<FixtureIds>; steps: () => number } {
  const real = fixtureSim();
  let steps = 0;
  const sim: Sim<FixtureIds> = {
    ...real,
    step() {
      steps++;
      real.step();
    },
  };
  return { sim, steps: () => steps };
}

describe('host loop', () => {
  it('runs one tick per TICK_MS of real time at 1×, carrying the remainder', () => {
    const { sim, steps } = counted();
    const host = createHost(sim, { now: () => 0 });
    expect(host.frame(TICK_MS * 0.5)).toBe(0);
    expect(host.frame(TICK_MS * 0.6)).toBe(1); // 1.1 ticks banked
    expect(host.frame(TICK_MS * 0.9)).toBe(1); // 0.1 + 0.9
    expect(steps()).toBe(2);
  });

  it('runs twice as many ticks at 2×, and none while paused', () => {
    const { sim, steps } = counted();
    const host = createHost(sim, { now: () => 0 });
    host.setSpeed(2);
    for (let i = 0; i < 60; i++) host.frame(TICK_MS);
    expect(steps()).toBe(120);
    host.setSpeed(0);
    for (let i = 0; i < 60; i++) host.frame(TICK_MS);
    expect(steps()).toBe(120);
  });

  it('caps catch-up steps per frame and drops the backlog', () => {
    const { sim } = counted();
    const host = createHost(sim, { now: () => 0 });
    expect(host.frame(MAX_FRAME_DELTA_MS)).toBe(MAX_STEPS_PER_FRAME);
    // The backlog was dropped, so a normal frame runs one tick, not the remainder.
    expect(host.frame(TICK_MS)).toBe(1);
    host.setSpeed(2);
    expect(host.frame(10_000)).toBe(MAX_STEPS_PER_FRAME * 2);
  });

  it('ignores bad deltas', () => {
    const { sim } = counted();
    const host = createHost(sim, { now: () => 0 });
    expect(host.frame(Number.NaN)).toBe(0);
    expect(host.frame(-50)).toBe(0);
  });

  it('applies commands while paused without advancing time, and dispatches their events', () => {
    const sim = fixtureSim();
    const host = createHost(sim, { now: () => 0, speed: 0 });
    const built: number[] = [];
    host.bus.on('TowerBuilt', (e) => built.push(e.uid));
    let frames = 0;
    host.onAfterFrame(() => frames++);
    host.enqueue({ type: 'build', tile: [1, 1], tower: 'fx_gun' });
    host.frame(TICK_MS * 10);
    expect(sim.state.tick).toBe(0);
    expect(sim.state.towers.live).toBe(1);
    expect(built).toHaveLength(1);
    expect(frames).toBe(1);
  });

  it('fastForward steps exactly, ignores speed, and dispatches once', () => {
    const sim = fixtureSim();
    const host = createHost(sim, { now: () => 0, speed: 0 });
    let frames = 0;
    host.onAfterFrame(() => frames++);
    host.fastForward(90);
    expect(sim.state.tick).toBe(90);
    expect(frames).toBe(1);
    // fastForward(0) applies pending commands (a test hook landing a build while paused).
    host.enqueue({ type: 'build', tile: [1, 1], tower: 'fx_gun' });
    host.fastForward(0);
    expect(sim.state.towers.live).toBe(1);
    expect(() => host.fastForward(-1)).toThrow(RangeError);
    expect(() => host.fastForward(1.5)).toThrow(RangeError);
  });

  it('measures sim time per tick', () => {
    const { sim } = counted();
    let t = 0;
    const host = createHost(sim, {
      now: () => {
        t += 2;
        return t;
      },
    });
    host.fastForward(4); // 2 ms over 4 ticks
    expect(host.simMsPerTick()).toBeCloseTo(0.5);
  });

  it('onAfterFrame returns an unsubscribe', () => {
    const host = createHost(fixtureSim(), { now: () => 0 });
    let n = 0;
    const off = host.onAfterFrame(() => n++);
    host.frame(0);
    off();
    host.frame(0);
    expect(n).toBe(1);
  });
});
