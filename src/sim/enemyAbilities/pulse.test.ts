// Shield pulses (T403; enemyAbilities/pulse.ts): the timer and its tell, what a pulse restores and
// to whom, the boss rules (its timer waits between phases; a phase's pulse wins), the Stasis
// interrupt, Story's scaling, the lifted gate, and the Glass Witch's pulse through the abilities
// system.
import { describe, expect, it } from 'vitest';
import type { CompiledPulse } from '../../content/compiled.ts';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import { enemyDef, MAP, setup, spawn } from '../__fixtures__/combat.ts';
import { FIXTURE_CONTENT, fixtureConfig } from '../__fixtures__/sim.ts';
import type { SimEvent } from '../events.ts';
import type { IdSpace } from '../../content/types.ts';
import { FEATURE_GATES, gateRefusals } from '../gates.ts';
import { scaledEnemy } from '../systems/waves.ts';
import { enemyAbilities } from './index.ts';
import { activePulse, pulseStep, pulseTelling, restoreShields } from './pulse.ts';

const LIVE = compileContent(RAW_CONTENT);

/** Every 60 ticks, the last 15 the tell; +5 shield within 2 tiles. */
const PULSE: CompiledPulse = Object.freeze({
  everyTicks: 60,
  tellTicks: 15,
  radiusTiles: 2,
  radiusSq: 4,
  shield: 5,
});
const SHIELD = Object.freeze({ hp: 20, regenPerTick: 0, regenDelayTicks: 60 });
const pulser = enemyDef('fx_cantor', {
  faction: 'aelari',
  body: 'crystalline',
  shield: SHIELD,
  pulse: PULSE,
});
const ally = enemyDef('fx_glimmer', { faction: 'aelari', body: 'crystalline', shield: SHIELD });

type Ev = SimEvent<IdSpace>;
const pulses = (events: readonly Ev[]): Extract<Ev, { type: 'ShieldPulse' }>[] =>
  events.filter((e): e is Extract<Ev, { type: 'ShieldPulse' }> => e.type === 'ShieldPulse');

describe('the shield pulse timer (enemies.md § 6; D101)', () => {
  it('starts on its first tick, tells for its last tellTicks, then fires and restarts', () => {
    const { state, ctx } = setup();
    const e = spawn(state, pulser, { dist: 1 });
    pulseStep(state, ctx, e, PULSE);
    expect(e.pulseTicks).toBe(60);
    let telling = 0;
    for (let i = 0; i < 60; i++) {
      pulseStep(state, ctx, e, PULSE);
      if (pulseTelling(e, PULSE)) telling++;
    }
    expect(telling).toBe(15); // 15 down to 1, then it fires
    expect(pulses(state.events).map((p) => p.phase)).toEqual(['tell', 'fired']);
    expect(e.pulseTicks).toBe(60);
    const [tell, fired] = pulses(state.events);
    expect(tell).toMatchObject({ uid: e.uid, enemy: 'fx_cantor', radiusTiles: 2, restored: 0 });
    expect(fired).toMatchObject({ uid: e.uid, x: e.x, y: e.y, restored: 0 });
  });

  it('first fires one period after its first tick (every 8 s for the Witch)', () => {
    const { state, ctx } = setup();
    const e = spawn(state, pulser, { dist: 1 });
    let firedAt = -1;
    for (let t = 0; t <= 200 && firedAt < 0; t++) {
      pulseStep(state, ctx, e, PULSE);
      if (pulses(state.events).some((p) => p.phase === 'fired')) firedAt = t;
    }
    expect(firedAt).toBe(60);
  });

  it("waits while a boss is invulnerable between phases (its other timers' rule)", () => {
    const { state, ctx } = setup();
    const e = spawn(state, pulser, { dist: 1 });
    e.pulseTicks = 10;
    e.invulnerableTicks = 5;
    pulseStep(state, ctx, e, PULSE);
    expect(e.pulseTicks).toBe(10);
    expect(pulseTelling(e, PULSE)).toBe(false);
    e.invulnerableTicks = 0;
    expect(pulseTelling(e, PULSE)).toBe(true);
  });
});

describe('what a pulse restores', () => {
  it('its own faction with shields, itself included, within the radius, up to each max', () => {
    const { state } = setup();
    const src = spawn(state, pulser, { dist: 2 });
    const near = spawn(state, ally, { dist: 3.5 });
    const capped = spawn(state, ally, { dist: 1 });
    const far = spawn(state, ally, { dist: 4.5 });
    const full = spawn(state, ally, { dist: 2.5 });
    const other = spawn(
      state,
      enemyDef('fx_hollow_shield', { faction: 'hollow', shield: SHIELD }),
      {
        dist: 2,
      },
    );
    const bare = spawn(state, enemyDef('fx_bare_aelari', { faction: 'aelari' }), { dist: 2 });
    const leaving = spawn(state, ally, { dist: 2 });
    const dead = spawn(state, ally, { dist: 2 });
    for (const e of [src, near, far, other, leaving, dead]) e.shieldHp = 0;
    capped.shieldHp = 18;
    leaving.leaving = true;
    dead.alive = false;
    expect(restoreShields(state, src, PULSE)).toBe(3);
    expect([src.shieldHp, near.shieldHp, capped.shieldHp, full.shieldHp]).toEqual([5, 5, 20, 20]);
    expect([far.shieldHp, other.shieldHp, bare.shieldHp, leaving.shieldHp]).toEqual([0, 0, 0, 0]);
    expect(dead.shieldHp).toBe(0);
  });

  it("leaves the regen delay alone (a pulse refills, it doesn't restart regeneration)", () => {
    const { state } = setup();
    const src = spawn(state, pulser, { dist: 1 });
    src.shieldHp = 0;
    src.shieldRegenDelayTicks = 7;
    restoreShields(state, src, PULSE);
    expect(src.shieldRegenDelayTicks).toBe(7);
  });
});

describe('the interrupt (enemies.md § 2.4)', () => {
  it('Stasis cancels a tell, even mid-tell, and the cooldown restarts', () => {
    const { state, ctx } = setup();
    const e = spawn(state, pulser, { dist: 1 });
    e.pulseTicks = 10; // mid-tell
    e.stasisTicks = 3;
    pulseStep(state, ctx, e, PULSE);
    expect(e.pulseTicks).toBe(60);
    expect(pulses(state.events).map((p) => p.phase)).toEqual(['interrupted']);
  });

  it('blocks a tell from starting (no event: it never began)', () => {
    const { state, ctx } = setup();
    const e = spawn(state, pulser, { dist: 1 });
    e.pulseTicks = 16;
    e.stasisTicks = 3;
    pulseStep(state, ctx, e, PULSE);
    expect(e.pulseTicks).toBe(60);
    expect(pulses(state.events)).toEqual([]);
    // Before the tell window, Stasis lets the cooldown run.
    e.pulseTicks = 40;
    pulseStep(state, ctx, e, PULSE);
    expect(e.pulseTicks).toBe(39);
  });

  it("doesn't touch a boss (Stasis on a boss is Chilled 50%; D101)", () => {
    const { state, ctx } = setup();
    const witch = spawn(state, LIVE.enemies.glass_witch, { dist: 1 });
    const pulse = LIVE.enemies.glass_witch.boss!.phases[0]!.pulse!;
    witch.pulseTicks = 10;
    witch.stasisTicks = 3;
    pulseStep(state, ctx, witch, pulse);
    expect(witch.pulseTicks).toBe(9);
  });
});

describe('the active pulse', () => {
  it("is a boss phase's, else the unit's own", () => {
    const { state } = setup();
    const unit = spawn(state, pulser);
    expect(activePulse(unit)).toBe(PULSE);
    const witch = spawn(state, LIVE.enemies.glass_witch);
    expect(activePulse(witch)).toBeNull(); // before phase 1
    witch.bossPhase = 1;
    expect(activePulse(witch)).toBe(LIVE.enemies.glass_witch.boss!.phases[0]!.pulse);
    expect(activePulse(spawn(state, ally))).toBeNull();
  });
});

describe('Story difficulty (progression.md § 9: −30% shields)', () => {
  it("scales a pulse's amount with the shield, a boss phase's too", () => {
    const pct = { hp: -0.3, shield: -0.3, speed: 0 };
    expect(scaledEnemy(pulser, pct).pulse?.shield).toBeCloseTo(3.5, 12);
    const witch = scaledEnemy(LIVE.enemies.glass_witch, pct);
    for (const p of witch.boss!.phases) expect(p.pulse?.shield).toBeCloseTo(84, 9);
    expect(witch.boss!.phases[1]!.blink).toBe(LIVE.enemies.glass_witch.boss!.phases[1]!.blink);
    // A boss with no pulse keeps its boss def as it is (Act I's runs are untouched).
    const bloom = LIVE.enemies.chitterbloom;
    expect(scaledEnemy(bloom, pct).boss).toBe(bloom.boss);
    // Only shield scaling touches the pulse.
    expect(scaledEnemy(pulser, { hp: 0.5, shield: 0, speed: 0 }).pulse).toBe(PULSE);
  });
});

describe('the gate (T403 lifts enemy.pulse)', () => {
  it('a pulsing unit plays', () => {
    expect(FEATURE_GATES['enemy.pulse']).toBeNull();
    const waves = MAP.waves.map((w) =>
      Object.assign({}, w, {
        groups: w.groups.map((g) => Object.assign({}, g, { enemy: pulser })),
      }),
    );
    const fx = Object.assign({}, MAP, { waves });
    const cfg = fixtureConfig({ content: { ...FIXTURE_CONTENT, maps: { fx_map: fx } } });
    expect(gateRefusals(cfg)).toEqual([]);
  });
});

describe("the Glass Witch's pulse through the abilities system (D101)", () => {
  it('every 8 s after a 1.5 s tell: 120 shield to her and Aelari within 2 tiles', () => {
    const { state, ctx } = setup();
    const witch = spawn(state, LIVE.enemies.glass_witch, { dist: 2 });
    const warden = spawn(state, LIVE.enemies.weft_warden, { dist: 3 });
    const glimmer = spawn(state, LIVE.enemies.glimmer, { dist: 1.5 });
    const farWarden = spawn(state, LIVE.enemies.weft_warden, { dist: 6 });
    witch.shieldHp = 1000;
    warden.shieldHp = 0;
    glimmer.shieldHp = 0;
    farWarden.shieldHp = 0;
    let tellAt = -1;
    let firedAt = -1;
    for (let t = 0; t < 8 * 60 + 2 && firedAt < 0; t++) {
      enemyAbilities(state, ctx);
      for (const p of pulses(state.events)) {
        if (p.phase === 'tell' && tellAt < 0) tellAt = t;
        if (p.phase === 'fired') firedAt = t;
      }
    }
    expect(firedAt).toBe(480);
    expect(firedAt - tellAt).toBe(90);
    expect([witch.shieldHp, warden.shieldHp, glimmer.shieldHp]).toEqual([1120, 120, 40]);
    expect(farWarden.shieldHp).toBe(0);
    const fired = pulses(state.events).find((p) => p.phase === 'fired');
    expect(fired).toMatchObject({ enemy: 'glass_witch', radiusTiles: 2, restored: 3 });
  });
});
