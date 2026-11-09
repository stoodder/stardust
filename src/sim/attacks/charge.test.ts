// T407b: the Zapcoil's specs (design/towers.md § 7). Overload Coil's long chain, and Capacitor
// Bank's charge attack (attacks/charge.ts): the 4 s charge and its timing, the discharge and its
// 50% splash, Strong and the sticky aim, what interrupts a charge (a kill or a leak swings it and
// keeps the work; an escape, an empty range, or Hold Fire fizzles it), rate bonuses, the
// Conductive Soak, neutral units, and the event shape. fx_map's pads (1,1), (3,1), (4,2), (1,3).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { CompiledContent } from '../../content/compiled.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import type { IdSpace } from '../../content/types.ts';
import { enemyDef, placeTower, setup, spawn } from '../__fixtures__/combat.ts';
import { FIXTURE_CONTENT, fixtureConfig } from '../__fixtures__/sim.ts';
import type { SimConfig } from '../config.ts';
import type { Enemy } from '../entities.ts';
import type { SimEvent } from '../events.ts';
import { gateRefusals } from '../gates.ts';
import type { SimState } from '../state.ts';
import { towers } from '../systems/towers.ts';
import type { TickContext } from '../tick.ts';
import { bonusChargeTicks } from './charge.ts';

const LIVE = compileContent(RAW_CONTENT);
const ZAPCOIL = LIVE.towers.zapcoil;
const OVERLOAD = ZAPCOIL.specs!.a; // built since T407b
const CAPACITOR = ZAPCOIL.specs!.b;
// Tough, still targets: hits never kill them unless a test says so.
const TANK = enemyDef('fx_tank', { hp: 10_000, speedTilesPerTick: 0 });
const BIG = enemyDef('fx_big', { hp: 20_000, speedTilesPerTick: 0 });

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

describe('the Zapcoil specs (towers.md § 7)', () => {
  it("Overload Coil: chains to 8, −10% a jump, on tier 3's damage, rate, and reach", () => {
    expect(OVERLOAD).toMatchObject({ tier: 4, name: 'Overload Coil', cost: 360 });
    expect(OVERLOAD.attack).toMatchObject({
      kind: 'chain',
      type: 'energy',
      damage: 14,
      cooldownTicks: 50,
      rangeTiles: 2.5,
      jumps: 7,
      falloffPct: 0.1,
    });
    const { state, ctx } = liveSetup();
    placeTower(state, ZAPCOIL, 0, 0, OVERLOAD); // (0.5, 0.5)
    // Nine in a line a tile apart: the first eight are struck, each 10% weaker than the last.
    const line = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => at(state, TANK, 1.5 + k, 0.5));
    towers(state, ctx);
    const hits = line.map(lost);
    expect(hits[8]).toBe(0);
    for (let k = 1; k < 8; k++) expect(round3(hits[k]! / hits[k - 1]!)).toBe(0.9);
  });

  it('Capacitor Bank: a 4 s charge, 250 Energy, 50% within 1 tile, Strong, ground and air', () => {
    expect(CAPACITOR).toMatchObject({ tier: 4, name: 'Capacitor Bank', cost: 360 });
    expect(CAPACITOR.defaultPriority).toBe('strong');
    expect(CAPACITOR.targets).toEqual({ ground: true, air: true });
    expect(CAPACITOR.attack).toMatchObject({
      kind: 'charge',
      type: 'energy',
      damage: 250,
      rangeTiles: 2.5,
      chargeTicks: 240,
      splashTiles: 1,
      splashPct: 0.5,
    });
  });

  it('plays: no gate refuses either spec (attack.charge lifted)', () => {
    const content: CompiledContent<IdSpace> = {
      ...FIXTURE_CONTENT,
      towers: { ...FIXTURE_CONTENT.towers, zapcoil: ZAPCOIL },
    };
    const cfg: SimConfig<IdSpace> = {
      ...fixtureConfig(),
      content,
      loadout: ['zapcoil'],
      specsUnlocked: ['zapcoil'],
    };
    expect(gateRefusals(cfg)).toEqual([]);
  });
});

describe('Capacitor Bank: the charge', () => {
  it('discharges on the 240th tick it holds a target, then charges again from 0', () => {
    const { state, ctx } = liveSetup();
    const t = placeTower(state, ZAPCOIL, 1, 1, CAPACITOR); // (1.5, 1.5)
    const e = at(state, TANK, 2.5, 1.5);
    tick(state, ctx, 239);
    expect(t.chargeTicks).toBe(239);
    expect(t.targetUid).toBe(e.uid);
    expect(lost(e)).toBe(0);
    expect(ofType(state, 'ProjectileFired')).toEqual([]);
    towers(state, ctx);
    expect(t.chargeTicks).toBe(0);
    const once = lost(e);
    expect(once).toBeGreaterThan(0);
    tick(state, ctx, 239);
    expect(lost(e)).toBe(once);
    towers(state, ctx);
    expect(lost(e)).toBe(round3(2 * once));
    expect(t.firstFiredTick).toBe(0);
  });

  it('hits the target, then 50% of the same hit to every enemy within 1 tile of it', () => {
    const { state, ctx } = liveSetup();
    const t = placeTower(state, ZAPCOIL, 1, 1, CAPACITOR);
    const e = at(state, TANK, 2.5, 1.5);
    const near = at(state, TANK, 2.5, 2.5); // 1.0 from the target: in
    const far = at(state, TANK, 3.6, 1.5); // 1.1 away: out
    tick(state, ctx, 240);
    expect(lost(near)).toBe(round3(lost(e) / 2));
    expect(lost(far)).toBe(0);
    const fired = ofType(state, 'ProjectileFired');
    expect(fired).toEqual([
      {
        type: 'ProjectileFired',
        uid: 0,
        towerUid: t.uid,
        kind: 'charge',
        targetUid: e.uid,
        x: 1.5,
        y: 1.5,
        targetX: 2.5,
        targetY: 1.5,
        sprite: null,
        flightTicks: 0,
        radiusTiles: 1,
      },
    ]);
    const hit = ofType(state, 'ProjectileHit');
    expect(hit).toHaveLength(1);
    expect(hit[0]).toMatchObject({ uid: 0, towerUid: t.uid, x: 2.5, y: 1.5, hits: 2 });
    expect(round3(hit[0]!.damage)).toBe(round3(lost(e) + lost(near)));
  });

  it('aims Strong, and keeps its target while it holds, whatever its priority says', () => {
    const { state, ctx } = liveSetup();
    const t = placeTower(state, ZAPCOIL, 1, 1, CAPACITOR);
    expect(t.priority).toBe('strong');
    const e = at(state, TANK, 2.5, 1.5);
    at(state, enemyDef('fx_small', { ...TANK, hp: 100 }), 1.5, 2.5);
    tick(state, ctx, 100);
    expect(t.targetUid).toBe(e.uid);
    const big = at(state, BIG, 0.5, 1.5); // stronger, walks in mid-charge
    tick(state, ctx, 140);
    expect(lost(e)).toBeGreaterThan(0);
    expect(lost(big)).toBe(0);
    // The next charge picks by priority afresh only once it loses its target: it still holds e.
    expect(t.targetUid).toBe(e.uid);
  });
});

describe('Capacitor Bank: what interrupts a charge', () => {
  it('a kill or a leak swings it to a new target in range, keeping the charge', () => {
    const { state, ctx } = liveSetup();
    const t = placeTower(state, ZAPCOIL, 1, 1, CAPACITOR);
    const e = at(state, BIG, 2.5, 1.5);
    const next = at(state, TANK, 1.5, 2.5);
    tick(state, ctx, 150);
    e.alive = false; // killed by another tower, or leaked
    towers(state, ctx);
    expect(t.targetUid).toBe(next.uid);
    expect(t.chargeTicks).toBe(151);
    tick(state, ctx, 89);
    expect(lost(next)).toBeGreaterThan(0);
  });

  it('fizzles when its target dies with nothing else in range', () => {
    const { state, ctx } = liveSetup();
    const t = placeTower(state, ZAPCOIL, 1, 1, CAPACITOR);
    const e = at(state, TANK, 2.5, 1.5);
    tick(state, ctx, 150);
    e.alive = false;
    towers(state, ctx);
    expect(t.chargeTicks).toBe(0);
    expect(t.targetUid).toBe(0);
  });

  it('fizzles when its target escapes (burrows, cloaks, leaves, or walks out of range)', () => {
    const cloaked = enemyDef('fx_cloaked', { ...TANK, cloaked: true, traits: ['cloaked'] });
    for (const escape of ['burrowed', 'cloak', 'leaving', 'range'] as const) {
      const { state, ctx } = liveSetup();
      const t = placeTower(state, ZAPCOIL, 1, 1, CAPACITOR);
      const e = at(state, escape === 'cloak' ? cloaked : BIG, 2.5, 1.5);
      if (escape === 'cloak') e.revealedTicks = 1_000;
      const other = at(state, TANK, 1.5, 2.5);
      tick(state, ctx, 150);
      expect(t.targetUid, escape).toBe(e.uid);
      if (escape === 'burrowed') e.burrowed = true;
      else if (escape === 'leaving') e.leaving = true;
      else if (escape === 'cloak') e.revealedTicks = 0;
      else e.x = 4.5; // 3.0 away: past 2.5
      towers(state, ctx);
      // The work is lost; it swings to what's in range and starts again.
      expect(t.targetUid, escape).toBe(other.uid);
      expect(t.chargeTicks, escape).toBe(1);
    }
  });

  it('a target dropped by the spare-runners filter swings it, keeping the charge', () => {
    const { state, ctx } = liveSetup();
    const t = placeTower(state, ZAPCOIL, 1, 1, CAPACITOR);
    const runner = spawn(state, BIG, { tags: ['fleeing'] });
    runner.x = 2.5;
    runner.y = 1.5;
    const other = at(state, TANK, 1.5, 2.5);
    tick(state, ctx, 100);
    expect(t.targetUid).toBe(runner.uid);
    t.spareRunners = true;
    towers(state, ctx);
    expect(t.targetUid).toBe(other.uid);
    expect(t.chargeTicks).toBe(101);
  });

  it('Hold Fire vents the charge', () => {
    const { state, ctx } = liveSetup();
    const t = placeTower(state, ZAPCOIL, 1, 1, CAPACITOR);
    at(state, TANK, 2.5, 1.5);
    tick(state, ctx, 200);
    t.holdFire = true;
    towers(state, ctx);
    expect(t.chargeTicks).toBe(0);
    t.holdFire = false;
    towers(state, ctx);
    expect(t.chargeTicks).toBe(1);
  });
});

describe('Capacitor Bank: bonuses, links, neutral units', () => {
  it('rate bonuses shorten the charge (+20%: 200 ticks)', () => {
    const attack = CAPACITOR.attack!;
    if (attack.kind !== 'charge') throw new Error('Capacitor Bank charges');
    expect(bonusChargeTicks(attack, { flatRate: 0, pctRate: 0 })).toBe(240);
    expect(bonusChargeTicks(attack, { flatRate: 0, pctRate: 0.2 })).toBe(200);
    const { state, ctx } = liveSetup();
    const t = placeTower(state, ZAPCOIL, 1, 1, CAPACITOR);
    t.pctRate = 0.2; // a power node
    const e = at(state, TANK, 2.5, 1.5);
    tick(state, ctx, 199);
    expect(lost(e)).toBe(0);
    towers(state, ctx);
    expect(lost(e)).toBeGreaterThan(0);
  });

  it("Conductive's Soak lands on every victim; damage bonuses apply to the splash too", () => {
    const { state, ctx } = liveSetup();
    const t = placeTower(state, ZAPCOIL, 1, 1, CAPACITOR);
    t.linkSoakedTicks = 180;
    const e = at(state, TANK, 2.5, 1.5);
    const near = at(state, TANK, 2.5, 2.2);
    tick(state, ctx, 240);
    expect(e.soakedTicks).toBe(180);
    expect(near.soakedTicks).toBe(180);
    const plain = lost(e);
    // The next discharge lands on Soaked targets: +25% Energy on both.
    tick(state, ctx, 240);
    expect(round3(lost(e) - plain)).toBe(round3(plain * 1.25));
  });

  it('a neutral target plinks; the splash still lands round it and passes neutral units by', () => {
    const gerald = enemyDef('fx_gerald', { ...LIVE.enemies.gerald, speedTilesPerTick: 0 });
    const { state, ctx } = liveSetup();
    const t = placeTower(state, ZAPCOIL, 1, 1, CAPACITOR);
    const g = at(state, gerald, 2.5, 1.5);
    const near = at(state, enemyDef('fx_small', { ...TANK, hp: 50 }), 2.5, 2.2);
    const other = at(state, gerald, 2.5, 2.0); // a second neutral unit, in the splash
    tick(state, ctx, 240);
    // Strong picks Gerald (100 HP over 50; ties to the lower uid).
    expect(ofType(state, 'ProjectileFired')[0]?.targetUid).toBe(g.uid);
    expect(ofType(state, 'NeutralHit')).toHaveLength(1);
    expect(g.hp).toBe(gerald.hp);
    expect(other.hp).toBe(gerald.hp);
    expect(lost(near)).toBeGreaterThan(0);
    expect(ofType(state, 'ProjectileHit')[0]?.hits).toBe(1);
    expect(t.chargeTicks).toBe(0);
  });
});
