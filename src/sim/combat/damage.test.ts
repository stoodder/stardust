import { describe, expect, it } from 'vitest';
import type { CompiledEffect, CompiledEnemyDef } from '../../content/compiled.ts';
import type { DamageType } from '../../content/types.ts';
import { CHILL_CAP, CORRODED_STACK_SEC } from '../../content/rules.ts';
import { secToTicks } from '../../shared/time.ts';
import { enemyDef, RUNNER, setup, spawn, WALKER } from '../__fixtures__/combat.ts';
import type { DamageSource } from '../events.ts';
import { status } from '../systems/status.ts';
import { applyDamage, applyEffects, PLAIN_HIT, type HitMods } from './damage.ts';

const TOWER: DamageSource = { kind: 'tower', uid: 99 };
const ABILITY: DamageSource = { kind: 'ability', slot: 1 };
const PIERCE_3 = { armorPierce: 3, ignoresArmor: false };
const IGNORE = { armorPierce: 0, ignoresArmor: true };

const tough = enemyDef('fx_tough', { hp: 1000 });
const armored = (armor: number) => enemyDef(`fx_armor_${armor}`, { hp: 1000, armor });
const shielded = enemyDef('fx_shielded', {
  hp: 1000,
  shield: { hp: 10, regenPerTick: 0.5, regenDelayTicks: 3 },
});

function hpLost(
  def: CompiledEnemyDef,
  amount: number,
  type: DamageType = 'kinetic',
  hit: HitMods = PLAIN_HIT,
): number {
  const { state } = setup();
  const e = spawn(state, def);
  applyDamage(state, e, amount, type, TOWER, hit);
  return def.hp - e.hp;
}

describe('damage pipeline: armor (enemies.md §2.3)', () => {
  it('armor 4 halves an 8-damage hit; armor 12 leaves the 20% floor', () => {
    expect(hpLost(armored(4), 8)).toBe(4);
    expect(hpLost(armored(12), 8)).toBeCloseTo(1.6, 12);
    expect(hpLost(armored(0), 8)).toBe(8);
  });

  it('armor pierce, ignoresArmor, Psionic, and DoT', () => {
    expect(hpLost(armored(4), 8, 'kinetic', PIERCE_3)).toBe(7);
    expect(hpLost(armored(2), 8, 'kinetic', PIERCE_3)).toBe(8); // pierce never adds damage
    expect(hpLost(armored(12), 120, 'kinetic', IGNORE)).toBe(120);
    expect(hpLost(armored(12), 10, 'psionic')).toBe(10);
    expect(
      hpLost(armored(4), 2, 'kinetic', { armorPierce: 0, ignoresArmor: false, isDoT: true }),
    ).toBe(2);
  });

  it('beams take armor per second, prorated per tick', () => {
    // 20 dps in 0.25 s ticks: raw 5 per tick, armor 4 × 0.25 = 1 → 4.
    const beam = { armorPierce: 0, ignoresArmor: false, beamTickSec: 0.25 };
    expect(hpLost(armored(4), 5, 'energy', beam)).toBe(4);
  });

  it('applies the body matrix before armor', () => {
    expect(hpLost(enemyDef('fx_void', { hp: 100, body: 'void' }), 8, 'energy')).toBe(6);
    expect(hpLost(enemyDef('fx_mech', { hp: 100, body: 'mechanical' }), 20, 'psionic')).toBeCloseTo(
      7,
      12,
    );
    expect(hpLost(enemyDef('fx_void2', { hp: 100, body: 'void' }), 10, 'psionic')).toBe(15);
    // Matrix, then armor: 20 × 0.75 = 15 − 4 = 11.
    expect(hpLost(enemyDef('fx_void3', { hp: 100, body: 'void', armor: 4 }), 20, 'energy')).toBe(
      11,
    );
  });

  it('Marked raises damage; Corroded strips armor', () => {
    const { state } = setup();
    const e = spawn(state, armored(4));
    e.markPct = 0.5;
    e.markTicks = 10;
    applyDamage(state, e, 8, 'kinetic', TOWER); // 12 − 4
    expect(1000 - e.hp).toBe(8);
    e.markTicks = 0;
    e.corrodedStacks = 3;
    applyDamage(state, e, 8, 'kinetic', TOWER); // 8 − 1
    expect(1000 - e.hp).toBe(15);
  });
});

describe('damage pipeline: shields (enemies.md §2.1, §2.3)', () => {
  it('Kinetic strips shields at ×0.5 and a fully absorbed hit leaves HP alone', () => {
    const { state } = setup();
    const e = spawn(state, shielded);
    expect(applyDamage(state, e, 8, 'kinetic', TOWER)).toBe(0);
    expect(e.shieldHp).toBe(6);
    expect(e.hp).toBe(1000);
  });

  it('overflow converts back to raw at the inverse multiplier', () => {
    const { state } = setup();
    const e = spawn(state, shielded);
    applyDamage(state, e, 30, 'kinetic', TOWER); // s = 15 > 10: (15 − 10) / 0.5 = 10 raw
    expect(e.shieldHp).toBe(0);
    expect(e.hp).toBe(990);
    const f = spawn(state, shielded);
    applyDamage(state, f, 8, 'energy', TOWER); // s = 16: (16 − 10) / 2 = 3 raw
    expect(f.hp).toBe(997);
  });

  it('Soaked: Kinetic and Explosive bite at ×0.8, Energy takes +25%', () => {
    const { state } = setup();
    const e = spawn(state, shielded);
    e.soakedTicks = 5;
    applyDamage(state, e, 10, 'explosive', TOWER);
    expect(e.shieldHp).toBeCloseTo(2, 12);
    const f = spawn(state, tough);
    f.soakedTicks = 5;
    applyDamage(state, f, 8, 'energy', TOWER);
    expect(f.hp).toBe(990);
    const g = spawn(state, tough);
    applyDamage(state, g, 8, 'kinetic', TOWER); // Soaked doesn't touch Kinetic HP damage
    g.soakedTicks = 5;
    applyDamage(state, g, 8, 'kinetic', TOWER);
    expect(g.hp).toBe(984);
  });

  it('shields regenerate after the delay, and any hit restarts the delay', () => {
    const { state } = setup();
    const e = spawn(state, shielded);
    applyDamage(state, e, 8, 'kinetic', TOWER);
    expect(e.shieldHp).toBe(6);
    for (let i = 0; i < 3; i++) status(state); // the delay
    expect(e.shieldHp).toBe(6);
    status(state);
    expect(e.shieldHp).toBe(6.5);
    applyDamage(state, e, 1, 'kinetic', TOWER);
    status(state);
    expect(e.shieldHp).toBe(6); // delay restarted
    for (let i = 0; i < 100; i++) status(state);
    expect(e.shieldHp).toBe(10); // capped at max
  });
});

describe('kills', () => {
  it('kills at 0 HP: EnemyDied names the killer, bounty, and place; stats count it', () => {
    const { state } = setup();
    const e = spawn(state, WALKER, { dist: 1.5 });
    expect(applyDamage(state, e, 25, 'kinetic', TOWER)).toBe(25);
    expect(applyDamage(state, e, 25, 'kinetic', TOWER)).toBe(5); // only the HP it had
    expect(e.alive).toBe(false);
    expect(e.hp).toBe(0);
    expect(state.events).toEqual([
      {
        type: 'EnemyDied',
        uid: e.uid,
        enemy: 'fx_walker',
        bounty: 3,
        killer: { kind: 'tower', uid: 99 },
        x: 2,
        y: 0.5,
      },
    ]);
    expect(state.stats.skitterkinKilled).toBe(1);
    expect(state.stats.killsByEnemy).toEqual({ fx_walker: 1 });
    // Dead enemies take nothing more and don't die twice.
    expect(applyDamage(state, e, 25, 'kinetic', TOWER)).toBe(0);
    expect(state.events).toHaveLength(1);
  });

  it('counts ability kills, and only Skitterkin as Pests Processed', () => {
    const { state } = setup();
    const bot = enemyDef('fx_bot', { faction: 'everglow', body: 'mechanical', hp: 5 });
    applyDamage(state, spawn(state, bot), 200, 'explosive', ABILITY);
    applyDamage(state, spawn(state, RUNNER), 200, 'explosive', ABILITY);
    expect(state.stats.skitterkinKilled).toBe(1);
    expect(state.stats.killsByEnemy).toEqual({ fx_bot: 1, fx_runner: 1 });
    expect(state.events[0]).toMatchObject({
      type: 'EnemyDied',
      killer: { kind: 'ability', slot: 1 },
    });
  });

  it('a float sliver of HP still dies (no extra shot for 1e-15)', () => {
    const { state } = setup();
    const e = spawn(state, enemyDef('fx_sliver', { hp: 0.3 + 5e-10, armor: 12 }));
    applyDamage(state, e, 1.5, 'kinetic', TOWER); // floor 0.3 leaves 5e-10
    expect(e.alive).toBe(false);
  });

  it('ignores zero damage', () => {
    const { state } = setup();
    const e = spawn(state, shielded);
    applyDamage(state, e, 0, 'kinetic', TOWER);
    expect(e.shieldRegenDelayTicks).toBe(0);
    expect(e.shieldHp).toBe(10);
  });
});

const chill = (pct: number, durationTicks: number): CompiledEffect => ({
  status: 'chilled',
  pct,
  durationTicks,
});

describe('statuses (enemies.md §2.4)', () => {
  it('Chilled: the strongest source wins, an equal one extends, a weaker one does nothing', () => {
    const { state } = setup();
    const e = spawn(state, tough);
    applyEffects(e, [chill(0.25, 90)]);
    expect(e.chillMul).toBe(0.75);
    applyEffects(e, [chill(0.3, 30)]);
    expect([e.chillPct, e.chillTicks]).toEqual([0.3, 30]);
    applyEffects(e, [chill(0.25, 200)]);
    expect([e.chillPct, e.chillTicks]).toEqual([0.3, 30]);
    applyEffects(e, [chill(0.3, 60)]);
    expect([e.chillPct, e.chillTicks]).toEqual([0.3, 60]);
    applyEffects(e, [chill(0.3, 10)]);
    expect(e.chillTicks).toBe(60);
  });

  it('Chilled is capped at 70%', () => {
    const { state } = setup();
    const e = spawn(state, tough);
    applyEffects(e, [chill(0.9, 10)]);
    expect(e.chillPct).toBe(CHILL_CAP);
    expect(e.chillMul).toBeCloseTo(0.3, 12);
  });

  it('Chilled for N ticks slows exactly N status passes, then clears', () => {
    const { state } = setup();
    const e = spawn(state, tough);
    applyEffects(e, [chill(0.25, 3)]);
    for (let i = 0; i < 3; i++) {
      status(state);
      expect(e.chillMul).toBe(0.75);
    }
    status(state);
    expect([e.chillPct, e.chillMul, e.chillTicks]).toEqual([0, 1, 0]);
  });

  it('Soaked refreshes; Marked takes the highest; both expire', () => {
    const { state } = setup();
    const e = spawn(state, tough);
    applyEffects(e, [{ status: 'soaked', durationTicks: 5 }]);
    applyEffects(e, [{ status: 'soaked', durationTicks: 3 }]);
    expect(e.soakedTicks).toBe(5);
    applyEffects(e, [{ status: 'marked', pct: 0.2, durationTicks: 5 }]);
    applyEffects(e, [{ status: 'marked', pct: 0.1, durationTicks: 50 }]);
    expect([e.markPct, e.markTicks]).toEqual([0.2, 5]);
    for (let i = 0; i < 5; i++) status(state);
    expect([e.soakedTicks, e.markTicks, e.markPct]).toEqual([0, 0, 0]);
  });

  it('Corroded stacks to the source max, refreshes, and expires together', () => {
    const { state } = setup();
    const e = spawn(state, armored(6));
    const corrode = { status: 'corroded', stacks: 2, maxStacks: 3 } as const;
    applyEffects(e, [corrode]);
    applyEffects(e, [corrode]);
    expect(e.corrodedStacks).toBe(3);
    // A lower-max source never strips stacks.
    applyEffects(e, [{ status: 'corroded', stacks: 1, maxStacks: 1 }]);
    expect(e.corrodedStacks).toBe(3);
    const ticks = secToTicks(CORRODED_STACK_SEC);
    expect(e.corrodedTicks).toBe(ticks);
    for (let i = 0; i < ticks; i++) status(state);
    expect(e.corrodedStacks).toBe(0);
  });

  it('dead enemies take no statuses', () => {
    const { state } = setup();
    const e = spawn(state, WALKER);
    applyDamage(state, e, 100, 'kinetic', TOWER);
    applyEffects(e, [chill(0.25, 90)]);
    expect(e.chillPct).toBe(0);
  });
});
