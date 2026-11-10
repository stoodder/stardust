// T506: the Sunderglass Penitent and the pivot (design/enemies.md § 6, § 6.1; D137). Systems driven
// directly on fx_map's road (9 tiles) with the live Penitent, its Glimmer-shards, and the Act II
// units: the shield-broken phase (entered when the shield breaks, never by HP), the shards and the
// re-form (4 s after a break while any shard lives; not once all three are dead), the pivot (its
// faction stands down: no leak, no bounty, its wave resolves; the Ward takes its place), the
// Ward's chill, `stats.pivotWave`, and the script actions (`standDown`, `bossEnd: 'pivot'`). The
// whole-map runs (the pivot both ways, Kneel, checkpoints across it) are dev_penitent's
// (render/__fixtures__/devPenitent.test.ts).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledEnemyDef } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { STAND_DOWN_FADE_SEC } from '../content/rules.ts';
import { secToTicks } from '../shared/time.ts';
import { MAP, enemyDef, setup as baseSetup, spawn } from './__fixtures__/combat.ts';
import { applyDamage } from './combat/damage.ts';
import { bossDamage, nextHpPhase } from './enemyAbilities/bossPhases.ts';
import { enemyAbilities } from './enemyAbilities/index.ts';
import { STAND_DOWN_TICKS, pivotBoss, standDown } from './enemyAbilities/pivot.ts';
import { shardsAlive } from './enemyAbilities/shieldBroken.ts';
import { immune, untargetable } from './enemyAbilities/layers.ts';
import type { Ally, Enemy } from './entities.ts';
import { FEATURE_GATES } from './gates.ts';
import type { SimState } from './state.ts';
import { allies } from './systems/allies.ts';
import { cleanup } from './systems/cleanup.ts';
import { movement } from './systems/movement.ts';
import { status } from './systems/status.ts';
import { SCRIPT_GATES, runScriptAction, unsupportedScript } from './systems/triggers.ts';
import type { TickContext } from './tick.ts';

const LIVE = compileContent(RAW_CONTENT);
const PENITENT = LIVE.enemies.sunderglass_penitent;
const SHARD = LIVE.enemies.glimmer_shard;
const GLIMMER = LIVE.enemies.glimmer;
const MOTE = LIVE.enemies.mote;
const SRC = { kind: 'ability', slot: 1 } as const;
const REFORM = secToTicks(4);

/** fx_map's state, with the live content in the context (the shards spawn from it). */
function setup(): { state: SimState; ctx: TickContext } {
  const { state, ctx } = baseSetup();
  return { state, ctx: { ...ctx, content: LIVE } };
}

/** The Penitent on the road, its phase 1 begun (its first abilities tick). */
function penitent(state: SimState, ctx: TickContext, dist = 4): Enemy {
  const boss = spawn(state, PENITENT, { dist });
  boss.wave = 1;
  enemyAbilities(state, ctx);
  return boss;
}

/** Breaks `boss`'s shield with one Energy hit (the rest lands on its HP, well above 50%). */
function breakShield(state: SimState, boss: Enemy): void {
  applyDamage(state, boss, boss.shieldHp / 2 + 10, 'energy', SRC);
  expect(boss.shieldHp).toBe(0);
}

/** Runs the abilities pass `n` times, a tick apart. */
function abilityTicks(state: SimState, ctx: TickContext, n: number): void {
  for (let i = 0; i < n; i++) {
    state.tick++;
    enemyAbilities(state, ctx);
  }
}

function liveShards(state: SimState, boss: Enemy): Enemy[] {
  return state.enemies.items
    .slice(0, state.enemies.used)
    .filter((e) => e.alive && e.ownerUid === boss.uid);
}

function types(state: SimState): string[] {
  return state.events.map((e) => e.type);
}

/** The Penitent at 50% with Aelari, a Hollow unit, and a neutral unit on the road, wave 5. */
function pivotScene() {
  const { state, ctx } = setup();
  state.wave = 5;
  const boss = penitent(state, ctx, 4);
  const glimmer = spawn(state, GLIMMER, { dist: 2 });
  const mote = spawn(state, MOTE, { dist: 1 });
  const neutral = spawn(state, enemyDef('fx_gerald', { faction: 'aelari', neutral: true }), {
    dist: 3,
  });
  for (const e of [glimmer, mote, neutral]) e.wave = 1;
  state.schedule.startTick[0] = 0;
  state.schedule.remaining[0] = 4;
  state.events.length = 0;
  return { state, ctx, boss, glimmer, mote, neutral };
}

/** The Penitent pivoted on the road, and its Ward. */
function wardScene() {
  const { state, ctx } = setup();
  const boss = penitent(state, ctx, 4);
  pivotBoss(state, boss);
  const ward: Ally = state.allies.items.find((a) => a.alive && a.kind === 'ward')!; // pivotBoss spawned it
  return { state, ctx, ward };
}

describe('the Penitent’s data (T506 settles the stub)', () => {
  it('phase 1: the shield wall and a 250-shield pulse every 8 s; phase 2 on the break, no pulse', () => {
    const [p1, p2] = PENITENT.boss!.phases;
    expect(p1!.pulse).toMatchObject({
      everyTicks: 480,
      tellTicks: 90,
      radiusTiles: 2,
      shield: 250,
    });
    expect(p2).toMatchObject({ onShieldBroken: true, pulse: null });
    expect(p2!.shards).toEqual({ enemy: 'glimmer_shard', count: 3, reformTicks: REFORM });
    expect(SHARD).toMatchObject({ hp: 60, shield: null, cloaked: true, leak: 1, bounty: 3 });
    expect(SHARD.speedTilesPerTick).toBe(PENITENT.speedTilesPerTick);
  });

  it('its gates are lifted (FEATURE_GATES, SCRIPT_GATES)', () => {
    expect(FEATURE_GATES['enemy.boss.pivot']).toBeNull();
    expect(FEATURE_GATES['enemy.boss.shieldBroken']).toBeNull();
    expect(SCRIPT_GATES).not.toHaveProperty('standDown');
    expect(SCRIPT_GATES).not.toHaveProperty('bossEnd.pivot');
    const events = [
      { id: 'a', on: { tick: 1 }, when: null, actions: [{ bossEnd: 'pivot' }], once: true },
      { id: 'b', on: { tick: 1 }, when: null, actions: [{ standDown: 'aelari' }], once: true },
    ] as const;
    expect(unsupportedScript({ ...MAP, events })).toEqual([]);
  });
});

describe('phase 2 begins when the shield breaks (not by HP)', () => {
  it('the break: BossPhase 2 the next tick, no invulnerability, 3 cloaked shards at its side', () => {
    const { state, ctx } = setup();
    const boss = penitent(state, ctx);
    expect(boss.bossPhase).toBe(1);
    // A hit that leaves some shield changes nothing.
    applyDamage(state, boss, 100, 'energy', SRC);
    abilityTicks(state, ctx, 1);
    expect(boss.bossPhase).toBe(1);
    state.events.length = 0;
    const remaining = state.schedule.remaining[0]!;
    breakShield(state, boss);
    expect(boss.bossPhase).toBe(1);
    abilityTicks(state, ctx, 1);
    expect(boss.bossPhase).toBe(2);
    expect(boss.invulnerableTicks).toBe(0);
    expect(state.events).toContainEqual({
      type: 'BossPhase',
      uid: boss.uid,
      enemy: 'sunderglass_penitent',
      phase: 2,
    });
    const shards = liveShards(state, boss);
    expect(shards).toHaveLength(3);
    for (const [i, s] of shards.entries()) {
      expect(s.def!.id).toBe('glimmer_shard');
      expect(s.wave).toBe(1);
      expect(s.dist).toBeCloseTo(boss.dist - i * 0.25, 9); // BROOD_SPREAD_TILES behind it
      expect(untargetable(s)).toBe(true); // cloaked, not Revealed
    }
    expect(state.schedule.remaining[0]).toBe(remaining + 3); // they join its wave
    // Phase 2 is entered once: a later break releases no more shards.
    abilityTicks(state, ctx, REFORM);
    breakShield(state, boss);
    abilityTicks(state, ctx, 2);
    expect(liveShards(state, boss)).toHaveLength(3);
  });

  it('HP skips the shield-broken phase: the boss keeps phase 1 down to its 50% pivot', () => {
    const { state, ctx } = setup();
    const boss = penitent(state, ctx);
    expect(nextHpPhase(PENITENT.boss!, 1)).toBe(0);
    boss.shieldHp = 0; // as if broken, before the next tick sees it
    bossDamage(state, boss, PENITENT.hp * 0.3);
    expect([boss.bossPhase, boss.hp]).toEqual([1, PENITENT.hp * 0.7]);
    // A burst past 0 stops at the ending's threshold (never in a phase at 0 HP).
    bossDamage(state, boss, PENITENT.hp * 10);
    expect([boss.bossPhase, boss.hp]).toEqual([1, PENITENT.hp * 0.5]);
    expect(state.events).toContainEqual({
      type: 'BossEnded',
      uid: boss.uid,
      enemy: 'sunderglass_penitent',
      how: 'pivot',
    });
  });
});

describe('the re-form (D137: 4 s after a break, unless all three shards are dead)', () => {
  it('lands exactly 4 s after the breaking hit, full, under fire or not', () => {
    const { state, ctx } = setup();
    const boss = penitent(state, ctx);
    const broke = state.tick;
    breakShield(state, boss);
    let at = -1;
    for (let i = 0; i < REFORM + 30 && at < 0; i++) {
      state.events.length = 0;
      abilityTicks(state, ctx, 1);
      if (types(state).includes('ShieldReformed')) at = state.tick;
      else expect(boss.shieldHp).toBe(0);
      applyDamage(state, boss, 1, 'kinetic', SRC); // still under fire: the regen delay holds
    }
    expect(at - broke).toBe(REFORM);
    expect(boss.shieldHp).toBeCloseTo(PENITENT.shield!.hp - 0.5, 9); // full, less the next hit
    expect(state.events).toContainEqual({
      type: 'ShieldReformed',
      uid: boss.uid,
      enemy: 'sunderglass_penitent',
      x: boss.x,
      y: boss.y,
    });
  });

  it('a single shard keeps it coming back after every break; with all three dead it stays down', () => {
    const { state, ctx } = setup();
    const boss = penitent(state, ctx);
    breakShield(state, boss);
    abilityTicks(state, ctx, 1);
    const [a, b, c] = liveShards(state, boss);
    for (const s of [a!, b!, c!]) s.revealedTicks = 60 * 60; // a Lookout over them
    for (const s of [a!, b!]) applyDamage(state, s, 1000, 'kinetic', SRC);
    expect([a!.alive, b!.alive, c!.alive]).toEqual([false, false, true]);
    expect(shardsAlive(state, boss)).toBe(true);
    abilityTicks(state, ctx, REFORM - 1);
    expect(boss.shieldHp).toBe(PENITENT.shield!.hp);
    // Broken again with one shard alive: back again 4 s later.
    const broke = state.tick;
    breakShield(state, boss);
    abilityTicks(state, ctx, REFORM - 1);
    expect(boss.shieldHp).toBe(0);
    abilityTicks(state, ctx, 1);
    expect(state.tick - broke).toBe(REFORM);
    expect(boss.shieldHp).toBe(PENITENT.shield!.hp);
    // The last shard dies mid-clock: no re-form, now or after a later break.
    breakShield(state, boss);
    abilityTicks(state, ctx, 60);
    applyDamage(state, c!, 1000, 'kinetic', SRC);
    state.events.length = 0;
    abilityTicks(state, ctx, REFORM);
    breakShield(state, boss);
    abilityTicks(state, ctx, REFORM * 2);
    expect(types(state)).not.toContain('ShieldReformed');
    expect(boss.shieldHp).toBe(0);
    expect(boss.reformTicks).toBe(0);
  });

  it('a shard that leaks or stands down no longer counts', () => {
    const { state, ctx } = setup();
    const boss = penitent(state, ctx);
    breakShield(state, boss);
    abilityTicks(state, ctx, 1);
    const shards = liveShards(state, boss);
    shards[0]!.alive = false; // leaked (gone from the pool)
    shards[1]!.alive = false;
    standDown(state, 'aelari'); // the last one stands down (with the boss: it's leaving now)
    expect(shardsAlive(state, boss)).toBe(false);
  });
});

describe('the pivot (enemies.md § 6.1)', () => {
  it('at 50%: BossEnded `pivot`, pivotWave, its faction stands down, the Ward takes its place', () => {
    const { state, boss, glimmer, mote, neutral } = pivotScene();
    breakShield(state, boss);
    bossDamage(state, boss, PENITENT.hp);
    expect(boss.hp).toBe(PENITENT.hp * 0.5);
    expect(state.stats.pivotWave).toBe(5);
    expect(types(state).filter((t) => t !== 'ShieldHit')).toEqual([
      'BossEnded',
      'StoodDown',
      'StoodDown',
      'AllySpawned',
    ]);
    expect(state.events).toContainEqual({
      type: 'StoodDown',
      uid: glimmer.uid,
      enemy: 'glimmer',
      faction: 'aelari',
      x: glimmer.x,
      y: glimmer.y,
    });
    for (const e of [boss, glimmer]) {
      expect([e.alive, e.leaving, e.standDownTicks]).toEqual([true, true, STAND_DOWN_TICKS]);
      expect(immune(e)).toBe(true);
    }
    expect(STAND_DOWN_TICKS).toBe(secToTicks(STAND_DOWN_FADE_SEC));
    for (const e of [mote, neutral]) expect([e.leaving, e.standDownTicks]).toEqual([false, 0]);
    const ward = state.allies.items.slice(0, state.allies.used).find((a) => a.alive)!;
    expect(ward).toMatchObject({
      kind: 'ward',
      mode: 'stationary',
      vulnerability: 'never',
      group: -1,
      x: boss.x,
      y: boss.y,
      rangeSq: 6.25,
      auraChillPct: 0.4,
      enemyId: 'sunderglass_penitent',
      damage: 0,
    });
    // Once only: a second ending (the surge's `bossEnd`) finds it leaving and does nothing.
    state.events.length = 0;
    state.wave = 6;
    runScriptAction(state, { bossEnd: 'pivot' }, MAP);
    expect(state.events).toEqual([]);
    expect(state.stats.pivotWave).toBe(5);
  });

  it('stood-down units hold still, fade for 1 s, and go: no leak, no bounty, the wave resolves', () => {
    const { state, ctx, boss, glimmer } = pivotScene();
    // The glimmer one step from the core: standing down, it never gets there.
    glimmer.dist = MAP.routes.a!.lengthTiles - 0.01;
    runScriptAction(state, { bossEnd: 'pivot' }, MAP);
    const { credits, integrity } = state;
    const at = [boss.x, boss.y, glimmer.x, glimmer.y];
    const cleared: number[] = [];
    for (let i = 0; i < STAND_DOWN_TICKS; i++) {
      expect(boss.alive && glimmer.alive).toBe(true);
      enemyAbilities(state, ctx);
      movement(state, ctx);
      allies(state, ctx);
      cleanup(state, ctx);
      for (const e of state.events) if (e.type === 'WaveCleared') cleared.push(e.wave);
      state.events.length = 0;
      state.tick++;
    }
    expect([boss.alive, glimmer.alive]).toEqual([false, false]);
    expect(at).toEqual([boss.x, boss.y, glimmer.x, glimmer.y]);
    expect(state.integrity).toBe(integrity);
    expect(state.stats.killsByEnemy).toEqual({});
    expect(state.stats.leaksByWave[0]).toBe(0);
    // Wave 1 still waits on the Mote and the neutral unit; its stood-down units are booked.
    expect(state.schedule.remaining[0]).toBe(2);
    expect(cleared).toEqual([]);
    expect(state.credits).toBe(credits);
  });

  it('`standDown` (the script action) stands a faction down without a boss; a pivot with no ward only stands down', () => {
    const { state, glimmer, mote, boss } = pivotScene();
    runScriptAction(state, { standDown: 'hollow' }, MAP);
    expect([mote.leaving, glimmer.leaving, boss.leaving]).toEqual([true, false, false]);
    const wardless: CompiledEnemyDef = Object.freeze({
      ...PENITENT,
      id: 'fx_wardless',
      boss: Object.freeze({ ...PENITENT.boss!, ward: null }),
    });
    boss.def = wardless;
    pivotBoss(state, boss);
    expect([boss.leaving, glimmer.leaving]).toEqual([true, true]);
    expect(state.allies.live).toBe(0);
  });
});

describe('the Ward’s chill (Hollow within 2.5 tiles Chilled 40%)', () => {
  it('chills a Hollow unit only while it is inside; not the Aelari; a Hollow boss at half', () => {
    const { state, ctx, ward } = wardScene();
    const inside = spawn(state, MOTE, { dist: 2 });
    const outside = spawn(state, MOTE, { dist: 0 });
    const aelari = spawn(state, GLIMMER, { dist: 4 });
    const hollowBoss = spawn(
      state,
      enemyDef('fx_hollow_boss', { faction: 'hollow', boss: PENITENT.boss }),
      { dist: 4 },
    );
    inside.x = ward.x + 1.2;
    inside.y = ward.y + 2;
    outside.x = ward.x + 2;
    outside.y = ward.y + 1.6; // √6.56 > 2.5
    allies(state, ctx);
    expect(inside.chillPct).toBe(0.4);
    expect(inside.chillMul).toBeCloseTo(0.6, 9);
    expect([outside.chillPct, aelari.chillPct]).toEqual([0, 0]);
    expect(hollowBoss.chillPct).toBeCloseTo(0.2, 9); // a boss takes Chilled at half
    // It holds for the next movement tick, and ends the tick after it leaves.
    status(state);
    expect(inside.chillPct).toBe(0.4);
    inside.x = ward.x + 3;
    allies(state, ctx);
    status(state);
    expect(inside.chillPct).toBe(0);
  });

  it('never reaches a unit out of reach (Phased, burrowed, cloaked and unrevealed)', () => {
    const { state, ctx, ward } = wardScene();
    const phased = spawn(state, MOTE, { dist: 2 });
    const burrowed = spawn(state, MOTE, { dist: 2 });
    const cloaked = spawn(state, enemyDef('fx_cloaked_mote', { faction: 'hollow', cloaked: true }));
    for (const e of [phased, burrowed, cloaked]) {
      e.x = ward.x;
      e.y = ward.y;
    }
    phased.phased = true;
    burrowed.burrowed = true;
    allies(state, ctx);
    expect([phased.chillPct, burrowed.chillPct, cloaked.chillPct]).toEqual([0, 0, 0]);
    cloaked.revealedTicks = 60; // Revealed, it's in reach
    allies(state, ctx);
    expect(cloaked.chillPct).toBe(0.4);
  });
});
