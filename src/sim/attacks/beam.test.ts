// T504: the Prism Spire's beam (attacks/beam.ts; design/towers.md § 5, § 7; enemies.md § 2.3):
// the data, the first tick and the per-tick damage, the linear ramp and its cap, armor per beam
// tick, sticky targeting, the ramp reset on retarget, Refractor's three beams and Sunlance's ramp,
// Hold Fire, the spare-runners filter, rate bonuses, `beamActive` and its events, and the
// Resonance link (systems/links.ts sums `vsShieldPct`; systems/towers.ts `damageOn` reads it).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { CompiledContent } from '../../content/compiled.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import { STUB_TOWER_TASKS } from '../../content/towers/index.ts';
import type { IdSpace } from '../../content/types.ts';
import { enemyDef, placeTower, setup, spawn } from '../__fixtures__/combat.ts';
import { FIXTURE_CONTENT, fixtureConfig } from '../__fixtures__/sim.ts';
import type { SimConfig } from '../config.ts';
import type { Enemy, Tower } from '../entities.ts';
import type { SimEvent } from '../events.ts';
import { gateRefusals, towerRefusal } from '../gates.ts';
import type { SimState } from '../state.ts';
import { links } from '../systems/links.ts';
import { towers } from '../systems/towers.ts';
import type { TickContext } from '../tick.ts';
import { MAX_BEAMS, beamRampOf, beamUid } from './beam.ts';

const LIVE = compileContent(RAW_CONTENT);
const PRISM = LIVE.towers.prism;
const T3 = PRISM.tiers[2];
const REFRACTOR = PRISM.specs!.a;
const SUNLANCE = PRISM.specs!.b;
const ZAPCOIL = LIVE.towers.zapcoil;
// Tough, still targets: beams never kill them unless a test says so.
const TANK = enemyDef('fx_tank', { hp: 10_000, speedTilesPerTick: 0 });
const BIG = enemyDef('fx_big', { hp: 20_000, speedTilesPerTick: 0 });
const ARMORED = enemyDef('fx_armored', { hp: 10_000, armor: 4, speedTilesPerTick: 0 });
const SHIELDED = enemyDef('fx_shielded', {
  hp: 10_000,
  shield: { hp: 100_000, regenPerTick: 0, regenDelayTicks: 180 },
  speedTilesPerTick: 0,
});

type Ev = SimEvent<IdSpace>;
const ofType = <T extends Ev['type']>(state: SimState, type: T): Extract<Ev, { type: T }>[] =>
  state.events.filter((e): e is Extract<Ev, { type: T }> => e.type === type);

function liveSetup(): { state: SimState; ctx: TickContext } {
  const s = setup();
  return { state: s.state, ctx: { ...s.ctx, content: LIVE } };
}

/** An enemy of `def` standing at (x, y). */
function at(state: SimState, def = TANK, x = 0, y = 0): Enemy {
  const e = spawn(state, def);
  e.x = x;
  e.y = y;
  return e;
}

const round3 = (x: number): number => Math.round(x * 1000) / 1000;
const lost = (e: Enemy): number => round3(e.def!.hp - e.hp);

/** Runs the towers system `n` times. */
function tick(state: SimState, ctx: TickContext, n: number): void {
  for (let i = 0; i < n; i++) towers(state, ctx);
}

/** A Prism at (1, 1), centre (1.5, 1.5), on `tier`. */
function prismAt(state: SimState, tier: Parameters<typeof placeTower>[4] = 1): Tower {
  return placeTower(state, PRISM, 1, 1, tier);
}

describe('the Prism Spire (towers.md § 7)', () => {
  it('compiles to the doc: 12/s ramping +50%/s to ×4, range 3, Strong, G+A; T2–T3 and specs', () => {
    expect(PRISM).toMatchObject({ faction: 'aelari', lightRadiusTiles: 2 });
    const t1 = PRISM.tiers[0];
    expect(t1).toMatchObject({ cost: 160, defaultPriority: 'strong' });
    expect(t1.targets).toEqual({ ground: true, air: true });
    expect(t1.attack).toMatchObject({
      kind: 'beam',
      type: 'energy',
      damage: 12,
      rangeTiles: 3,
      cooldownTicks: 15,
      beamTickTicks: 15,
      beamTickSec: 0.25,
      rampPctPerTick: 0.5 / 60,
      rampCap: 4,
      beams: 1,
    });
    expect(PRISM.tiers[1]).toMatchObject({ cost: 130, attack: { damage: 16 } });
    expect(T3).toMatchObject({ cost: 240, attack: { damage: 16, rampCap: 5, rangeTiles: 3.5 } });
    expect(REFRACTOR).toMatchObject({
      name: 'Refractor',
      cost: 480,
      attack: { beams: 3, rampCap: 3, damage: 16 },
    });
    expect(SUNLANCE).toMatchObject({
      name: 'Sunlance',
      cost: 480,
      attack: { rampPctPerTick: 1 / 60, rampCap: 10, beams: 1 },
    });
  });

  it("every beam tier's rate restates its tick, and runs at most MAX_BEAMS beams", () => {
    for (const t of Object.values(LIVE.towers)) {
      const tiers = [...t.tiers, ...(t.specs === null ? [] : [t.specs.a, t.specs.b])];
      for (const tier of tiers) {
        const a = tier.attack;
        if (a?.kind !== 'beam') continue;
        expect(a.cooldownTicks, `${t.id} T${tier.tier}`).toBe(a.beamTickTicks);
        expect(a.beams, `${t.id} T${tier.tier}`).toBeLessThanOrEqual(MAX_BEAMS);
      }
    }
  });

  it('plays: no gate refuses it or its specs (T504 lifted the stub and attack.beam)', () => {
    expect(Object.hasOwn(STUB_TOWER_TASKS, 'prism')).toBe(false);
    expect(towerRefusal(RAW_CONTENT.towers.prism)).toBeNull();
    const content: CompiledContent<IdSpace> = {
      ...FIXTURE_CONTENT,
      towers: { ...FIXTURE_CONTENT.towers, prism: PRISM },
    };
    const cfg: SimConfig<IdSpace> = {
      ...fixtureConfig(),
      content,
      loadout: ['prism'],
      specsUnlocked: ['prism'],
    };
    expect(gateRefusals(cfg)).toEqual([]);
  });
});

describe('the beam: ticks and the ramp', () => {
  it('locks on and lands its first tick at once: 12/s × 0.25 s, then a tick every 15', () => {
    const { state, ctx } = liveSetup();
    const t = prismAt(state);
    const e = at(state, TANK, 2.5, 1.5);
    towers(state, ctx);
    expect(t.targetUid).toBe(e.uid);
    expect(t.beamActive).toBe(true);
    expect(t.beamRamp).toBe(1);
    expect(lost(e)).toBe(3);
    expect(ofType(state, 'ProjectileFired')).toEqual([
      expect.objectContaining({ kind: 'beam', uid: 0, towerUid: t.uid, targetUid: e.uid }),
    ]);
    expect(ofType(state, 'BeamChanged')).toEqual([
      { type: 'BeamChanged', towerUid: t.uid, on: true },
    ]);
    expect(ofType(state, 'ProjectileHit')).toEqual([
      expect.objectContaining({ uid: 0, towerUid: t.uid, hits: 1, damage: 3, reduced: false }),
    ]);
    expect(t.firstFiredTick).toBe(state.tick);
    tick(state, ctx, 14);
    expect(ofType(state, 'ProjectileHit')).toHaveLength(1);
    towers(state, ctx);
    expect(ofType(state, 'ProjectileHit')).toHaveLength(2);
    // A locked beam fires once (its ProjectileFired is the lock, not the tick).
    expect(ofType(state, 'ProjectileFired')).toHaveLength(1);
  });

  it('ramps linearly, +50% of the base per second held, to ×4 after 6 s (48/s), then holds', () => {
    const { state, ctx } = liveSetup();
    const t = prismAt(state);
    const e = at(state, TANK, 2.5, 1.5);
    tick(state, ctx, 1);
    expect(t.beamRamp).toBe(1);
    tick(state, ctx, 60);
    expect(t.beamRamp).toBeCloseTo(1.5, 9);
    tick(state, ctx, 299);
    // 24 beam ticks on the way up: 3 × Σ (1 + 15j / 120), j = 0..23.
    expect(lost(e)).toBeCloseTo(175.5, 6);
    tick(state, ctx, 1); // held 360 ticks after the lock: 6 s
    expect(t.beamRamp).toBeCloseTo(4, 9);
    expect(lost(e)).toBeCloseTo(187.5, 6); // its 25th tick at ×4
    tick(state, ctx, 600);
    expect(t.beamRamp).toBe(4);
    const before = e.hp;
    tick(state, ctx, 15);
    expect(round3(before - e.hp)).toBe(12); // 48/s × 0.25 s
  });

  it('armor applies per beam tick at armor × 0.25: armor 4 takes 1 of each 3, not the floor', () => {
    const { state, ctx } = liveSetup();
    prismAt(state);
    const e = at(state, ARMORED, 2.5, 1.5);
    towers(state, ctx);
    expect(lost(e)).toBe(2); // 3 − 4 × 0.25
    expect(ofType(state, 'ProjectileHit')[0]).toMatchObject({ reduced: true, damage: 2 });
  });

  it('Sunlance: +100% per second to ×10 (160/s on T3’s 16)', () => {
    const { state, ctx } = liveSetup();
    const t = prismAt(state, SUNLANCE);
    const e = at(state, TANK, 2.5, 1.5);
    tick(state, ctx, 61);
    expect(t.beamRamp).toBeCloseTo(2, 9);
    tick(state, ctx, 600);
    expect(t.beamRamp).toBe(10);
    const before = e.hp;
    tick(state, ctx, 15);
    expect(round3(before - e.hp)).toBe(40); // 160/s × 0.25 s
  });

  it("Lightsong's faster ramp (`linkRampPct`) speeds the step, not the cap", () => {
    const { state, ctx } = liveSetup();
    const t = prismAt(state);
    t.linkRampPct = 0.3;
    at(state, TANK, 2.5, 1.5);
    tick(state, ctx, 61);
    expect(t.beamRamp).toBeCloseTo(1 + 0.5 * 1.3, 9);
    tick(state, ctx, 600);
    expect(t.beamRamp).toBe(4);
  });

  it('an upgrade keeps the ramp; a lower cap clamps it (T3 ×5 → Refractor ×3)', () => {
    const { state, ctx } = liveSetup();
    const t = prismAt(state, T3);
    at(state, TANK, 2.5, 1.5);
    tick(state, ctx, 600);
    expect(t.beamRamp).toBe(5);
    t.tierDef = REFRACTOR;
    t.tier = 4;
    towers(state, ctx);
    expect(t.beamRamp).toBe(3);
  });

  it('a rate bonus shortens the beam tick; each tick stays the same size', () => {
    const { state, ctx } = liveSetup();
    const t = prismAt(state);
    t.pctRate = 0.2; // a power node: 4.8 ticks a second
    const e = at(state, TANK, 2.5, 1.5);
    towers(state, ctx);
    expect(t.cooldownTicks).toBe(13); // 60 / 4.8 = 12.5, rounded
    expect(lost(e)).toBe(3);
  });
});

describe('the beam: targeting', () => {
  it('is sticky: a stronger enemy entering range never takes the beam from its target', () => {
    const { state, ctx } = liveSetup();
    const t = prismAt(state);
    const first = at(state, TANK, 2.5, 1.5);
    tick(state, ctx, 120);
    const ramp = t.beamRamp;
    const big = at(state, BIG, 2.5, 2.5);
    tick(state, ctx, 30);
    expect(t.targetUid).toBe(first.uid);
    expect(t.beamRamp).toBeGreaterThan(ramp);
    expect(lost(big)).toBe(0);
  });

  it('retargets with the ramp back at 1 when its target leaves range, and again when it dies', () => {
    const { state, ctx } = liveSetup();
    const t = prismAt(state);
    const a = at(state, BIG, 2.5, 1.5);
    const b = at(state, TANK, 1.5, 3.5);
    tick(state, ctx, 121);
    expect(t.targetUid).toBe(a.uid); // Strong
    expect(t.beamRamp).toBeCloseTo(2, 9);
    a.x = 9; // out of range
    towers(state, ctx);
    expect(t.targetUid).toBe(b.uid);
    expect(t.beamRamp).toBe(1);
    tick(state, ctx, 60);
    expect(t.beamRamp).toBeGreaterThan(1);
    // Dead: the beam goes to the next, from 1 again.
    const c = at(state, TANK, 2.5, 2.5);
    b.hp = 0.1;
    tick(state, ctx, 15);
    expect(b.alive).toBe(false);
    towers(state, ctx);
    expect(t.targetUid).toBe(c.uid);
    expect(t.beamRamp).toBeCloseTo(1 + 0.5 / 60, 9);
    const locks = ofType(state, 'ProjectileFired').map((f) => f.targetUid);
    expect(locks).toEqual([a.uid, b.uid, c.uid]);
  });

  it('goes dark with nothing in range (BeamChanged off) and lights on the next arrival', () => {
    const { state, ctx } = liveSetup();
    const t = prismAt(state);
    const e = at(state, TANK, 2.5, 1.5);
    tick(state, ctx, 30);
    e.x = 9;
    towers(state, ctx);
    expect(t.beamActive).toBe(false);
    expect([t.targetUid, t.beamRamp]).toEqual([0, 1]);
    e.x = 2.5;
    towers(state, ctx);
    expect(t.beamActive).toBe(true);
    expect(ofType(state, 'BeamChanged').map((c) => c.on)).toEqual([true, false, true]);
  });

  it('Hold Fire puts the beam out and resets the ramp; release lights it again', () => {
    const { state, ctx } = liveSetup();
    const t = prismAt(state);
    const e = at(state, TANK, 2.5, 1.5);
    tick(state, ctx, 120);
    t.holdFire = true;
    const before = e.hp;
    tick(state, ctx, 30);
    expect(e.hp).toBe(before);
    expect([t.beamActive, t.targetUid, t.beamRamp]).toEqual([false, 0, 1]);
    t.holdFire = false;
    towers(state, ctx);
    expect([t.beamActive, t.targetUid, t.beamRamp]).toEqual([true, e.uid, 1]);
  });

  it('with the spare-runners filter, drops a spared target and never picks one', () => {
    const { state, ctx } = liveSetup();
    const t = prismAt(state);
    const runner = spawn(state, TANK, { tags: ['fleeing'] });
    runner.x = 2.5;
    runner.y = 1.5;
    towers(state, ctx);
    expect(t.targetUid).toBe(runner.uid);
    t.spareRunners = true;
    towers(state, ctx);
    expect(t.beamActive).toBe(false);
    const e = at(state, TANK, 2.5, 2.5);
    towers(state, ctx);
    expect(t.targetUid).toBe(e.uid);
  });
});

describe('Refractor: three beams on three targets', () => {
  it('splits onto three different targets, each with its own ramp; a fourth waits', () => {
    const { state, ctx } = liveSetup();
    const t = prismAt(state, REFRACTOR);
    const es = [1.5, 2.5, 3.5, 2.0].map((y, k) => at(state, k === 3 ? TANK : BIG, 2.5, y));
    towers(state, ctx);
    const held = [0, 1, 2].map((k) => beamUid(t, k));
    expect(new Set(held).size).toBe(3);
    expect(held).not.toContain(es[3]!.uid); // the weakest: Strong picks the three BIGs
    for (const e of es.slice(0, 3)) expect(lost(e)).toBe(4); // 16/s × 0.25 s each
    expect(ofType(state, 'ProjectileHit')).toHaveLength(3);
    tick(state, ctx, 600);
    for (let k = 0; k < 3; k++) expect(beamRampOf(t, k)).toBe(3);
    // One target goes: that beam alone swings to the waiting one, from 1.
    es[1]!.x = 9;
    towers(state, ctx);
    const swung = [0, 1, 2].findIndex((k) => beamUid(t, k) === es[3]!.uid);
    expect(swung).toBeGreaterThanOrEqual(0);
    expect(beamRampOf(t, swung)).toBe(1);
    for (let k = 0; k < 3; k++) if (k !== swung) expect(beamRampOf(t, k)).toBe(3);
  });

  it('with fewer targets than beams, the spare beams stay dark (never doubled up)', () => {
    const { state, ctx } = liveSetup();
    const t = prismAt(state, REFRACTOR);
    const e = at(state, TANK, 2.5, 1.5);
    towers(state, ctx);
    expect([beamUid(t, 0), beamUid(t, 1), beamUid(t, 2)]).toEqual([e.uid, 0, 0]);
    expect(lost(e)).toBe(4);
  });
});

/** A Prism at (1, 1) and a Zapcoil beside it at (2, 1), their links computed. */
function linked(): { state: SimState; ctx: TickContext; prism: Tower; zap: Tower } {
  const { state, ctx } = liveSetup();
  const prism = prismAt(state);
  const zap = placeTower(state, ZAPCOIL, 2, 1); // adjacent
  state.linksDirty = true;
  links(state, ctx);
  return { state, ctx, prism, zap };
}

describe('Resonance (Zapcoil + Prism, towers.md § 6.2): +20% damage vs a raised shield', () => {
  it('both partners get it, once, as `vsShieldPct`', () => {
    const { prism, zap } = linked();
    expect([prism.vsShieldPct, zap.vsShieldPct]).toEqual([0.2, 0.2]);
    expect(prism.pctDamage).toBe(0);
  });

  it("the Prism's beam: ×1.2 on a shield, plain on bare HP", () => {
    const { state, ctx, prism, zap } = linked();
    zap.holdFire = true;
    const s = at(state, SHIELDED, 1.5, 2.5);
    towers(state, ctx);
    expect(prism.targetUid).toBe(s.uid);
    // 12 × 1.2 × 0.25 raw, ×2 against the shield (Energy).
    expect(round3(SHIELDED.shield!.hp - s.shieldHp)).toBe(7.2);
    s.shieldHp = 0;
    const before = s.hp;
    tick(state, ctx, 15);
    expect(round3(before - s.hp)).toBeCloseTo(3 * (1 + 15 * (0.5 / 60)), 3);
  });

  it("the Zapcoil's arc: ×1.2 on a shield", () => {
    const { state, ctx, prism, zap } = linked();
    prism.holdFire = true;
    const s = at(state, SHIELDED, 3.5, 1.5);
    towers(state, ctx);
    const zapDamage = ZAPCOIL.tiers[0].attack!.damage;
    expect(round3(SHIELDED.shield!.hp - s.shieldHp)).toBe(round3(zapDamage * 1.2 * 2));
    expect(zap.vsShieldPct).toBe(0.2);
  });

  it('is gone once the pair is broken', () => {
    const { state, ctx, prism, zap } = linked();
    zap.alive = false;
    state.towerAtTile[1 * ctx.map.cols + 2] = -1;
    state.linksDirty = true;
    links(state, ctx);
    expect(prism.vsShieldPct).toBe(0);
  });
});
