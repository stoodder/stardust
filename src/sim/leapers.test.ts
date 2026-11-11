// T704: the Sproing Pad (design/towers.md § 7; sim/leapers.ts) from its live data: its tiers and
// specs, its leapers from the swarmling pool (the family, the period, the pick: flyers first, then
// Lookie Here's Marked, then a free unit, then First), the bonk and Big Bonk's splash, the Pin that
// grounds a flyer (ground towers hit it; a flying boss is Chilled 50% instead; a ground unit isn't
// Pinned), a Jammed or holding pad calling its leapers home, a sale, its links (Lookie Here, Bounce
// Chorus), its tune-up row, determinism on a real map, and a probe that it answers air the way
// towers.md says: it hits flyers itself, and it grounds them for a ground-only Thumper.
// fx_map's road `a` runs (0,0) → (2,0) → (2,3) → (3,3) → (3,4) → (5,4); route distance d sits on
// tile d's centre, so (2,1) is distance 3. A pad at (3,1) stands at (3.5, 1.5), 1 tile from it.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent, CompiledEnemyDef, CompiledTier } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { BOSS_CONVERTED_CHILL } from '../content/rules.ts';
import { STUB_TOWER_TASKS, TOWERS } from '../content/towers/index.ts';
import type { IdSpace } from '../content/types.ts';
import { UPGRADES } from '../content/upgrades/index.ts';
import { enemyDef, placeTower, setup, spawn } from './__fixtures__/combat.ts';
import { canHit } from './combat/targeting.ts';
import type { SimConfig } from './config.ts';
import type { Ally, Enemy, Tower } from './entities.ts';
import type { SimEvent } from './events.ts';
import { FEATURE_GATES, gateRefusals, towerRefusal } from './gates.ts';
import { isLeaper, LEAP_TILES_PER_SEC, leapers } from './leapers.ts';
import { poolKill } from './pool.ts';
import { createSim } from './sim.ts';
import type { SimState } from './state.ts';
import { swarmlings } from './swarmlings.ts';
import { links } from './systems/links.ts';
import { projectiles } from './systems/projectiles.ts';
import { status } from './systems/status.ts';
import { towers } from './systems/towers.ts';
import type { TickContext } from './tick.ts';

const LIVE: CompiledContent<IdSpace> = compileContent(RAW_CONTENT);
const PAD = LIVE.towers.sproing!;
const [T1, T2, T3] = PAD.tiers;
const SKY_BOUNCERS: CompiledTier = PAD.specs!.a;
const BIG_BONK: CompiledTier = PAD.specs!.b;

/** Still, tough units (speed 0): a walker, a flyer, a flying boss. */
const POST = enemyDef('fx_post', { hp: 100_000, armor: 0, speedTilesPerTick: 0 });
const FLYER = enemyDef('fx_flyer', { hp: 100_000, layer: 'air', speedTilesPerTick: 0 });
const SKY_BOSS: CompiledEnemyDef = enemyDef('fx_sky_boss', {
  hp: 100_000,
  layer: 'air',
  speedTilesPerTick: 0,
  boss: LIVE.enemies.chitterbloom!.boss,
});

type Ev = SimEvent<IdSpace>;
const ofType = <T extends Ev['type']>(state: SimState, type: T): Extract<Ev, { type: T }>[] =>
  state.events.filter((e): e is Extract<Ev, { type: T }> => e.type === type);

function world(over: Partial<SimConfig<IdSpace>> = {}): { state: SimState; ctx: TickContext } {
  const { state, ctx } = setup(over);
  return { state, ctx: { ...ctx, content: LIVE } };
}

function build(
  state: SimState,
  id: string,
  tier: number | CompiledTier = 1,
  col = 3,
  row = 1,
): Tower {
  const t = placeTower(state, LIVE.towers[id]!, col, row, tier);
  if (typeof tier !== 'number') {
    t.tier = 4;
    t.spec = tier === SKY_BOUNCERS ? 'a' : 'b';
  }
  state.linksDirty = true;
  return t;
}

/** One tick of what a bonk needs, in tick order: status, links, towers, swarmlings, leapers. */
function tick(state: SimState, ctx: TickContext): void {
  status(state);
  links(state, ctx);
  towers(state, ctx);
  swarmlings(state, ctx);
  leapers(state, ctx);
  projectiles(state, ctx);
  state.tick++;
}

/** Runs ticks (clearing events each tick) until `done`, at most `max`; returns the events seen. */
function runUntil(
  state: SimState,
  ctx: TickContext,
  done: (seen: Ev[]) => boolean,
  max = 60 * 30,
): Ev[] {
  const seen: Ev[] = [];
  for (let i = 0; i < max; i++) {
    state.events.length = 0;
    tick(state, ctx);
    seen.push(...state.events);
    if (done(seen)) return seen;
  }
  throw new Error(`not done after ${max} ticks`);
}

const bonks = (seen: readonly Ev[]): Extract<Ev, { type: 'LeaperBonk' }>[] =>
  seen.filter((e): e is Extract<Ev, { type: 'LeaperBonk' }> => e.type === 'LeaperBonk');

function leapersOf(state: SimState, pad?: Tower): Ally[] {
  return state.allies.items.filter(
    (a) => isLeaper(a) && (pad === undefined || a.ownerUid === pad.uid),
  );
}

const lost = (e: Enemy): number => e.def!.hp - e.hp;

describe('the Sproing Pad (towers.md § 7): numbers and gates', () => {
  it('compiles the tiers and specs as designed', () => {
    expect(PAD.tiers.map((t) => t.cost)).toEqual([130, 105, 195]);
    expect(T1.attack).toMatchObject({
      kind: 'leaper',
      type: 'kinetic',
      damage: 25,
      cooldownTicks: 120, // 0.5 leaps/s
      rangeTiles: 3,
      leapers: 1,
      pinTicks: 90,
      splashTiles: 0,
    });
    expect(T1.targets).toEqual({ ground: true, air: true });
    expect(T2.attack).toMatchObject({ damage: 35, pinTicks: 90, cooldownTicks: 120 });
    expect(T3.attack).toMatchObject({ damage: 35, pinTicks: 120, cooldownTicks: 100 });
    expect([SKY_BOUNCERS.cost, BIG_BONK.cost]).toEqual([390, 390]);
    expect(SKY_BOUNCERS.attack).toMatchObject({ leapers: 2, damage: 35, splashTiles: 0 });
    expect(BIG_BONK.attack).toMatchObject({ leapers: 1, damage: 90, splashTiles: 0.8 });
    expect(PAD.links).toEqual(['lookie_here', 'bounce_chorus']);
  });

  it('is simulated: no stub entry, `attack.leaper` lifted, a loadout with it runs', () => {
    expect(STUB_TOWER_TASKS).not.toHaveProperty('sproing');
    expect(FEATURE_GATES['attack.leaper']).toBeNull();
    expect(towerRefusal(TOWERS.sproing)).toBeNull();
    const cfg: SimConfig<IdSpace> = {
      ...setup().ctx.config,
      content: LIVE,
      mapId: 'a1_m03',
      loadout: ['sproing', 'thumper', 'skyhook', 'rivet'],
      specsUnlocked: ['sproing'],
    };
    expect(gateRefusals(cfg)).toEqual([]);
  });

  it('has the usual tune-up, stocked after A3M4 with the gift (progression.md § 4.2)', () => {
    const u = UPGRADES.tune_sproing;
    expect(u).toMatchObject({ kind: 'shop', currency: 'stardust', availableAfter: 'a3_m04' });
    expect(u.ranks.map((r) => [r.price, r.grants])).toEqual([
      [40, [{ kind: 'towerStat', tower: 'sproing', stat: 'damage', pct: 0.05 }]],
      [80, [{ kind: 'towerCost', tower: 'sproing', tiers: 'all', pct: -0.05 }]],
      [140, [{ kind: 'towerStat', tower: 'sproing', stat: 'range', pct: 0.05 }]],
    ]);
  });
});

describe('leapers from the swarmling pool', () => {
  it('one at home on a new pad (two for Sky Bouncers), owner allies of kind leaper', () => {
    const { state, ctx } = world();
    const pad = build(state, 'sproing');
    tick(state, ctx);
    const [a] = leapersOf(state, pad);
    expect(leapersOf(state, pad)).toHaveLength(1);
    expect(a).toMatchObject({ kind: 'leaper', mode: 'owner', vulnerability: 'never', damage: 0 });
    expect(a).toMatchObject({ swarmState: 'home', x: pad.x, y: pad.y });
    expect(pad.swarmAlive).toBe(1);
    // Taking Sky Bouncers adds the second at home.
    pad.tierDef = SKY_BOUNCERS;
    pad.tier = 4;
    pad.spec = 'a';
    tick(state, ctx);
    expect(leapersOf(state, pad)).toHaveLength(2);
    expect(pad.swarmAlive).toBe(2);
  });

  it('share the pool with a Den: neither pass takes the other’s allies', () => {
    const { state, ctx } = world();
    const den = build(state, 'burrow', 1, 1, 1);
    const pad = build(state, 'sproing');
    spawn(state, POST, { dist: 3 });
    for (let i = 0; i < 120; i++) tick(state, ctx);
    expect(leapersOf(state, pad)).toHaveLength(1);
    const swarm = state.allies.items.filter((a) => a.alive && a.ownerUid === den.uid);
    expect(swarm).toHaveLength(3);
    expect(swarm.every((a) => a.kind === 'swarmling')).toBe(true);
    expect(den.swarmAlive).toBe(3);
  });

  it('a sold pad’s leapers go in at once, wherever they are', () => {
    const { state, ctx } = world();
    const pad = build(state, 'sproing');
    spawn(state, FLYER, { dist: 3 });
    tick(state, ctx);
    expect(leapersOf(state, pad)[0]?.swarmState).toBe('out');
    poolKill(state.towers, pad);
    tick(state, ctx);
    expect(leapersOf(state)).toEqual([]);
    expect(state.allies.live).toBe(0);
  });

  it('each leaper leaps once a period (2 s at T1, 1.67 s at T3), boinging out and back', () => {
    for (const [tier, period] of [
      [1, 120],
      [3, 100],
    ] as const) {
      const { state, ctx } = world();
      build(state, 'sproing', tier);
      spawn(state, FLYER, { dist: 3 });
      const ticks: number[] = [];
      for (let k = 0; k < period * 3 + 30; k++) {
        state.events.length = 0;
        tick(state, ctx);
        if (ofType(state, 'LeaperBonk').length > 0) ticks.push(k);
      }
      // The bonks land one period apart: the trip (1 tile out and back) is far shorter.
      expect(ticks.length, `T${tier}`).toBeGreaterThanOrEqual(3);
      expect(ticks[1]! - ticks[0]!).toBe(period);
      expect(ticks[2]! - ticks[1]!).toBe(period);
      // 1 tile at LEAP_TILES_PER_SEC: the first bonk lands within the trip's ticks.
      expect(ticks[0]!).toBeLessThanOrEqual(Math.ceil(60 / LEAP_TILES_PER_SEC));
    }
  });
});

describe('the pick: flyers first, then Marked (Lookie Here), then free, then First', () => {
  it('always prefers a flyer in range, even behind a ground unit nearer the core', () => {
    const { state, ctx } = world();
    build(state, 'sproing');
    spawn(state, POST, { dist: 4 }); // First
    const f = spawn(state, FLYER, { dist: 3 });
    tick(state, ctx);
    expect(leapersOf(state)[0]?.targetUid).toBe(f.uid);
    // With no flyer, the First ground unit.
    const { state: s2, ctx: c2 } = world();
    build(s2, 'sproing');
    spawn(s2, POST, { dist: 3 });
    const first = spawn(s2, POST, { dist: 4 });
    tick(s2, c2);
    expect(leapersOf(s2)[0]?.targetUid).toBe(first.uid);
  });

  it('Sky Bouncers’ two spread over two flyers; none goes for a flyer already Pinned', () => {
    const { state, ctx } = world();
    build(state, 'sproing', SKY_BOUNCERS);
    const back = spawn(state, FLYER, { dist: 3 });
    const front = spawn(state, FLYER, { dist: 4 });
    tick(state, ctx);
    expect(leapersOf(state).map((a) => a.targetUid)).toEqual([front.uid, back.uid]);
    // A Pinned flyer is grounded already: the free one behind it is picked first.
    const { state: s2, ctx: c2 } = world();
    build(s2, 'sproing');
    const free = spawn(s2, FLYER, { dist: 3 });
    const pinned = spawn(s2, FLYER, { dist: 4 });
    pinned.pinnedTicks = 60;
    tick(s2, c2);
    expect(leapersOf(s2)[0]?.targetUid).toBe(free.uid);
  });

  it('never a neutral unit or one an ally never targets (D005)', () => {
    const { state, ctx } = world();
    build(state, 'sproing');
    spawn(state, FLYER, { dist: 4, tags: ['youngling'] });
    const ok = spawn(state, POST, { dist: 3 });
    tick(state, ctx);
    expect(leapersOf(state)[0]?.targetUid).toBe(ok.uid);
  });
});

describe('the bonk, Big Bonk, and the Pin (enemies.md § 2.4)', () => {
  it('bonks for the tier’s damage and Pins a flyer 1.5 s: grounded, so a ground tower may hit it', () => {
    const { state, ctx } = world();
    const pad = build(state, 'sproing');
    const f = spawn(state, FLYER, { dist: 3 });
    const ground = { ground: true, air: false };
    expect(canHit(f, ground)).toBe(false);
    const seen = runUntil(state, ctx, (s) => bonks(s).length > 0);
    expect(bonks(seen)).toEqual([{ type: 'LeaperBonk', tower: pad.uid, target: f.uid }]);
    expect(seen.filter((e) => e.type === 'FlyerGrounded')).toEqual([
      { type: 'FlyerGrounded', uid: f.uid, ticks: 90 },
    ]);
    expect(lost(f)).toBe(25);
    expect(f.pinnedTicks).toBe(90);
    expect(canHit(f, ground)).toBe(true);
    // Then it's back home, and the Pin lapses: the flyer is out of a ground tower's reach again.
    runUntil(state, ctx, () => leapersOf(state)[0]?.swarmState === 'home');
    for (let i = 0; i < 90; i++) tick(state, ctx);
    expect(f.pinnedTicks).toBe(0);
    expect(canHit(f, ground)).toBe(false);
  });

  it('a ground unit is bonked, not Pinned; a flying boss is Chilled 50% for the Pin instead', () => {
    const { state, ctx } = world();
    build(state, 'sproing');
    const walker = spawn(state, POST, { dist: 3 });
    const seen = runUntil(state, ctx, (s) => bonks(s).length > 0);
    expect(lost(walker)).toBe(25);
    expect(walker.pinnedTicks).toBe(0);
    expect(seen.some((e) => e.type === 'FlyerGrounded')).toBe(false);

    const { state: s2, ctx: c2 } = world();
    build(s2, 'sproing');
    const boss = spawn(s2, SKY_BOSS, { dist: 3 });
    const seen2 = runUntil(s2, c2, (s) => bonks(s).length > 0);
    expect(lost(boss)).toBe(25);
    expect(boss.pinnedTicks).toBe(0);
    expect(boss.chillPct).toBe(BOSS_CONVERTED_CHILL);
    expect(boss.chillTicks).toBe(90);
    expect(seen2.some((e) => e.type === 'FlyerGrounded')).toBe(false);
  });

  it('a Pin never stacks or extends: the next bonk during the Pin or its 1 s immunity grounds nothing', () => {
    const { state, ctx } = world();
    build(state, 'sproing', SKY_BOUNCERS);
    const f = spawn(state, FLYER, { dist: 3 });
    const seen = runUntil(state, ctx, (s) => bonks(s).length >= 2);
    // Both leapers land on the one flyer; only the first Pin lands (a spec keeps T3's 2 s).
    expect(seen.filter((e) => e.type === 'FlyerGrounded')).toHaveLength(1);
    expect(f.pinnedTicks).toBeLessThanOrEqual(120);
  });

  it('Big Bonk hits everyone within 0.8 tiles of its target for 90, and Pins only the target', () => {
    const { state, ctx } = world();
    build(state, 'sproing', BIG_BONK);
    const clump = [3, 3.3, 3.6].map((d) => spawn(state, POST, { dist: d }));
    const far = spawn(state, POST, { dist: 1 });
    const sky = spawn(state, FLYER, { dist: 3.2 }); // a flyer in the clump: the target
    runUntil(state, ctx, (s) => bonks(s).length > 0);
    for (const u of clump) expect(lost(u)).toBe(90);
    expect(lost(sky)).toBe(90);
    expect(lost(far)).toBe(0);
    expect(sky.pinnedTicks).toBe(120); // a spec keeps T3's 2 s Pin
    for (const u of clump) expect(u.pinnedTicks).toBe(0);
  });

  it('credits the pad with its kills', () => {
    const { state, ctx } = world();
    const pad = build(state, 'sproing');
    spawn(state, enemyDef('fx_frail', { hp: 10, layer: 'air', speedTilesPerTick: 0 }), {
      dist: 3,
    });
    const seen = runUntil(state, ctx, (s) => s.some((e) => e.type === 'EnemyDied'));
    const died = seen.find((e) => e.type === 'EnemyDied');
    expect(died).toMatchObject({ killer: { kind: 'tower', uid: pad.uid } });
  });
});

describe('fire control: a holding or Jammed pad calls its leapers home', () => {
  it('Jammed (a jammed tower holds fire): mid-leap it turns back, and none leaves until the jam ends', () => {
    const { state, ctx } = world();
    const pad = build(state, 'sproing');
    const f = spawn(state, FLYER, { dist: 3 });
    tick(state, ctx);
    const [a] = leapersOf(state);
    expect(a?.swarmState).toBe('out');
    pad.jamTicks = 240;
    tick(state, ctx);
    expect(a?.swarmState).toBe('back');
    for (let i = 0; i < 200; i++) {
      pad.jamTicks--;
      tick(state, ctx);
    }
    expect(a?.swarmState).toBe('home');
    expect(lost(f)).toBe(0);
    pad.jamTicks = 0;
    runUntil(state, ctx, (s) => bonks(s).length > 0);
    expect(lost(f)).toBe(25);
  });

  it('holding fire, it stays home', () => {
    const { state, ctx } = world();
    const pad = build(state, 'sproing');
    pad.holdFire = true;
    const f = spawn(state, FLYER, { dist: 3 });
    for (let i = 0; i < 300; i++) tick(state, ctx);
    expect(leapersOf(state)[0]?.swarmState).toBe('home');
    expect(lost(f)).toBe(0);
  });
});

describe('Lookie Here and Bounce Chorus (towers.md § 6.2)', () => {
  it('compile with their partners and numbers', () => {
    const lookie = LIVE.links.find((l) => l.id === 'lookie_here')!;
    const chorus = LIVE.links.find((l) => l.id === 'bounce_chorus')!;
    expect(
      lookie.partners.map((p) => [p.tower, p.flatRange, p.preferMarked, p.detectRadiusTiles]),
    ).toEqual([
      ['lantern', 0, false, 0.5],
      ['sproing', 0.5, true, 0],
    ]);
    expect(chorus.partners.map((p) => [p.tower, p.pinTicks, p.auraPct])).toEqual([
      ['sproing', 30, 0],
      ['choir', 0, 0.05],
    ]);
  });

  it('Lookie Here: the pad reaches 0.5 further and its leapers pick a Marked flyer first', () => {
    const { state, ctx } = world();
    const pad = build(state, 'sproing');
    const lantern = build(state, 'lantern', 1, 4, 2);
    lantern.holdFire = true; // its beam would Mark for itself; the Mark here is the test's
    spawn(state, FLYER, { dist: 4 }); // First, unmarked
    const marked = spawn(state, FLYER, { dist: 3 });
    marked.markTicks = 600;
    marked.markPct = 0.15;
    tick(state, ctx);
    expect(pad.flatRange).toBeCloseTo(0.5, 12);
    expect(pad.linkPreferMarked).toBe(true);
    expect(lantern.bonusDetectTiles).toBeCloseTo(0.5, 12);
    expect(leapersOf(state)[0]?.targetUid).toBe(marked.uid);
    // Unlinked, First wins.
    const { state: s2, ctx: c2 } = world();
    build(s2, 'sproing');
    const first = spawn(s2, FLYER, { dist: 4 });
    const m2 = spawn(s2, FLYER, { dist: 3 });
    m2.markTicks = 600;
    m2.markPct = 0.15;
    tick(s2, c2);
    expect(leapersOf(s2)[0]?.targetUid).toBe(first.uid);
  });

  it('Bounce Chorus: the Pin 0.5 s longer (+0.75 s under Linked Up), and the Choir’s aura +5%', () => {
    const { state, ctx } = world();
    const pad = build(state, 'sproing');
    const choir = build(state, 'choir', 1, 4, 2);
    const f = spawn(state, FLYER, { dist: 3 });
    const seen = runUntil(state, ctx, (s) => bonks(s).length > 0);
    expect(pad.linkPinTicks).toBe(30);
    expect(choir.linkAuraPct).toBeCloseTo(0.05, 12);
    expect(pad.pctDamage).toBeCloseTo(0.15, 12); // T1's +10% aura, +5%
    expect(seen.find((e) => e.type === 'FlyerGrounded')).toMatchObject({ ticks: 120 });
    expect(f.pinnedTicks).toBe(120);

    const { state: s2, ctx: c2 } = world({
      modifiers: [{ kind: 'linkBonus', pct: 0.5, source: 'test' }],
    });
    const pad2 = build(s2, 'sproing');
    build(s2, 'choir', 1, 4, 2);
    links(s2, c2);
    expect(pad2.linkPinTicks).toBe(45);
  });
});

/** What a ground-only Thumper on (1,3) deals a still flyer at dist 3 over 10 s, with or without a pad. */
function thumperOnFlyer(withPad: boolean): number {
  const { state, ctx } = world();
  const thumper = build(state, 'thumper', 1, 1, 3);
  if (withPad) build(state, 'sproing');
  spawn(state, FLYER, { dist: 3 });
  let byThumper = 0;
  for (let i = 0; i < 600; i++) {
    state.events.length = 0;
    tick(state, ctx);
    for (const e of ofType(state, 'ProjectileHit')) {
      if (e.towerUid === thumper.uid) byThumper += e.damage;
    }
  }
  return byThumper;
}

describe('the probe: the Sproing Pad answers air (towers.md § 2, § 7)', () => {
  it('it grounds flyers for a ground-only tower: a Thumper never touches one alone, and does beside it', () => {
    expect(LIVE.towers.thumper!.tiers[0].targets.air).toBe(false);
    expect(thumperOnFlyer(false)).toBe(0);
    expect(thumperOnFlyer(true)).toBeGreaterThan(0);
  });
});

describe('determinism (sim integration)', () => {
  it('a Sproing Pad run on A1M3 bonks Puffwings, grounds them, and replays to the same hash', () => {
    const cfg: SimConfig<IdSpace> = {
      content: LIVE,
      mapId: 'a1_m03',
      seed: 7,
      loadout: ['sproing', 'thumper', 'skyhook', 'rivet'],
      companion: null,
      modifiers: [{ kind: 'economy', stat: 'startCredits', flat: 5000, source: 'test' }],
      difficulty: 'standard',
      abilities: { slot1: 'orbital_strike', slot2: null, slot2State: 'none' },
      scriptFlags: {},
      specsUnlocked: ['sproing'],
    };
    const run = (): { hash: string; bonked: number; grounded: number } => {
      const sim = createSim(cfg);
      // Every buildable tile gets a pad (a1_m03's air lane crosses them), then the waves run
      // until three flyers have been grounded.
      const map = LIVE.maps.a1_m03!;
      for (let row = 0; row < map.rows; row++) {
        for (let col = 0; col < map.cols; col++) {
          if (!'o^+'.includes(map.tiles[row * map.cols + col]!)) continue;
          sim.enqueue({ type: 'build', tile: [col, row], tower: 'sproing' });
        }
      }
      sim.enqueue({ type: 'callWave' });
      let bonked = 0;
      let grounded = 0;
      for (let i = 0; i < 60 * 240 && sim.state.outcome === 'playing' && grounded < 3; i++) {
        sim.step();
        for (const e of sim.state.events) {
          if (e.type === 'LeaperBonk') bonked++;
          if (e.type === 'FlyerGrounded') grounded++;
        }
      }
      return { hash: sim.hash(), bonked, grounded };
    };
    const a = run();
    expect(a.bonked).toBeGreaterThan(0);
    expect(a.grounded).toBe(3);
    expect(run()).toEqual(a);
  });
});
