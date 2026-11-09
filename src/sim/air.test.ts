// T304a: air lanes, air targeting, Skyhook's flak (a straight projectile with a burst), and the
// neutral unit (Gerald). The live M3 data (Skyhook, Puffwing, Gerald) runs on the fixture map:
// fx_map's path `a` (0,0) → (2,0) → (2,3) → (3,3) → (3,4) → (5,4), and its air lane `sky`, a
// 3-4-5 diagonal from (2,0) to the core (5,4). Road dist 2 and sky dist 0 are the same point.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type {
  CompiledContent,
  CompiledMapDef,
  CompiledTier,
  CompiledWave,
} from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { IdSpace } from '../content/types.ts';
import { MAP, ROAD, SPRINKLER, WALKER, placeTower, setup, spawn } from './__fixtures__/combat.ts';
import { FIXTURE_CONTENT, fixtureConfig } from './__fixtures__/sim.ts';
import type { SimConfig } from './config.ts';
import type { SimEvent } from './events.ts';
import { createSim } from './sim.ts';
import { movement } from './systems/movement.ts';
import { projectiles } from './systems/projectiles.ts';
import { interceptInto, towers } from './systems/towers.ts';
import { runTick } from './tick.ts';

const LIVE = compileContent(RAW_CONTENT);
const SKYHOOK = LIVE.towers.skyhook;
const RIVET = LIVE.towers.rivet;
const THUMPER = LIVE.towers.thumper;
const PUFFWING = LIVE.enemies.puffwing;
const GERALD = LIVE.enemies.gerald;
const SKY = MAP.routes.sky!; // fx_map has the air lane `sky`

type Ev = SimEvent<IdSpace>;
const ofType = <T extends Ev['type']>(evs: readonly Ev[], type: T): Extract<Ev, { type: T }>[] =>
  evs.filter((e): e is Extract<Ev, { type: T }> => e.type === type);

describe('air lanes: flyers move and leak', () => {
  it('a Puffwing flies its lane at 1.1 tiles/s and leaks 1 at the core', () => {
    const { state, ctx } = setup();
    const e = spawn(state, PUFFWING, { route: SKY });
    const uid = e.uid;
    for (let i = 0; i < 60; i++) movement(state);
    expect(e.dist).toBeCloseTo(1.1, 9);
    expect(e.x).toBeCloseTo(2.5 + 0.6 * 1.1, 9); // the lane's direction is (3, 4) / 5
    expect(e.y).toBeCloseTo(0.5 + 0.8 * 1.1, 9);
    let ticks = 60;
    while (e.alive && ticks < 1000) {
      runTick(state, ctx);
      ticks++;
    }
    expect(ticks).toBe(Math.ceil((5 / 1.1) * 60)); // 5 tiles at 1.1 tiles/s
    expect(ofType(state.events, 'EnemyLeaked')).toEqual([
      { type: 'EnemyLeaked', uid, enemy: 'puffwing', leak: 1 },
    ]);
    expect(state.integrity).toBe(MAP.coreIntegrity - 1);
  });
});

describe('air targeting: layers per tower', () => {
  it('ground-only towers never see a flyer; air-only towers never see a ground unit', () => {
    const { state, ctx } = setup();
    const flyer = spawn(state, PUFFWING, { route: SKY, dist: 1 }); // (3.1, 1.3)
    const walker = spawn(state, WALKER, { dist: 2.8 }); // (2.5, 1.3)
    const sky = placeTower(state, SKYHOOK, 3, 1);
    const thump = placeTower(state, THUMPER, 1, 1);
    const rivet = placeTower(state, RIVET, 1, 3);
    rivet.priority = 'last'; // the walker has more route left than the flyer...
    towers(state, ctx);
    expect(sky.targetUid).toBe(flyer.uid);
    expect(thump.targetUid).toBe(walker.uid);
    expect(rivet.targetUid).toBe(walker.uid);
    rivet.priority = 'first'; // ...and Rivets hit both layers
    rivet.cooldownTicks = 0;
    towers(state, ctx);
    expect(rivet.targetUid).toBe(flyer.uid);
  });
});

describe("Skyhook's flak", () => {
  it('intercepts: a target that holds its speed is at the aim point when the burst lands', () => {
    const { state, ctx } = setup();
    const e = spawn(state, PUFFWING, { route: SKY, dist: 0.4 });
    const t = placeTower(state, SKYHOOK, 4, 2);
    towers(state, ctx);
    projectiles(state, ctx); // the firing tick's projectiles pass
    const [fired] = ofType(state.events, 'ProjectileFired');
    expect(fired).toMatchObject({ kind: 'projectile', towerUid: t.uid, targetUid: e.uid });
    expect(fired).toMatchObject({ sprite: 'projectile.skyhook_flak', radiusTiles: 0.8 });
    const p = state.projectiles.items.find((x) => x.alive)!;
    const flight = p.flightTicks;
    // 10 tiles/s from (4.5, 2.5) to about (2.9, 1.1): a few ticks.
    expect(flight).toBeGreaterThan(5);
    expect(flight).toBeLessThan(20);
    let ticks = 0;
    while (ofType(state.events, 'ProjectileHit').length === 0 && ticks < 100) {
      movement(state);
      projectiles(state, ctx);
      ticks++;
    }
    expect(ticks).toBe(flight);
    const [hit] = ofType(state.events, 'ProjectileHit');
    expect(hit!.x).toBeCloseTo(e.x, 9);
    expect(hit!.y).toBeCloseTo(e.y, 9);
    expect(hit).toMatchObject({ hits: 1, damage: 14 });
    expect(e.hp).toBe(40 - 14);
  });

  it('interceptInto times the flight to the predicted point, at the shot speed', () => {
    const { state } = setup();
    const e = spawn(state, PUFFWING, { route: SKY, dist: 1 });
    const out = { x: 0, y: 0 };
    const speed = SKYHOOK.tiers[0].attack!.kind === 'projectile' ? 10 / 60 : 0;
    const ticks = interceptInto(4.5, 2.5, speed, e, out);
    const d = Math.hypot(out.x - 4.5, out.y - 2.5);
    expect(ticks).toBe(Math.max(1, Math.ceil(d / speed)));
    const along = 1 + (1.1 / 60) * ticks;
    expect(out.x).toBeCloseTo(2.5 + 0.6 * along, 9);
    expect(out.y).toBeCloseTo(0.5 + 0.8 * along, 9);
  });

  it('bursts on every flyer within 0.8 tiles, and never on ground units', () => {
    const { state, ctx } = setup();
    const lead = spawn(state, PUFFWING, { route: SKY, dist: 1.2 });
    const wing = spawn(state, PUFFWING, { route: SKY, dist: 0.6 });
    const far = spawn(state, PUFFWING, { route: SKY, dist: 0 });
    const walker = spawn(state, WALKER, { dist: 2.9 }); // beside the flock, on the ground
    placeTower(state, SKYHOOK, 4, 2);
    towers(state, ctx);
    projectiles(state, ctx);
    for (let i = 0; i < 30 && ofType(state.events, 'ProjectileHit').length === 0; i++) {
      movement(state);
      projectiles(state, ctx);
    }
    expect(ofType(state.events, 'ProjectileHit')[0]).toMatchObject({ hits: 2, damage: 28 });
    expect([lead.hp, wing.hp, far.hp, walker.hp]).toEqual([26, 26, 40, WALKER.hp]);
  });

  it('copies its stats at fire time and still lands if the tower is sold', () => {
    const { state, ctx } = setup();
    const e = spawn(state, PUFFWING, { route: SKY, dist: 0.4 });
    const t = placeTower(state, SKYHOOK, 4, 2, 2); // T2: 20 damage
    towers(state, ctx);
    projectiles(state, ctx);
    t.alive = false;
    for (let i = 0; i < 30 && ofType(state.events, 'ProjectileHit').length === 0; i++) {
      movement(state);
      projectiles(state, ctx);
    }
    expect(e.hp).toBe(20);
  });
});

/** fx_map with wave 1 replaced: 4 Puffwings on the air lane and Gerald on the path. */
function airContent(): CompiledContent<IdSpace> {
  const g0 = MAP.waves[0]!.groups[0]!;
  const groups = [
    { ...g0, enemy: PUFFWING, count: 4, intervalTicks: 36, delayTicks: 120, route: SKY },
    { ...g0, enemy: GERALD, count: 1, intervalTicks: 60, delayTicks: 0, route: ROAD },
  ];
  const w1: CompiledWave<IdSpace> = { ...MAP.waves[0]!, groups, lastSpawnTicks: 120 + 3 * 36 };
  const map: CompiledMapDef<IdSpace> = { ...MAP, waves: [w1, ...MAP.waves.slice(1)] };
  return {
    ...FIXTURE_CONTENT,
    towers: { ...FIXTURE_CONTENT.towers, skyhook: SKYHOOK },
    enemies: { ...FIXTURE_CONTENT.enemies, puffwing: PUFFWING, gerald: GERALD },
    maps: { fx_map: map },
  };
}

function airConfig(): SimConfig<IdSpace> {
  return { ...fixtureConfig(), content: airContent(), loadout: ['fx_gun', 'skyhook'] };
}

/** Runs the air map to its end with a Skyhook and a gun built at the start; returns its events. */
function runAirMap(holdForGerald: boolean): {
  events: Ev[];
  hash: string;
  sim: ReturnType<typeof createSim>;
} {
  const sim = createSim(airConfig());
  sim.enqueue({ type: 'build', tower: 'skyhook', tile: [3, 1] });
  sim.enqueue({ type: 'build', tower: 'fx_gun', tile: [1, 1] });
  if (holdForGerald) sim.enqueue({ type: 'holdFire', target: 'all', on: true });
  sim.enqueue({ type: 'callWave' });
  const events: Ev[] = [];
  let released = !holdForGerald;
  for (let i = 0; i < 20_000 && sim.state.outcome === 'playing'; i++) {
    sim.step();
    const out: Ev[] = [];
    sim.drainEvents(out);
    events.push(...out);
    if (!released && out.some((e) => e.type === 'NeutralExited')) {
      sim.enqueue({ type: 'holdFire', target: 'all', on: false });
      released = true;
    }
  }
  return { events, hash: sim.hash(), sim };
}

describe('a map with flyers and Gerald runs end to end (gates lifted)', () => {
  it('plays, wins, and is deterministic', () => {
    const a = runAirMap(false);
    const b = runAirMap(false);
    expect(a.sim.state.outcome).toBe('won');
    expect(a.hash).toBe(b.hash);
    expect(a.events).toEqual(b.events);
    expect(ofType(a.events, 'ProjectileFired').some((e) => e.kind === 'projectile')).toBe(true);
    // A T1 Skyhook alone on a short lane: some of the flock gets through, all of it resolves.
    const died = ofType(a.events, 'EnemyDied').filter((e) => e.enemy === 'puffwing').length;
    const leaked = ofType(a.events, 'EnemyLeaked').filter((e) => e.enemy === 'puffwing').length;
    expect(died).toBeGreaterThan(0);
    expect(died + leaked).toBe(4);
    // Nobody held fire: the gun shot Gerald, who shrugged it off and delivered.
    expect(a.sim.state.stats.neutralHits).toBeGreaterThan(0);
    expect(ofType(a.events, 'NeutralHit').length).toBe(a.sim.state.stats.neutralHits);
    expect(ofType(a.events, 'NeutralExited')).toHaveLength(1);
    expect(ofType(a.events, 'EnemyDied').some((e) => e.enemy === 'gerald')).toBe(false);
  });

  it('holding fire for his pass keeps neutralHits at 0 (Return to Sender)', () => {
    const { sim, events } = runAirMap(true);
    expect(sim.state.stats.neutralHits).toBe(0);
    expect(ofType(events, 'NeutralExited')).toHaveLength(1);
  });
});

describe('Gerald, the neutral unit', () => {
  it('is targeted like an enemy, but an aimed hitscan shot plinks off: NeutralHit, no damage', () => {
    const { state, ctx } = setup();
    const g = spawn(state, GERALD, { dist: 1 });
    const r = placeTower(state, RIVET, 1, 1);
    towers(state, ctx);
    expect(r.targetUid).toBe(g.uid);
    expect(g.hp).toBe(GERALD.hp);
    expect(state.stats.neutralHits).toBe(1);
    expect(ofType(state.events, 'ProjectileHit')[0]).toMatchObject({ hits: 0, damage: 0 });
    expect(ofType(state.events, 'NeutralHit')).toEqual([
      { type: 'NeutralHit', uid: g.uid, enemy: 'gerald', towerUid: r.uid, x: g.x, y: g.y },
    ]);
    expect(ofType(state.events, 'EnemyDied')).toEqual([]);
    expect(r.firstFiredTick).toBe(state.tick); // it did fire
  });

  it('flak aimed at him plinks once, and still bursts on the flyers beside him', () => {
    const { state, ctx } = setup();
    const g = spawn(state, GERALD, { dist: 2 }); // (2.5, 0.5), heading down the path
    const p = spawn(state, PUFFWING, { route: SKY, dist: 0.1 }); // right beside him
    const t = placeTower(state, SKYHOOK, 3, 1);
    t.priority = 'last'; // Gerald has the most route left
    towers(state, ctx);
    expect(t.targetUid).toBe(g.uid);
    projectiles(state, ctx);
    for (let i = 0; i < 30 && ofType(state.events, 'ProjectileHit').length === 0; i++) {
      movement(state);
      projectiles(state, ctx);
    }
    expect(ofType(state.events, 'ProjectileHit')[0]).toMatchObject({ hits: 1 });
    expect(p.hp).toBe(40 - 14);
    expect(g.hp).toBe(GERALD.hp);
    expect(ofType(state.events, 'NeutralHit')).toHaveLength(1);
    expect(state.stats.neutralHits).toBe(1);
  });

  it('a burst aimed at someone else passes him by: no hit, no count (the ruling on splash)', () => {
    const { state, ctx } = setup();
    const g = spawn(state, GERALD, { dist: 2 });
    const p = spawn(state, PUFFWING, { route: SKY, dist: 0.1 });
    placeTower(state, SKYHOOK, 3, 1); // First: the Puffwing has less route left
    towers(state, ctx);
    projectiles(state, ctx);
    for (let i = 0; i < 30 && ofType(state.events, 'ProjectileHit').length === 0; i++) {
      movement(state);
      projectiles(state, ctx);
    }
    expect(p.hp).toBe(40 - 14);
    expect(g.hp).toBe(GERALD.hp);
    expect(ofType(state.events, 'NeutralHit')).toEqual([]);
    expect(state.stats.neutralHits).toBe(0);
  });

  it('ground-only towers never see him, and a pulse passes him by', () => {
    const { state, ctx } = setup();
    const g = spawn(state, GERALD, { dist: 1 });
    const thump = placeTower(state, THUMPER, 1, 1);
    // A pulse that also hits air (Cloudburst's shape): with only Gerald in range it waits.
    const both: CompiledTier = Object.freeze({
      ...SPRINKLER.tiers[0],
      targets: { ground: true, air: true },
    });
    const pulse = placeTower(state, SPRINKLER, 1, 1, both);
    towers(state, ctx);
    expect(thump.targetUid).toBe(0);
    expect(ofType(state.events, 'ProjectileFired')).toEqual([]);
    // With a pest in range it pulses, and hits only the pest.
    const w = spawn(state, WALKER, { dist: 0.5 });
    towers(state, ctx);
    expect(ofType(state.events, 'ProjectileHit')).toMatchObject([{ towerUid: pulse.uid, hits: 1 }]);
    expect(w.hp).toBeLessThan(WALKER.hp);
    expect(g.chillTicks).toBe(0);
    expect(state.stats.neutralHits).toBe(0);
  });

  it('never leaks: at the core he delivers and leaves, costing nothing', () => {
    const { state, ctx } = setup();
    const g = spawn(state, GERALD, { dist: ROAD.lengthTiles - 0.01 });
    const uid = g.uid;
    const leakedBefore = { ...state.stats.tagLeaked };
    runTick(state, ctx);
    expect(g.alive).toBe(false);
    expect(ofType(state.events, 'NeutralExited')).toEqual([
      { type: 'NeutralExited', uid, enemy: 'gerald', x: 5.5, y: 4.5 },
    ]);
    expect(ofType(state.events, 'EnemyLeaked')).toEqual([]);
    expect(state.integrity).toBe(MAP.coreIntegrity);
    expect(state.stats.integrityLost).toBe(0);
    expect(state.stats.tagLeaked).toEqual(leakedBefore);
    expect(state.medals.perfectCore).toBe('open');
    expect(ofType(state.events, 'MedalProgress')).toEqual([]);
  });
});
