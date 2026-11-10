// Phasing (T503; enemyAbilities/phase.ts): the cycle in ticks (3.5 s solid, its last 0.5 s the
// tell, 1.5 s Phased, every 5 s), the Phased layer (no targeting, damage, or status; it moves and
// leaks), the interrupt (Stasis cancels the tell and restarts the cooldown; the hook is
// `isInterrupted`, which Unnerved joins with T507), Story scaling, and the lifted gate. Also the
// Fracture's two-level split (Fracture → 2 Shards → 2 Motes each), its bounties and leaks, and a
// whole-sim run with both units.
import { describe, expect, it } from 'vitest';
import type { CompiledContent, CompiledEffect, CompiledEnemyDef } from '../../content/compiled.ts';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import type { IdSpace } from '../../content/types.ts';
import { MAP, enemyDef, setup, spawn } from '../__fixtures__/combat.ts';
import { FIXTURE_CONTENT, fixtureConfig, type FixtureIds } from '../__fixtures__/sim.ts';
import { applyDamage, applyEffects } from '../combat/damage.ts';
import { canHit, pickTarget } from '../combat/targeting.ts';
import type { Enemy } from '../entities.ts';
import type { SimEvent } from '../events.ts';
import { gateRefusals } from '../gates.ts';
import { createSim } from '../sim.ts';
import type { SimState } from '../state.ts';
import { cleanup } from '../systems/cleanup.ts';
import { movement } from '../systems/movement.ts';
import { applyStasis, isInterrupted, status } from '../systems/status.ts';
import { scaledEnemy } from '../systems/waves.ts';
import type { TickContext } from '../tick.ts';
import { enemyAbilities, immune, untargetable } from './index.ts';
import { outOfReach } from './layers.ts';
import { phaseBlocked, phaseStep, phaseTelling, solidTicks } from './phase.ts';
import { restoreShields } from './pulse.ts';

const LIVE = compileContent(RAW_CONTENT);
const E = LIVE.enemies;
const MOTH = E.riftmoth;
const PHASE = MOTH.phase!; // the Rift Moth phases
const AIR = { ground: false, air: true } as const;
const BOTH = { ground: true, air: true } as const;
const SRC = { kind: 'ability', slot: 1 } as const;
const RANGE = { rangeSq: 100, minRangeSq: 0 };
const FREEZE: readonly CompiledEffect[] = [{ status: 'stasis', durationTicks: 60 }];

type Ev = SimEvent<IdSpace>;
function events<T extends Ev['type']>(state: SimState, type: T): Extract<Ev, { type: T }>[] {
  return state.events.filter((e): e is Extract<Ev, { type: T }> => e.type === type);
}

/** A bare state and a context whose content has the live enemies (for broods). */
function world(): { state: SimState; ctx: TickContext } {
  const { state, ctx } = setup();
  const content = Object.assign({}, ctx.content, { enemies: E });
  return { state, ctx: Object.assign({}, ctx, { content }) };
}

/** The integers a to b, inclusive. */
function range(a: number, b: number): number[] {
  return Array.from({ length: b - a + 1 }, (_, k) => a + k);
}

function live(state: SimState, id: string): Enemy[] {
  return state.enemies.items.filter((e) => e.alive && e.def?.id === id);
}

describe('the Rift Moth’s phase cycle', () => {
  it('compiles the roster row: 1.5 s Phased every 5 s after a 0.5 s tell (60 Hz ticks)', () => {
    expect(PHASE).toEqual({ everyTicks: 300, durationTicks: 90, tellTicks: 30 });
    expect(solidTicks(PHASE)).toBe(210);
    expect(MOTH).toMatchObject({ hp: 120, armor: 0, leak: 1, bounty: 10, layer: 'air' });
    expect(MOTH.tells).toContain('phasing');
  });

  it('is solid 3.5 s from spawn (the last 0.5 s the tell), Phased 1.5 s, then again every 5 s', () => {
    const { state, ctx } = setup();
    const e = spawn(state, MOTH, { dist: 0 });
    const phased: number[] = [];
    const telling: number[] = [];
    for (let i = 0; i < 800; i++) {
      enemyAbilities(state, ctx);
      if (e.phased) phased.push(i);
      if (phaseTelling(e, PHASE)) telling.push(i);
    }
    // The first visit is the spawn tick (i = 0): the tell runs 180–209, Phased 210–299, and so on.
    expect(telling).toEqual([...range(180, 209), ...range(480, 509), ...range(780, 799)]);
    expect(phased).toEqual([...range(210, 299), ...range(510, 599)]);
    expect(events(state, 'PhaseShift').map((p) => p.phase)).toEqual([
      'tell',
      'in',
      'out',
      'tell',
      'in',
      'out',
      'tell',
    ]);
    const [tell] = events(state, 'PhaseShift');
    expect(tell).toMatchObject({ uid: e.uid, enemy: 'riftmoth' });
  });

  it('keeps moving through the tell and while Phased, and leaks normally', () => {
    const { state, ctx } = setup();
    const end = MAP.routes.a!.lengthTiles;
    const e = spawn(state, MOTH, { dist: end - 0.5 });
    e.phased = true;
    e.phaseTicks = PHASE.durationTicks;
    const before = e.dist;
    enemyAbilities(state, ctx);
    expect(e.paceMul).toBe(1);
    movement(state);
    expect(e.dist).toBeGreaterThan(before);
    for (let i = 0; i < 40 && e.alive; i++) {
      enemyAbilities(state, ctx);
      movement(state);
    }
    expect(e.alive).toBe(false);
    expect(events(state, 'EnemyLeaked')).toEqual([
      expect.objectContaining({ uid: e.uid, enemy: 'riftmoth', leak: 1 }),
    ]);
  });
});

describe('the Phased layer', () => {
  it('nothing targets, hits, or slows it while Phased; it is open again once back', () => {
    const { state } = setup();
    const e = spawn(state, MOTH, { dist: 2 });
    e.phased = true;
    expect([untargetable(e), immune(e)]).toEqual([true, true]);
    expect(canHit(e, AIR)).toBe(false);
    expect(canHit(e, BOTH)).toBe(false);
    expect(pickTarget(state.enemies, e.x, e.y, BOTH, RANGE, 'first')).toBeNull();
    expect(applyDamage(state, e, 50, 'kinetic', SRC)).toBe(0);
    expect(e.hp).toBe(MOTH.hp);
    applyEffects(e, FREEZE);
    applyEffects(e, [{ status: 'chilled', pct: 0.3, durationTicks: 60 }]);
    expect([e.stasisTicks, e.chillPct]).toEqual([0, 0]);
    e.phased = false;
    expect(canHit(e, AIR)).toBe(true);
    expect(canHit(e, { ground: true, air: false })).toBe(false); // still a flyer
    expect(pickTarget(state.enemies, e.x, e.y, AIR, RANGE, 'first')).toBe(e);
    expect(applyDamage(state, e, 50, 'kinetic', SRC)).toBe(50);
  });

  it('enemy-side shields don’t reach it either (a pulse; the layer rule, enemies.md § 2.6)', () => {
    // No Hollow unit has a shield yet: a shielded phaser and a pulser of one faction stand in.
    const shield = { hp: 50, regenPerTick: 0, regenDelayTicks: 0 };
    const phaser = enemyDef('fx_shielded_phaser', { faction: 'hollow', shield, phase: PHASE });
    const pulser = enemyDef('fx_pulser', { faction: 'hollow', shield });
    const pulse = { everyTicks: 60, tellTicks: 10, radiusTiles: 3, radiusSq: 9, shield: 20 };
    const { state } = setup();
    const src = spawn(state, pulser, { dist: 2 });
    const e = spawn(state, phaser, { dist: 2.5 });
    src.shieldHp = 50;
    e.shieldHp = 0;
    e.phased = true;
    expect(outOfReach(e)).toBe(true);
    expect(restoreShields(state, src, pulse)).toBe(0);
    expect(e.shieldHp).toBe(0);
    e.phased = false;
    expect(outOfReach(e)).toBe(false);
    expect(restoreShields(state, src, pulse)).toBe(1);
    expect(e.shieldHp).toBe(20);
  });

  it('a ground phaser (any layer) is Phased the same way', () => {
    const { state } = setup();
    const walker = enemyDef('fx_phaser', { phase: PHASE, faction: 'hollow' });
    const e = spawn(state, walker, { dist: 2 });
    e.phased = true;
    expect(canHit(e, { ground: true, air: false })).toBe(false);
    expect(applyDamage(state, e, 10, 'explosive', SRC)).toBe(0);
  });
});

describe('the interrupt (D137: Stasis now, Unnerved with T507)', () => {
  it('Stasis mid-tell cancels the phase and restarts the solid stretch from zero', () => {
    const { state, ctx } = setup();
    const e = spawn(state, MOTH);
    phaseStep(state, e, PHASE); // first tick: 210
    while (!phaseTelling(e, PHASE)) phaseStep(state, e, PHASE);
    for (let i = 0; i < 10; i++) phaseStep(state, e, PHASE); // 10 ticks into the tell
    expect(applyStasis(e, 30)).toBe(true);
    phaseStep(state, e, PHASE);
    expect(e.phased).toBe(false);
    expect(e.phaseTicks).toBe(solidTicks(PHASE));
    expect(events(state, 'PhaseShift').map((p) => p.phase)).toEqual(['tell', 'interrupted']);
    // It stays solid for a whole stretch from the interrupt, Stasis and all.
    let solid = 0;
    while (!e.phased) {
      status(state);
      enemyAbilities(state, ctx);
      solid++;
    }
    expect(solid).toBe(solidTicks(PHASE));
  });

  it('a unit in Stasis as its tell would start never starts it', () => {
    const { state } = setup();
    const e = spawn(state, MOTH);
    phaseStep(state, e, PHASE);
    e.phaseTicks = PHASE.tellTicks + 1;
    applyStasis(e, 120);
    phaseStep(state, e, PHASE);
    expect(phaseTelling(e, PHASE)).toBe(false);
    expect(e.phaseTicks).toBe(solidTicks(PHASE));
    expect(events(state, 'PhaseShift')).toEqual([]); // no tell began, so nothing was interrupted
  });

  it('Stasis outside the tell changes nothing; nothing interrupts a unit already Phased', () => {
    const { state } = setup();
    const e = spawn(state, MOTH);
    phaseStep(state, e, PHASE);
    applyStasis(e, 20); // runs out long before the tell
    for (let i = 0; i < 20; i++) {
      status(state);
      phaseStep(state, e, PHASE);
    }
    expect(e.phaseTicks).toBe(solidTicks(PHASE) - 20);
    const p = spawn(state, MOTH);
    p.phased = true;
    p.phaseTicks = 10;
    p.stasisTicks = 5; // as if it landed just before (none can land on a Phased unit)
    for (let i = 0; i < 10; i++) phaseStep(state, p, PHASE);
    expect(p.phased).toBe(false);
  });

  it('asks the interrupt hook, so Unnerved (T507) only has to join isInterrupted', () => {
    const { state } = setup();
    const e = spawn(state, MOTH);
    expect(phaseBlocked(e)).toBe(isInterrupted(e));
    applyStasis(e, 30);
    expect([phaseBlocked(e), isInterrupted(e)]).toEqual([true, true]);
  });
});

describe('phasing in a run', () => {
  it('Story difficulty keeps the phase numbers; the gate is lifted', () => {
    const story = scaledEnemy(MOTH, { hp: -0.3, shield: -0.3, speed: 0 });
    expect(story.phase).toBe(MOTH.phase);
    expect(gateRefusals(fixtureConfig({ content: withWave([[MOTH, 1, 1]]) }))).toEqual([]);
  });

  it('a tower never hits it while Phased; it takes fire either side, and leaks for 1', () => {
    // A sturdy Moth on fx_map's road past one gun, so it lives through a phase and leaks.
    const tough: CompiledEnemyDef = Object.freeze({ ...MOTH, hp: 1000 });
    const sim = createSim(fixtureConfig({ content: withWave([[tough, 1, 1]]) }));
    sim.enqueue({ type: 'build', tower: 'fx_gun', tile: [1, 1] });
    sim.enqueue({ type: 'build', tower: 'fx_gun', tile: [3, 1] });
    sim.enqueue({ type: 'callWave' });
    let moth: Enemy | null = null;
    let phasedTicks = 0;
    let hitWhilePhased = 0;
    let hitSolid = 0;
    const integrity = sim.state.integrity;
    while (sim.state.tick < 1200 && sim.state.outcome === 'playing') {
      const hp = moth?.hp ?? tough.hp;
      sim.step();
      moth ??= sim.state.enemies.items.find((e) => e.alive && e.def?.id === 'riftmoth') ?? null;
      if (moth === null || !moth.alive) continue;
      if (moth.phased) {
        phasedTicks++;
        if (moth.hp < hp) hitWhilePhased++;
      } else if (moth.hp < hp) hitSolid++;
    }
    expect(phasedTicks).toBeGreaterThanOrEqual(PHASE.durationTicks);
    expect(hitWhilePhased).toBe(0);
    expect(hitSolid).toBeGreaterThan(0);
    expect(sim.state.integrity).toBe(integrity - 1);
  });
});

describe('the Fracture’s two-level split', () => {
  it('Fracture → 2 Shards where it died → 2 Motes each; the Motes split no further', () => {
    const { state, ctx } = world();
    const f = spawn(state, E.fracture, { dist: 5 });
    f.wave = 1;
    const remaining = state.schedule.remaining[0]!;
    applyDamage(state, f, 1000, 'kinetic', SRC);
    cleanup(state, ctx);
    const shards = live(state, 'fracture_shard');
    expect(shards.map((s) => s.dist)).toEqual([5, 4.75]);
    expect(shards.every((s) => s.wave === 1 && s.hp === 80)).toBe(true);
    expect(state.schedule.remaining[0]).toBe(remaining - 1 + 2);
    applyDamage(state, shards[0]!, 1000, 'kinetic', SRC);
    cleanup(state, ctx);
    expect(live(state, 'mote').map((m) => m.dist)).toEqual([5, 4.75]);
    applyDamage(state, shards[1]!, 1000, 'kinetic', SRC);
    cleanup(state, ctx);
    const motes = live(state, 'mote');
    expect(motes).toHaveLength(4);
    for (const m of motes) applyDamage(state, m, 1000, 'kinetic', SRC);
    cleanup(state, ctx);
    expect(state.enemies.live).toBe(0);
    expect(state.schedule.remaining[0]).toBe(remaining - 1);
    // Bounties: 8 + 2 × 4 + 4 × 2.
    const paid = events(state, 'EnemyDied').map((d) => [d.enemy, d.bounty]);
    expect(paid).toEqual([
      ['fracture', 8],
      ['fracture_shard', 4],
      ['fracture_shard', 4],
      ['mote', 2],
      ['mote', 2],
      ['mote', 2],
      ['mote', 2],
    ]);
  });

  it('the Shards are a Mote-like splash problem: clustered, Hollow, 1.1 tiles/s, leak 1', () => {
    expect(E.fracture).toMatchObject({ hp: 200, armor: 0, leak: 2, bounty: 8, layer: 'ground' });
    expect(E.fracture_shard).toMatchObject({ hp: 80, armor: 0, leak: 1, bounty: 4 });
    expect(E.fracture_shard.speedTilesPerTick * 60).toBeCloseTo(1.1, 12);
    expect(E.fracture_shard.traits).toEqual(['splitting', 'clustered']);
    expect([E.fracture.hushes, E.fracture_shard.hushes]).toEqual([true, true]);
  });

  it('a leaking Fracture costs 2 and releases nothing; a leaking Shard costs 1', () => {
    const { state, ctx } = world();
    const end = MAP.routes.a!.lengthTiles;
    spawn(state, E.fracture, { dist: end - 0.001 });
    spawn(state, E.fracture_shard, { dist: end - 0.001 });
    const integrity = state.integrity;
    movement(state);
    cleanup(state, ctx);
    expect(state.enemies.live).toBe(0);
    expect(integrity - state.integrity).toBe(3);
  });

  it('a whole sim with Fractures and Rift Moths is deterministic and resolves after the Motes', () => {
    const content = withWave(
      [
        // A Fracture worn down to 30 HP (fx_map's road is 9 tiles), splitting into the real Shards.
        [Object.freeze({ ...E.fracture, hp: 30 }), 3, 1.2],
        [MOTH, 3, 0.8],
      ],
      1000,
    );
    const a = run(content);
    const b = run(content);
    expect(a.sim.hash()).toBe(b.sim.hash());
    expect(a.log).toEqual(b.log);
    const spawned = (id: string): number =>
      a.log.filter((e) => e.type === 'EnemySpawned' && e.enemy === id).length;
    expect(spawned('fracture_shard')).toBeGreaterThan(0);
    expect(spawned('mote')).toBeGreaterThan(0);
    expect(a.log.some((e) => e.type === 'PhaseShift' && e.phase === 'in')).toBe(true);
    const cleared = a.log.findIndex((e) => e.type === 'WaveCleared' && e.wave === 1);
    const lastMote = a.log.findLastIndex(
      (e) => (e.type === 'EnemyDied' || e.type === 'EnemyLeaked') && e.enemy === 'mote',
    );
    expect(cleared).toBeGreaterThan(lastMote);
  });
});

// ── Whole-sim helpers ─────────────────────────────────────────────────────────────────────────

/** fx_map with wave 1 replaced by `groups` (enemy, count, interval s), and the live enemies. */
function withWave(
  groups: readonly [CompiledEnemyDef, number, number][],
  startCredits = MAP.startCredits,
): CompiledContent<FixtureIds> {
  const [w1, ...rest] = MAP.waves;
  const base = w1!.groups[0]!;
  const g = groups.map(([enemy, count, sec]) =>
    Object.assign({}, base, { enemy, count, intervalTicks: Math.round(sec * 60), delayTicks: 0 }),
  );
  const last = Math.max(...g.map((x) => (x.count - 1) * x.intervalTicks));
  const wave = Object.assign({}, w1, { groups: g, lastSpawnTicks: last });
  const map = Object.assign({}, MAP, { waves: [wave, ...rest], startCredits });
  const enemies = Object.assign({}, FIXTURE_CONTENT.enemies, E);
  return Object.assign({}, FIXTURE_CONTENT, { enemies, maps: { fx_map: map } });
}

function run(content: CompiledContent<FixtureIds>, ticks = 4000) {
  const sim = createSim(fixtureConfig({ content }));
  for (const tile of [
    [1, 1],
    [3, 1],
    [4, 2],
    [1, 3],
  ] as const) {
    sim.enqueue({ type: 'build', tower: 'fx_gun', tile });
  }
  sim.enqueue({ type: 'callWave' });
  const log: Ev[] = [];
  const out: SimEvent<FixtureIds>[] = [];
  while (sim.state.tick < ticks && sim.state.outcome === 'playing') {
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    log.push(...out);
  }
  return { sim, log };
}
