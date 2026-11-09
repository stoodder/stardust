// M3's companion abilities and protocols (T304d): Time Dilation (a map-wide `field` zone: every
// enemy Chilled 40% for 6 s, bosses at half through applyChill), Clearance Sale (the next 3
// purchases 40% off, spent per purchase; a cooldown of 4 waves), Rapid Deploy (`firstBuildFree`),
// Ready Room (`freeCast`), and Suppressing Fire passing air units by (Gerald, D072). The live
// abilities are slotted on the fixture map: fx_gun builds for 100 and upgrades for 80 then 150
// (its specs 300); fx_map starts with 200 credits.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { CompiledContent } from '../../content/compiled.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import { BOSS_CHILL_MULT } from '../../content/rules.ts';
import type { IdSpace } from '../../content/types.ts';
import { enemyDef, setup as setupFixture, spawn, WALKER } from '../__fixtures__/combat.ts';
import { FIXTURE_CONTENT, fixtureConfig } from '../__fixtures__/sim.ts';
import type { Command } from '../commands.ts';
import type { Modifier, SimConfig } from '../config.ts';
import { pay, purchaseCost, purchasePriceInto, sellValue, type PurchaseState } from '../economy.ts';
import type { SimEvent } from '../events.ts';
import { gateRefusals } from '../gates.ts';
import { createSim, type Sim } from '../sim.ts';
import {
  abilities,
  abilityReady,
  abilityStats,
  applyAbilityCommand,
  freeCastReady,
} from './abilities.ts';

const LIVE = compileContent(RAW_CONTENT);
const TD = LIVE.abilities.time_dilation;
const SALE = LIVE.abilities.clearance_sale;
const DURATION = 360; // 6 s

/** The fixture content with the live abilities added. */
const CONTENT: CompiledContent<IdSpace> = {
  ...FIXTURE_CONTENT,
  abilities: { ...FIXTURE_CONTENT.abilities, ...LIVE.abilities },
};

/** A config on fx_map with the live abilities; `over` applied. */
function config(over: Partial<SimConfig<IdSpace>> = {}): SimConfig<IdSpace> {
  return { ...fixtureConfig(), content: CONTENT, ...over };
}

const QUILL: Partial<SimConfig<IdSpace>> = {
  content: CONTENT,
  companion: 'quill',
  abilities: { slot1: 'fx_strike', slot2: 'time_dilation', slot2State: 'present' },
};
const ZIBZAB: Partial<SimConfig<IdSpace>> = {
  content: CONTENT,
  companion: 'zibzab',
  abilities: { slot1: 'fx_strike', slot2: 'clearance_sale', slot2State: 'present' },
};
const cast2 = { type: 'ability', slot: 2 } as const;

/** combat.ts's bare state and tick context, with the live abilities in the content. */
function setup(over: Partial<SimConfig<IdSpace>> = {}): ReturnType<typeof setupFixture> {
  const s = setupFixture(over);
  return { state: s.state, ctx: { ...s.ctx, content: CONTENT } };
}

/** Runs the abilities system `n` times, advancing the tick. */
function tickAbilities(s: ReturnType<typeof setup>, n: number): void {
  for (let i = 0; i < n; i++) {
    abilities(s.state, s.ctx);
    s.state.tick++;
  }
}

/** Starts wave `w` on the current tick, as the waves system does. */
function startWave(s: ReturnType<typeof setup>, w: number): void {
  s.state.wave = w;
  s.state.schedule.startTick[w - 1] = s.state.tick;
}

describe('the content (core-loop.md § 3.2)', () => {
  it('Time Dilation: 40% for 6 s, 60 s; its boss rate is the boss rule applied to it', () => {
    expect(TD.cooldownTicks).toBe(3600);
    expect(TD.effect).toEqual({
      kind: 'slowAll',
      slowPct: 0.4,
      bossSlowPct: 0.2,
      durationTicks: DURATION,
    });
    // bossSlowPct is what the HUD shows; the sim halves slowPct on a boss (applyChill), so the
    // two must agree.
    if (TD.effect.kind !== 'slowAll') throw new Error('unreachable');
    expect(TD.effect.bossSlowPct).toBeCloseTo(TD.effect.slowPct * BOSS_CHILL_MULT, 9);
  });

  it('Clearance Sale: 3 purchases 40% off, once per 4 waves', () => {
    expect(SALE).toMatchObject({ cooldownTicks: 0, cooldownWaves: 4 });
    expect(SALE.effect).toEqual({ kind: 'discount', pct: 0.4, charges: 3 });
  });

  it('every T304d gate is open', () => {
    const cfg = config({
      ...ZIBZAB,
      modifiers: [
        { kind: 'firstBuildFree', source: 'protocol:rapid_deploy' },
        { kind: 'freeCast', wave: 1, source: 'protocol:ready_room' },
      ],
    });
    expect(gateRefusals(cfg)).toEqual([]);
    expect(gateRefusals(config(QUILL))).toEqual([]);
  });
});

describe('Time Dilation', () => {
  it('takes no target, opens a field zone, and starts its 60 s cooldown', () => {
    const s = setup(QUILL);
    expect(applyAbilityCommand(s.state, s.ctx, cast2)).toBeNull();
    expect(s.state.abilityCooldownTicks).toEqual([0, 3600]);
    expect(s.state.abilityCooldownWaves).toEqual([0, 0]);
    const z = s.state.zones.items[0]!;
    expect(z).toMatchObject({ alive: true, kind: 'field', ticksLeft: DURATION, slowPct: 0.4 });
    expect(z.abilitySlot).toBe(2);
    expect(s.state.events).toContainEqual({
      type: 'AbilityUsed',
      slot: 2,
      uid: z.uid,
      ability: 'time_dilation',
      target: null,
    });
    // A target, if sent, is ignored.
    const t = setup(QUILL);
    expect(applyAbilityCommand(t.state, t.ctx, { ...cast2, target: [9, 9] })).toBeNull();
  });

  it('slows every enemy 40% for 6 s, air and late spawns included; a boss gets half', () => {
    const s = setup(QUILL);
    const walker = spawn(s.state, WALKER, { dist: 1 });
    const flyer = spawn(s.state, enemyDef('fx_flyer', { layer: 'air' }), { dist: 2 });
    const boss = spawn(s.state, enemyDef('fx_boss', { boss: LIVE.enemies.chitterbloom.boss }), {
      dist: 3,
    });
    expect(applyAbilityCommand(s.state, s.ctx, cast2)).toBeNull();
    tickAbilities(s, 1);
    expect(walker.chillPct).toBe(0.4);
    expect(flyer.chillPct).toBe(0.4);
    expect(boss.chillPct).toBeCloseTo(0.2, 9);
    const late = spawn(s.state, WALKER, { dist: 0 });
    tickAbilities(s, 1);
    expect(late.chillPct).toBe(0.4);
    tickAbilities(s, DURATION - 3);
    expect(s.state.zones.items[0]!.alive).toBe(true);
    tickAbilities(s, 1); // the 360th tick: its last
    expect(s.state.zones.items[0]!.alive).toBe(false);
    expect(walker.chillTicks).toBe(1); // the last refresh covers this movement tick only
  });

  it('passes a neutral unit by (Gerald is not an enemy)', () => {
    const s = setup(QUILL);
    const gerald = spawn(s.state, LIVE.enemies.gerald, { dist: 1 });
    expect(applyAbilityCommand(s.state, s.ctx, cast2)).toBeNull();
    tickAbilities(s, 2);
    expect(gerald.chillPct).toBe(0);
  });

  it('a stronger chill already on a unit wins (the strongest source)', () => {
    const s = setup(QUILL);
    const w = spawn(s.state, WALKER, { dist: 1 });
    w.chillPct = 0.5;
    w.chillTicks = 100;
    expect(applyAbilityCommand(s.state, s.ctx, cast2)).toBeNull();
    tickAbilities(s, 1);
    expect(w.chillPct).toBe(0.5);
  });
});

describe('Suppressing Fire passes air units by (D072)', () => {
  it("doesn't slow or hurt Gerald, who flies the ground path", () => {
    const s = setup({
      companion: 'bricks',
      abilities: { slot1: 'fx_strike', slot2: 'fx_suppress', slot2State: 'present' },
    });
    const gerald = spawn(s.state, enemyDef('fx_gerald', { ...LIVE.enemies.gerald }), { dist: 4 });
    const walker = spawn(s.state, WALKER, { dist: 4 });
    expect(applyAbilityCommand(s.state, s.ctx, { type: 'ability', slot: 2, target: [2, 2] })).toBe(
      null,
    );
    tickAbilities(s, 30);
    expect(gerald.chillPct).toBe(0);
    expect(gerald.hp).toBe(gerald.def!.hp);
    expect(walker.chillPct).toBe(0.5);
    expect(walker.hp).toBeLessThan(WALKER.hp);
  });
});

describe('Clearance Sale', () => {
  it('loads 3 charges at 40% and starts a 4-wave cooldown', () => {
    const s = setup(ZIBZAB);
    startWave(s, 1);
    s.state.tick++; // cast after wave 1's start tick
    expect(applyAbilityCommand(s.state, s.ctx, cast2)).toBeNull();
    expect(s.state).toMatchObject({ discountCharges: 3, discountPct: 0.4 });
    expect(s.state.abilityCooldownTicks).toEqual([0, 0]);
    expect(s.state.abilityCooldownWaves).toEqual([0, 4]);
    expect(s.state.events).toContainEqual({
      type: 'AbilityUsed',
      slot: 2,
      uid: 0,
      ability: 'clearance_sale',
      target: null,
    });
    expect(applyAbilityCommand(s.state, s.ctx, cast2)).toBe('abilityOnCooldown');
    expect(abilityReady(s.state, 2)).toBe(false);
    expect(abilityReady(s.state, 1)).toBe(true);
  });

  it('counts its cooldown in wave starts: cast in W1, ready as W5 starts', () => {
    const s = setup(ZIBZAB);
    startWave(s, 1);
    tickAbilities(s, 1);
    expect(applyAbilityCommand(s.state, s.ctx, cast2)).toBeNull();
    tickAbilities(s, 5000); // time alone never readies it
    for (const w of [2, 3, 4]) {
      startWave(s, w);
      tickAbilities(s, 1);
      expect(abilityReady(s.state, 2), `W${w}`).toBe(false);
    }
    expect(s.state.abilityCooldownWaves[1]).toBe(1);
    startWave(s, 5);
    tickAbilities(s, 1);
    expect(abilityReady(s.state, 2)).toBe(true);
    expect(applyAbilityCommand(s.state, s.ctx, cast2)).toBeNull();
  });

  it("a wave that starts on the cast's tick counts only if it starts after the cast", () => {
    // Cast after the wave started this tick (a callWave earlier in the queue): it doesn't count.
    const before = setup(ZIBZAB);
    startWave(before, 2);
    expect(applyAbilityCommand(before.state, before.ctx, cast2)).toBeNull();
    tickAbilities(before, 1);
    expect(before.state.abilityCooldownWaves[1]).toBe(4);
    // Cast before the wave starts this tick (the waves system runs after applyCommands): it does.
    const after = setup(ZIBZAB);
    after.state.wave = 1;
    expect(applyAbilityCommand(after.state, after.ctx, cast2)).toBeNull();
    startWave(after, 2);
    tickAbilities(after, 1);
    expect(after.state.abilityCooldownWaves[1]).toBe(3);
  });

  it('takes cooldown percentages in whole waves: Coolant keeps 4, Rapport makes 3', () => {
    expect(abilityStats(SALE, [])).toMatchObject({ cooldownTicks: 0, cooldownWaves: 4 });
    expect(abilityStats(SALE, [cd(-0.05)]).cooldownWaves).toBe(4);
    expect(abilityStats(SALE, [cd(-0.15)]).cooldownWaves).toBe(3);
    expect(abilityStats(SALE, [cd(-0.15), cd(-0.05)]).cooldownWaves).toBe(3);
    expect(abilityStats(SALE, [cd(-0.99)]).cooldownWaves).toBe(1);
    expect(abilityStats(TD, [cd(-0.15)])).toMatchObject({ cooldownTicks: 3060, cooldownWaves: 0 });
  });
});

/** Every ability's cooldown × (1 + pct). */
function cd(pct: number): Modifier<IdSpace> {
  return { kind: 'abilityStat', ability: '*', stat: 'cooldown', pct, source: 't' };
}

/** What a price reads, after one build by default. */
function state(over: Partial<PurchaseState> = {}): PurchaseState {
  return { stats: { towersBuilt: 1 }, discountCharges: 0, discountPct: 0, ...over };
}

describe('purchase prices (economy.ts purchasePriceInto and pay)', () => {
  const tuneUp: Modifier<IdSpace> = {
    kind: 'towerCost',
    tower: '*',
    tiers: 'all',
    pct: -0.1,
    source: 't',
  };
  const free: Modifier<IdSpace> = { kind: 'firstBuildFree', source: 'protocol:rapid_deploy' };

  it('a sale takes 40% off after the modifiers, rounded', () => {
    const sale = state({ discountCharges: 2, discountPct: 0.4 });
    expect(purchaseCost(sale, [], 'x', 100, 'build')).toBe(60);
    expect(purchaseCost(sale, [], 'x', 125, 'upgrade')).toBe(75);
    expect(purchaseCost(sale, [], 'x', 300, 'spec')).toBe(180);
    expect(purchaseCost(sale, [tuneUp], 'x', 100, 'build')).toBe(54); // 90 × 0.6
    expect(purchaseCost(state(), [tuneUp], 'x', 100, 'build')).toBe(90);
    const out = { cost: 0, discounted: false };
    expect(purchasePriceInto(sale, [], 'x', 100, 'build', out)).toEqual({
      cost: 60,
      discounted: true,
    });
  });

  it("Rapid Deploy: the run's first build is free and spends no sale charge", () => {
    const first = state({ stats: { towersBuilt: 0 }, discountCharges: 3, discountPct: 0.4 });
    expect(purchaseCost(first, [free], 'x', 100, 'build')).toBe(0);
    expect(
      purchasePriceInto(first, [free], 'x', 100, 'build', { cost: 0, discounted: false }),
    ).toEqual({ cost: 0, discounted: false });
    expect(purchaseCost(first, [free], 'x', 80, 'upgrade')).toBe(48); // upgrades never
    expect(purchaseCost(state(), [free], 'x', 100, 'build')).toBe(100); // the second build
    expect(purchaseCost({ ...first, discountCharges: 0 }, [], 'x', 100, 'build')).toBe(100);
  });

  it('pay spends credits and one charge per discounted purchase, and refuses a short bank', () => {
    const s = setup();
    s.state.credits = 200;
    s.state.discountCharges = 2;
    s.state.discountPct = 0.4;
    expect(pay(s.state, [], 'fx_gun', 100, 'build')).toBe(60);
    expect(s.state).toMatchObject({ credits: 140, discountCharges: 1, discountPct: 0.4 });
    expect(s.state.stats.creditsSpent).toBe(60);
    expect(pay(s.state, [], 'fx_gun', 300, 'spec')).toBe(-1); // 180 > 140
    expect(s.state).toMatchObject({ credits: 140, discountCharges: 1 });
    expect(pay(s.state, [], 'fx_gun', 100, 'build')).toBe(60);
    expect(s.state).toMatchObject({ credits: 80, discountCharges: 0, discountPct: 0 });
    expect(pay(s.state, [], 'fx_gun', 100, 'build')).toBe(-1);
  });
});

type Ev = SimEvent<IdSpace>;
const gun = (col: number, row: number): Command<IdSpace> => ({
  type: 'build',
  tile: [col, row],
  tower: 'fx_gun',
});

function sim(over: Partial<SimConfig<IdSpace>>): Sim<IdSpace> {
  return createSim(config(over));
}
function steps(s: ReturnType<typeof sim>, n: number): void {
  for (let i = 0; i < n; i++) s.step();
}
function drain(s: ReturnType<typeof sim>): Ev[] {
  const out: Ev[] = [];
  s.drainEvents(out);
  return out;
}

describe('through the sim', () => {
  it('Clearance Sale discounts the next 3 builds and upgrades; a sell refunds what was paid', () => {
    const s = sim(ZIBZAB);
    s.enqueue(cast2);
    s.enqueue(gun(1, 1)); // 60
    s.applyPending();
    const built = drain(s).find((e) => e.type === 'TowerBuilt');
    expect(built).toMatchObject({ type: 'TowerBuilt', cost: 60 });
    const uid = built?.type === 'TowerBuilt' ? built.uid : 0;
    s.enqueue({ type: 'upgrade', towerUid: uid }); // 80 → 48
    s.enqueue(gun(3, 1)); // 60, the last charge
    s.enqueue(gun(4, 2)); // full price: 100 > 32 left, refused
    s.applyPending();
    const ev = drain(s);
    expect(ev.find((e) => e.type === 'TowerUpgraded')).toMatchObject({ cost: 48 });
    expect(ev.filter((e) => e.type === 'TowerBuilt').map((e) => e.cost)).toEqual([60]);
    expect(ev.find((e) => e.type === 'CommandRejected' && e.cmd.type === 'build')).toMatchObject({
      reason: 'cantAfford',
    });
    expect(s.state.credits).toBe(200 - 60 - 48 - 60);
    expect(s.state.discountCharges).toBe(0);
    expect(s.state.stats.creditsSpent).toBe(168);
    const tower = s.state.towers.items.find((t) => t.alive && t.uid === uid)!;
    expect(tower.invested).toBe(108);
    // Past the misclick grace, a sell refunds 70% of what was actually paid.
    expect(sellValue(tower, tower.builtTick + 10_000).value).toBe(75);
  });

  it('Rapid Deploy makes the first build free (refunds 0) and only the first', () => {
    const s = sim({ modifiers: [{ kind: 'firstBuildFree', source: 'protocol:rapid_deploy' }] });
    s.enqueue(gun(1, 1));
    s.enqueue(gun(3, 1));
    s.applyPending();
    const costs = drain(s).flatMap((e) => (e.type === 'TowerBuilt' ? [e.cost] : []));
    expect(costs).toEqual([0, 100]);
    expect(s.state.credits).toBe(100);
    const first = s.state.towers.items.find((t) => t.alive && t.col === 1)!;
    expect(first.invested).toBe(0);
    s.enqueue({ type: 'sell', towerUid: first.uid });
    s.enqueue(gun(1, 1)); // the next build pays full price
    s.applyPending();
    expect(drain(s).find((e) => e.type === 'TowerBuilt')).toMatchObject({ cost: 100 });
  });

  it('Ready Room: the first cast of each slot in wave 1 starts no cooldown', () => {
    const mods: Modifier<IdSpace>[] = [
      { kind: 'freeCast', wave: 1, source: 'protocol:ready_room' },
    ];
    const s = sim({ ...QUILL, modifiers: mods });
    // Before wave 1 (the setup phase) there's no free cast.
    expect(freeCastReady(s.state, mods, 2)).toBe(false);
    s.enqueue({ type: 'callWave' });
    s.step();
    expect(s.state.wave).toBe(1);
    expect(freeCastReady(s.state, mods, 2)).toBe(true);
    s.enqueue(cast2);
    s.step();
    expect(s.state.abilityCooldownTicks[1]).toBe(0);
    expect(s.state.freeCastWave).toEqual([0, 1]);
    expect(freeCastReady(s.state, mods, 2)).toBe(false);
    expect(freeCastReady(s.state, mods, 1)).toBe(true);
    s.enqueue(cast2); // the second cast pays
    s.step();
    expect(s.state.abilityCooldownTicks[1]).toBe(3599);
    expect(s.state.stats.abilityUses).toBe(2);
    expect(s.state.zones.items.filter((z) => z.alive && z.kind === 'field')).toHaveLength(2);
  });

  it('Ready Room covers a wave-count cooldown too (a second sale of 3 charges)', () => {
    const s = sim({ ...ZIBZAB, modifiers: [{ kind: 'freeCast', wave: 1, source: 'r' }] });
    s.enqueue({ type: 'callWave' });
    s.step();
    s.enqueue(cast2);
    s.step();
    expect(s.state.abilityCooldownWaves).toEqual([0, 0]);
    s.enqueue(cast2);
    s.step();
    expect(s.state.abilityCooldownWaves).toEqual([0, 4]);
    expect(s.state.discountCharges).toBe(3);
  });

  it('is deterministic with a Time Dilation cast mid-wave', () => {
    expect(dilatedRun()).toBe(dilatedRun());
  });
});

/** A Time Dilation cast 1 s into wave 1, run 10 s on; returns the hash. */
function dilatedRun(): string {
  const s = sim(QUILL);
  s.enqueue({ type: 'callWave' });
  steps(s, 60);
  s.enqueue(cast2);
  steps(s, 600);
  return s.hash();
}
