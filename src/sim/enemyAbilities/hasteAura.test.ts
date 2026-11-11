// Haste auras (T603; enemyAbilities/hasteAura.ts): who is hasted and how much, the stacking rule
// and the cap, the sources that project nothing, the speed rule movement applies (chill, Unnerved,
// Stasis, Pin), the lifted gate, and the Expediter and Compliance Drone's own numbers through the
// abilities system (a whole sim on dev_revoke: render/__fixtures__/devRevoke.test.ts).
import { describe, expect, it } from 'vitest';
import type { CompiledHasteAura } from '../../content/compiled.ts';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import { HASTE_CAP, UNNERVED_SLOW } from '../../content/rules.ts';
import { enemyDef, MAP, setup, spawn } from '../__fixtures__/combat.ts';
import { FIXTURE_CONTENT, fixtureConfig } from '../__fixtures__/sim.ts';
import { FEATURE_GATES, gateRefusals } from '../gates.ts';
import { enemySpeedPerTick } from '../systems/movement.ts';
import { scaledEnemy } from '../systems/waves.ts';
import { hasteAuraPass, projectedHaste } from './hasteAura.ts';
import { enemyAbilities } from './index.ts';

const LIVE = compileContent(RAW_CONTENT);

/** +30% within 2 tiles. */
const AURA: CompiledHasteAura = Object.freeze({ radiusTiles: 2, radiusSq: 4, pct: 0.3 });
const machine = { faction: 'everglow', body: 'mechanical' } as const;
const expediter = enemyDef('fx_expediter', { ...machine, hasteAura: AURA });
const drone = enemyDef('fx_drone', machine);

describe('who an aura hastes (enemies.md § 3 `haste_aura`)', () => {
  it('its faction within the radius, not itself; a far, foreign, leaving, burrowed, Phased, neutral, or dead unit gets nothing', () => {
    const { state, ctx } = setup();
    const src = spawn(state, expediter, { dist: 2 });
    const near = spawn(state, drone, { dist: 3.5 });
    const edge = spawn(state, drone, { dist: 0 });
    const far = spawn(state, drone, { dist: 4.5 });
    const other = spawn(state, enemyDef('fx_hollow', { faction: 'hollow' }), { dist: 2 });
    const leaving = spawn(state, drone, { dist: 2 });
    const burrowed = spawn(state, drone, { dist: 2 });
    const phased = spawn(state, drone, { dist: 2 });
    const neutral = spawn(state, enemyDef('fx_neutral', { ...machine, neutral: true }), {
      dist: 2,
    });
    const dead = spawn(state, drone, { dist: 2 });
    leaving.leaving = true;
    burrowed.burrowed = true;
    phased.phased = true;
    dead.alive = false;
    hasteAuraPass(state, ctx);
    expect([near.auraHastePct, edge.auraHastePct]).toEqual([0.3, 0.3]);
    expect(src.auraHastePct).toBe(0); // allies, not itself
    for (const e of [far, other, leaving, burrowed, phased, neutral, dead]) {
      expect(e.auraHastePct).toBe(0);
    }
  });

  it('reaches a flyer over the road (centres, any layer) and a cloaked unit', () => {
    const { state, ctx } = setup();
    spawn(state, expediter, { dist: 2 });
    const flyer = spawn(state, enemyDef('fx_gunship', { ...machine, layer: 'air' }), { dist: 3 });
    const veiled = spawn(state, enemyDef('fx_black', { ...machine, cloaked: true }), { dist: 1 });
    hasteAuraPass(state, ctx);
    expect([flyer.auraHastePct, veiled.auraHastePct]).toEqual([0.3, 0.3]);
  });

  it('never a boss (its pace is its phases’ business)', () => {
    const { state, ctx } = setup();
    spawn(state, expediter, { dist: 2 });
    const boss = spawn(state, { ...LIVE.enemies.glass_witch, faction: 'everglow' }, { dist: 2.5 });
    hasteAuraPass(state, ctx);
    expect(boss.auraHastePct).toBe(0);
  });

  it('two Expediters haste each other (each is the other’s ally)', () => {
    const { state, ctx } = setup();
    const a = spawn(state, expediter, { dist: 2 });
    const b = spawn(state, expediter, { dist: 3 });
    hasteAuraPass(state, ctx);
    expect([a.auraHastePct, b.auraHastePct]).toEqual([0.3, 0.3]);
  });

  it('a leaving, burrowed, Phased, or dead source projects nothing, and its haste ends at once', () => {
    const { state, ctx } = setup();
    const src = spawn(state, expediter, { dist: 2 });
    const near = spawn(state, drone, { dist: 3 });
    expect(projectedHaste(src)).toBe(AURA);
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
      hasteAuraPass(state, ctx);
      expect(near.auraHastePct).toBe(0.3);
      set();
      expect(projectedHaste(src)).toBeNull();
      hasteAuraPass(state, ctx);
      expect(near.auraHastePct).toBe(0);
    }
    expect(projectedHaste(spawn(state, drone))).toBeNull();
  });
});

describe('stacking (enemies.md § 2.4: Haste is highest only, capped)', () => {
  it('a unit inside two rings has the strongest, once', () => {
    const { state, ctx } = setup();
    spawn(state, expediter, { dist: 1 });
    spawn(
      state,
      enemyDef('fx_expediter_strong', { ...expediter, hasteAura: { ...AURA, pct: 0.4 } }),
      {
        dist: 3,
      },
    );
    spawn(state, expediter, { dist: 2.5 });
    const between = spawn(state, drone, { dist: 2 });
    hasteAuraPass(state, ctx);
    expect(between.auraHastePct).toBe(0.4);
  });

  it('never above HASTE_CAP, even from an aura past it (validate refuses one in content)', () => {
    const { state, ctx } = setup();
    spawn(state, enemyDef('fx_over', { ...expediter, hasteAura: { ...AURA, pct: 0.9 } }), {
      dist: 2,
    });
    const near = spawn(state, drone, { dist: 3 });
    hasteAuraPass(state, ctx);
    expect(near.auraHastePct).toBe(HASTE_CAP);
  });

  it('no other haste meets an aura: no Skitterkin projects one, no boss carries one', () => {
    for (const def of Object.values(LIVE.enemies)) {
      if (def.hasteAura === null) continue;
      expect(def.faction, def.id).not.toBe('skitterkin'); // Skittish is a fleeing Skitterkin's
      expect(def.boss, def.id).toBeNull();
    }
  });
});

describe('the speed rule (enemies.md § 2.4: base × (1 − chill) × (1 − unnerved) × (1 + haste))', () => {
  it('multiplies with chill and Unnerved; Stasis and a Pin still hold it at 0', () => {
    const { state, ctx } = setup();
    spawn(state, expediter, { dist: 2 });
    const near = spawn(state, drone, { dist: 3 });
    const base = drone.speedTilesPerTick;
    hasteAuraPass(state, ctx);
    expect(enemySpeedPerTick(near)).toBeCloseTo(base * 1.3, 12);
    near.chillMul = 0.5;
    expect(enemySpeedPerTick(near)).toBeCloseTo(base * 0.5 * 1.3, 12);
    near.unnervedTicks = 30;
    expect(enemySpeedPerTick(near)).toBeCloseTo(base * 0.5 * (1 - UNNERVED_SLOW) * 1.3, 12);
    near.stasisTicks = 5;
    expect(enemySpeedPerTick(near)).toBe(0);
    near.stasisTicks = 0;
    near.pinnedTicks = 5;
    expect(enemySpeedPerTick(near)).toBe(0);
  });

  it('isn’t interrupted: an Expediter in Stasis or Pinned still hastes (no tell to cancel)', () => {
    const { state, ctx } = setup();
    const src = spawn(state, expediter, { dist: 2 });
    const near = spawn(state, drone, { dist: 3 });
    src.stasisTicks = 30;
    src.pinnedTicks = 30;
    src.unnervedTicks = 30;
    enemyAbilities(state, ctx);
    expect(near.auraHastePct).toBe(0.3);
  });

  it('a unit with no aura on it moves exactly as before (×1: the Act I–II harness numbers hold)', () => {
    const { state } = setup();
    const near = spawn(state, drone, { dist: 3 });
    expect(near.auraHastePct).toBe(0);
    expect(enemySpeedPerTick(near)).toBe(drone.speedTilesPerTick);
  });
});

describe('Story difficulty', () => {
  it('changes no haste number', () => {
    const scaled = scaledEnemy(LIVE.enemies.expediter, { hp: -0.3, shield: -0.3, speed: 0 });
    expect(scaled.hasteAura).toEqual(LIVE.enemies.expediter.hasteAura);
  });
});

describe('the gate (T603 lifts enemy.hasteAura)', () => {
  it('an aura unit plays', () => {
    expect(FEATURE_GATES['enemy.hasteAura']).toBeNull();
    const waves = MAP.waves.map((w) =>
      Object.assign({}, w, {
        groups: w.groups.map((g) => Object.assign({}, g, { enemy: expediter })),
      }),
    );
    const fx = Object.assign({}, MAP, { waves });
    const cfg = fixtureConfig({ content: { ...FIXTURE_CONTENT, maps: { fx_map: fx } } });
    expect(gateRefusals(cfg)).toEqual([]);
  });
});

describe('Everglow Security as built (enemies.md § 5.3)', () => {
  it('the roster rows, the spawn intervals (1.0 s, 1.5 s), and the Expediter’s aura', () => {
    expect(LIVE.enemies.compliance).toMatchObject({
      faction: 'everglow',
      body: 'mechanical',
      layer: 'ground',
      hp: 120,
      armor: 4,
      leak: 1,
      bounty: 6,
      spawnIntervalTicks: 60,
      hasteAura: null,
    });
    expect(LIVE.enemies.compliance.speedTilesPerTick * 60).toBeCloseTo(1.0, 12);
    expect(LIVE.enemies.expediter).toMatchObject({
      faction: 'everglow',
      body: 'mechanical',
      layer: 'ground',
      hp: 150,
      armor: 3,
      leak: 1,
      bounty: 12,
      spawnIntervalTicks: 90,
      hasteAura: { radiusTiles: 2, radiusSq: 4, pct: 0.3 },
    });
    expect(LIVE.enemies.expediter.speedTilesPerTick * 60).toBeCloseTo(1.1, 12);
  });

  it('a drone beside an Expediter walks 1.3 tiles/s through the abilities system', () => {
    const { state, ctx } = setup();
    // fx_map's road runs straight down column 2 from dist 2 to 5.
    spawn(state, LIVE.enemies.expediter, { dist: 2 });
    const beside = spawn(state, LIVE.enemies.compliance, { dist: 3.9 });
    const out = spawn(state, LIVE.enemies.compliance, { dist: 4.1 });
    enemyAbilities(state, ctx);
    expect(enemySpeedPerTick(beside) * 60).toBeCloseTo(1.3, 12);
    expect(enemySpeedPerTick(out) * 60).toBeCloseTo(1.0, 12);
  });
});
