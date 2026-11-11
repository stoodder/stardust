// T705: the Gloop Spitter (design/towers.md § 7) from its live data: its tiers' Corroded stacks and
// caps, Big Glorp's puddle (sim/puddles.ts: duration, the chill, the armor-bypassing acid, one
// puddle per unit), Corrosive Kiss's shield slow, the links Acid Rain and Sticky Flak, its tune-up
// row, determinism on a real map, and a probe that it answers what towers.md says it does (armor
// and splash). On fx_map's road ((0,0) → (2,0) → (2,3) → …, tile centres +0.5): a Gloop on pad
// (1,1) stands at (1.5, 1.5), and a unit at dist 2 (2.5, 0.5) is 1.41 tiles off, in its 3.0 range.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent, CompiledTier } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { LINK_CORRODED_MAX_STACKS } from '../content/rules.ts';
import { STUB_TOWER_TASKS, TOWERS } from '../content/towers/index.ts';
import type { IdSpace } from '../content/types.ts';
import { UPGRADES } from '../content/upgrades/index.ts';
import { enemyDef, placeTower, setup, spawn } from './__fixtures__/combat.ts';
import type { SimConfig } from './config.ts';
import {
  PROJECTILE_BLANK,
  type Enemy,
  type Projectile,
  type Tower,
  type Zone,
} from './entities.ts';
import type { SimEvent } from './events.ts';
import { FEATURE_GATES, gateRefusals, towerRefusal } from './gates.ts';
import {
  applyLinkCorroded,
  armShot,
  puddleBeatDamage,
  puddles,
  PUDDLE_DOT_TICKS,
  spawnPuddle,
} from './puddles.ts';
import { createSim } from './sim.ts';
import type { SimState } from './state.ts';
import { links } from './systems/links.ts';
import { projectiles } from './systems/projectiles.ts';
import { status } from './systems/status.ts';
import { towers } from './systems/towers.ts';
import type { TickContext } from './tick.ts';

const LIVE: CompiledContent<IdSpace> = compileContent(RAW_CONTENT);
const GLOOP = LIVE.towers.gloop!;
const BIG_GLORP: CompiledTier = GLOOP.specs!.a;
const KISS: CompiledTier = GLOOP.specs!.b;
const PUDDLE = BIG_GLORP.puddle!;
// A still, tough, armored ground unit: hits never kill it unless a test says so.
const TANK = enemyDef('fx_tank', { hp: 100_000, armor: 10, speedTilesPerTick: 0 });
const SHIELDED = enemyDef('fx_shielded', { hp: 100_000, speedTilesPerTick: 0 });

type Ev = SimEvent<IdSpace>;
const ofType = <T extends Ev['type']>(state: SimState, type: T): Extract<Ev, { type: T }>[] =>
  state.events.filter((e): e is Extract<Ev, { type: T }> => e.type === type);

function world(): { state: SimState; ctx: TickContext } {
  const { state, ctx } = setup();
  return { state, ctx: { ...ctx, content: LIVE } };
}

function build(
  state: SimState,
  id: string,
  tier: number | CompiledTier = 1,
  col = 1,
  row = 1,
): Tower {
  const t = placeTower(state, LIVE.towers[id]!, col, row, tier);
  if (typeof tier !== 'number') {
    t.tier = 4;
    t.spec = tier === BIG_GLORP ? 'a' : 'b';
  }
  state.linksDirty = true;
  return t;
}

/** One tick of the systems a shot needs, in tick order: status, links, puddles, towers, shots. */
function tick(state: SimState, ctx: TickContext): void {
  status(state);
  links(state, ctx);
  puddles(state, ctx);
  towers(state, ctx);
  projectiles(state, ctx);
  state.tick++;
}

/** Runs ticks until `n` shells have landed (ProjectileHit), clearing events each tick. */
function untilHits(state: SimState, ctx: TickContext, n: number, max = 60 * 60): number {
  let hits = 0;
  for (let i = 0; i < max; i++) {
    state.events.length = 0;
    tick(state, ctx);
    hits += ofType(state, 'ProjectileHit').length;
    if (hits >= n) return hits;
  }
  return hits;
}

function livePuddles(state: SimState): Zone[] {
  return state.zones.items.slice(0, state.zones.used).filter((z) => z.alive && z.kind === 'puddle');
}

/** A shot armed by `t` (its tier's puddle, its bonuses), aimed at (x, y). */
function shotAt(state: SimState, t: Tower, x: number, y: number): Projectile {
  const p: Projectile = {
    ...PROJECTILE_BLANK,
    alive: true,
    towerUid: t.uid,
    targetX: x,
    targetY: y,
  };
  armShot(p, t, t.tierDef!);
  return p;
}

const lost = (e: Enemy): number => Math.round((e.def!.hp - e.hp) * 1e6) / 1e6;

describe('the Gloop Spitter (towers.md § 7): numbers and gates', () => {
  it('compiles the tiers and specs as designed', () => {
    expect(GLOOP.tiers.map((t) => t.cost)).toEqual([120, 95, 180]);
    expect(GLOOP.tiers[0].attack).toMatchObject({
      kind: 'lobbed',
      type: 'explosive',
      damage: 12,
      rangeTiles: 3,
      splashTiles: 1,
      projectile: 'projectile.gloop_glob',
    });
    expect(GLOOP.tiers[1].attack).toMatchObject({ damage: 16 });
    expect(GLOOP.tiers[0].targets).toEqual({ ground: true, air: false });
    expect(GLOOP.tiers[0].defaultPriority).toBe('strong');
    expect(GLOOP.tiers.map((t) => t.effects)).toMatchObject([
      [{ status: 'corroded', stacks: 1, maxStacks: 5, shieldRegenMul: 1 }],
      [{ stacks: 1, maxStacks: 6 }],
      [{ stacks: 2, maxStacks: 8 }],
    ]);
    expect([BIG_GLORP.cost, KISS.cost]).toEqual([360, 360]);
    expect(PUDDLE).toMatchObject({ durationTicks: 180, radiusTiles: 1, chillPct: 0.25 });
    expect(PUDDLE.damagePerTick * 60).toBeCloseTo(10, 12);
    expect(BIG_GLORP.effects).toEqual(GLOOP.tiers[2].effects); // keeps T3's stacks
    expect(KISS.effects).toMatchObject([{ stacks: 3, maxStacks: 12, shieldRegenMul: 0.5 }]);
    expect(KISS.puddle).toBeNull();
  });

  it('is simulated: no stub entry, `tower.puddle` lifted, a loadout with it runs', () => {
    expect(STUB_TOWER_TASKS).not.toHaveProperty('gloop');
    expect(FEATURE_GATES['tower.puddle']).toBeNull();
    expect(towerRefusal(TOWERS.gloop)).toBeNull();
    const cfg: SimConfig<IdSpace> = {
      ...setup().ctx.config,
      content: LIVE,
      mapId: 'a1_m03',
      loadout: ['gloop', 'thumper', 'skyhook', 'rivet'],
      specsUnlocked: ['gloop'],
    };
    expect(gateRefusals(cfg)).toEqual([]);
  });

  it('has the usual tune-up, stocked after A3M3 (progression.md § 4.2)', () => {
    const u = UPGRADES.tune_gloop;
    expect(u).toMatchObject({ kind: 'shop', currency: 'stardust', availableAfter: 'a3_m03' });
    expect(u.ranks.map((r) => [r.price, r.grants])).toEqual([
      [40, [{ kind: 'towerStat', tower: 'gloop', stat: 'damage', pct: 0.05 }]],
      [80, [{ kind: 'towerCost', tower: 'gloop', tiers: 'all', pct: -0.05 }]],
      [140, [{ kind: 'towerStat', tower: 'gloop', stat: 'range', pct: 0.05 }]],
    ]);
  });
});

/** The armored unit a Gloop at `tier` on (1,1) has hit `hits` times. */
function stacksAfter(tier: number | CompiledTier, hits: number): Enemy {
  const { state, ctx } = world();
  build(state, 'gloop', tier);
  const e = spawn(state, TANK, { dist: 2 });
  expect(untilHits(state, ctx, hits)).toBe(hits);
  return e;
}

describe('Corroded per tier (enemies.md § 2.4)', () => {
  it('T1 adds 1 a hit up to 5; T2 caps at 6; T3 adds 2 up to 8', () => {
    expect(stacksAfter(1, 1).corrodedStacks).toBe(1);
    expect(stacksAfter(1, 3).corrodedStacks).toBe(3);
    expect(stacksAfter(1, 8).corrodedStacks).toBe(5);
    expect(stacksAfter(2, 8).corrodedStacks).toBe(6);
    expect(stacksAfter(3, 1).corrodedStacks).toBe(2);
    expect(stacksAfter(3, 6).corrodedStacks).toBe(8);
  });

  it('Corrosive Kiss adds 3 up to 12, and halves shield regeneration while they hold', () => {
    const e = stacksAfter(KISS, 6);
    expect(e.corrodedStacks).toBe(12);
    expect(e.corrodedShieldMul).toBe(0.5);
    expect(stacksAfter(BIG_GLORP, 6).corrodedShieldMul).toBe(1); // a plain Corroded
  });

  it('the stacks strip armor from each hit, and lapse 5 s after the last', () => {
    const { state, ctx } = world();
    const t = build(state, 'gloop', 3);
    const e = spawn(state, TANK, { dist: 2 });
    untilHits(state, ctx, 5);
    expect(e.corrodedStacks).toBe(8);
    t.holdFire = true;
    for (let i = 0; i < 5 * 60 + 1; i++) tick(state, ctx);
    expect(e.corrodedStacks).toBe(0);
  });
});

describe("Big Glorp's puddle (sim/puddles.ts)", () => {
  it('each glob leaves one where it lands, hit or miss, for 3 s', () => {
    const { state, ctx } = world();
    build(state, 'gloop', BIG_GLORP);
    spawn(state, TANK, { dist: 2 });
    state.events.length = 0;
    untilHits(state, ctx, 1);
    const spawned = ofType(state, 'PuddleSpawned');
    expect(spawned).toHaveLength(1);
    const [z] = livePuddles(state);
    expect(spawned[0]).toEqual({ type: 'PuddleSpawned', zoneUid: z!.uid, at: [2.5, 0.5] });
    expect(z).toMatchObject({ ticksLeft: 180, chillPct: 0.25, radiusSq: 1, damageType: 'kinetic' });
    // A miss leaves one too.
    const g = state.towers.items.find((x) => x.alive)!;
    spawnPuddle(state, shotAt(state, g, 5.5, 0.5));
    expect(livePuddles(state)).toHaveLength(2);
    // Only Big Glorp's globs carry one.
    const plain = build(state, 'gloop', 3, 3, 1);
    expect(shotAt(state, plain, 1, 1).puddle).toBeNull();
  });

  it('Chills 25% and burns 10/s through armor while a unit stands in it, then dries', () => {
    const { state, ctx } = world();
    const g = build(state, 'gloop', BIG_GLORP);
    const e = spawn(state, TANK, { dist: 2 }); // armor 10, no Corroded on it
    spawnPuddle(state, shotAt(state, g, e.x, e.y));
    let passes = 0;
    while (livePuddles(state).length > 0) {
      status(state);
      puddles(state, ctx);
      passes++;
      if (passes === 1) expect(e.chillPct).toBe(0.25);
    }
    expect(passes).toBe(180);
    expect(e.corrodedStacks).toBe(0);
    expect(lost(e)).toBeCloseTo(30, 9); // 12 beats of 2.5: armor 10 never touched it
    expect(180 / PUDDLE_DOT_TICKS).toBe(12);
    status(state);
    status(state);
    expect(e.chillPct).toBe(0); // dried: the chill lapses a step later
  });

  it('half the chill on a boss; never a flyer, a burrowed unit, or a neutral one', () => {
    const { state, ctx } = world();
    const g = build(state, 'gloop', BIG_GLORP);
    const boss = spawn(state, LIVE.enemies.glass_witch!, { dist: 2 });
    const flyer = spawn(
      state,
      enemyDef('fx_fly', { hp: 1000, layer: 'air', speedTilesPerTick: 0 }),
      {
        dist: 2,
      },
    );
    const mole = spawn(state, enemyDef('fx_mole', { hp: 1000, speedTilesPerTick: 0 }), { dist: 2 });
    mole.burrowed = true;
    const neutral = enemyDef('fx_gerald', { hp: 1000, speedTilesPerTick: 0, neutral: true });
    const gerald = spawn(state, neutral, { dist: 2 });
    for (const u of [flyer, mole, gerald]) {
      u.x = boss.x;
      u.y = boss.y;
    }
    spawnPuddle(state, shotAt(state, g, boss.x, boss.y));
    for (let i = 0; i < PUDDLE_DOT_TICKS; i++) puddles(state, ctx);
    expect(boss.chillPct).toBeCloseTo(0.125, 12);
    for (const u of [flyer, mole, gerald]) {
      expect(u.chillPct).toBe(0);
      expect(u.hp).toBe(1000);
    }
    // A pinned flyer is grounded: it stands in the acid.
    flyer.pinnedTicks = 60;
    puddles(state, ctx);
    expect(flyer.chillPct).toBe(0.25);
  });

  it('overlapping puddles never stack: one chill, one acid, the strongest', () => {
    const { state, ctx } = world();
    const g = build(state, 'gloop', BIG_GLORP);
    const e = spawn(state, TANK, { dist: 2 });
    spawnPuddle(state, shotAt(state, g, e.x, e.y));
    spawnPuddle(state, shotAt(state, g, e.x + 0.3, e.y));
    g.pctDamage = 0.2; // a third, stronger puddle (its tower's damage percent at fire time)
    const strong = shotAt(state, g, e.x - 0.3, e.y);
    expect(strong.puddleDamage).toBeCloseTo(2.5 * 1.2, 12);
    spawnPuddle(state, strong);
    while (livePuddles(state).length > 0) puddles(state, ctx);
    expect(lost(e)).toBeCloseTo(12 * 3, 9); // not 12 × (2.5 + 2.5 + 3)
  });

  it('credits its tower with the kill', () => {
    const { state, ctx } = world();
    const g = build(state, 'gloop', BIG_GLORP);
    const e = spawn(state, enemyDef('fx_weak', { hp: 2, armor: 50, speedTilesPerTick: 0 }), {
      dist: 2,
    });
    spawnPuddle(state, shotAt(state, g, e.x, e.y));
    for (let i = 0; i < PUDDLE_DOT_TICKS; i++) puddles(state, ctx);
    expect(e.alive).toBe(false);
    expect(ofType(state, 'EnemyDied')[0]?.killer).toEqual({ kind: 'tower', uid: g.uid });
  });

  it("the acid takes the tower's damage percent (capped), not its flat bonuses", () => {
    expect(puddleBeatDamage(PUDDLE, { pctDamage: 0.1 })).toBeCloseTo(2.75, 12);
    expect(puddleBeatDamage(PUDDLE, { pctDamage: 9 })).toBeCloseTo(2.5 * 2.5, 12);
  });
});

describe('Acid Rain and Sticky Flak (towers.md § 6.2)', () => {
  it('compile with their partners and numbers', () => {
    const rain = LIVE.links.find((l) => l.id === 'acid_rain')!;
    const flak = LIVE.links.find((l) => l.id === 'sticky_flak')!;
    expect(rain.partners.map((p) => [p.tower, p.corrodedStacks, p.flatRange])).toEqual([
      ['thumper', 1, 0],
      ['gloop', 0, 0.5],
    ]);
    expect(flak.partners.map((p) => [p.tower, p.corrodedStacks, p.pctRate])).toEqual([
      ['skyhook', 1, 0],
      ['gloop', 0, 0.1],
    ]);
    expect(GLOOP.links).toEqual(['acid_rain', 'sticky_flak']);
  });

  it('form beside a Gloop: the partner corrodes, the Gloop reaches or fires further', () => {
    const { state, ctx } = world();
    const g = build(state, 'gloop', 1, 3, 1);
    const th = build(state, 'thumper', 1, 4, 2);
    const sk = build(state, 'skyhook', 1, 2, 2);
    links(state, ctx);
    expect([th.linkCorrodedStacks, sk.linkCorrodedStacks]).toEqual([1, 1]);
    expect(g.flatRange).toBeCloseTo(0.5, 12);
    expect(g.pctRate).toBeCloseTo(0.1, 12);
    expect(g.linkCorrodedStacks).toBe(0);
  });

  it("Linked Up's ×1.5 leaves whole stacks at 1", () => {
    const { state, ctx } = setup({ modifiers: [{ kind: 'linkBonus', pct: 0.5, source: 'test' }] });
    const live = { ...ctx, content: LIVE };
    build(state, 'gloop', 1, 3, 1);
    const th = build(state, 'thumper', 1, 4, 2);
    links(state, live);
    expect(th.linkCorrodedStacks).toBe(1);
  });

  it("a linked Thumper's shells corrode each victim, up to 5, never lowering a Gloop's 8", () => {
    const { state, ctx } = world();
    build(state, 'gloop', 1, 3, 1).holdFire = true;
    build(state, 'thumper', 1, 4, 2);
    const e = spawn(state, TANK, { dist: 6 }); // (2.5, 3.5)… in the Thumper's ring
    untilHits(state, ctx, 1);
    expect(e.corrodedStacks).toBe(1);
    untilHits(state, ctx, 8);
    expect(e.corrodedStacks).toBe(LINK_CORRODED_MAX_STACKS);
    e.corrodedStacks = 8;
    untilHits(state, ctx, 1);
    expect(e.corrodedStacks).toBe(8);
  });

  it("a plain link Corroded never lifts or adds Corrosive Kiss's shield slow", () => {
    const e = spawn(world().state, SHIELDED, { dist: 2 });
    applyLinkCorroded(e, 1);
    expect([e.corrodedStacks, e.corrodedShieldMul]).toEqual([1, 1]);
    e.corrodedShieldMul = 0.5;
    applyLinkCorroded(e, 1);
    expect([e.corrodedStacks, e.corrodedShieldMul]).toEqual([2, 0.5]);
  });

  it('an unlinked Thumper corrodes nothing', () => {
    const { state, ctx } = world();
    build(state, 'thumper', 1, 4, 2);
    const e = spawn(state, TANK, { dist: 6 });
    untilHits(state, ctx, 2);
    expect(e.corrodedStacks).toBe(0);
  });
});

/** Damage a Rivet T1 on (1,1) deals an armor-8 unit in 20 s, with or without a Gloop beside. */
function rivetDamage(withGloop: boolean): number {
  const { state, ctx } = world();
  build(state, 'rivet', 1, 1, 1);
  if (withGloop) build(state, 'gloop', 1, 3, 1);
  spawn(state, enemyDef('fx_plate', { hp: 100_000, armor: 8, speedTilesPerTick: 0 }), { dist: 2 });
  let rivetHits = 0;
  for (let i = 0; i < 20 * 60; i++) {
    state.events.length = 0;
    tick(state, ctx);
    // Only count the Rivet's damage: hitscan hits land as ProjectileHit with uid 0.
    for (const h of ofType(state, 'ProjectileHit')) if (h.uid === 0) rivetHits += h.damage;
  }
  return rivetHits;
}

describe('the probe: Gloop answers armor and splash (towers.md § 2; enemies.md § 3.1)', () => {
  it("its Corroded more than doubles a Rivet's damage on heavy armor", () => {
    const alone = rivetDamage(false);
    const beside = rivetDamage(true);
    expect(alone).toBeGreaterThan(0);
    expect(beside / alone).toBeGreaterThan(2);
  });

  it('one glob hits a whole clump', () => {
    const { state, ctx } = world();
    build(state, 'gloop', 1);
    const clump = [0, 0.3, 0.6].map((d) => spawn(state, TANK, { dist: 2 + d }));
    untilHits(state, ctx, 1);
    for (const u of clump) expect(u.corrodedStacks).toBe(1);
  });
});

describe('determinism (sim integration)', () => {
  it('a Big Glorp run on A1M3 leaves puddles and replays to the same hash', () => {
    const cfg: SimConfig<IdSpace> = {
      content: LIVE,
      mapId: 'a1_m03',
      seed: 11,
      loadout: ['gloop', 'thumper', 'skyhook', 'rivet'],
      companion: null,
      modifiers: [{ kind: 'economy', stat: 'startCredits', flat: 5000, source: 'test' }],
      difficulty: 'standard',
      abilities: { slot1: 'orbital_strike', slot2: null, slot2State: 'none' },
      scriptFlags: {},
      specsUnlocked: ['gloop'],
    };
    const run = (): { hash: string; puddles: number; linked: boolean } => {
      const sim = createSim(cfg);
      const plan = [
        ['gloop', [4, 4]],
        ['gloop', [7, 5]],
        ['thumper', [8, 4]], // beside the second Gloop: Acid Rain
      ] as const;
      for (const [tower, tile] of plan) sim.enqueue({ type: 'build', tile, tower });
      sim.enqueue({ type: 'callWave' });
      let spawned = 0;
      let linked = false;
      for (let i = 0; i < 60 * 90 && sim.state.outcome === 'playing'; i++) {
        sim.step();
        for (const t of sim.state.towers.items) {
          if (!t.alive || t.def?.id !== 'gloop' || t.spec !== null) continue;
          if (t.builtTick !== sim.state.tick - 1) continue;
          sim.enqueue({ type: 'upgrade', towerUid: t.uid });
          sim.enqueue({ type: 'upgrade', towerUid: t.uid });
          sim.enqueue({ type: 'specialize', towerUid: t.uid, spec: 'a' });
        }
        for (const e of sim.state.events) {
          if (e.type === 'PuddleSpawned') spawned++;
          if (e.type === 'CommandRejected') throw new Error(JSON.stringify(e));
          if (e.type === 'LinkFormed') linked = true;
        }
      }
      return { hash: sim.hash(), puddles: spawned, linked };
    };
    const a = run();
    expect(a.puddles).toBeGreaterThan(0);
    expect(a.linked).toBe(true);
    expect(run()).toEqual(a);
  });
});
