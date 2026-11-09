import { describe, expect, it } from 'vitest';
import {
  enemyDef,
  GUN,
  MORTAR,
  placeTower,
  RUNNER,
  setup,
  spawn,
  SPRINKLER,
  tierWith,
  WALKER,
} from '../__fixtures__/combat.ts';
import { applyEffects } from '../combat/damage.ts';
import type { IdSpace } from '../../content/types.ts';
import type { SimEvent as LiveSimEvent } from '../events.ts';
import { hashState } from '../hashState.ts';
import { poolKill } from '../pool.ts';
import type { SimState } from '../state.ts';
import { runTick, type TickContext } from '../tick.ts';
import { DEPLOY_TICKS } from './applyCommands.ts';

type SimEvent = LiveSimEvent<IdSpace>;
type Ev<T extends SimEvent['type']> = Extract<SimEvent, { type: T }>;

/** Runs `n` ticks; returns every event they emitted, each tagged with its tick. */
function run(state: SimState, ctx: TickContext, n: number): (SimEvent & { tick: number })[] {
  const out: (SimEvent & { tick: number })[] = [];
  for (let i = 0; i < n; i++) {
    const tick = state.tick;
    runTick(state, ctx);
    for (const e of state.events) out.push({ ...e, tick });
    state.events.length = 0;
  }
  return out;
}

function ofType<T extends SimEvent['type']>(
  evs: readonly (SimEvent & { tick: number })[],
  type: T,
): (Ev<T> & { tick: number })[] {
  return evs.filter((e): e is Ev<T> & { tick: number } => e.type === type);
}

const fast = enemyDef('fx_fast', { hp: 1000, speedTilesPerTick: 2 / 60 });
const sturdy = enemyDef('fx_sturdy', { hp: 1000 });
const flyer = enemyDef('fx_flyer', { hp: 1000, layer: 'air' });

describe('towers: deploy delay (core-loop.md § 2.5)', () => {
  it('is 0.5 s', () => {
    expect(DEPLOY_TICKS).toBe(30);
  });

  it('a built tower first fires DEPLOY_TICKS after the build tick, then on its cooldown', () => {
    const { state, ctx } = setup();
    spawn(state, sturdy);
    state.pending.push({ type: 'build', tile: [1, 1], tower: 'fx_gun' });
    const evs = run(state, ctx, 91);
    expect(ofType(evs, 'TowerBuilt').map((b) => b.tick)).toEqual([0]);
    expect(ofType(evs, 'ProjectileFired').map((f) => f.tick)).toEqual([30, 60, 90]);
  });

  it('a built pulse tower waits out the deploy too', () => {
    const { state, ctx } = setup({ loadout: ['fx_sprinkler'] });
    state.lockedTowers.length = 0;
    spawn(state, sturdy);
    state.pending.push({ type: 'build', tile: [1, 1], tower: 'fx_sprinkler' });
    const evs = run(state, ctx, 31);
    expect(ofType(evs, 'ProjectileFired').map((f) => [f.tick, f.kind, f.sprite])).toEqual([
      [30, 'pulse', null],
    ]);
  });
});

describe('towers: hitscan (Rivet)', () => {
  it('fires the tick it has a target, then every cooldownTicks, and kills', () => {
    const { state, ctx } = setup();
    const gun = placeTower(state, GUN, 1, 1); // 10 kinetic, 2/s → 30 ticks
    const e = spawn(state, WALKER); // 30 HP
    const eUid = e.uid; // cleanup zeroes a dead slot's uid
    const evs = run(state, ctx, 90);
    const fired = ofType(evs, 'ProjectileFired');
    expect(fired.map((f) => f.tick)).toEqual([0, 30, 60]);
    expect(fired[0]).toMatchObject({
      uid: 0,
      towerUid: gun.uid,
      kind: 'hitscan',
      targetUid: eUid,
      sprite: null,
      flightTicks: 0,
    });
    expect(ofType(evs, 'ProjectileHit').map((h) => [h.tick, h.hits])).toEqual([
      [0, 1],
      [30, 1],
      [60, 1],
    ]);
    const died = ofType(evs, 'EnemyDied');
    expect(died).toHaveLength(1);
    expect(died[0]).toMatchObject({ tick: 60, uid: eUid, killer: { kind: 'tower', uid: gun.uid } });
    expect(gun.firstFiredTick).toBe(0);
    expect(state.stats.skitterkinKilled).toBe(1);
    expect(gun.targetUid).toBe(0); // nothing left
  });

  it('applies armor pierce from its tier (T3: pierce 3)', () => {
    const { state, ctx } = setup();
    placeTower(state, GUN, 1, 1, 3); // 12 kinetic, pierce 3
    const e = spawn(state, enemyDef('fx_plated', { hp: 1000, armor: 4 }));
    run(state, ctx, 1);
    expect(1000 - e.hp).toBe(11);
  });

  it('spins up before its first shot, and again after losing every target', () => {
    const { state, ctx } = setup();
    placeTower(state, GUN, 1, 1, tierWith(GUN.tiers[0], { spinUpTicks: 10 }));
    const e = spawn(state, sturdy);
    let evs = run(state, ctx, 31);
    expect(ofType(evs, 'ProjectileFired').map((f) => f.tick)).toEqual([10]);
    poolKill(state.enemies, e);
    run(state, ctx, 5);
    spawn(state, sturdy);
    const start = state.tick;
    evs = run(state, ctx, 20);
    expect(ofType(evs, 'ProjectileFired').map((f) => f.tick - start)).toEqual([10]);
  });

  it('a target killed earlier in the tick is skipped: no overkill, no wasted shot', () => {
    const { state, ctx } = setup();
    const a = placeTower(state, GUN, 1, 1);
    const b = placeTower(state, GUN, 3, 1);
    const eUid = spawn(state, enemyDef('fx_frail', { hp: 10 }), { dist: 2 }).uid;
    const evs = run(state, ctx, 1);
    expect(ofType(evs, 'ProjectileFired').map((f) => f.towerUid)).toEqual([a.uid]);
    expect(ofType(evs, 'EnemyDied').map((d) => d.uid)).toEqual([eUid]);
    expect([b.firstFiredTick, b.cooldownTicks]).toEqual([-1, 0]);
  });

  it('a ground-and-air tower hits flyers; a ground-only one ignores them', () => {
    const { state, ctx } = setup();
    const gun = placeTower(state, GUN, 1, 1);
    const mortar = placeTower(state, MORTAR, 4, 2);
    spawn(state, flyer, { dist: 2 });
    run(state, ctx, 1);
    expect(gun.firstFiredTick).toBe(0);
    expect(mortar.firstFiredTick).toBe(-1);
  });

  it('keeps its target while cooling only while it stays valid', () => {
    const { state, ctx } = setup();
    const gun = placeTower(state, GUN, 1, 1, tierWith(GUN.tiers[0], { damage: 1 }));
    gun.priority = 'last';
    const a = spawn(state, sturdy, { dist: 1 });
    run(state, ctx, 1);
    expect(gun.targetUid).toBe(a.uid);
    const b = spawn(state, sturdy, { dist: 0 }); // now "last", but the gun is cooling
    run(state, ctx, 1);
    expect(gun.targetUid).toBe(a.uid);
    run(state, ctx, 29); // ready again: re-picks by priority
    expect(gun.targetUid).toBe(b.uid);
  });
});

/** Fires one shell at `def` starting at `dist`; returns the aim point and the target's spot at impact. */
function shoot(over: { lead?: boolean; dist?: number; chill?: number; def?: typeof fast } = {}) {
  const { state, ctx } = setup();
  const tier = over.lead === false ? tierWith(MORTAR.tiers[0], { lead: false }) : MORTAR.tiers[0];
  const mortar = placeTower(state, MORTAR, 3, 1, tier); // (3.5, 1.5)
  const e = spawn(state, over.def ?? fast, { dist: over.dist ?? 1.2 });
  if (over.chill !== undefined)
    applyEffects(e, [{ status: 'chilled', pct: over.chill, durationTicks: 600 }]);
  const evs = run(state, ctx, 1);
  const fired = ofType(evs, 'ProjectileFired')[0]!; // the mortar fires on tick 0 (in range)
  let hit: (Ev<'ProjectileHit'> & { tick: number }) | undefined;
  while (hit === undefined && state.tick < 200) {
    const tick = state.tick;
    runTick(state, ctx);
    const h = state.events.find((x): x is Ev<'ProjectileHit'> => x.type === 'ProjectileHit');
    if (h !== undefined) hit = { ...h, tick };
    state.events.length = 0;
  }
  expect(hit).toBeDefined();
  return { state, mortar, e, fired, hit: hit!, at: { x: e.x, y: e.y } }; // checked above
}

describe('towers: lobbed shells with lead targeting (Thumper)', () => {
  it('lands flightTicks after firing, exactly where a constant-speed target is (round a corner)', () => {
    // From dist 1.2 at 2 tiles/s, 48 ticks of flight carries it past the corner at dist 2.
    const { fired, hit, at, e, mortar } = shoot();
    expect(fired).toMatchObject({
      kind: 'lobbed',
      sprite: 'projectile.thumper_shell',
      flightTicks: 48,
      towerUid: mortar.uid,
      targetUid: e.uid,
      x: 3.5,
      y: 1.5,
    });
    expect(fired.uid).toBeGreaterThan(0);
    expect(hit.tick).toBe(48);
    expect(hit.uid).toBe(fired.uid);
    expect(hit.hits).toBe(1);
    expect(hit.x).toBeCloseTo(at.x, 9);
    expect(hit.y).toBeCloseTo(at.y, 9);
    expect(fired.targetX).toBe(2.5); // past the corner, heading down the column
    expect(e.hp).toBe(980);
  });

  it('leads a Chilled target at its current (slowed) speed', () => {
    const { hit, at, e } = shoot({ chill: 0.3 });
    expect(hit.x).toBeCloseTo(at.x, 9);
    expect(hit.y).toBeCloseTo(at.y, 9);
    expect(e.hp).toBe(980);
  });

  it('without lead, a fast target walks out of the splash', () => {
    const { hit, e } = shoot({ lead: false });
    expect(hit.hits).toBe(0);
    expect(e.hp).toBe(1000);
  });

  it('the shell flies its ground point from the tower to the aim point', () => {
    const { state, ctx } = setup();
    placeTower(state, MORTAR, 3, 1);
    spawn(state, fast, { dist: 1.2 });
    run(state, ctx, 24);
    const p = state.projectiles.items[0]!; // preallocated pool
    expect(p.alive).toBe(true);
    expect(p.ticksLeft).toBe(24);
    expect(p.x).toBeCloseTo((3.5 + p.targetX) / 2, 12);
    expect(p.y).toBeCloseTo((1.5 + p.targetY) / 2, 12);
  });

  it('splashes every ground enemy within the radius, not flyers; a sold tower’s shell still lands', () => {
    const { state, ctx } = setup();
    const mortar = placeTower(state, MORTAR, 3, 1);
    // The target is b (First); on impact a is 0.5 behind it, c 3 behind, and the flyer on a.
    const a = spawn(state, sturdy, { dist: 3 });
    const b = spawn(state, sturdy, { dist: 3.5 });
    const c = spawn(state, sturdy, { dist: 0.5 });
    const f = spawn(state, flyer, { dist: 3 });
    run(state, ctx, 1);
    const mortarUid = mortar.uid;
    poolKill(state.towers, mortar); // sold mid-flight
    const evs = run(state, ctx, 60);
    expect(ofType(evs, 'ProjectileHit')[0]).toMatchObject({ hits: 2, towerUid: mortarUid });
    expect([a.hp, b.hp, c.hp, f.hp]).toEqual([980, 980, 1000, 1000]);
  });

  it('never targets at exactly its minimum range (exclusive)', () => {
    const { state, ctx } = setup();
    const mortar = placeTower(state, MORTAR, 3, 1); // (3.5, 1.5), minimum 1.0
    const still = enemyDef('fx_still', { hp: 1000, speedTilesPerTick: 0 });
    spawn(state, still, { dist: 3 }); // (2.5, 1.5): exactly 1.0 away
    run(state, ctx, 5);
    expect(mortar.firstFiredTick).toBe(-1);
    mortar.x = 3.5000001; // a hair past the minimum
    run(state, ctx, 1);
    expect(mortar.firstFiredTick).toBe(5);
  });

  it('kills by splash credit the tower', () => {
    const { state, ctx } = setup();
    const mortar = placeTower(state, MORTAR, 3, 1);
    spawn(state, enemyDef('fx_frail', { hp: 15 }), { dist: 2.5 });
    const evs = run(state, ctx, 60);
    expect(ofType(evs, 'EnemyDied')[0]).toMatchObject({
      killer: { kind: 'tower', uid: mortar.uid },
    });
  });
});

describe('towers: pulse (Sprinkler)', () => {
  it('hits every enemy in range with damage and Chilled, once per period', () => {
    const { state, ctx } = setup();
    const s = placeTower(state, SPRINKLER, 1, 1); // (1.5, 1.5), radius 2
    const a = spawn(state, sturdy, { dist: 0.5 });
    const b = spawn(state, sturdy, { dist: 3 });
    const c = spawn(state, sturdy, { dist: 6.5 }); // (3.5, 4): out of range
    const evs = run(state, ctx, 61);
    expect(ofType(evs, 'ProjectileFired').map((f) => [f.tick, f.kind, f.targetUid])).toEqual([
      [0, 'pulse', 0],
      [60, 'pulse', 0],
    ]);
    expect(ofType(evs, 'ProjectileHit')[0]).toMatchObject({ hits: 2, x: 1.5, y: 1.5 });
    expect([a.hp, b.hp, c.hp]).toEqual([996, 996, 1000]);
    expect([a.chillPct, b.chillPct, c.chillPct]).toEqual([0.25, 0.25, 0]);
    expect(s.firstFiredTick).toBe(0);
  });

  it('waits for an enemy: its first pulse always affects one (misclick grace)', () => {
    const { state, ctx } = setup();
    const s = placeTower(state, SPRINKLER, 1, 1);
    const e = spawn(state, sturdy, { dist: 6.5 });
    run(state, ctx, 30);
    expect([s.firstFiredTick, s.cooldownTicks]).toEqual([-1, 0]);
    e.def = enemyDef('fx_still', { hp: 1000, speedTilesPerTick: 0 });
    e.dist = 3;
    run(state, ctx, 1);
    expect(s.firstFiredTick).toBe(30);
  });

  it('Chilled slows movement for exactly its duration', () => {
    const { state, ctx } = setup();
    const s = placeTower(state, SPRINKLER, 1, 1);
    const e = spawn(state, WALKER, { dist: 0.5 }); // 1 tile/s
    const free = spawn(state, WALKER, { dist: 6.5 });
    run(state, ctx, 1); // tick 0: pulse, Chilled 25% for 90 ticks
    poolKill(state.towers, s);
    const d0 = e.dist;
    const f0 = free.dist;
    run(state, ctx, 91);
    // 90 slowed ticks at 0.75, then one at full speed.
    expect(e.dist - d0).toBeCloseTo((90 * 0.75 + 1) / 60, 12);
    expect(free.dist - f0).toBeCloseTo(91 / 60, 12);
    expect(e.chillPct).toBe(0);
  });

  it('two Sprinklers: only the strongest Chilled applies', () => {
    const { state, ctx } = setup();
    placeTower(state, SPRINKLER, 1, 1, 1); // 25%
    placeTower(state, SPRINKLER, 3, 1, 2); // 30%
    const e = spawn(state, sturdy, { dist: 2.5 });
    run(state, ctx, 1);
    expect(e.chillPct).toBe(0.3);
    expect(e.chillMul).toBeCloseTo(0.7, 12);
  });

  it('T3 also Soaks (shields take Kinetic at ×0.8)', () => {
    const { state, ctx } = setup();
    placeTower(state, SPRINKLER, 1, 1, 3);
    const e = spawn(state, RUNNER, { dist: 2.5 });
    run(state, ctx, 1);
    expect(e.soakedTicks).toBe(180);
    expect(e.shieldHp).toBe(9); // 2 × 0.5: Soaked lands after the hit
  });
});

function battle(): SimState {
  const { state, ctx } = setup();
  placeTower(state, GUN, 1, 1);
  placeTower(state, MORTAR, 3, 1);
  placeTower(state, SPRINKLER, 4, 2);
  placeTower(state, GUN, 1, 3, 3);
  for (let i = 0; i < 12; i++) {
    spawn(state, i % 3 === 0 ? RUNNER : i % 3 === 1 ? WALKER : sturdy, { dist: i * 0.35 });
  }
  run(state, ctx, 400);
  return state;
}

describe('combat determinism', () => {
  it('two identical battles hash the same', () => {
    const a = battle();
    const b = battle();
    expect(hashState(a)).toBe(hashState(b));
    expect(a.stats.killsByEnemy).toEqual(b.stats.killsByEnemy);
    expect(a.stats.skitterkinKilled).toBeGreaterThan(0);
  });

  it('combat state is hashed (a status change changes the hash)', () => {
    const { state } = setup();
    const e = spawn(state, sturdy);
    const before = hashState(state);
    e.chillPct = 0.25;
    expect(hashState(state)).not.toBe(before);
  });
});
