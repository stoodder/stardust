// T407b: the Skyhook's specs (design/towers.md § 7) and homing projectiles (systems/projectiles.ts):
// Flak Curtain's data, Seeker Swarm's volleys (each missile at its own target, wrapping round when
// targets run short), steering and arrival, armor pierce, retargeting when the target dies,
// leaks, burrows, cloaks, or leaves (nearest within 3 tiles, ties to the lowest uid, never a
// neutral or a spared unit), the fizzles, determinism, and a Story run that specializes both
// Skyhook and Zapcoil. fx_map's pads (1,1), (3,1), (4,2), (1,3); its air lane `sky` runs (2,0) to
// (5,4).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { IdSpace, WaveTag } from '../content/types.ts';
import { MAP, enemyDef, placeTower, setup, spawn } from './__fixtures__/combat.ts';
import { FIXTURE_CONTENT, fixtureConfig } from './__fixtures__/sim.ts';
import type { SimConfig } from './config.ts';
import type { Enemy, Projectile } from './entities.ts';
import type { SimEvent } from './events.ts';
import { gateRefusals } from './gates.ts';
import { hashState } from './hashState.ts';
import { createSim } from './sim.ts';
import type { SimState } from './state.ts';
import { movement } from './systems/movement.ts';
import { HOMING_LIFE_TICKS, projectiles } from './systems/projectiles.ts';
import { towers } from './systems/towers.ts';
import type { TickContext } from './tick.ts';

const LIVE = compileContent(RAW_CONTENT);
const SKYHOOK = LIVE.towers.skyhook;
const FLAK_CURTAIN = SKYHOOK.specs!.a; // built since T407b
const SEEKER_SWARM = SKYHOOK.specs!.b;
const SKY = MAP.routes.sky!; // fx_map has the air lane `sky`
// Tough, still flyers: hits never kill them unless a test says so.
const FLYER = enemyDef('fx_flyer', { hp: 10_000, layer: 'air', speedTilesPerTick: 0 });

/**
 * Story difficulty as it reaches the sim (meta/modifiers.ts DIFFICULTY_MODIFIERS; sim tests can't
 * import meta): enemies −30% HP and shields, the economy's terms.
 */
const STORY: SimConfig<IdSpace>['modifiers'] = [
  { kind: 'enemyStat', stat: 'hp', pct: -0.3, source: 'difficulty:story' },
  { kind: 'enemyStat', stat: 'shield', pct: -0.3, source: 'difficulty:story' },
  { kind: 'economy', stat: 'startCredits', pct: 0.5, source: 'difficulty:story' },
  { kind: 'economy', stat: 'coreIntegrity', set: 30, source: 'difficulty:story' },
  { kind: 'countdown', pct: 0.5, source: 'difficulty:story' },
];

type Ev = SimEvent<IdSpace>;
const ofType = <T extends Ev['type']>(state: SimState, type: T): Extract<Ev, { type: T }>[] =>
  state.events.filter((e): e is Extract<Ev, { type: T }> => e.type === type);

/** A fixture state with the live content (the Skyhook and its specs). */
function liveSetup(): { state: SimState; ctx: TickContext } {
  const s = setup();
  return { state: s.state, ctx: { ...s.ctx, content: LIVE } };
}

/** An enemy of `def` standing at (x, y) (on the air lane for a flyer). */
function at(state: SimState, def = FLYER, x = 0, y = 0, tags?: readonly WaveTag[]): Enemy {
  const route = def.layer === 'air' ? SKY : undefined;
  const e = spawn(state, def, {
    ...(route === undefined ? {} : { route }),
    ...(tags === undefined ? {} : { tags }),
  });
  e.x = x;
  e.y = y;
  return e;
}

/** The live homing shots. */
function missiles(state: SimState): Projectile[] {
  return state.projectiles.items.slice(0, state.projectiles.used).filter((p) => p.alive);
}

/** Runs the projectiles system until no shot is left (at most `max` ticks); the ticks it took. */
function flyOut(state: SimState, ctx: TickContext, max = HOMING_LIFE_TICKS + 5): number {
  for (let i = 1; i <= max; i++) {
    projectiles(state, ctx);
    if (missiles(state).length === 0) return i;
  }
  return -1;
}

const lost = (e: Enemy): number => Math.round((e.def!.hp - e.hp) * 1000) / 1000;

/**
 * A volley at three moving flyers on fx_map, for 240 ticks: every live shot's position after each
 * tick, then the whole state's hash at the end.
 */
function volleyTrace(): string[] {
  const { state, ctx } = liveSetup();
  placeTower(state, SKYHOOK, 1, 1, SEEKER_SWARM);
  const mover = enemyDef('fx_mover', { ...FLYER, hp: 60, speedTilesPerTick: 1.5 / 60 });
  for (const d of [0.5, 1.5, 2.5]) spawn(state, mover, { route: SKY, dist: d });
  const trace: string[] = [];
  for (let i = 0; i < 240; i++) {
    movement(state);
    towers(state, ctx);
    projectiles(state, ctx);
    trace.push(
      missiles(state)
        .map((p) => `${p.uid}:${p.x},${p.y}>${p.targetUid}`)
        .join(' '),
    );
  }
  trace.push(hashState(state));
  return trace;
}

describe('the Skyhook specs (towers.md § 7)', () => {
  it('Flak Curtain: 3.0 shots/s, 12 damage, splash 1.2; still straight flak at range 4', () => {
    expect(FLAK_CURTAIN).toMatchObject({ tier: 4, name: 'Flak Curtain', cost: 330 });
    expect(FLAK_CURTAIN.targets).toEqual({ ground: false, air: true });
    expect(FLAK_CURTAIN.attack).toMatchObject({
      kind: 'projectile',
      type: 'explosive',
      damage: 12,
      cooldownTicks: 20,
      rangeTiles: 4,
      splashTiles: 1.2,
      homing: false,
      volley: 1,
      projectile: 'projectile.skyhook_flak',
    });
  });

  it('Seeker Swarm: volleys of 4 homing missiles, 25 damage, pierce 4, range 5, Strong', () => {
    expect(SEEKER_SWARM).toMatchObject({ tier: 4, name: 'Seeker Swarm', cost: 330 });
    expect(SEEKER_SWARM.defaultPriority).toBe('strong');
    expect(SEEKER_SWARM.targets).toEqual({ ground: false, air: true });
    expect(SEEKER_SWARM.attack).toMatchObject({
      kind: 'projectile',
      damage: 25,
      armorPierce: 4,
      rangeTiles: 5,
      splashTiles: 0,
      homing: true,
      volley: 4,
      cooldownTicks: 120,
      speedTilesPerTick: 0.1,
      projectile: 'projectile.skyhook_seeker',
    });
  });

  it('plays: no gate refuses either spec (attack.homing lifted)', () => {
    const content: CompiledContent<IdSpace> = {
      ...FIXTURE_CONTENT,
      towers: { ...FIXTURE_CONTENT.towers, skyhook: SKYHOOK },
    };
    const cfg: SimConfig<IdSpace> = {
      ...fixtureConfig(),
      content,
      loadout: ['skyhook'],
      specsUnlocked: ['skyhook'],
    };
    expect(gateRefusals(cfg)).toEqual([]);
  });
});

describe('Seeker Swarm volleys', () => {
  it('fires 4 missiles at once, each at its own target in priority order (Strong)', () => {
    const { state, ctx } = liveSetup();
    const t = placeTower(state, SKYHOOK, 1, 1, SEEKER_SWARM);
    t.priority = 'strong';
    const weak = at(state, enemyDef('fx_weak', { ...FLYER, hp: 100 }), 3.5, 0.5);
    const mid = at(state, enemyDef('fx_mid', { ...FLYER, hp: 500 }), 4.5, 1.5);
    const big = at(state, FLYER, 2.5, 3.5);
    const tiny = at(state, enemyDef('fx_tiny', { ...FLYER, hp: 50 }), 0.5, 3.5);
    const huge = at(state, enemyDef('fx_huge', { ...FLYER, hp: 20_000 }), 4.5, 3.5);
    towers(state, ctx);
    const fired = ofType(state, 'ProjectileFired');
    expect(fired.map((e) => e.targetUid)).toEqual([huge.uid, big.uid, mid.uid, weak.uid]);
    expect(fired.every((e) => e.kind === 'projectile' && e.sprite === 'projectile.skyhook_seeker'));
    expect(fired.every((e) => e.uid !== 0 && e.flightTicks === 0 && e.radiusTiles === 0)).toBe(
      true,
    );
    expect(tiny.hp).toBe(50);
    expect(t.targetUid).toBe(huge.uid);
    expect(t.cooldownTicks).toBe(120);
    expect(missiles(state).every((p) => p.homing && p.ticksLeft === HOMING_LIFE_TICKS)).toBe(true);
  });

  it('with too few targets, the extras go round them again, the tower’s target first', () => {
    const { state, ctx } = liveSetup();
    placeTower(state, SKYHOOK, 1, 1, SEEKER_SWARM);
    const a = at(state, FLYER, 3.5, 0.5);
    const b = at(state, enemyDef('fx_b', { ...FLYER, hp: 100 }), 4.5, 1.5);
    towers(state, ctx);
    expect(ofType(state, 'ProjectileFired').map((e) => e.targetUid)).toEqual([
      a.uid,
      b.uid,
      a.uid,
      b.uid,
    ]);
    flyOut(state, ctx);
    // 4 × 25 explosive split two and two (no armor on either): each took the same.
    expect(lost(a)).toBe(lost(b));
    expect(lost(a)).toBeGreaterThan(0);
  });

  it('a spared runner is never picked for the volley under the filter', () => {
    const { state, ctx } = liveSetup();
    const t = placeTower(state, SKYHOOK, 1, 1, SEEKER_SWARM);
    t.spareRunners = true;
    const a = at(state, FLYER, 3.5, 0.5);
    at(state, FLYER, 4.5, 1.5, ['fleeing']);
    towers(state, ctx);
    expect(ofType(state, 'ProjectileFired').map((e) => e.targetUid)).toEqual([
      a.uid,
      a.uid,
      a.uid,
      a.uid,
    ]);
  });
});

describe('homing missiles', () => {
  it('steer to a moving target at 6 tiles/s and hit it', () => {
    const { state, ctx } = liveSetup();
    placeTower(state, SKYHOOK, 1, 1, SEEKER_SWARM);
    const mover = enemyDef('fx_mover', { ...FLYER, speedTilesPerTick: 2 / 60 });
    const e = spawn(state, mover, { route: SKY, dist: 1 });
    towers(state, ctx);
    expect(missiles(state)).toHaveLength(4);
    let ticks = 0;
    while (missiles(state).length > 0 && ticks < 200) {
      movement(state);
      projectiles(state, ctx);
      ticks++;
      // Every live missile is heading at where its target is now.
      for (const p of missiles(state)) expect([p.targetX, p.targetY]).toEqual([e.x, e.y]);
    }
    expect(ticks).toBeGreaterThan(5);
    expect(ticks).toBeLessThan(60);
    const hits = ofType(state, 'ProjectileHit');
    expect(hits).toHaveLength(4);
    expect(hits.every((h) => h.hits === 1)).toBe(true);
    expect(e.hp).toBeLessThan(mover.hp);
  });

  it('pierce 4: armor up to 4 costs nothing; armor 6 costs the 2 left over', () => {
    const { state, ctx } = liveSetup();
    placeTower(state, SKYHOOK, 1, 1, SEEKER_SWARM);
    const bare = at(state, FLYER, 3.5, 0.5);
    towers(state, ctx);
    flyOut(state, ctx);
    const base = lost(bare);
    for (const [armor, less] of [
      [4, false],
      [6, true],
    ] as const) {
      const s = liveSetup();
      placeTower(s.state, SKYHOOK, 1, 1, SEEKER_SWARM);
      const e = at(s.state, enemyDef(`fx_armor${armor}`, { ...FLYER, armor }), 3.5, 0.5);
      towers(s.state, s.ctx);
      flyOut(s.state, s.ctx);
      if (less) expect(lost(e)).toBeLessThan(base);
      else expect(lost(e)).toBe(base);
    }
  });

  it('retarget when the target dies or leaks: the nearest within 3 tiles, ties to the lowest uid', () => {
    const { state, ctx } = liveSetup();
    placeTower(state, SKYHOOK, 1, 1, SEEKER_SWARM);
    const first = at(state, FLYER, 4.5, 3.5);
    towers(state, ctx);
    projectiles(state, ctx);
    // Two candidates at the same distance from the missiles, and one farther.
    const p = missiles(state)[0]!; // four fired above
    const near1 = at(state, FLYER, p.x + 1, p.y);
    const near2 = at(state, FLYER, p.x - 1, p.y);
    at(state, FLYER, p.x, p.y + 2);
    // Make the later slot the lower uid: the rule is uid, not slot order.
    const u = near1.uid;
    near1.uid = near2.uid;
    near2.uid = u;
    first.alive = false; // it died (or leaked) before the missiles got there
    projectiles(state, ctx);
    // All four flew together, so all four switch to the same one.
    expect(missiles(state).map((m) => m.targetUid)).toEqual([
      near2.uid,
      near2.uid,
      near2.uid,
      near2.uid,
    ]);
  });

  it('retarget when the target burrows, slips into its cloak, or leaves', () => {
    const cloaked = enemyDef('fx_cloaked', { ...FLYER, cloaked: true, traits: ['cloaked'] });
    for (const escape of ['burrowed', 'cloak', 'leaving'] as const) {
      const { state, ctx } = liveSetup();
      placeTower(state, SKYHOOK, 1, 1, SEEKER_SWARM);
      const e = at(state, escape === 'cloak' ? cloaked : FLYER, 4.5, 3.5);
      if (escape === 'cloak') e.revealedTicks = 100; // revealed while the volley fires
      towers(state, ctx);
      expect(missiles(state)).toHaveLength(4);
      projectiles(state, ctx);
      const other = at(state, FLYER, missiles(state)[0]!.x + 0.5, missiles(state)[0]!.y);
      if (escape === 'burrowed') e.burrowed = true;
      else if (escape === 'leaving') e.leaving = true;
      else e.revealedTicks = 0;
      projectiles(state, ctx);
      expect(
        missiles(state).every((m) => m.targetUid === other.uid),
        escape,
      ).toBe(true);
      flyOut(state, ctx);
      expect(lost(e), escape).toBe(0);
      expect(lost(other), escape).toBeGreaterThan(0);
    }
  });

  it('never retargets onto a neutral unit, or a spared one when fired under the filter', () => {
    const gerald = LIVE.enemies.gerald;
    const { state, ctx } = liveSetup();
    const t = placeTower(state, SKYHOOK, 1, 1, SEEKER_SWARM);
    t.spareRunners = true;
    const e = at(state, FLYER, 4.5, 3.5);
    towers(state, ctx);
    projectiles(state, ctx);
    const p = missiles(state)[0]!;
    at(state, gerald, p.x + 0.2, p.y);
    at(state, FLYER, p.x - 0.2, p.y, ['fleeing']);
    e.alive = false;
    projectiles(state, ctx);
    // Nothing it may take: every missile flies on to where it last saw its target, and fizzles.
    expect(missiles(state).every((m) => m.targetUid === 0)).toBe(true);
    state.events.length = 0;
    flyOut(state, ctx);
    const hits = ofType(state, 'ProjectileHit');
    expect(hits).toHaveLength(4);
    expect(hits.every((h) => h.hits === 0 && h.x === 4.5 && h.y === 3.5)).toBe(true);
    expect(ofType(state, 'NeutralHit')).toEqual([]);
  });

  it('a missile aimed at a neutral unit plinks off it (D072)', () => {
    const { state, ctx } = liveSetup();
    placeTower(state, SKYHOOK, 1, 1, SEEKER_SWARM);
    const g = at(state, LIVE.enemies.gerald, 3.5, 0.5);
    towers(state, ctx);
    flyOut(state, ctx);
    expect(ofType(state, 'NeutralHit')).toHaveLength(4);
    expect(g.hp).toBe(g.def!.hp);
  });

  it('fizzles where it is when its fuel runs out', () => {
    const { state, ctx } = liveSetup();
    placeTower(state, SKYHOOK, 1, 1, SEEKER_SWARM);
    const e = at(state, FLYER, 4.5, 3.5);
    towers(state, ctx);
    for (const p of missiles(state)) p.ticksLeft = 1;
    state.events.length = 0;
    projectiles(state, ctx);
    expect(missiles(state)).toEqual([]);
    const hits = ofType(state, 'ProjectileHit');
    expect(hits).toHaveLength(4);
    expect(hits.every((h) => h.hits === 0 && h.x !== 4.5)).toBe(true);
    expect(lost(e)).toBe(0);
  });

  it('is deterministic: the same setup flies the same paths, tick by tick', () => {
    const trace = volleyTrace();
    expect(trace.some((t) => t.length > 0 && t.includes(':'))).toBe(true);
    expect(volleyTrace()).toEqual(trace);
  });
});

describe('a Story run with both specs (sim integration)', () => {
  it('specializes Seeker Swarm and Capacitor Bank on A1M3 and plays them out deterministically', () => {
    const cfg: SimConfig<IdSpace> = {
      content: LIVE,
      mapId: 'a1_m03',
      seed: 7,
      loadout: ['skyhook', 'zapcoil', 'rivet', 'thumper'],
      companion: null,
      modifiers: [...STORY, { kind: 'economy', stat: 'startCredits', flat: 5000, source: 'test' }],
      difficulty: 'story',
      abilities: { slot1: 'orbital_strike', slot2: null, slot2State: 'none' },
      scriptFlags: {},
      specsUnlocked: ['skyhook', 'zapcoil'],
    };
    expect(gateRefusals(cfg)).toEqual([]);
    const run = (): { hash: string; fired: number; charged: number; specs: (string | null)[] } => {
      const sim = createSim(cfg);
      // A1M3's par pads: Zapcoils by the hairpin at once; Skyhooks on both air lanes (par's) as
      // soon as the Skyhook ships mid-map. Each goes straight to tier 3 and spec B.
      const plan = [
        ['zapcoil', [4, 4]],
        ['zapcoil', [7, 5]],
        ['skyhook', [3, 2]],
        ['skyhook', [6, 7]],
      ] as const;
      const built = new Set<string>();
      const rejected: unknown[] = [];
      let fired = 0;
      let charged = 0;
      sim.enqueue({ type: 'callWave' });
      for (let i = 0; i < 60 * 150 && sim.state.outcome === 'playing'; i++) {
        for (const [tower, tile] of plan) {
          if (built.has(tile.join()) || sim.state.lockedTowers.includes(tower)) continue;
          built.add(tile.join());
          sim.enqueue({ type: 'build', tile, tower });
        }
        sim.step();
        for (const t of sim.state.towers.items) {
          if (!t.alive || t.spec !== null || t.builtTick !== sim.state.tick - 1) continue;
          sim.enqueue({ type: 'upgrade', towerUid: t.uid });
          sim.enqueue({ type: 'upgrade', towerUid: t.uid });
          sim.enqueue({ type: 'specialize', towerUid: t.uid, spec: 'b' });
        }
        for (const e of sim.state.events) {
          if (e.type === 'CommandRejected') rejected.push(e);
          if (e.type !== 'ProjectileFired') continue;
          if (e.kind === 'projectile') fired++;
          if (e.kind === 'charge') charged++;
        }
      }
      expect(rejected).toEqual([]);
      const specs = sim.state.towers.items.filter((x) => x.alive).map((x) => x.spec);
      return { hash: sim.hash(), fired, charged, specs };
    };
    const a = run();
    expect(a.specs).toEqual(['b', 'b', 'b', 'b']);
    expect(a.fired).toBeGreaterThan(0);
    expect(a.charged).toBeGreaterThan(0);
    expect(run()).toEqual(a);
  });
});
