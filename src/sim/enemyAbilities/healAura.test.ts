// Healer auras (T703; enemyAbilities/healAura.ts): who is mended and how much, the max HP cap, the
// stacking rule, the sources that project nothing, interrupts, Story difficulty, the lifted gate,
// and the Maintenance Associate's own numbers through the abilities system and a whole sim.
import { describe, expect, it } from 'vitest';
import type { CompiledHealAura } from '../../content/compiled.ts';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import { enemyDef, MAP, setup, spawn } from '../__fixtures__/combat.ts';
import { FIXTURE_CONTENT, fixtureConfig } from '../__fixtures__/sim.ts';
import { FEATURE_GATES, gateRefusals } from '../gates.ts';
import { scaledEnemy } from '../systems/waves.ts';
import { healAuraPass, healRate, projectedHeal } from './healAura.ts';
import { enemyAbilities } from './index.ts';

const LIVE = compileContent(RAW_CONTENT);

/** 12 HP/s (0.2 a tick) to Mechanical within 1.5 tiles. */
const AURA: CompiledHealAura = Object.freeze({
  radiusTiles: 1.5,
  radiusSq: 2.25,
  hpPerTick: 0.2,
  body: 'mechanical',
});
const machine = { faction: 'everglow', body: 'mechanical', hp: 100 } as const;
const associate = enemyDef('fx_associate', { ...machine, healAura: AURA });
const drone = enemyDef('fx_drone', machine);

/** Spawns `def` at `dist` with `hp` left. */
function hurt(
  state: Parameters<typeof spawn>[0],
  def: Parameters<typeof spawn>[1],
  dist: number,
  hp = 50,
) {
  const e = spawn(state, def, { dist });
  e.hp = hp;
  return e;
}

describe('who an aura mends (enemies.md § 3 `healer_aura`)', () => {
  it('its faction’s Mechanical units within the radius, not itself', () => {
    const { state, ctx } = setup();
    const src = hurt(state, associate, 2);
    const near = hurt(state, drone, 3.5);
    const edge = hurt(state, drone, 0.5);
    const far = hurt(state, drone, 3.6);
    healAuraPass(state, ctx);
    expect(near.hp).toBeCloseTo(50.2, 12);
    expect(edge.hp).toBeCloseTo(50.2, 12);
    expect(far.hp).toBe(50);
    expect(src.hp).toBe(50); // allies, not itself
  });

  it('never another faction or body, a boss, a neutral, leaving, burrowed, Phased, or dead unit', () => {
    const { state, ctx } = setup();
    hurt(state, associate, 2);
    const hollow = hurt(state, enemyDef('fx_hollow', { ...machine, faction: 'hollow' }), 2);
    const organic = hurt(state, enemyDef('fx_meat', { ...machine, body: 'organic' }), 2);
    const boss = hurt(
      state,
      { ...LIVE.enemies.glass_witch, faction: 'everglow', body: 'mechanical' },
      2.5,
    );
    const neutral = hurt(state, enemyDef('fx_neutral', { ...machine, neutral: true }), 2);
    const leaving = hurt(state, drone, 2);
    const burrowed = hurt(state, drone, 2);
    const phased = hurt(state, drone, 2);
    const dead = hurt(state, drone, 2, 0);
    leaving.leaving = true;
    burrowed.burrowed = true;
    phased.phased = true;
    dead.alive = false;
    healAuraPass(state, ctx);
    for (const e of [hollow, organic, neutral, leaving, burrowed, phased]) expect(e.hp).toBe(50);
    expect(boss.hp).toBe(50);
    expect(dead.hp).toBe(0);
  });

  it('reaches a flyer over the road (centres, any layer) and an unrevealed cloaked unit', () => {
    const { state, ctx } = setup();
    hurt(state, associate, 2);
    const flyer = hurt(state, enemyDef('fx_gunship', { ...machine, layer: 'air' }), 3);
    const veiled = hurt(state, enemyDef('fx_black', { ...machine, cloaked: true }), 1);
    healAuraPass(state, ctx);
    expect(flyer.hp).toBeCloseTo(50.2, 12);
    expect(veiled.hp).toBeCloseTo(50.2, 12);
  });

  it('never past max HP (def.hp + bonusMaxHp), and a whole unit gets nothing', () => {
    const { state, ctx } = setup();
    hurt(state, associate, 2);
    const nearly = hurt(state, drone, 2.5, 99.9);
    const whole = hurt(state, drone, 2.5, 100);
    const grown = hurt(state, drone, 2.5, 100);
    grown.bonusMaxHp = 20;
    healAuraPass(state, ctx);
    expect(nearly.hp).toBe(100);
    expect(whole.hp).toBe(100);
    expect(grown.hp).toBeCloseTo(100.2, 12);
    const sources = [0];
    expect(healRate(state.enemies, whole.slot, sources, 1)).toBe(0);
  });

  it('two Associates mend each other (each is the other’s ally)', () => {
    const { state, ctx } = setup();
    const a = hurt(state, associate, 2);
    const b = hurt(state, associate, 3);
    healAuraPass(state, ctx);
    expect([a.hp, b.hp].map((h) => Math.round(h * 10) / 10)).toEqual([50.2, 50.2]);
  });

  it('a leaving, burrowed, Phased, or dead source projects nothing', () => {
    const { state, ctx } = setup();
    const src = hurt(state, associate, 2);
    const near = hurt(state, drone, 3);
    expect(projectedHeal(src)).toBe(AURA);
    for (const set of [
      () => (src.leaving = true),
      () => (src.burrowed = true),
      () => (src.phased = true),
      () => (src.alive = false),
    ]) {
      src.leaving = false;
      src.burrowed = false;
      src.phased = false;
      src.alive = true;
      near.hp = 50;
      set();
      expect(projectedHeal(src)).toBeNull();
      healAuraPass(state, ctx);
      expect(near.hp).toBe(50);
    }
    expect(projectedHeal(spawn(state, drone))).toBeNull();
  });
});

describe('stacking and interrupts', () => {
  it('a unit inside two rings regains the strongest, once', () => {
    const { state, ctx } = setup();
    hurt(state, associate, 1);
    hurt(
      state,
      enemyDef('fx_associate_strong', { ...associate, healAura: { ...AURA, hpPerTick: 0.5 } }),
      3,
    );
    const between = hurt(state, drone, 2);
    healAuraPass(state, ctx);
    expect(between.hp).toBeCloseTo(50.5, 12);
  });

  it('isn’t interrupted: an Associate in Stasis, Pinned, Unnerved or Lulled still mends', () => {
    const { state, ctx } = setup();
    const src = hurt(state, associate, 2);
    const near = hurt(state, drone, 3);
    src.stasisTicks = 30;
    src.pinnedTicks = 30;
    src.unnervedTicks = 30;
    src.lulled = true;
    enemyAbilities(state, ctx);
    expect(near.hp).toBeCloseTo(50.2, 12);
  });
});

describe('Story difficulty and the gate', () => {
  it('scales the rate with the HP (the same share of a weaker unit)', () => {
    const story = scaledEnemy(LIVE.enemies.associate, { hp: -0.3, shield: -0.3, speed: 0 });
    expect(story.healAura?.hpPerTick).toBeCloseTo(0.14, 12);
    expect(scaledEnemy(LIVE.enemies.associate, { hp: 0, shield: -0.3, speed: 0.2 }).healAura).toBe(
      LIVE.enemies.associate.healAura,
    );
  });

  it('T703 lifts enemy.healAura: an Associate plays', () => {
    expect(FEATURE_GATES['enemy.healAura']).toBeNull();
    const waves = MAP.waves.map((w) =>
      Object.assign({}, w, {
        groups: w.groups.map((g) => Object.assign({}, g, { enemy: LIVE.enemies.associate })),
      }),
    );
    const fx = Object.assign({}, MAP, { waves });
    const cfg = fixtureConfig({ content: { ...FIXTURE_CONTENT, maps: { fx_map: fx } } });
    expect(gateRefusals(cfg)).toEqual([]);
  });
});

describe('the Maintenance Associate as built (enemies.md § 5.3)', () => {
  it('mends a drone 12 HP a second through the abilities system', () => {
    const { state, ctx } = setup();
    // fx_map's road runs straight down column 2 from dist 2 to 5.
    spawn(state, LIVE.enemies.associate, { dist: 2 });
    const beside = spawn(state, LIVE.enemies.compliance, { dist: 3.4 });
    const out = spawn(state, LIVE.enemies.compliance, { dist: 3.6 });
    beside.hp = 60;
    out.hp = 60;
    for (let t = 0; t < 60; t++) enemyAbilities(state, ctx);
    expect(beside.hp).toBeCloseTo(72, 9);
    expect(out.hp).toBe(60);
  });
});
