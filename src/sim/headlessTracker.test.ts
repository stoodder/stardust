// The run tracker's invariant checks (conventions.md § Balance sims, #12) catch broken state.
import { describe, expect, it } from 'vitest';
import { fixtureSim, type FixtureIds } from './__fixtures__/sim.ts';
import type { SimEvent } from './events.ts';
import { createRunTracker } from './headlessTracker.ts';
import type { SimState } from './state.ts';

/** A fixture sim with a gun on (1, 1), its tracker fed the build, and the mutable state behind it. */
function tracked() {
  const sim = fixtureSim();
  const tracker = createRunTracker(sim, true);
  sim.enqueue({ type: 'build', tile: [1, 1], tower: 'fx_gun' });
  sim.applyPending();
  const out: SimEvent<FixtureIds>[] = [];
  sim.drainEvents(out);
  tracker.consume(out);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test corrupts state on purpose
  const state = sim.state as unknown as SimState;
  return { tracker, state };
}

const check = (t: ReturnType<typeof tracked>): readonly string[] => {
  t.tracker.afterTick();
  return t.tracker.summary().violations;
};

describe('run tracker invariants', () => {
  it('a clean state has none', () => {
    expect(check(tracked())).toEqual([]);
  });

  it('the credits ledger: start + earned − spent + refunded', () => {
    const t = tracked();
    t.state.credits += 5;
    expect(check(t)).toEqual([expect.stringMatching(/credits 105 ≠ ledger 100/)]);
  });

  it('a wave with a negative remaining count', () => {
    const t = tracked();
    t.state.schedule.remaining[0] = -1;
    expect(check(t)).toEqual([expect.stringMatching(/wave 1 has -1 enemies remaining/)]);
  });

  it('a tower on a non-buildable tile, and a tile map that disagrees with the pool', () => {
    const t = tracked();
    const gun = t.state.towers.items[0]!;
    gun.col = 2; // the path at (2, 0)
    gun.row = 0;
    expect(check(t)).toEqual([
      expect.stringMatching(/tower \d+ stands on a non-buildable tile \(2, 0\)/),
      expect.stringMatching(/tile \(1, 1\) maps to slot 0, which has no tower there/),
    ]);
  });

  it('a live tower its tile doesn’t point at', () => {
    const t = tracked();
    t.state.towerAtTile.fill(-1);
    expect(check(t)).toEqual([expect.stringMatching(/tile \(1, 1\) doesn't map to tower/)]);
  });
});
