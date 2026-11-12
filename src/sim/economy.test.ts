// The credits economy (design/core-loop.md § 2.3–2.4): the rule formulas, sell values and the
// misclick grace, bounties, and the sell command through the sim.
import { describe, expect, it } from 'vitest';
import {
  EARLY_CALL_BONUS_SHARE,
  earlyCallBonus,
  MISCLICK_GRACE_SEC,
  waveClearBonus,
} from '../content/rules.ts';
import { WALKER, setup, spawn } from './__fixtures__/combat.ts';
import { fixtureSim, type FixtureIds } from './__fixtures__/sim.ts';
import { applyDamage } from './combat/damage.ts';
import type { Command } from './commands.ts';
import type { Modifier } from './config.ts';
import {
  MISCLICK_GRACE_TICKS,
  bountyFor,
  callWaveBonus,
  costFor,
  payBounty,
  sellValue,
  sellValueInto,
} from './economy.ts';
import type { SimEvent } from './events.ts';

type Ev = SimEvent<FixtureIds>;
const drain = (sim: ReturnType<typeof fixtureSim>): Ev[] => {
  const out: Ev[] = [];
  sim.drainEvents(out);
  return out;
};
const gun = (col: number, row: number): Command<FixtureIds> => ({
  type: 'build',
  tile: [col, row],
  tower: 'fx_gun',
});

describe('rule formulas', () => {
  it('the clear bonus is 20 + 4 × wave (wave 1 pays 24)', () => {
    expect([1, 2, 5, 7].map(waveClearBonus)).toEqual([24, 28, 40, 48]);
  });

  it('the early-call bonus is round(0.5 × clear bonus × time left / countdown)', () => {
    expect(EARLY_CALL_BONUS_SHARE).toBe(0.5);
    // The doc's example: wave 5 called the instant its 20 s countdown starts pays +20.
    expect(earlyCallBonus(5, 1200, 1200)).toBe(20);
    expect(earlyCallBonus(5, 600, 1200)).toBe(10);
    expect(earlyCallBonus(2, 750, 1500)).toBe(7); // 0.5 × 28 × 0.5 = 7
    expect(earlyCallBonus(3, 750, 1500)).toBe(8); // 0.5 × 32 × 0.5 = 8
    expect(earlyCallBonus(2, 1125, 1500)).toBe(11); // 10.5 rounds up
    expect(earlyCallBonus(2, 1, 1500)).toBe(0);
    expect(earlyCallBonus(2, 0, 1500)).toBe(0);
    expect(earlyCallBonus(2, 2000, 1500)).toBe(14); // never more than the whole countdown's
  });

  it('the misclick grace is 10 s of sim time', () => {
    expect(MISCLICK_GRACE_TICKS).toBe(MISCLICK_GRACE_SEC * 60);
  });
});

describe('sellValue', () => {
  const t = { invested: 255, builtTick: 0, firstFiredTick: -1 };

  it('refunds everything inside the misclick grace, else 70% rounded down', () => {
    expect(sellValue(t, 0)).toEqual({ value: 255, full: true });
    expect(sellValue(t, 599)).toEqual({ value: 255, full: true });
    expect(sellValue(t, 600)).toEqual({ value: 178, full: false });
  });

  it('ends the grace at the first shot, whichever comes first', () => {
    expect(sellValue({ ...t, firstFiredTick: 30 }, 31)).toEqual({ value: 178, full: false });
    expect(sellValue({ ...t, firstFiredTick: 0 }, 0)).toEqual({ value: 178, full: false });
  });

  it('sellValueInto fills a scratch with the same answer (the HUD reads it every frame)', () => {
    const out = { value: -1, full: true };
    for (const [tick, fired] of [
      [0, -1],
      [599, -1],
      [600, -1],
      [31, 30],
    ] as const) {
      const tower = { ...t, firstFiredTick: fired };
      expect(sellValueInto(tower, tick, 0.7, out)).toBe(out);
      expect({ ...out }).toEqual(sellValue(tower, tick, 0.7));
    }
  });

  it('floors exact products correctly despite float error (0.7 × 180 = 126)', () => {
    expect(sellValue({ ...t, invested: 180, firstFiredTick: 0 }, 1).value).toBe(126);
    expect(sellValue({ ...t, invested: 100, firstFiredTick: 0 }, 1).value).toBe(70);
    expect(sellValue({ ...t, invested: 125, firstFiredTick: 0 }, 1).value).toBe(87);
  });
});

describe('bounties', () => {
  it('pay the enemy’s bounty, 1 for fleeing units, 0 for younglings', () => {
    expect(bountyFor(3, [])).toBe(3);
    expect(bountyFor(3, ['fleeing'])).toBe(1);
    expect(bountyFor(3, ['youngling'])).toBe(0);
    expect(bountyFor(3, ['youngling', 'fleeing'])).toBe(0);
    expect(bountyFor(3, ['quiet_wave'])).toBe(3);
  });

  it('are credited by the kill, and EnemyDied reports what was paid', () => {
    const { state } = setup();
    const before = state.credits;
    const plain = spawn(state, WALKER);
    const fleeing = spawn(state, WALKER, { tags: ['fleeing'] });
    const young = spawn(state, WALKER, { tags: ['youngling'] });
    for (const e of [plain, fleeing, young]) {
      applyDamage(state, e, 1000, 'kinetic', { kind: 'tower', uid: 9 });
    }
    expect(state.credits).toBe(before + 3 + 1 + 0);
    expect(state.stats.creditsEarned).toBe(4);
    expect(state.events.flatMap((e) => (e.type === 'EnemyDied' ? [e.bounty] : []))).toEqual([
      3, 1, 0,
    ]);
  });
});

describe('the sell command', () => {
  it('refunds 100% inside the grace (upgrades included) and frees the tile at once', () => {
    const sim = fixtureSim();
    sim.enqueue(gun(1, 1));
    sim.enqueue({ type: 'upgrade', towerUid: 1 });
    sim.applyPending();
    expect(sim.state.credits).toBe(20);
    for (let i = 0; i < MISCLICK_GRACE_TICKS - 1; i++) sim.step(); // no enemies: it never fires
    sim.enqueue({ type: 'sell', towerUid: 1 });
    sim.enqueue(gun(1, 1)); // the same tile, the same tick
    sim.applyPending();
    const events = drain(sim);
    expect(events.find((e) => e.type === 'TowerSold')).toEqual({
      type: 'TowerSold',
      uid: 1,
      refund: 180,
    });
    expect(events.at(-1)).toMatchObject({ type: 'TowerBuilt', uid: 2, tile: [1, 1] });
    expect(sim.state.credits).toBe(200 - 100);
    expect(sim.state.stats).toMatchObject({ creditsSpent: 280, creditsRefunded: 180 });
    sim.step(); // cleanup releases the sold slot without clearing the new tower's tile
    expect(sim.state.towerAtTile[1 * 6 + 1]).not.toBe(-1);
    expect(sim.state.towers.live).toBe(1);
  });

  it('refunds 70% once the grace has run out, and paused time never counts', () => {
    const sim = fixtureSim();
    sim.enqueue(gun(1, 1));
    sim.applyPending();
    for (let i = 0; i < 50; i++) sim.applyPending(); // paused: no sim time passes
    for (let i = 0; i < MISCLICK_GRACE_TICKS; i++) sim.step();
    sim.enqueue({ type: 'sell', towerUid: 1 });
    sim.applyPending();
    expect(drain(sim).at(-1)).toEqual({ type: 'TowerSold', uid: 1, refund: 70 });
    expect(sim.state.credits).toBe(170);
  });

  it('refunds 70% once the tower has fired, even inside 10 s', () => {
    const sim = fixtureSim();
    sim.enqueue(gun(1, 1));
    sim.enqueue({ type: 'callWave' });
    let fired = false;
    for (let i = 0; i < 120 && !fired; i++) {
      sim.step();
      fired = drain(sim).some((e) => e.type === 'ProjectileFired');
    }
    expect(fired).toBe(true);
    const credits = sim.state.credits;
    sim.enqueue({ type: 'sell', towerUid: 1 });
    sim.applyPending();
    expect(drain(sim).at(-1)).toEqual({ type: 'TowerSold', uid: 1, refund: 70 });
    expect(sim.state.credits).toBe(credits + 70);
  });

  it('rejects an unknown or already sold tower', () => {
    const sim = fixtureSim();
    sim.enqueue(gun(1, 1));
    sim.enqueue({ type: 'sell', towerUid: 1 });
    sim.enqueue({ type: 'sell', towerUid: 1 });
    sim.enqueue({ type: 'sell', towerUid: 42 });
    sim.applyPending();
    const reasons = drain(sim).flatMap((e) => (e.type === 'CommandRejected' ? [e.reason] : []));
    expect(reasons).toEqual(['noSuchTower', 'noSuchTower']);
  });
});

describe('callWaveBonus', () => {
  it('is 0 outside a countdown and the early-call bonus during one', () => {
    const waves = [0, 1, 2].map(() => ({ noCall: false, groups: [] }));
    const at = (phase: 'setup' | 'spawning' | 'countdown' | 'done', wave: number, left = 0) =>
      callWaveBonus(
        {
          wave,
          schedule: {
            phase,
            waveTicks: 0,
            countdownTicks: left,
            countdownTotalTicks: 1500,
            countdownWave: wave + 1,
            startTick: [],
            remaining: [],
            resolved: [],
          },
          economy: { bountyPct: 0, bountyCarry: 0, earlyCallPct: 0, sellRefundPct: 0.7 },
        },
        { waves },
      );
    expect(at('setup', 0)).toBe(0);
    expect(at('spawning', 1)).toBe(0);
    expect(at('countdown', 1, 1500)).toBe(14);
    expect(at('countdown', 2, 750)).toBe(8);
    expect(at('done', 3)).toBe(0);
  });
});

describe('economy modifiers (progression.md § 4.3, § 5, § 9; T202a)', () => {
  type Mod = Modifier<FixtureIds>;
  const sim = (modifiers: Mod[]) => fixtureSim({ modifiers });

  it('start credits and core integrity: (set ?? base + Σ flat) × (1 + Σ pct), lowest set wins', () => {
    const s = sim([
      { kind: 'economy', stat: 'startCredits', pct: 0.04, source: 'shop:seed1' },
      { kind: 'economy', stat: 'startCredits', pct: 0.1, source: 'protocol:head_start' },
      { kind: 'economy', stat: 'coreIntegrity', flat: 2, source: 'shop:core2' },
      { kind: 'economy', stat: 'coreIntegrity', set: 30, source: 'difficulty:story' },
      { kind: 'economy', stat: 'coreIntegrity', set: 5, source: 'veteran:glass' },
    ]);
    expect(sim([]).state.credits).toBe(200);
    expect(s.state.credits).toBe(228); // 200 × 1.14
    expect(s.state.integrity).toBe(7); // set 5 (lowest) + 2
    // The run's full meter is the modified start, not the map's (Results showed "30 / 20").
    expect(s.state.maxIntegrity).toBe(7);
    const story = sim([
      { kind: 'economy', stat: 'coreIntegrity', set: 30, source: 'difficulty:story' },
    ]);
    expect(story.state.maxIntegrity).toBe(30);
    expect(sim([]).state.maxIntegrity).toBe(sim([]).state.integrity);
  });

  it('atLeast is a floor (D157): raises a lower map value, keeps a higher one; set still wins', () => {
    const base = sim([]).state.integrity;
    const floor = (atLeast: number, more: Mod[] = []): number =>
      sim([
        { kind: 'economy', stat: 'coreIntegrity', atLeast, source: 'difficulty:story' },
        ...more,
      ]).state.maxIntegrity;
    expect(floor(base + 10)).toBe(base + 10); // raised to the floor
    expect(floor(base - 1)).toBe(base); // Story never gives less than Standard
    // The highest floor wins; flat and pct apply after it.
    expect(
      floor(base + 4, [
        { kind: 'economy', stat: 'coreIntegrity', atLeast: base + 8, source: 'test' },
        { kind: 'economy', stat: 'coreIntegrity', flat: 2, source: 'shop:core2' },
      ]),
    ).toBe(base + 10);
    // A `set` overrides the floor (veteran Glass Core's 5 under Story), and Reinforced Core adds.
    expect(
      floor(30, [
        { kind: 'economy', stat: 'coreIntegrity', set: 5, source: 'veteran:glass' },
        { kind: 'economy', stat: 'coreIntegrity', flat: 2, source: 'shop:core2' },
      ]),
    ).toBe(7);
    expect(() =>
      sim([{ kind: 'economy', stat: 'bounty', atLeast: 1, source: 'test' }]),
    ).toThrow(/economy 'bounty' takes pct only/);
  });

  it('refuses a flat or set on bounty or the early-call bonus (pct only)', () => {
    expect(() => sim([{ kind: 'economy', stat: 'bounty', flat: 1, source: 'test' }])).toThrow(
      /economy 'bounty' takes pct only/,
    );
    expect(() =>
      sim([{ kind: 'economy', stat: 'earlyCallBonus', set: 10, source: 'test' }]),
    ).toThrow(/economy 'earlyCallBonus' takes pct only/);
  });

  it('towerCost: discounts builds and upgrades (rounded); `spec` discounts tier 4 only', () => {
    const mods: Mod[] = [
      { kind: 'towerCost', tower: 'fx_gun', tiers: 'all', pct: -0.05, source: 'shop:tune2' },
      { kind: 'towerCost', tower: '*', tiers: 'spec', pct: -0.25, source: 'protocol:specialist' },
    ];
    expect(costFor(mods, 'fx_gun', 100)).toBe(95);
    expect(costFor(mods, 'fx_gun', 150)).toBe(143); // 142.5 rounds up
    expect(costFor(mods, 'fx_mortar', 120)).toBe(120);
    expect(costFor(mods, 'fx_gun', 300, true)).toBe(210); // 300 × 0.7
    expect(costFor(mods, 'fx_mortar', 375, true)).toBe(281); // 281.25
    const s = sim(mods);
    s.enqueue(gun(1, 1));
    s.enqueue({ type: 'upgrade', towerUid: 1 });
    s.applyPending();
    expect(drain(s).flatMap((e) => ('cost' in e ? [e.cost] : []))).toEqual([95, 76]);
    expect(s.state.credits).toBe(200 - 95 - 76);
    expect(s.state.towers.items[0]!.invested).toBe(171);
    expect(s.state.stats.creditsSpent).toBe(171);
  });

  it('sellRefund: Resale Value raises the 70% (never past 100%); the grace still refunds all', () => {
    expect(sellValue({ invested: 200, builtTick: 0, firstFiredTick: 5 }, 10, 0.8).value).toBe(160);
    const s = sim([
      { kind: 'sellRefund', flat: 0.05, source: 'shop:resale1' },
      { kind: 'sellRefund', flat: 0.05, source: 'shop:resale2' },
    ]);
    expect(s.state.economy.sellRefundPct).toBeCloseTo(0.8, 12);
    expect(
      sim([{ kind: 'sellRefund', flat: 0.5, source: 'test' }]).state.economy.sellRefundPct,
    ).toBe(1);
    s.enqueue(gun(1, 1));
    s.applyPending();
    for (let i = 0; i < MISCLICK_GRACE_TICKS; i++) s.step();
    drain(s);
    s.enqueue({ type: 'sell', towerUid: 1 });
    s.applyPending();
    expect(drain(s)).toContainEqual({ type: 'TowerSold', uid: 1, refund: 80 });
  });

  it('bounty: +5% carries its fractions to later kills instead of rounding them away', () => {
    const { state } = setup();
    state.economy.bountyPct = 0.05;
    const paid: number[] = [];
    for (let i = 0; i < 7; i++) {
      paid.push(payBounty(state, 3, []));
    }
    // 3.15 a kill: the extra credit lands on the 7th (7 × 0.15 = 1.05).
    expect(paid).toEqual([3, 3, 3, 3, 3, 3, 4]);
    expect(state.economy.bountyCarry).toBeCloseTo(0.05, 9);
    expect(payBounty(state, 3, ['youngling'])).toBe(0); // younglings still pay nothing
  });

  it('bounty through kills: EnemyDied reports what each kill paid', () => {
    const { state } = setup();
    state.economy.bountyPct = 0.5;
    for (let i = 0; i < 2; i++) {
      applyDamage(state, spawn(state, WALKER), 1000, 'kinetic', { kind: 'tower', uid: 9 });
    }
    expect(state.events.flatMap((e) => (e.type === 'EnemyDied' ? [e.bounty] : []))).toEqual([4, 5]); // 4.5 + 4.5
    expect(state.stats.creditsEarned).toBe(9);
  });

  it('earlyCallBonus: Early Bird’s +50% scales the bonus before rounding', () => {
    expect(earlyCallBonus(2, 750, 1500, 0.5)).toBe(11); // 7 × 1.5 = 10.5 → 11
    const s = sim([{ kind: 'economy', stat: 'earlyCallBonus', pct: 0.5, source: 'p:eb' }]);
    expect(s.state.economy.earlyCallPct).toBe(0.5);
    s.enqueue({ type: 'callWave' });
    s.applyPending();
    while (s.state.schedule.phase !== 'countdown') s.step();
    expect(callWaveBonus(s.state, s.map)).toBe(21); // 0.5 × 28 × 1.5, the full countdown
  });

  it('leakAbsorb: Emergency Bulkhead starts the run with its absorption', () => {
    expect(
      sim([{ kind: 'leakAbsorb', flat: 5, source: 'protocol:bulkhead' }]).state.leakAbsorbLeft,
    ).toBe(5);
  });
});
