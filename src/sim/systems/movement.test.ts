import { describe, expect, it } from 'vitest';
import type { CompiledEnemyDef, CompiledRoute } from '../../content/compiled.ts';
import type { IdSpace, WaveTag } from '../../content/types.ts';
import { FIXTURE_CONTENT, fixtureConfig } from '../__fixtures__/sim.ts';
import type { SimConfig } from '../config.ts';
import { ENEMY_BLANK, type Enemy } from '../entities.ts';
import { hashState } from '../hashState.ts';
import { placeOnRoute } from '../path.ts';
import { poolAlloc } from '../pool.ts';
import { createState, takeUid, type SimState } from '../state.ts';
import { runTick, type TickContext } from '../tick.ts';
import { movement } from './movement.ts';

const map = FIXTURE_CONTENT.maps.fx_map;
const road = map.routes.a!; // length 9
const sky = map.routes.sky!; // one 3-4-5 diagonal, length 5
const walker = FIXTURE_CONTENT.enemies.fx_walker; // 1 tile/s, leak 1
const runner = FIXTURE_CONTENT.enemies.fx_runner; // 2 tiles/s, leak 1

function setup(): { state: SimState; ctx: TickContext } {
  const config: SimConfig<IdSpace> = fixtureConfig();
  return {
    state: createState(map, config.seed),
    ctx: { content: FIXTURE_CONTENT, map, config, scratch: { slots: [] } },
  };
}

/** Allocates an enemy on a route, as the wave spawner (T105b) will. */
function spawn(
  state: SimState,
  def: CompiledEnemyDef,
  route: CompiledRoute = road,
  over: { dist?: number; tags?: readonly WaveTag[]; chillMul?: number } = {},
): Enemy {
  const e = poolAlloc(state.enemies, ENEMY_BLANK, takeUid(state));
  e.def = def;
  e.hp = def.hp;
  e.tags = over.tags ?? e.tags;
  e.chillMul = over.chillMul ?? 1;
  placeOnRoute(e, route, over.dist ?? 0);
  return e;
}

/** Runs ticks until `e` is dead (or `max` ticks); returns how many ran. */
function ticksUntilGone(state: SimState, ctx: TickContext, e: Enemy, max = 10_000): number {
  let n = 0;
  while (e.alive && n < max) {
    runTick(state, ctx);
    n++;
  }
  return n;
}

/** Whether a coordinate sits on a tile center (k + 0.5). */
function isOnCenter(v: number): boolean {
  return Math.abs(v - Math.floor(v) - 0.5) < 1e-9;
}

describe('movement', () => {
  it('advances by speed per tick and derives the position from (seg, dist)', () => {
    const { state } = setup();
    const e = spawn(state, walker);
    for (let i = 0; i < 90; i++) movement(state);
    expect(e.dist).toBeCloseTo(1.5, 12);
    expect(e.seg).toBe(1);
    expect(e.x).toBeCloseTo(2, 12); // halfway from (1,0) to (2,0)
    expect(e.y).toBe(0.5);
  });

  it('turns corners: the position always lies on the polyline', () => {
    const { state } = setup();
    const e = spawn(state, runner);
    for (let i = 0; i < 260; i++) {
      movement(state);
      // Every route segment is axis-aligned, so one coordinate sits on a tile center.
      expect(isOnCenter(e.x) || isOnCenter(e.y)).toBe(true);
    }
  });

  it('leaks at the route end on the exact tick: 9 tiles at 1/s and 2/s', () => {
    for (const [def, want] of [
      [walker, 540],
      [runner, 270],
    ] as const) {
      const { state, ctx } = setup();
      const e = spawn(state, def);
      expect(ticksUntilGone(state, ctx, e)).toBe(want);
      expect(e.dist).toBe(road.lengthTiles);
      expect([e.x, e.y]).toEqual([5.5, 4.5]); // the core tile's center
    }
  });

  it('a leak damages the core, counts as integrity lost, emits EnemyLeaked, and frees the slot', () => {
    const { state, ctx } = setup();
    const e = spawn(state, walker, road, { dist: 8.99 });
    const uid = e.uid;
    runTick(state, ctx);
    expect(e.alive).toBe(false);
    expect(state.integrity).toBe(map.coreIntegrity - 1);
    expect(state.stats.integrityLost).toBe(1);
    expect(state.events).toEqual([{ type: 'EnemyLeaked', uid, enemy: 'fx_walker', leak: 1 }]);
    expect(state.enemies.live).toBe(0);
    expect(e.uid).toBe(0); // cleanup released it
  });

  it('fleeing enemies leak for 0', () => {
    const { state } = setup();
    spawn(state, walker, road, { dist: 8.99, tags: ['fleeing'] });
    movement(state);
    expect(state.integrity).toBe(map.coreIntegrity);
    expect(state.stats.integrityLost).toBe(0);
    expect(state.events).toMatchObject([{ type: 'EnemyLeaked', leak: 0 }]);
  });

  it('integrity never goes below 0, and integrityLost counts only what was there', () => {
    const { state } = setup();
    state.integrity = 1;
    spawn(state, walker, road, { dist: 8.99 });
    spawn(state, walker, road, { dist: 8.995 });
    movement(state);
    expect(state.integrity).toBe(0);
    expect(state.stats.integrityLost).toBe(1);
    expect(state.events.filter((ev) => ev.type === 'EnemyLeaked')).toHaveLength(2);
  });

  it('Chilled slows by chillMul', () => {
    const { state } = setup();
    const cold = spawn(state, walker, road, { chillMul: 0.5 });
    const warm = spawn(state, walker);
    for (let i = 0; i < 60; i++) movement(state);
    expect(warm.dist).toBeCloseTo(1, 12);
    expect(cold.dist).toBeCloseTo(0.5, 12);
  });

  it('follows air lanes the same way', () => {
    const { state } = setup();
    const e = spawn(state, runner, sky);
    for (let i = 0; i < 75; i++) movement(state); // 2.5 tiles of the 5-tile diagonal
    expect(e.x).toBeCloseTo(2, 9);
    expect(e.y).toBeCloseTo(2.5, 9);
  });

  it('skips dead slots and route-less enemies', () => {
    const { state } = setup();
    const e = poolAlloc(state.enemies, ENEMY_BLANK, takeUid(state));
    e.def = walker; // no route
    movement(state);
    expect(e.dist).toBe(0);
    expect(state.events).toEqual([]);
  });

  it('is deterministic: two identical runs hash the same throughout', () => {
    const a = setup();
    const b = setup();
    for (const s of [a.state, b.state]) {
      spawn(s, walker);
      spawn(s, runner, road, { dist: 3, chillMul: 0.65 });
      spawn(s, runner, sky);
    }
    for (let t = 0; t < 600; t++) {
      runTick(a.state, a.ctx);
      runTick(b.state, b.ctx);
      if (t % 30 === 0) expect(hashState(a.state)).toBe(hashState(b.state));
    }
    expect(hashState(a.state)).toBe(hashState(b.state));
    expect(a.state.integrity).toBe(map.coreIntegrity - 3);
  });
});
