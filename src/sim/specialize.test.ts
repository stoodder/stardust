// The `specialize` command (T202b; design/towers.md § 3.1): tier 3 → tier 4, gated by
// `specsUnlocked`, paid with costFor(…, spec = true), permanent, and counted in the sell value.
// The spec stats themselves are content (data.test.ts); here, how a specialized tower behaves.
import { describe, expect, it } from 'vitest';
import type { CompiledTowerDef } from '../content/compiled.ts';
import { enemyDef, GUN, placeTower, setup, spawn } from './__fixtures__/combat.ts';
import { FIXTURE_CONTENT, fixtureSim, type FixtureIds } from './__fixtures__/sim.ts';
import type { Command } from './commands.ts';
import type { Modifier } from './config.ts';
import type { Tower } from './entities.ts';
import type { SimEvent } from './events.ts';
import { applySpecialize } from './specialize.ts';
import type { SimState } from './state.ts';
import { runTick, type TickContext } from './tick.ts';

type Sim = ReturnType<typeof fixtureSim>;
type Ev = SimEvent<FixtureIds>;

const RICH: Modifier<FixtureIds> = {
  kind: 'economy',
  stat: 'startCredits',
  set: 2000,
  source: 'test',
};

/** A paused fixture sim with fx_gun's specs unlocked and plenty of credits (unless overridden). */
function richSim(over: Parameters<typeof fixtureSim>[0] = {}): Sim {
  return fixtureSim({ specsUnlocked: ['fx_gun'], modifiers: [RICH], ...over });
}

function apply(sim: Sim, ...cmds: Command<FixtureIds>[]): Ev[] {
  for (const cmd of cmds) sim.enqueue(cmd);
  sim.applyPending();
  const out: Ev[] = [];
  sim.drainEvents(out);
  return out;
}

/** The live tower on tile (1, 1). */
function gunOf(sim: Sim): Readonly<Tower> {
  const t = sim.state.towers.items.find((x) => x.alive && x.col === 1 && x.row === 1);
  if (t === undefined) throw new Error('no tower on (1, 1)');
  return t;
}

/** Builds fx_gun on (1, 1) and upgrades it to `tier`; returns its uid. */
function gunAtTier(sim: Sim, tier: number): number {
  apply(sim, { type: 'build', tile: [1, 1], tower: 'fx_gun' });
  const uid = gunOf(sim).uid;
  for (let t = 1; t < tier; t++) apply(sim, { type: 'upgrade', towerUid: uid });
  expect(gunOf(sim).tier).toBe(tier);
  return uid;
}

const rejectedWith = (evs: readonly Ev[]): string[] =>
  evs.flatMap((e) => (e.type === 'CommandRejected' ? [e.reason] : []));

describe('specialize: success', () => {
  it('tier 3 → tier 4: pays, records the spec, sets linksDirty, emits TowerSpecialized', () => {
    const sim = richSim();
    const uid = gunAtTier(sim, 3);
    const credits = sim.state.credits;
    const spent = sim.state.stats.creditsSpent;
    const evs = apply(sim, { type: 'specialize', towerUid: uid, spec: 'a' });
    expect(evs).toEqual([{ type: 'TowerSpecialized', uid, spec: 'a', cost: 300 }]);
    const t = gunOf(sim);
    expect(t.tier).toBe(4);
    expect(t.spec).toBe('a');
    expect(t.tierDef).toBe(FIXTURE_CONTENT.towers.fx_gun.specs!.a); // fx_gun has specs
    expect(t.invested).toBe(100 + 80 + 150 + 300);
    expect(sim.state.credits).toBe(credits - 300);
    expect(sim.state.stats.creditsSpent).toBe(spent + 300);
    expect(sim.state.linksDirty).toBe(true);
    expect(sim.state.commandLog.at(-1)?.cmd).toEqual({
      type: 'specialize',
      towerUid: uid,
      spec: 'a',
    });
  });

  it("switches to a spec's own default priority (Railspike's Strong); otherwise keeps the player's", () => {
    const rail = richSim();
    const railUid = gunAtTier(rail, 3);
    apply(rail, { type: 'targeting', towerUid: railUid, mode: 'close' });
    apply(rail, { type: 'specialize', towerUid: railUid, spec: 'b' });
    expect(gunOf(rail).priority).toBe('strong');

    const storm = richSim();
    const stormUid = gunAtTier(storm, 3);
    apply(storm, { type: 'targeting', towerUid: stormUid, mode: 'close' });
    apply(storm, { type: 'specialize', towerUid: stormUid, spec: 'a' });
    expect(gunOf(storm).priority).toBe('close');
  });

  it("costs go through costFor(…, spec = true): Specialist (−25%) and the tune-up's −5% both apply", () => {
    const sim = richSim({
      modifiers: [
        RICH,
        { kind: 'towerCost', tower: '*', tiers: 'spec', pct: -0.25, source: 'protocol:specialist' },
        { kind: 'towerCost', tower: 'fx_gun', tiers: 'all', pct: -0.05, source: 'tuneup' },
      ],
    });
    const uid = gunAtTier(sim, 3);
    const evs = apply(sim, { type: 'specialize', towerUid: uid, spec: 'b' });
    expect(evs).toEqual([{ type: 'TowerSpecialized', uid, spec: 'b', cost: 210 }]); // 300 × 0.7
    expect(gunOf(sim).invested).toBe(95 + 76 + 143 + 210); // 150 × 0.95 = 142.5 rounds up
  });

  it('sells for its whole investment, spec included: everything in the grace, else 70%', () => {
    const grace = richSim();
    const g = gunAtTier(grace, 3);
    apply(grace, { type: 'specialize', towerUid: g, spec: 'a' });
    expect(apply(grace, { type: 'sell', towerUid: g })).toEqual([
      { type: 'TowerSold', uid: g, refund: 630 },
    ]);

    const late = richSim();
    const l = gunAtTier(late, 3);
    apply(late, { type: 'specialize', towerUid: l, spec: 'a' });
    for (let i = 0; i < 600; i++) late.step(); // past the 10 s misclick grace
    const sold = apply(late, { type: 'sell', towerUid: l }).find((e) => e.type === 'TowerSold');
    expect(sold).toEqual({ type: 'TowerSold', uid: l, refund: 441 }); // floor(630 × 0.7)
  });

  it('another tower of the same type can take the other spec', () => {
    const sim = richSim({ modifiers: [{ ...RICH, set: 5000 }] });
    const a = gunAtTier(sim, 3);
    apply(sim, { type: 'build', tile: [3, 1], tower: 'fx_gun' });
    const b = sim.state.towers.items.find((t) => t.alive && t.col === 3)!.uid; // just built
    apply(sim, { type: 'upgrade', towerUid: b }, { type: 'upgrade', towerUid: b });
    const evs = apply(
      sim,
      { type: 'specialize', towerUid: a, spec: 'a' },
      { type: 'specialize', towerUid: b, spec: 'b' },
    );
    expect(evs.map((e) => e.type)).toEqual(['TowerSpecialized', 'TowerSpecialized']);
  });
});

/** Applies `cmd` and returns its rejection reason, checking the state hash didn't move. */
function reject(sim: Sim, cmd: Command<FixtureIds>): string[] {
  const before = sim.hash();
  const reasons = rejectedWith(apply(sim, cmd));
  expect(sim.hash()).toBe(before);
  return reasons;
}

describe('specialize: rejections change nothing', () => {
  it('noSuchTower', () => {
    const sim = richSim();
    expect(reject(sim, { type: 'specialize', towerUid: 999, spec: 'a' })).toEqual(['noSuchTower']);
  });

  it('noSpecs: the type has none authored', () => {
    const plain: CompiledTowerDef<FixtureIds['tower']> = Object.freeze({
      ...FIXTURE_CONTENT.towers.fx_gun,
      specs: null,
    });
    const content = {
      ...FIXTURE_CONTENT,
      towers: { ...FIXTURE_CONTENT.towers, fx_gun: plain },
    };
    const sim = richSim({ content });
    const uid = gunAtTier(sim, 3);
    expect(reject(sim, { type: 'specialize', towerUid: uid, spec: 'a' })).toEqual(['noSpecs']);
  });

  it('specLocked: the pair is not in specsUnlocked (checked before the tier)', () => {
    const sim = richSim({ specsUnlocked: [] });
    const uid = gunAtTier(sim, 1);
    expect(reject(sim, { type: 'specialize', towerUid: uid, spec: 'a' })).toEqual(['specLocked']);
    apply(sim, { type: 'upgrade', towerUid: uid }, { type: 'upgrade', towerUid: uid });
    expect(reject(sim, { type: 'specialize', towerUid: uid, spec: 'b' })).toEqual(['specLocked']);
  });

  it('needsTier3 at tiers 1 and 2', () => {
    const sim = richSim();
    const uid = gunAtTier(sim, 1);
    expect(reject(sim, { type: 'specialize', towerUid: uid, spec: 'a' })).toEqual(['needsTier3']);
    apply(sim, { type: 'upgrade', towerUid: uid });
    expect(reject(sim, { type: 'specialize', towerUid: uid, spec: 'a' })).toEqual(['needsTier3']);
  });

  it('alreadySpecialized: the choice is permanent; upgrade stays maxTier', () => {
    const sim = richSim();
    const uid = gunAtTier(sim, 3);
    apply(sim, { type: 'specialize', towerUid: uid, spec: 'a' });
    expect(reject(sim, { type: 'specialize', towerUid: uid, spec: 'b' })).toEqual([
      'alreadySpecialized',
    ]);
    expect(reject(sim, { type: 'specialize', towerUid: uid, spec: 'a' })).toEqual([
      'alreadySpecialized',
    ]);
    expect(reject(sim, { type: 'upgrade', towerUid: uid })).toEqual(['maxTier']);
    expect(gunOf(sim).spec).toBe('a');
  });

  it('cantAfford: one credit short', () => {
    // 330 to reach tier 3, then 299 left for a 300 spec.
    const sim = richSim({ modifiers: [{ ...RICH, set: 629 }] });
    const uid = gunAtTier(sim, 3);
    expect(sim.state.credits).toBe(299);
    expect(reject(sim, { type: 'specialize', towerUid: uid, spec: 'a' })).toEqual(['cantAfford']);
  });
});

function fireTicks(state: SimState, ctx: TickContext, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const tick = state.tick;
    runTick(state, ctx);
    for (const e of state.events) if (e.type === 'ProjectileFired') out.push(tick);
    state.events.length = 0;
  }
  return out;
}

describe('specialized towers in combat', () => {
  const sturdy = enemyDef('fx_sturdy', { hp: 100000 });

  it('specializing mid-fight takes effect at once; Rivet Storm spins up from the top', () => {
    const { state, ctx } = setup({ specsUnlocked: ['fx_gun'] });
    state.credits = 1000;
    const gun = placeTower(state, GUN, 1, 1, 3); // 2.5/s: every 24 ticks
    spawn(state, sturdy);
    expect(fireTicks(state, ctx, 25)).toEqual([0, 24]);
    const cmd = { type: 'specialize', towerUid: gun.uid, spec: 'a' } as const;
    expect(applySpecialize(state, ctx, cmd)).toBeNull();
    // Spin-up 60 ticks from the specialize (tick 25), then 7.5/s: every 8 ticks.
    const start = state.tick;
    const shots = fireTicks(state, ctx, 80).map((t) => t - start);
    expect(shots).toEqual([60, 68, 76]);
  });

  it('Railspike ignores all armor', () => {
    const { state, ctx } = setup();
    placeTower(state, GUN, 1, 1, GUN.specs!.b); // fx_gun has specs
    const e = spawn(state, enemyDef('fx_plated', { hp: 1000, armor: 10 }));
    fireTicks(state, ctx, 1);
    expect(1000 - e.hp).toBe(120);
  });

  it('a spec patches tier 3: unchanged fields carry over', () => {
    const t3 = GUN.tiers[2].attack!; // fx_gun attacks
    const storm = GUN.specs!.a.attack!; // fx_gun has specs
    expect(storm.rangeTiles).toBe(t3.rangeTiles);
    expect(storm.type).toBe(t3.type);
    expect(GUN.specs!.b.attack!.armorPierce).toBe(t3.armorPierce);
  });
});
