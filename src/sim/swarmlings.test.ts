// T604: the Scuttle Den (design/towers.md § 7; sim/swarmlings.ts) and Bramble's Underfoot
// (core-loop.md § 3.2; sim/abilities/underfoot.ts). The Den: swarmlings at home, the dash, the
// latch (a DoT that bypasses armor, reaching burrowed units), the chill stacking to 30%, the rest,
// the spread, Brave Hearts' Champions on flyers, hold fire, a sale, the spare rule, and its links
// (Splash Zone, Finders Keepers). Underfoot: Pinned 1 s and 30 Kinetic once per enemy per trap,
// burrowed reached, flyers never, 6 s, a path tile only. dev_den end to end (determinism, a replay
// of the command log) is render/__fixtures__/devDen.test.ts.
// fx_map's road `a` runs (0,0) → (2,0) → (2,3) → (3,3) → (3,4) → (5,4); route distance d sits on
// tile d's centre, so (2,1) is distance 3. A Den at (3,1) reaches it 1 tile away (range 2.5).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent, CompiledEnemyDef } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { SWARMLING_CHILL_CAP } from '../content/rules.ts';
import type { IdSpace } from '../content/types.ts';
import {
  enemyDef,
  GUN,
  MAP,
  placeTower,
  setup as setupFixture,
  spawn,
} from './__fixtures__/combat.ts';
import { FIXTURE_CONTENT } from './__fixtures__/sim.ts';
import type { Ally, Tower } from './entities.ts';
import { placeOnRoute } from './path.ts';
import type { SimEvent } from './events.ts';
import { poolKill } from './pool.ts';
import type { SimState } from './state.ts';
import { SWARM_DASH_TILES_PER_SEC, swarmSpread } from './swarmlings.ts';
import { applyAbilityCommand } from './systems/abilities.ts';
import { runTick, SYSTEMS, type TickContext } from './tick.ts';

const LIVE = compileContent(RAW_CONTENT);
const DEN = LIVE.towers.burrow;
const [T1, , T3] = DEN.tiers;
const BIG_FAMILY = DEN.specs!.a;
const BRAVE_HEARTS = DEN.specs!.b;

/** The fixture content with the live Den, Sprinkler, Crane, links, and Underfoot. */
const CONTENT: CompiledContent<IdSpace> = {
  ...FIXTURE_CONTENT,
  towers: {
    ...FIXTURE_CONTENT.towers,
    burrow: DEN,
    sprinkler: LIVE.towers.sprinkler,
    crane: LIVE.towers.crane,
  },
  abilities: { ...FIXTURE_CONTENT.abilities, underfoot: LIVE.abilities.underfoot },
  links: LIVE.links,
};

/** A slow, sturdy, armored walker that stands still (speed 0): the latch's numbers show plainly. */
const POST: CompiledEnemyDef = enemyDef('fx_post', { hp: 1000, armor: 5, speedTilesPerTick: 0 });
const TANK: CompiledEnemyDef = enemyDef('fx_tank', { hp: 1000, armor: 5 });
const FLYER: CompiledEnemyDef = enemyDef('fx_flyer', {
  hp: 1000,
  layer: 'air',
  speedTilesPerTick: 0,
});

/** Every system but the waves (enemies are placed by hand) and the script. */
const RUN = SYSTEMS.filter(
  (s) => s.name !== 'waves' && s.name !== 'rifts' && s.name !== 'triggers',
);

function setup(): { state: SimState; ctx: TickContext } {
  const s = setupFixture({
    content: CONTENT,
    companion: 'bramble',
    abilities: { slot1: null, slot2: 'underfoot', slot2State: 'present' },
  });
  return { state: s.state, ctx: { ...s.ctx, content: CONTENT } };
}

function run(state: SimState, ctx: TickContext, ticks: number): void {
  for (let i = 0; i < ticks; i++) runTick(state, ctx, RUN);
}

/** Runs until `done` holds (at most `max` ticks); returns the ticks it took. */
function runUntil(state: SimState, ctx: TickContext, done: () => boolean, max = 2000): number {
  for (let i = 0; i < max; i++) {
    if (done()) return i;
    runTick(state, ctx, RUN);
  }
  throw new Error(`not done after ${max} ticks`);
}

/** The damage a T1 Den's three swarmlings deal over one whole latch on a unit, burrowed or not. */
function wholeLatch(burrowed: boolean): number {
  const { state, ctx } = setup();
  const t = den(state);
  const e = spawn(state, POST, { dist: 3 });
  e.burrowed = burrowed;
  runUntil(state, ctx, () => allIn(state, t, 'latched'));
  runUntil(state, ctx, () => allIn(state, t, 'back'));
  return 1000 - e.hp;
}

function den(state: SimState, col = 3, row = 1, tier: number | typeof T1 = 1): Tower {
  const t = placeTower(state, DEN, col, row, tier);
  state.linksDirty = true;
  return t;
}

function swarm(state: SimState, owner?: Tower): Ally[] {
  return state.allies.items.filter(
    (a) => a.alive && a.mode === 'owner' && (owner === undefined || a.ownerUid === owner.uid),
  );
}

/** Whether `t` has a family and every one of it is in `step`. */
function allIn(state: SimState, t: Tower, step: Ally['swarmState']): boolean {
  const family = swarm(state, t);
  return family.length > 0 && family.every((a) => a.swarmState === step);
}

type Ev = SimEvent<IdSpace>;
function events<T extends Ev['type']>(state: SimState, type: T): Extract<Ev, { type: T }>[] {
  return state.events.filter((e): e is Extract<Ev, { type: T }> => e.type === type);
}

describe('the Scuttle Den (towers.md § 7; T604)', () => {
  it('has the doc numbers: 3 → 4 swarmlings, 8/s and a 5 s latch at T3; Big Family 7; Brave Hearts 3 Champions', () => {
    expect(T1.cost).toBe(140);
    expect(T1.attack).toMatchObject({
      kind: 'spawner',
      ally: 'swarmling',
      maxAlive: 3,
      damage: 5,
      rangeTiles: 2.5,
      latchTicks: 240,
      restTicks: 180,
      chillPct: 0.1,
      cooldownTicks: 15,
    });
    expect(DEN.tiers[1].attack).toMatchObject({ maxAlive: 4 });
    expect(T3.attack).toMatchObject({ maxAlive: 4, damage: 8, latchTicks: 300 });
    expect(BIG_FAMILY.attack).toMatchObject({ ally: 'swarmling', maxAlive: 7 });
    expect(BRAVE_HEARTS.attack).toMatchObject({
      ally: 'champion',
      maxAlive: 3,
      damage: 20,
      chillPct: 0.15,
    });
    expect(BRAVE_HEARTS.targets).toEqual({ ground: true, air: true });
    expect(swarmSpread(0.1)).toBe(3);
    expect(swarmSpread(0.15)).toBe(2);
  });

  it('keeps its family at home, ready, and counts them', () => {
    const { state, ctx } = setup();
    const t = den(state);
    run(state, ctx, 1);
    const family = swarm(state, t);
    expect(family).toHaveLength(3);
    expect(t.swarmAlive).toBe(3);
    for (const a of family) {
      expect(a).toMatchObject({ kind: 'swarmling', swarmState: 'home', x: 3.5, y: 1.5, damage: 0 });
    }
  });

  it('dashes to the First unit in range, latches, and lands a DoT that bypasses armor', () => {
    const { state, ctx } = setup();
    const t = den(state);
    const e = spawn(state, POST, { dist: 3 }); // (2.5, 1.5): 1 tile from the Den
    run(state, ctx, 1);
    expect(swarm(state, t).every((a) => a.swarmState === 'out' && a.targetUid === e.uid)).toBe(
      true,
    );
    // 1 tile at 4 tiles/s: 15 ticks.
    const took = runUntil(state, ctx, () => allIn(state, t, 'latched'));
    expect(took).toBe(Math.ceil(60 / SWARM_DASH_TILES_PER_SEC));
    expect(events(state, 'SwarmLatch').filter((x) => x.on)).toHaveLength(3);
    expect(e.latchCount).toBe(3);
    // The whole latch: 4 s of 1.25 a DoT tick (5/s), 16 ticks each, armor 5 bypassed.
    runUntil(state, ctx, () => allIn(state, t, 'back'));
    expect(1000 - e.hp).toBeCloseTo(3 * 16 * 1.25, 9);
    expect(t.firstFiredTick).toBeGreaterThanOrEqual(0);
  });

  it('stacks its chill to 30% (one source), and a stronger chill wins', () => {
    const { state, ctx } = setup();
    const t = den(state, 3, 1, BIG_FAMILY);
    const a = spawn(state, POST, { dist: 3 });
    const b = spawn(state, POST, { dist: 2 }); // (2.5, 0.5): behind a, in range too
    runUntil(
      state,
      ctx,
      () => swarm(state, t).filter((s) => s.swarmState === 'latched').length === 7,
    );
    // The First (a) takes the spread (3), the next 3 go to b, the last back to the First.
    expect(a.latchCount).toBe(4);
    expect(b.latchCount).toBe(3);
    expect(a.swarmChillPct).toBe(SWARMLING_CHILL_CAP);
    expect(a.chillPct).toBe(SWARMLING_CHILL_CAP);
    expect(b.chillPct).toBeCloseTo(0.3, 9);
    // A stronger chill (a 50% from a Pin's boss conversion, say) beats the swarm's.
    a.chillPct = 0.5;
    a.chillTicks = 30;
    run(state, ctx, 1);
    expect(a.chillPct).toBe(0.5);
  });

  it('lets go when the latch runs out, runs home, chirps, and rests 3 s', () => {
    const { state, ctx } = setup();
    const t = den(state);
    spawn(state, POST, { dist: 3 });
    runUntil(state, ctx, () => allIn(state, t, 'latched'));
    const latchedAt = state.tick;
    runUntil(state, ctx, () => allIn(state, t, 'back'));
    // The latch tick and 239 more: 240 passes on, 4 s.
    expect(state.tick - latchedAt).toBe(239);
    expect(events(state, 'SwarmLatch').filter((x) => !x.on)).toHaveLength(3);
    runUntil(state, ctx, () => allIn(state, t, 'home'));
    expect(events(state, 'SwarmHome')).toHaveLength(3);
    expect(swarm(state, t).map((a) => a.swarmTicks)).toEqual([180, 180, 180]);
    const homeAt = state.tick;
    runUntil(state, ctx, () => allIn(state, t, 'out'));
    expect(state.tick - homeAt).toBe(180);
  });

  it('follows a unit underground (burrowed), where a tower can’t reach', () => {
    const { state, ctx } = setup();
    const t = den(state);
    const gun = placeTower(state, GUN, 1, 1);
    const e = spawn(state, POST, { dist: 3 });
    e.burrowed = true;
    runUntil(state, ctx, () => allIn(state, t, 'latched'));
    run(state, ctx, 60);
    expect(e.burrowed).toBe(true);
    expect(e.hp).toBeLessThan(1000);
    expect(gun.targetUid).toBe(0);
    // But never a Phased, leaving, or cloaked-out one: it lets go.
    e.phased = true;
    run(state, ctx, 1);
    expect(allIn(state, t, 'back')).toBe(true);
  });

  it('deals ×burrowedDotMul on a burrowed target, the plain DoT on a surfaced one (T622)', () => {
    const attack = T1.attack;
    const mul = attack?.kind === 'spawner' ? attack.burrowedDotMul : 0;
    expect(mul).toBe(2.5);
    // The whole latch: 3 swarmlings × 16 DoT ticks × 1.25, then × 2.5 underground.
    expect(wholeLatch(false)).toBeCloseTo(3 * 16 * 1.25, 9);
    expect(wholeLatch(true)).toBeCloseTo(3 * 16 * 1.25 * mul, 9);
  });

  it('leaves flyers alone, but Brave Hearts’ Champions leap onto them', () => {
    const { state, ctx } = setup();
    const t = den(state);
    const sky = MAP.routes.sky!;
    const f = spawn(state, FLYER, { route: sky, dist: 0.5 });
    run(state, ctx, 30);
    expect(allIn(state, t, 'home')).toBe(true);
    // Brave Hearts: the swarmlings go in for good, three Champions come out for the flyer.
    t.tierDef = BRAVE_HEARTS;
    t.tier = 4;
    t.spec = 'b';
    runUntil(
      state,
      ctx,
      () => swarm(state, t).filter((a) => a.swarmState === 'latched').length === 3,
    );
    const family = swarm(state, t);
    expect(family.map((a) => a.kind)).toEqual(['champion', 'champion', 'champion']);
    expect(t.swarmAlive).toBe(3);
    expect(f.latchCount).toBe(3);
    // Two Champions' 15% stack to the 30% cap.
    expect(f.chillPct).toBeCloseTo(0.3, 9);
    run(state, ctx, 15);
    expect(1000 - f.hp).toBeCloseTo(3 * 2 * 20 * 0.25, 9);
  });

  it('stays in while its Den holds fire; latched ones let go', () => {
    const { state, ctx } = setup();
    const t = den(state);
    spawn(state, POST, { dist: 3 });
    runUntil(state, ctx, () => allIn(state, t, 'latched'));
    t.holdFire = true;
    run(state, ctx, 1);
    expect(allIn(state, t, 'back')).toBe(true);
    run(state, ctx, 400);
    expect(allIn(state, t, 'home')).toBe(true);
  });

  it('a sold Den calls its family in at once', () => {
    const { state, ctx } = setup();
    const t = den(state);
    spawn(state, POST, { dist: 3 });
    runUntil(state, ctx, () => allIn(state, t, 'latched'));
    poolKill(state.towers, t);
    run(state, ctx, 1);
    expect(swarm(state)).toHaveLength(0);
    expect(events(state, 'SwarmHome')).toHaveLength(3);
  });

  it('never targets a spared unit (youngling, quiet wave, fleeing; D005)', () => {
    const { state, ctx } = setup();
    const t = den(state);
    spawn(state, POST, { dist: 3, tags: ['youngling'] });
    run(state, ctx, 30);
    expect(allIn(state, t, 'home')).toBe(true);
  });

  it('drops a runner past its leash and goes home', () => {
    const { state, ctx } = setup();
    const t = den(state, 1, 3); // (1.5, 3.5): the road's (2,3) is 1 tile away
    const e = spawn(state, TANK, { dist: 5 });
    run(state, ctx, 1);
    expect(swarm(state, t)[0]?.targetUid).toBe(e.uid);
    // It blinks far down the road, past range + leash (4 tiles): the dash gives up on it.
    placeOnRoute(e, e.route!, 9);
    run(state, ctx, 1);
    expect(allIn(state, t, 'back')).toBe(true);
  });

  it('Splash Zone: swarmlings 30% faster and 1 s longer on; the Sprinkler +0.3 radius', () => {
    const { state, ctx } = setup();
    const t = den(state);
    const s = placeTower(state, LIVE.towers.sprinkler, 4, 2);
    state.linksDirty = true;
    spawn(state, POST, { dist: 3 });
    run(state, ctx, 1);
    expect(t.linkLatchTicks).toBe(60);
    expect(t.linkSwarmSpeedPct).toBeCloseTo(0.3, 9);
    expect(s.flatRange).toBeCloseTo(0.3, 9);
    const took = runUntil(state, ctx, () => allIn(state, t, 'latched'));
    expect(took).toBe(12); // 1 tile at 5.2 tiles/s: 12 steps
    const at = state.tick;
    runUntil(state, ctx, () => allIn(state, t, 'back'));
    expect(state.tick - at).toBe(299);
  });

  it('Finders Keepers: one more swarmling, and +1 credit per swarmling kill', () => {
    const { state, ctx } = setup();
    const t = den(state);
    placeTower(state, LIVE.towers.crane, 4, 2);
    state.linksDirty = true;
    run(state, ctx, 1);
    expect(t.linkSwarmlings).toBe(1);
    expect(t.linkKillCredits).toBe(1);
    expect(swarm(state, t)).toHaveLength(4);
    expect(t.swarmAlive).toBe(4);
    const e = spawn(state, enemyDef('fx_frail', { hp: 2, speedTilesPerTick: 0 }), { dist: 3 });
    runUntil(state, ctx, () => !e.alive);
    expect(events(state, 'EnemyDied')[0]?.killer).toEqual({ kind: 'tower', uid: t.uid });
    expect(events(state, 'TowerIncome').filter((x) => x.towerUid === t.uid)).toMatchObject([
      { credits: 1, kind: 'kill' },
    ]);
    // The link breaks: the fourth goes in for good when it next gets home.
    poolKill(
      state.towers,
      state.towers.items.find((x) => x.alive && x.def?.id === 'crane')!,
    );
    state.linksDirty = true;
    run(state, ctx, 400);
    expect(swarm(state, t)).toHaveLength(3);
  });
});

/** Casts slot 2 (Underfoot) at `tile`, as the `ability` command does. */
function cast(state: SimState, ctx: TickContext, tile: readonly [number, number]) {
  return applyAbilityCommand(state, ctx, { type: 'ability', slot: 2, target: [tile[0], tile[1]] });
}

describe('Underfoot (core-loop.md § 3.2; T604)', () => {
  it('opens a 6 s trap on a path tile only; off the road it is rejected with no cooldown', () => {
    const { state, ctx } = setup();
    expect(cast(state, ctx, [1, 1])).toBe('invalidTarget');
    expect(state.abilityCooldownTicks[1]).toBe(0);
    expect(cast(state, ctx, [2, 1])).toBeNull();
    const z = state.zones.items.find((x) => x.alive && x.kind === 'trap')!;
    expect(z).toMatchObject({ x: 2.5, y: 1.5, ticksLeft: 360, damage: 30, pinTicks: 60 });
    expect(state.abilityCooldownTicks[1]).toBe(3000);
    run(state, ctx, 359);
    expect(z.alive).toBe(true);
    run(state, ctx, 1);
    expect(z.alive).toBe(false);
  });

  it('pins each ground unit that crosses it 1 s and hits it for 30 Kinetic, once per trap', () => {
    const { state, ctx } = setup();
    cast(state, ctx, [2, 1]);
    const e = spawn(state, TANK, { dist: 2 }); // walks onto (2,1) at distance 2.5
    runUntil(state, ctx, () => e.pinnedTicks > 0);
    expect(events(state, 'TrapSprung')).toMatchObject([{ enemyUid: e.uid }]);
    // Plain armor: 30 − 5.
    expect(1000 - e.hp).toBe(25);
    expect(e.pinnedTicks).toBe(60);
    expect(state.trapSprung).toHaveLength(2);
    // Held on the tile, then walks off; it never springs twice.
    run(state, ctx, 200);
    expect(events(state, 'TrapSprung')).toHaveLength(1);
    expect(e.dist).toBeGreaterThan(3.5);
    run(state, ctx, 300);
    expect(state.trapSprung).toEqual([]);
  });

  it('reaches burrowed units, never flyers', () => {
    const { state, ctx } = setup();
    cast(state, ctx, [2, 0]);
    const under = spawn(state, TANK, { dist: 1.6 });
    under.burrowed = true;
    const over = spawn(state, FLYER, { route: MAP.routes.sky!, dist: 0 }); // (2.5, 0.5), on the tile
    run(state, ctx, 30);
    expect(events(state, 'TrapSprung').map((x) => x.enemyUid)).toEqual([under.uid]);
    expect(under.hp).toBe(975);
    expect(over.hp).toBe(1000);
    expect(over.pinnedTicks).toBe(0);
  });
});
