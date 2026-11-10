// Shield-recharge auras (T502; enemyAbilities/shieldAura.ts; D137: continuous, not a pulse): who
// regains and how much, the stacking rule, the regen delay and the interrupts it ignores, the
// Witch's pulse alongside it, Story's scaling, the lifted gate, and the Aegis Cantor's own numbers
// through the abilities system and a whole tick.
import { describe, expect, it } from 'vitest';
import type { CompiledShieldAura } from '../../content/compiled.ts';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import { enemyDef, MAP, setup, spawn } from '../__fixtures__/combat.ts';
import { FIXTURE_CONTENT, fixtureConfig } from '../__fixtures__/sim.ts';
import { FEATURE_GATES, gateRefusals } from '../gates.ts';
import { scaledEnemy } from '../systems/waves.ts';
import { status } from '../systems/status.ts';
import { enemyAbilities } from './index.ts';
import { projectedAura, shieldAuraPass } from './shieldAura.ts';

const LIVE = compileContent(RAW_CONTENT);

/** +1 shield a tick within 2 tiles. */
const AURA: CompiledShieldAura = Object.freeze({ radiusTiles: 2, radiusSq: 4, shieldPerTick: 1 });
const SHIELD = Object.freeze({ hp: 20, regenPerTick: 0, regenDelayTicks: 60 });
const crystal = { faction: 'aelari', body: 'crystalline' } as const;
const cantor = enemyDef('fx_cantor', { ...crystal, shield: SHIELD, shieldAura: AURA });
const ally = enemyDef('fx_glimmer', { ...crystal, shield: SHIELD });

describe('what an aura restores (enemies.md § 3 `shield_aura`)', () => {
  it('its faction with shields within the radius, not itself, every tick, up to each max', () => {
    const { state, ctx } = setup();
    const src = spawn(state, cantor, { dist: 2 });
    const near = spawn(state, ally, { dist: 3.5 });
    const capped = spawn(state, ally, { dist: 1 });
    const far = spawn(state, ally, { dist: 4.5 });
    const other = spawn(state, enemyDef('fx_hollow', { faction: 'hollow', shield: SHIELD }), {
      dist: 2,
    });
    const bare = spawn(state, enemyDef('fx_bare', { faction: 'aelari' }), { dist: 2 });
    const leaving = spawn(state, ally, { dist: 2 });
    const burrowed = spawn(state, ally, { dist: 2 });
    const neutral = spawn(
      state,
      enemyDef('fx_neutral', { ...crystal, shield: SHIELD, neutral: true }),
      {
        dist: 2,
      },
    );
    const dead = spawn(state, ally, { dist: 2 });
    for (const e of [src, near, far, other, leaving, burrowed, neutral, dead]) e.shieldHp = 0;
    capped.shieldHp = 19.5;
    leaving.leaving = true;
    burrowed.burrowed = true;
    dead.alive = false;
    shieldAuraPass(state, ctx);
    shieldAuraPass(state, ctx);
    expect([near.shieldHp, capped.shieldHp]).toEqual([2, 20]);
    expect(src.shieldHp).toBe(0); // allies, not itself
    for (const e of [far, other, leaving, burrowed, neutral, dead]) expect(e.shieldHp).toBe(0);
    expect(bare.shieldHp).toBe(0);
  });

  it('reaches flyers over the road (centres, any layer) and a cloaked unit, Revealed or not', () => {
    const { state, ctx } = setup();
    spawn(state, cantor, { dist: 2 });
    const flyer = spawn(state, enemyDef('fx_wing', { ...crystal, shield: SHIELD, layer: 'air' }), {
      dist: 3,
    });
    const veiled = spawn(
      state,
      enemyDef('fx_veil', { ...crystal, shield: SHIELD, cloaked: true }),
      {
        dist: 1,
      },
    );
    flyer.shieldHp = 0;
    veiled.shieldHp = 0;
    shieldAuraPass(state, ctx);
    expect([flyer.shieldHp, veiled.shieldHp]).toEqual([1, 1]);
  });

  it('never reaches a boss (its shield is its phases’ business: the Penitent, T506)', () => {
    const { state, ctx } = setup();
    spawn(state, cantor, { dist: 2 });
    const witch = spawn(state, LIVE.enemies.glass_witch, { dist: 2.5 });
    witch.shieldHp = 0;
    shieldAuraPass(state, ctx);
    expect(witch.shieldHp).toBe(0);
  });

  it('a Cantor recharges another Cantor (each is the other’s ally)', () => {
    const { state, ctx } = setup();
    const a = spawn(state, cantor, { dist: 2 });
    const b = spawn(state, cantor, { dist: 3 });
    a.shieldHp = 0;
    b.shieldHp = 0;
    shieldAuraPass(state, ctx);
    expect([a.shieldHp, b.shieldHp]).toEqual([1, 1]);
  });

  it('a leaving, burrowed, or dead source projects nothing', () => {
    const { state, ctx } = setup();
    const src = spawn(state, cantor, { dist: 2 });
    const near = spawn(state, ally, { dist: 3 });
    near.shieldHp = 0;
    expect(projectedAura(src)).toBe(AURA);
    for (const set of [
      () => (src.leaving = true),
      () => (src.burrowed = true),
      () => (src.alive = false),
    ]) {
      src.leaving = false;
      src.burrowed = false;
      src.alive = true;
      set();
      expect(projectedAura(src)).toBeNull();
      shieldAuraPass(state, ctx);
      expect(near.shieldHp).toBe(0);
    }
    expect(projectedAura(spawn(state, ally))).toBeNull();
  });
});

describe('stacking (towers.md § 4: auras of a kind never stack)', () => {
  it('a unit inside two rings regains the strongest rate, once', () => {
    const { state, ctx } = setup();
    spawn(state, cantor, { dist: 1 });
    spawn(
      state,
      enemyDef('fx_cantor_strong', { ...cantor, shieldAura: { ...AURA, shieldPerTick: 3 } }),
      {
        dist: 3,
      },
    );
    spawn(state, cantor, { dist: 2.5 });
    const between = spawn(state, ally, { dist: 2 });
    between.shieldHp = 0;
    shieldAuraPass(state, ctx);
    expect(between.shieldHp).toBe(3);
  });
});

describe('what it ignores', () => {
  it('works under fire: the regen delay neither stops it nor is reset by it', () => {
    const { state, ctx } = setup();
    spawn(state, cantor, { dist: 2 });
    const near = spawn(state, ally, { dist: 3 });
    near.shieldHp = 0;
    near.shieldRegenDelayTicks = 50;
    shieldAuraPass(state, ctx);
    expect(near.shieldHp).toBe(1);
    expect(near.shieldRegenDelayTicks).toBe(50);
  });

  it('adds to the unit’s own regeneration once its delay is out (both run)', () => {
    const { state, ctx } = setup();
    spawn(state, cantor, { dist: 2 });
    const regen = enemyDef('fx_regen', { ...crystal, shield: { ...SHIELD, regenPerTick: 0.5 } });
    const near = spawn(state, regen, { dist: 3 });
    near.shieldHp = 0;
    near.shieldRegenDelayTicks = 0;
    status(state);
    shieldAuraPass(state, ctx);
    expect(near.shieldHp).toBe(1.5);
  });

  it('isn’t interrupted: a Cantor in Stasis (or Pinned) still recharges (no tell to cancel)', () => {
    const { state, ctx } = setup();
    const src = spawn(state, cantor, { dist: 2 });
    const near = spawn(state, ally, { dist: 3 });
    near.shieldHp = 0;
    src.stasisTicks = 30;
    src.pinnedTicks = 30;
    enemyAbilities(state, ctx);
    expect(near.shieldHp).toBe(1);
  });

  it("runs beside a shield pulse: the Witch's 120 lands on top, both capped at the max", () => {
    const { state, ctx } = setup();
    const witch = spawn(state, LIVE.enemies.glass_witch, { dist: 2 });
    witch.bossPhase = 1;
    witch.pulseTicks = 1; // fires this tick
    spawn(state, LIVE.enemies.cantor, { dist: 3 });
    const warden = spawn(state, LIVE.enemies.weft_warden, { dist: 2.5 });
    warden.shieldHp = 50;
    enemyAbilities(state, ctx);
    expect(warden.shieldHp).toBeCloseTo(50 + 120 + 0.25, 9);
    warden.shieldHp = 199.9;
    enemyAbilities(state, ctx);
    expect(warden.shieldHp).toBe(200);
  });
});

describe('Story difficulty (progression.md § 9: −30% shields)', () => {
  it('scales the rate with the shield, so it restores the same share', () => {
    const pct = { hp: -0.3, shield: -0.3, speed: 0 };
    const scaled = scaledEnemy(LIVE.enemies.cantor, pct);
    expect(scaled.shieldAura!.shieldPerTick * 60).toBeCloseTo(10.5, 9);
    expect(scaled.shieldAura!.radiusSq).toBe(4);
    // Only shield scaling touches it; a unit without one keeps null.
    const harder = scaledEnemy(LIVE.enemies.cantor, { hp: 0.5, shield: 0, speed: 0.1 });
    expect(harder.shieldAura).toBe(LIVE.enemies.cantor.shieldAura);
    expect(scaledEnemy(LIVE.enemies.glimmer, pct).shieldAura).toBeNull();
  });
});

describe('the gate (T502 lifts enemy.shieldAura)', () => {
  it('an aura unit plays', () => {
    expect(FEATURE_GATES['enemy.shieldAura']).toBeNull();
    const waves = MAP.waves.map((w) =>
      Object.assign({}, w, {
        groups: w.groups.map((g) => Object.assign({}, g, { enemy: cantor })),
      }),
    );
    const fx = Object.assign({}, MAP, { waves });
    const cfg = fixtureConfig({ content: { ...FIXTURE_CONTENT, maps: { fx_map: fx } } });
    expect(gateRefusals(cfg)).toEqual([]);
  });
});

describe("the Aegis Cantor's aura through the abilities system (enemies.md § 5.2)", () => {
  it('15 shield/s to Aelari within 2 tiles: a broken Glimmer is full again in 40/15 s', () => {
    const { state, ctx } = setup();
    spawn(state, LIVE.enemies.cantor, { dist: 2 });
    const glimmer = spawn(state, LIVE.enemies.glimmer, { dist: 3.9 });
    const out = spawn(state, LIVE.enemies.glimmer, { dist: 4.1 });
    glimmer.shieldHp = 0;
    out.shieldHp = 0;
    let ticks = 0;
    while (glimmer.shieldHp < 40 && ticks < 600) {
      enemyAbilities(state, ctx);
      ticks++;
    }
    expect(ticks).toBe(160); // 40 shield at 0.25 a tick
    expect(out.shieldHp).toBe(0);
  });
});
