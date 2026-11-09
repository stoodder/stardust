// The run tracker's invariant checks (conventions.md § Balance sims, #12) catch broken state.
import { describe, expect, it } from 'vitest';
import { fixtureSim, type FixtureIds } from './__fixtures__/sim.ts';
import type { SimEvent } from './events.ts';
import { ALLY_BLANK, ENEMY_BLANK } from './entities.ts';
import { createRunTracker } from './headlessTracker.ts';
import { poolAlloc } from './pool.ts';
import { takeUid, type SimState } from './state.ts';

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

/** A tracked fixture sim with one hand-placed ally and a fleeing enemy announced by its spawn. */
function withAlly() {
  const t = tracked();
  const ally = poolAlloc(t.state.allies, ALLY_BLANK, takeUid(t.state));
  ally.x = 0.5;
  ally.y = 2.5;
  const enemy = poolAlloc(t.state.enemies, ENEMY_BLANK, takeUid(t.state));
  enemy.tags = ['fleeing'];
  t.tracker.consume([
    { type: 'EnemySpawned', uid: enemy.uid, enemy: 'fx_runner', route: 'a', wave: 1 },
  ]);
  return { ...t, ally, enemy };
}

describe('run tracker: ally invariants (allies are never harmed, never target exempt units)', () => {
  it('a clean ally has none', () => {
    expect(check(withAlly())).toEqual([]);
  });

  it('an attack on (or a target that is) an exempt unit', () => {
    const t = withAlly();
    const attacked: SimEvent<FixtureIds> = {
      type: 'AllyAttacked',
      uid: t.ally.uid,
      targetUid: t.enemy.uid,
      x: 0.5,
      y: 2.5,
      targetX: 0,
      targetY: 0,
    };
    t.tracker.consume([attacked]);
    t.ally.targetUid = t.enemy.uid;
    t.ally.targetSlot = t.enemy.slot;
    expect(check(t)).toEqual([
      expect.stringMatching(/ally \d+ attacked exempt enemy \d+/),
      expect.stringMatching(/ally \d+ targets exempt enemy \d+/),
    ]);
  });

  it('a never-vulnerable ally that lost health, or one off the map', () => {
    const t = withAlly();
    t.ally.health = 0.5;
    t.ally.x = -1;
    expect(check(t)).toEqual([
      expect.stringMatching(/ally \d+ is off the map/),
      expect.stringMatching(/ally \d+ can't be hurt but has health 0.5/),
    ]);
  });
});

describe('run tracker: fire-control invariants (core-loop.md § 2.7)', () => {
  const fired = (towerUid: number, targetUid: number): SimEvent<FixtureIds> => ({
    type: 'ProjectileFired',
    uid: 0,
    towerUid,
    kind: 'hitscan',
    targetUid,
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    sprite: null,
    flightTicks: 0,
    radiusTiles: 0,
  });

  it('a shot from a tower holding fire', () => {
    const t = withAlly();
    const gun = t.state.towers.items[0]!;
    t.tracker.consume([fired(gun.uid, 0)]);
    expect(check(t)).toEqual([]);
    gun.holdFire = true;
    t.tracker.consume([fired(gun.uid, 0)]);
    expect(check(t)).toEqual([expect.stringMatching(/tower \d+ fired while holding fire/)]);
  });

  it('a shot at a spared unit from a tower with spare runners on', () => {
    const t = withAlly();
    const gun = t.state.towers.items[0]!;
    t.tracker.consume([fired(gun.uid, t.enemy.uid)]); // the filter is off: fine
    expect(check(t)).toEqual([]);
    gun.spareRunners = true;
    t.tracker.consume([fired(gun.uid, t.enemy.uid)]);
    expect(check(t)).toEqual([
      expect.stringMatching(/tower \d+ with spare runners on targeted spared enemy \d+/),
    ]);
  });
});
