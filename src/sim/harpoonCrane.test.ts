// T408: the Grapple Harpoon and the Salvage Crane. Pinned (systems/status.ts; enemies.md § 2.4),
// Skewer's line (attacks/line.ts), Magnet Crane's target filter (combat/targeting.ts), the Crane's
// economy and Reel It In's credits (towerEconomy.ts), with the live data on fx_map: road `a` (0,0)
// → (2,0) → (2,3) → (3,3) → (3,4) → (5,4), and the air lane `sky`, (2,0) to (5,4).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { BOSS_CONVERTED_CHILL, statusMask } from '../content/rules.ts';
import type { IdSpace } from '../content/types.ts';
import { MAP, WALKER, enemyDef, placeTower, setup, spawn } from './__fixtures__/combat.ts';
import { hasStatusIn } from './bonuses.ts';
import type { SimConfig } from './config.ts';
import { applyDamage, applyEffects } from './combat/damage.ts';
import { canHit } from './combat/targeting.ts';
import type { SimEvent } from './events.ts';
import { gateRefusals } from './gates.ts';
import { createSim } from './sim.ts';
import type { SimState } from './state.ts';
import { cleanup } from './systems/cleanup.ts';
import { enemySpeedPerTick } from './systems/movement.ts';
import { PIN_IMMUNITY_TICKS, applyPin, isInterrupted, status } from './systems/status.ts';
import { towers } from './systems/towers.ts';
import { wreckage } from './systems/wreckage.ts';
import { interestOn, payKillIncome, payWaveIncome, perWaveIncome } from './towerEconomy.ts';

const LIVE = compileContent(RAW_CONTENT);
const HARPOON = LIVE.towers.harpoon;
const CRANE = LIVE.towers.crane;
const SKEWER = HARPOON.specs!.a;
const TETHER = HARPOON.specs!.b;
const HAGGLER = CRANE.specs!.a;
const MAGNET = CRANE.specs!.b;
const PUFFWING = LIVE.enemies.puffwing;
const BOSS = enemyDef('fx_boss', { boss: LIVE.enemies.chitterbloom.boss });
const TANK = enemyDef('fx_tank', { hp: 500, armor: 10 });
const DRONE = enemyDef('fx_drone', { hp: 500, body: 'mechanical' });
const SKY = MAP.routes.sky!;
const SRC = { kind: 'tower', uid: 0 } as const;
const GROUND_ONLY = { ground: true, air: false } as const;

type Ev = SimEvent<IdSpace>;
const ofType = <T extends Ev['type']>(state: SimState, type: T): Extract<Ev, { type: T }>[] =>
  state.events.filter((e): e is Extract<Ev, { type: T }> => e.type === type);

describe('Pinned (enemies.md § 2.4)', () => {
  it('holds a non-boss without interrupting it, then gives 1 s of immunity; never extends', () => {
    const { state } = setup();
    const e = spawn(state, WALKER, { dist: 2 });
    expect(applyPin(e, 60)).toBe(true);
    expect(enemySpeedPerTick(e)).toBe(0);
    expect(isInterrupted(e)).toBe(false); // only Stasis (and M5's Unnerved) interrupts
    expect(hasStatusIn(e, statusMask(['pinned']))).toBe(true);
    status(state);
    expect(applyPin(e, 120)).toBe(false); // no extension while it runs
    for (let i = 0; i < 59; i++) status(state);
    expect(e.pinnedTicks).toBe(0);
    expect(e.pinImmuneTicks).toBe(PIN_IMMUNITY_TICKS);
    expect(enemySpeedPerTick(e)).toBeGreaterThan(0);
    expect(applyPin(e, 60)).toBe(false);
    for (let i = 0; i < PIN_IMMUNITY_TICKS; i++) status(state);
    expect(applyPin(e, 60)).toBe(true);
  });

  it('grounds a pinned flyer: ground-only towers can hit it while the Pin holds', () => {
    const { state } = setup();
    const flyer = spawn(state, PUFFWING, { route: SKY, dist: 1 });
    expect(canHit(flyer, GROUND_ONLY)).toBe(false);
    applyEffects(flyer, [{ status: 'pinned', durationTicks: 30 }]);
    expect(canHit(flyer, GROUND_ONLY)).toBe(true);
    flyer.pinnedTicks = 0;
    expect(canHit(flyer, GROUND_ONLY)).toBe(false);
  });

  it('is Chilled 50% on a boss (not halved again), with no immunity', () => {
    const { state } = setup();
    const boss = spawn(state, BOSS, { dist: 2 });
    expect(applyPin(boss, 150)).toBe(false);
    expect(boss.pinnedTicks + boss.pinImmuneTicks).toBe(0);
    expect(boss.chillPct).toBe(BOSS_CONVERTED_CHILL);
    expect(boss.chillTicks).toBe(150);
  });

  it('Tether: 80 damage, then a 2.5 s Pin on the flyer it hits', () => {
    const { state, ctx } = setup();
    expect(TETHER.name).toBe('Tether');
    placeTower(state, HARPOON, 1, 1, TETHER);
    const flyer = spawn(state, enemyDef('fx_bird', { ...PUFFWING, hp: 500 }), {
      route: SKY,
      dist: 1,
    });
    towers(state, ctx);
    expect(ofType(state, 'ProjectileFired')[0]?.kind).toBe('hitscan');
    expect(flyer.hp).toBe(420);
    expect(flyer.pinnedTicks).toBe(150);
  });
});

describe("Skewer's line (attacks/line.ts)", () => {
  it('pierces every enemy along a 5-tile line through its target, 70 each past armor pierce 8', () => {
    const { state, ctx } = setup();
    expect(SKEWER.name).toBe('Skewer');
    // The tower at (2.5, 4.5) looks up road a's column x = 2.5.
    const t = placeTower(state, HARPOON, 2, 4, SKEWER);
    const near = spawn(state, TANK, { dist: 4 }); // (2.5, 2.5): 2 tiles up
    const mid = spawn(state, TANK, { dist: 3 }); // (2.5, 1.5)
    const far = spawn(state, TANK, { dist: 2 }); // (2.5, 0.5): 4 tiles up
    const beside = spawn(state, TANK, { dist: 1 }); // (1.5, 0.5): a tile off the line
    towers(state, ctx);
    const fired = ofType(state, 'ProjectileFired')[0]!;
    expect(fired).toMatchObject({ kind: 'line', towerUid: t.uid, x: 2.5, y: 4.5 });
    expect(fired.targetX).toBeCloseTo(2.5);
    expect(fired.targetY).toBeCloseTo(-0.5); // 5 tiles from the tower
    const hit = ofType(state, 'ProjectileHit')[0]!;
    expect(hit.hits).toBe(3);
    expect(hit.damage).toBeCloseTo(3 * 68); // armor 10 − pierce 8
    for (const e of [near, mid, far]) expect(e.hp).toBeCloseTo(500 - 68);
    expect(beside.hp).toBe(500);
    expect(t.cooldownTicks).toBe(120); // 0.5 shots/s
  });
});

describe("Magnet Crane's grab (a target filter)", () => {
  it('picks only Mechanical or armored ground units, slams for 150, and Pins 1.5 s', () => {
    const { state, ctx } = setup();
    expect(MAGNET.name).toBe('Magnet Crane');
    const t = placeTower(state, CRANE, 1, 1, MAGNET);
    const soft = spawn(state, enemyDef('fx_big', { hp: 900 }), { dist: 2 }); // strongest, no match
    const drone = spawn(state, DRONE, { dist: 3 });
    towers(state, ctx);
    expect(t.targetUid).toBe(drone.uid);
    expect(drone.hp).toBe(350);
    expect(drone.pinnedTicks).toBe(90);
    expect(soft.hp).toBe(900);
    // An armored organic passes the filter too; with no match it holds its fire.
    const { state: s2, ctx: c2 } = setup();
    placeTower(s2, CRANE, 1, 1, MAGNET);
    const tank = spawn(s2, TANK, { dist: 2 });
    towers(s2, c2);
    expect(tank.hp).toBeLessThan(500);
    const { state: s3, ctx: c3 } = setup();
    placeTower(s3, CRANE, 1, 1, MAGNET);
    spawn(s3, WALKER, { dist: 2 });
    towers(s3, c3);
    expect(ofType(s3, 'ProjectileFired')).toEqual([]);
  });
});

describe('the Crane economy (towerEconomy.ts)', () => {
  it('pays per wave as each wave resolves: +10 / +18 / +28, × its income tune-up', () => {
    expect(CRANE.tiers.map((x) => x.economy?.perWave)).toEqual([10, 18, 28]);
    expect([10, 18, 28].map((n) => perWaveIncome(n, 0.05))).toEqual([11, 19, 29]);
    const { state, ctx } = setup();
    placeTower(state, CRANE, 1, 1, 1);
    placeTower(state, CRANE, 3, 1, 3);
    state.credits = 0;
    state.wave = 1;
    state.schedule.startTick[0] = 0; // wave 1 started, nobody left in it
    state.schedule.remaining[0] = 0;
    cleanup(state, ctx);
    const paid = ofType(state, 'TowerIncome').map((e) => [e.kind, e.credits, e.wave]);
    expect(paid).toEqual([
      ['wave', 10, 1],
      ['wave', 28, 1],
    ]);
    const bonus = ofType(state, 'WaveCleared')[0]!.bonus;
    expect(state.credits).toBe(bonus + 38);
  });

  it("Haggler's Stall: 2% interest on the bank once a wave, capped at 40; Stalls don't stack", () => {
    expect(interestOn(1000, 0.02, 40)).toBe(20);
    expect(interestOn(1999, 0.02, 40)).toBe(39);
    expect(interestOn(5000, 0.02, 40)).toBe(40);
    const { state } = setup();
    placeTower(state, CRANE, 1, 1, HAGGLER);
    placeTower(state, CRANE, 3, 1, HAGGLER);
    state.credits = 1000;
    payWaveIncome(state, [], 4);
    // Two Stalls: +28 each, then one interest on 1,056.
    const paid = ofType(state, 'TowerIncome').map((e) => [e.kind, e.credits]);
    expect(paid).toEqual([
      ['wave', 28],
      ['wave', 28],
      ['interest', 21],
    ]);
    expect(state.credits).toBe(1077);
  });

  it('kill credits: each Crane whose radius holds the killing tower, plus Reel It In', () => {
    const { state } = setup();
    const gun = placeTower(state, HARPOON, 2, 1);
    placeTower(state, CRANE, 1, 1, 3); // 1 tile away: +2
    placeTower(state, CRANE, 5, 4, 1); // 4.2 tiles away: nothing
    gun.linkKillCredits = 3; // Reel It In (systems/links.ts sums it)
    const e = spawn(state, WALKER, { dist: 2 });
    state.credits = 0;
    applyDamage(state, e, 999, 'kinetic', { kind: 'tower', uid: gun.uid });
    const paid = ofType(state, 'TowerIncome').map((x) => [x.towerUid, x.credits]);
    expect(paid).toEqual([
      [gun.uid, 3],
      [state.towers.items[1]!.uid, 2],
    ]);
    expect(state.credits).toBe(WALKER.bounty + 5);
    // A spared runner, and a kill by anything but a tower, pay no kill credits.
    state.events.length = 0;
    const runner = spawn(state, WALKER, { dist: 2, tags: ['fleeing'] });
    applyDamage(state, runner, 999, 'kinetic', { kind: 'tower', uid: gun.uid });
    payKillIncome(state, spawn(state, WALKER, { dist: 2 }), SRC);
    expect(ofType(state, 'TowerIncome')).toEqual([]);
  });

  it('clears wreckage in its radius twice as fast for +25% salvage', () => {
    const { state, ctx } = setup();
    placeTower(state, CRANE, 3, 2); // (3.5, 2.5): the wreck at (4.5, 3.5) is 1.41 tiles away
    state.wreckage.queue.push(3 * MAP.cols + 4);
    let ticks = 0;
    while (state.wreckage.queue.length > 0) {
      wreckage(state, ctx);
      ticks++;
    }
    expect(ticks).toBe(180); // 6 s at double speed
    expect(ofType(state, 'WreckageCleared')[0]?.salvage).toBe(50); // 40 × 1.25
  });
});

describe('in play (T408)', () => {
  it('plays deterministically on A2M1 with both towers, both specs, and Reel It In', () => {
    const cfg: SimConfig<IdSpace> = {
      content: LIVE,
      mapId: 'a2_m01',
      seed: 3,
      loadout: ['harpoon', 'crane', 'thumper', 'zapcoil'],
      companion: null,
      modifiers: [{ kind: 'economy', stat: 'startCredits', flat: 5000, source: 'test' }],
      difficulty: 'standard',
      abilities: { slot1: 'orbital_strike', slot2: null, slot2State: 'none' },
      scriptFlags: {},
      specsUnlocked: ['harpoon', 'crane'],
    };
    expect(gateRefusals(cfg)).toEqual([]);
    const run = (): { hash: string; counts: Record<string, number> } => {
      const sim = createSim(cfg);
      // A Skewer by the Spires road's drop beside a Haggler's Stall (Reel It In: diagonal), a
      // Tether south-west of the merge, and a Thumper and Zapcoil from par's pads.
      const plan = [
        ['harpoon', [6, 4], 'a'],
        ['crane', [7, 5], 'a'],
        ['harpoon', [7, 7], 'b'],
        ['thumper', [9, 7], null],
        ['zapcoil', [10, 5], null],
      ] as const;
      for (const [tower, tile] of plan) sim.enqueue({ type: 'build', tile, tower });
      sim.enqueue({ type: 'callWave' });
      sim.step();
      for (const t of sim.state.towers.items) {
        const spec = plan.find(([, [c, r]]) => c === t.col && r === t.row)?.[2] ?? null;
        if (!t.alive || spec === null) continue;
        sim.enqueue({ type: 'upgrade', towerUid: t.uid });
        sim.enqueue({ type: 'upgrade', towerUid: t.uid });
        sim.enqueue({ type: 'specialize', towerUid: t.uid, spec });
      }
      const counts: Record<string, number> = {};
      const count = (k: string): void => {
        counts[k] = (counts[k] ?? 0) + 1;
      };
      const events: Ev[] = [];
      for (let i = 0; i < 60 * 150 && sim.state.outcome === 'playing'; i++) {
        sim.step();
        events.length = 0;
        sim.drainEvents(events);
        for (const e of events) {
          if (e.type === 'CommandRejected') count('rejected');
          if (e.type === 'TowerIncome') count(e.kind);
          if (e.type === 'ProjectileFired' && e.kind === 'line') count('line');
          if (e.type === 'LinkFormed' && e.link === 'reel_it_in') count('reel');
        }
      }
      return { hash: sim.hash(), counts };
    };
    const a = run();
    expect(a.counts.rejected).toBeUndefined();
    expect(a.counts).toMatchObject({ reel: 1 });
    for (const k of ['wave', 'kill', 'interest', 'line']) expect(a.counts[k], k).toBeGreaterThan(0);
    expect(run()).toEqual(a);
  });
});
