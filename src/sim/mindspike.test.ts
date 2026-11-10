// T507: Unnerved (enemies.md § 2.4: −20% speed on a non-boss; interrupts and blocks abilities,
// a boss's too), the Mindspike Obelisk (towers.md § 7: Psionic ignores armor; Echo Spike's echo,
// sim/attacks/echo.ts; Dread's Unnerved), Stillness (core-loop.md § 3.2: Stasis 3 s in radius 2.5,
// sim/abilities/stillness.ts) with Ves'thara as its companion, and the two reach fixes T507 owns:
// a Phased Hollow unit is in no hush contact (hush.ts `outOfReach`), and Suppressing Fire neither
// slows nor hurts a burrowed or Phased unit (Time Dilation stays map-wide). fx_map's road `a` runs
// (0,0) → (2,0) → (2,3) → (3,3) → (3,4) → (5,4); route distance d sits on tile d's centre.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent, CompiledEnemyDef } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { IdSpace } from '../content/types.ts';
import { enemyDef, placeTower, setup as setupFixture, spawn, WALKER } from './__fixtures__/combat.ts';
import { FIXTURE_CONTENT, fixtureConfig } from './__fixtures__/sim.ts';
import { hasStatusIn } from './bonuses.ts';
import { applyChill, applyEffects } from './combat/damage.ts';
import type { Command } from './commands.ts';
import type { SimConfig } from './config.ts';
import { canHush, isHushable } from './enemyAbilities/hush.ts';
import { enemyAbilities } from './enemyAbilities/index.ts';
import { phaseStep, phaseTelling, solidTicks } from './enemyAbilities/phase.ts';
import { pulseStep } from './enemyAbilities/pulse.ts';
import type { SimEvent } from './events.ts';
import { abilityRefusal, gateRefusals, towerRefusal } from './gates.ts';
import type { SimState } from './state.ts';
import { abilities, abilityStats, applyAbilityCommand } from './systems/abilities.ts';
import { enemySpeedPerTick } from './systems/movement.ts';
import { applyUnnerved, isInterrupted, status, unnervedSpeedMul } from './systems/status.ts';
import { towers } from './systems/towers.ts';

const LIVE = compileContent(RAW_CONTENT);
const E = LIVE.enemies;
const SPIKE = LIVE.towers.mindspike;
const STILLNESS = LIVE.abilities.stillness;
const MOTH = E.riftmoth;
const PHASE = MOTH.phase!; // the Rift Moth phases

/** The fixture content with the live Mindspike and abilities added. */
const CONTENT: CompiledContent<IdSpace> = {
  ...FIXTURE_CONTENT,
  towers: { ...FIXTURE_CONTENT.towers, mindspike: SPIKE },
  abilities: { ...FIXTURE_CONTENT.abilities, ...LIVE.abilities },
};

/** Ves'thara present, Stillness in slot 2. */
const VESTHARA: Partial<SimConfig<IdSpace>> = {
  content: CONTENT,
  companion: 'vesthara',
  abilities: { slot1: 'fx_strike', slot2: 'stillness', slot2State: 'present' },
};

function setup(over: Partial<SimConfig<IdSpace>> = {}): ReturnType<typeof setupFixture> {
  const s = setupFixture({ content: CONTENT, ...over });
  return { state: s.state, ctx: { ...s.ctx, content: CONTENT } };
}

type Ev = SimEvent<IdSpace>;
function events<T extends Ev['type']>(state: SimState, type: T): Extract<Ev, { type: T }>[] {
  return state.events.filter((e): e is Extract<Ev, { type: T }> => e.type === type);
}

/** A sturdy organic walker with light armor (Psionic ignores it; body ×1). */
const HIDE: CompiledEnemyDef = enemyDef('fx_hide', { hp: 500, armor: 4 });

describe('Unnerved (enemies.md § 2.4)', () => {
  it('lasts its duration counting the tick it lands, and a refresh keeps the longer', () => {
    const { state } = setup();
    const e = spawn(state, WALKER);
    expect(applyUnnerved(e, 90)).toBe(true);
    expect(applyUnnerved(e, 30)).toBe(false); // shorter: no change
    expect(e.unnervedTicks).toBe(90);
    for (let i = 0; i < 89; i++) status(state);
    expect(isInterrupted(e)).toBe(true);
    status(state);
    expect([e.unnervedTicks, isInterrupted(e)]).toEqual([0, false]);
  });

  it('slows a non-boss 20% beside its Chill, and never a boss (interrupt only)', () => {
    const { state } = setup();
    const e = spawn(state, WALKER);
    const base = enemySpeedPerTick(e);
    applyUnnerved(e, 60);
    expect(unnervedSpeedMul(e)).toBe(0.8);
    expect(enemySpeedPerTick(e)).toBeCloseTo(base * 0.8, 12);
    applyChill(e, 0.5, 60);
    expect(enemySpeedPerTick(e)).toBeCloseTo(base * 0.5 * 0.8, 12);
    const witch = spawn(state, E.glass_witch);
    const witchBase = enemySpeedPerTick(witch);
    applyUnnerved(witch, 60);
    expect([unnervedSpeedMul(witch), enemySpeedPerTick(witch)]).toEqual([1, witchBase]);
    expect(isInterrupted(witch)).toBe(true); // a boss's tells are interrupted all the same
  });

  it('lands through Dread’s on-hit effect (1.5 s) and matches a link’s `unnerved` status bit', () => {
    const { state } = setup();
    const e = spawn(state, WALKER);
    expect(SPIKE.specs!.b.effects).toEqual([{ status: 'unnerved', durationTicks: 90 }]);
    expect(hasStatusIn(e, 64)).toBe(false);
    applyEffects(e, SPIKE.specs!.b.effects);
    expect(e.unnervedTicks).toBe(90);
    expect(hasStatusIn(e, 64)).toBe(true);
  });
});

describe('Unnerved interrupts tells, a boss’s too', () => {
  it("cancels the Glass Witch's pulse mid-tell, and the cooldown restarts", () => {
    const { state, ctx } = setup();
    const witch = spawn(state, E.glass_witch, { dist: 1 });
    const pulse = E.glass_witch.boss!.phases[0]!.pulse!;
    witch.pulseTicks = 10; // mid-tell
    applyUnnerved(witch, 30);
    pulseStep(state, ctx, witch, pulse);
    expect(witch.pulseTicks).toBe(pulse.everyTicks);
    expect(events(state, 'ShieldPulse').map((p) => p.phase)).toEqual(['interrupted']);
  });

  it("blocks the Penitent's pulse from starting while it lasts", () => {
    const { state, ctx } = setup();
    const pen = spawn(state, E.sunderglass_penitent, { dist: 1 });
    const pulse = E.sunderglass_penitent.boss!.phases[0]!.pulse!;
    pen.pulseTicks = pulse.tellTicks + 1;
    applyUnnerved(pen, 30);
    pulseStep(state, ctx, pen, pulse);
    expect(pen.pulseTicks).toBe(pulse.everyTicks);
    expect(events(state, 'ShieldPulse')).toEqual([]); // no tell began
  });

  it('cancels a phasing tell (D137) and restarts the solid stretch from zero', () => {
    const { state } = setup();
    const moth = spawn(state, MOTH);
    phaseStep(state, moth, PHASE);
    while (!phaseTelling(moth, PHASE)) phaseStep(state, moth, PHASE);
    phaseStep(state, moth, PHASE);
    applyUnnerved(moth, 30);
    phaseStep(state, moth, PHASE);
    expect(moth.phased).toBe(false);
    expect(moth.phaseTicks).toBe(solidTicks(PHASE));
    expect(events(state, 'PhaseShift').map((p) => p.phase)).toEqual(['tell', 'interrupted']);
  });

  it('keeps a Hollow unit from starting a hush', () => {
    const { state, ctx } = setup();
    const mote = spawn(state, E.mote, { dist: 3 });
    spawn(state, WALKER, { dist: 3.3, tags: ['fleeing'] });
    applyUnnerved(mote, 30);
    expect(canHush(mote)).toBe(false);
    enemyAbilities(state, ctx);
    expect(events(state, 'HushStarted')).toEqual([]);
  });
});

describe('the Mindspike Obelisk (towers.md § 7)', () => {
  it('compiles its tiers and specs: Psionic, ground and air, First', () => {
    const [t1, t2, t3] = SPIKE.tiers;
    expect(t1).toMatchObject({ cost: 150, targets: { ground: true, air: true } });
    expect(t1.defaultPriority).toBe('first');
    expect(t1.attack).toMatchObject({ kind: 'hitscan', type: 'psionic', damage: 18 });
    expect(t1.attack).toMatchObject({ cooldownTicks: 75, rangeTiles: 3, echo: null });
    expect([t2.cost, t2.attack!.damage, t3.cost, t3.attack!.damage]).toEqual([120, 26, 225, 34]);
    expect(t3.attack!.cooldownTicks).toBe(60);
    const { a, b } = SPIKE.specs!;
    expect([a.name, a.cost, b.name, b.cost, b.attack!.damage]).toEqual([
      'Echo Spike',
      450,
      'Dread',
      450,
      50,
    ]);
    expect(a.attack).toMatchObject({ damage: 34, echo: { pct: 0.5, radiusTiles: 1.2 } });
    expect(towerRefusal(SPIKE)).toBeNull();
  });

  it('ignores armor: a T1 hit lands whole on an armored unit', () => {
    const { state, ctx } = setup();
    placeTower(state, SPIKE, 1, 1);
    const e = spawn(state, HIDE, { dist: 2 });
    towers(state, ctx);
    expect(e.hp).toBe(500 - 18);
    expect(events(state, 'EchoBurst')).toEqual([]); // no echo below Echo Spike
  });

  it('Echo Spike echoes 50% to the others within 1.2 tiles of the target, after the hit', () => {
    const { state, ctx } = setup();
    const t = placeTower(state, SPIKE, 1, 1, SPIKE.specs!.a);
    const target = spawn(state, HIDE, { dist: 3 }); // (2.5, 1.5): First picks it
    const near = spawn(state, HIDE, { dist: 2.2 }); // (2.5, 0.7): 0.8 from the target
    const far = spawn(state, HIDE, { dist: 0.5 }); // (1.0, 0.5): 1.8 away
    const ghost = spawn(state, MOTH, { dist: 2.6 }); // Phased: out of reach
    ghost.phased = true;
    ghost.phaseTicks = 60;
    const ghostHp = ghost.hp;
    towers(state, ctx);
    expect(t.targetUid).toBe(target.uid);
    expect([target.hp, near.hp, far.hp]).toEqual([500 - 34, 500 - 17, 500]);
    expect(ghost.hp).toBe(ghostHp);
    const types = state.events.map((ev) => ev.type);
    expect(types.indexOf('EchoBurst')).toBeGreaterThan(types.indexOf('ProjectileHit'));
    expect(events(state, 'EchoBurst')).toEqual([
      { type: 'EchoBurst', towerUid: t.uid, x: 2.5, y: 1.5, radiusTiles: 1.2, hits: 1 },
    ]);
  });

  it('an echo reaches flyers (ground and air), still lands when the hit kills, and skips a neutral', () => {
    const { state, ctx } = setup();
    placeTower(state, SPIKE, 1, 1, SPIKE.specs!.a);
    const frail = spawn(state, enemyDef('fx_frail', { hp: 10 }), { dist: 3 });
    const flyer = spawn(state, enemyDef('fx_flyer', { hp: 100, layer: 'air' }), { dist: 2.4 });
    const gerald = spawn(state, E.gerald, { dist: 2.6 });
    const geraldHp = gerald.hp;
    towers(state, ctx);
    expect(frail.alive).toBe(false);
    expect(flyer.hp).toBe(100 - 17);
    expect(gerald.hp).toBe(geraldHp);
    expect(events(state, 'EchoBurst')[0]).toMatchObject({ x: 2.5, y: 1.5, hits: 1 });
  });

  it('Dread hits for 50 and Unnerves for 1.5 s', () => {
    const { state, ctx } = setup();
    placeTower(state, SPIKE, 1, 1, SPIKE.specs!.b);
    const e = spawn(state, HIDE, { dist: 2 });
    towers(state, ctx);
    expect([e.hp, e.unnervedTicks]).toEqual([450, 90]);
  });
});

describe("Stillness (core-loop.md § 3.2), Ves'thara's", () => {
  const cast = (col: number, row: number): Extract<Command<IdSpace>, { type: 'ability' }> => ({
    type: 'ability',
    slot: 2,
    target: [col, row],
  });

  it("is Ves'thara's: Stasis 3 s in radius 2.5, every 45 s", () => {
    expect(STILLNESS).toMatchObject({ companion: 'vesthara', cooldownTicks: 2700 });
    expect(STILLNESS.effect).toEqual({
      kind: 'stasisArea',
      radiusTiles: 2.5,
      radiusSq: 6.25,
      durationTicks: 180,
    });
    expect(abilityStats(STILLNESS, []).radiusTiles).toBe(2.5);
    expect(abilityRefusal(RAW_CONTENT.abilities.stillness)).toBeNull();
  });

  it('freezes ground and air units in the circle at once, then reports StasisArea', () => {
    const { state, ctx } = setup(VESTHARA);
    const inGround = spawn(state, WALKER, { dist: 3 }); // (2.5, 1.5)
    const inAir = spawn(state, enemyDef('fx_flyer', { layer: 'air' }), { dist: 5 });
    const edge = spawn(state, WALKER, { dist: 0.5 }); // (1.0, 0.5): 2.5 from (2.5, 2.5), inclusive
    const out = spawn(state, WALKER, { dist: 9 }); // (5.5, 4.5): 3.6 away
    const immune = spawn(state, WALKER, { dist: 3.5 });
    immune.stasisImmuneTicks = 30;
    expect(applyAbilityCommand(state, ctx, cast(2, 2))).toBeNull();
    expect([inGround, inAir, edge].map((u) => u.stasisTicks)).toEqual([180, 180, 180]);
    expect([out.stasisTicks, immune.stasisTicks]).toEqual([0, 0]);
    expect(inGround.stasisImmuneTicks).toBe(360);
    expect(state.events.map((e) => e.type)).toEqual(['AbilityUsed', 'StasisArea']);
    expect(events(state, 'StasisArea')).toEqual([
      { type: 'StasisArea', slot: 2, x: 2.5, y: 2.5, radiusTiles: 2.5, frozen: 3 },
    ]);
    expect(events(state, 'AbilityUsed')[0]).toMatchObject({ ability: 'stillness', uid: 0 });
    expect(state.abilityCooldownTicks[1]).toBe(2700);
    expect(state.zones.live).toBe(0); // instant: no zone
  });

  it('a boss takes Chilled 50% instead; it never reaches a unit out of reach or a neutral', () => {
    const { state, ctx } = setup(VESTHARA);
    const witch = spawn(state, E.glass_witch, { dist: 3 });
    const moth = spawn(state, MOTH, { dist: 3 });
    moth.phased = true;
    moth.phaseTicks = 60;
    const dug = spawn(state, WALKER, { dist: 2 });
    dug.burrowed = true;
    const veiled = spawn(state, E.veilwalker, { dist: 2.5 }); // cloaked, never Revealed
    const gerald = spawn(state, E.gerald, { dist: 3 });
    applyAbilityCommand(state, ctx, cast(2, 2));
    expect([witch.stasisTicks, witch.chillPct, witch.chillTicks]).toEqual([0, 0.5, 180]);
    for (const u of [moth, dug, veiled, gerald]) expect(u.stasisTicks, u.def!.id).toBe(0);
    expect(events(state, 'StasisArea')[0]!.frozen).toBe(0);
  });

  it('interrupts a tell under way (a Rift Moth about to phase)', () => {
    const { state, ctx } = setup(VESTHARA);
    const moth = spawn(state, MOTH, { dist: 3 });
    phaseStep(state, moth, PHASE);
    while (!phaseTelling(moth, PHASE)) phaseStep(state, moth, PHASE);
    applyAbilityCommand(state, ctx, cast(2, 1));
    phaseStep(state, moth, PHASE);
    expect([moth.phased, moth.phaseTicks]).toEqual([false, solidTicks(PHASE)]);
  });

  it('needs a tile on the map, and its cooldown', () => {
    const { state, ctx } = setup(VESTHARA);
    expect(applyAbilityCommand(state, ctx, cast(-1, 0))).toBe('invalidTarget');
    expect(applyAbilityCommand(state, ctx, { type: 'ability', slot: 2 })).toBe('invalidTarget');
    expect(applyAbilityCommand(state, ctx, cast(0, 0))).toBeNull();
    expect(applyAbilityCommand(state, ctx, cast(0, 0))).toBe('abilityOnCooldown');
  });

  it("plays: Ves'thara's slot and the Mindspike with its specs aren't refused", () => {
    const cfg: SimConfig<IdSpace> = {
      ...fixtureConfig(),
      ...VESTHARA,
      loadout: ['fx_gun', 'mindspike'],
      specsUnlocked: ['mindspike'],
    };
    expect(gateRefusals(cfg)).toEqual([]);
  });
});

describe('reach: a unit out of reach (T507’s fixes, enemies.md § 2.6)', () => {
  it('a Phased Hollow unit neither hushes nor holds a hush; a Phased runner is no victim', () => {
    const { state, ctx } = setup();
    const mote = spawn(state, E.mote, { dist: 3 });
    const runner = spawn(state, WALKER, { dist: 3.3, tags: ['fleeing'] });
    mote.phased = true;
    expect(canHush(mote)).toBe(false);
    enemyAbilities(state, ctx);
    expect(events(state, 'HushStarted')).toEqual([]);
    mote.phased = false;
    runner.phased = true;
    expect(isHushable(runner)).toBe(false);
    runner.phased = false;
    enemyAbilities(state, ctx);
    expect(events(state, 'HushStarted')).toHaveLength(1);
    mote.phased = true; // phases mid-tell: the runner runs on, the hush unspent
    enemyAbilities(state, ctx);
    expect([mote.hushUid, runner.hushUid, mote.heavy]).toEqual([0, 0, false]);
  });

  it('Suppressing Fire neither slows nor hurts a burrowed or Phased unit; Time Dilation still slows them', () => {
    const bricks: Partial<SimConfig<IdSpace>> = {
      companion: 'bricks',
      abilities: { slot1: 'fx_strike', slot2: 'fx_suppress', slot2State: 'present' },
    };
    const s = setup(bricks);
    const open = spawn(s.state, WALKER, { dist: 3 });
    const dug = spawn(s.state, WALKER, { dist: 3 });
    dug.burrowed = true;
    const ghost = spawn(s.state, enemyDef('fx_ghost', {}), { dist: 3 });
    ghost.phased = true;
    expect(applyAbilityCommand(s.state, s.ctx, cast(2, 1))).toBeNull();
    for (let i = 0; i < 15; i++) {
      abilities(s.state, s.ctx);
      s.state.tick++;
    }
    expect(open.chillPct).toBe(0.5);
    expect(open.hp).toBeLessThan(WALKER.hp);
    expect([dug.chillPct, ghost.chillPct, dug.hp, ghost.hp]).toEqual([0, 0, WALKER.hp, WALKER.hp]);

    const quill: Partial<SimConfig<IdSpace>> = {
      companion: 'quill',
      abilities: { slot1: 'fx_strike', slot2: 'time_dilation', slot2State: 'present' },
    };
    const t = setup(quill);
    const deep = spawn(t.state, WALKER, { dist: 3 });
    deep.burrowed = true;
    const phased = spawn(t.state, WALKER, { dist: 4 });
    phased.phased = true;
    expect(applyAbilityCommand(t.state, t.ctx, { type: 'ability', slot: 2 })).toBeNull();
    abilities(t.state, t.ctx);
    expect([deep.chillPct, phased.chillPct]).toEqual([0.4, 0.4]);
  });

  function cast(col: number, row: number): Extract<Command<IdSpace>, { type: 'ability' }> {
    return { type: 'ability', slot: 2, target: [col, row] };
  }
});
