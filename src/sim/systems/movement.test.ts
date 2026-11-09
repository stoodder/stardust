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
import { createScratch, runTick, type TickContext } from '../tick.ts';
import { YOUNGLING_SPEED_MUL } from '../../content/rules.ts';
import { enemySpeedPerTick, movement } from './movement.ts';

const map = FIXTURE_CONTENT.maps.fx_map;
const road = map.routes.a!; // length 9
const sky = map.routes.sky!; // one 3-4-5 diagonal, length 5
const walker = FIXTURE_CONTENT.enemies.fx_walker; // 1 tile/s, leak 1
const runner = FIXTURE_CONTENT.enemies.fx_runner; // 2 tiles/s, leak 1

function setup(): { state: SimState; ctx: TickContext } {
  const config: SimConfig<IdSpace> = fixtureConfig();
  return {
    state: createState(map, config.seed),
    ctx: { content: FIXTURE_CONTENT, map, config, scratch: createScratch() },
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
    expect(state.events).toEqual([
      { type: 'EnemyLeaked', uid, enemy: 'fx_walker', leak: 1 },
      { type: 'MedalProgress', medal: 'perfectCore', status: 'forfeited' }, // cleanup (T202c)
    ]);
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

  it('younglings leak for 0 and move at half speed (enemies.md § 5.1); a leak counts its tags', () => {
    const { state, ctx } = setup();
    const young = spawn(state, walker, road, { tags: ['quiet_wave', 'youngling'] });
    expect(enemySpeedPerTick(young)).toBe(walker.speedTilesPerTick * YOUNGLING_SPEED_MUL);
    expect(ticksUntilGone(state, ctx, young)).toBe(1080); // 9 tiles at 0.5/s
    expect(state.integrity).toBe(map.coreIntegrity);
    expect(state.stats.tagLeaked).toEqual({
      quiet_wave: 1,
      youngling: 1,
      fleeing: 0,
      medal_exempt: 0,
    });
    // Chilled stacks with it: ×0.5 × chillMul.
    const chilled = spawn(state, walker, road, { tags: ['youngling'], chillMul: 0.5 });
    expect(enemySpeedPerTick(chilled)).toBeCloseTo(walker.speedTilesPerTick * 0.25, 15);
  });

  it('a quiet_wave unit without the youngling tag leaks its normal cost (Old Thrum)', () => {
    const { state } = setup();
    spawn(state, walker, road, { dist: 8.99, tags: ['quiet_wave'] });
    movement(state);
    expect(state.integrity).toBe(map.coreIntegrity - 1);
  });

  it('integrity never goes below 0; integrityLost and EnemyLeaked.leak count only what was there', () => {
    const { state } = setup();
    state.integrity = 1;
    spawn(state, walker, road, { dist: 8.99 });
    spawn(state, walker, road, { dist: 8.995 });
    movement(state);
    expect(state.integrity).toBe(0);
    expect(state.stats.integrityLost).toBe(1);
    // EnemyLeaked.leak is what the core actually lost: the second leak finds nothing left.
    expect(state.events).toMatchObject([
      { type: 'EnemyLeaked', leak: 1 },
      { type: 'EnemyLeaked', leak: 0 },
    ]);
  });

  it('Emergency Bulkhead absorbs the first leaks, once per map, before the core loses any', () => {
    const { state } = setup();
    state.leakAbsorbLeft = 5;
    const brute = { ...walker, leak: 3 };
    spawn(state, brute, road, { dist: 8.99 }); // 3: all absorbed
    spawn(state, brute, road, { dist: 8.995 }); // 3: 2 absorbed, 1 lost
    spawn(state, walker, road, { dist: 8.999 }); // 1: lost
    movement(state);
    expect(state.leakAbsorbLeft).toBe(0);
    expect(state.integrity).toBe(map.coreIntegrity - 2);
    expect(state.stats.integrityLost).toBe(2);
    expect(state.events).toMatchObject([
      { type: 'EnemyLeaked', leak: 0 },
      { type: 'EnemyLeaked', leak: 1 },
      { type: 'EnemyLeaked', leak: 1 },
    ]);
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
    expect(e.x).toBeCloseTo(4, 9);
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
