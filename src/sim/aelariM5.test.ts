// M5's Aelari units in play (T502): the Veilwalker, the Blinkstrider, and the Aegis Cantor as
// compiled from their data (enemies.md § 5.2), each through its mechanic with its own numbers: the
// Veilwalker's cloak (§ 2.5: untouchable until Revealed), the Blinkstrider's blink (2.5 tiles every
// 6 s after a 0.8 s tell, held still through it), and the Cantor's aura (shieldAura.test.ts has
// the rule; here, its row and the gate). Whole-map runs: render/__fixtures__/devAura.test.ts.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { IdSpace } from '../content/types.ts';
import { GUN, placeTower, setup, spawn } from './__fixtures__/combat.ts';
import { applyDamage } from './combat/damage.ts';
import { canHit } from './combat/targeting.ts';
import { cloakedOut } from './enemyAbilities/cloak.ts';
import { enemyAbilities } from './enemyAbilities/index.ts';
import type { SimEvent } from './events.ts';
import { FEATURE_GATES } from './gates.ts';
import { towers } from './systems/towers.ts';

const LIVE = compileContent(RAW_CONTENT);
const { veilwalker, blinkstrider, cantor } = LIVE.enemies;
const TOWER = { kind: 'tower', uid: 99 } as const;

type Ev = SimEvent<IdSpace>;

const row = (e: typeof cantor): unknown => ({
  hp: e.hp,
  armor: e.armor,
  shield: e.shield!.hp,
  regenPerSec: Math.round(e.shield!.regenPerTick * 60 * 1e9) / 1e9,
  delayTicks: e.shield!.regenDelayTicks,
  speed: Math.round(e.speedTilesPerTick * 60 * 1e9) / 1e9,
  leak: e.leak,
  bounty: e.bounty,
  layer: e.layer,
  faction: e.faction,
  body: e.body,
  traits: e.traits,
});
const base = {
  armor: 0,
  delayTicks: 180,
  layer: 'ground',
  faction: 'aelari',
  body: 'crystalline',
};

describe('the roster rows (enemies.md § 5.2)', () => {
  it('Veilwalker: 90 HP, shield 30 / 10 / 3, 1.0, leak 2, bounty 10, Cloaked', () => {
    expect(row(veilwalker)).toEqual({
      ...base,
      hp: 90,
      shield: 30,
      regenPerSec: 10,
      speed: 1,
      leak: 2,
      bounty: 10,
      traits: ['shielded', 'cloaked'],
    });
    expect(veilwalker.cloaked).toBe(true);
    expect([veilwalker.blink, veilwalker.pulse, veilwalker.shieldAura]).toEqual([null, null, null]);
  });

  it('Blinkstrider: 110 HP, shield 50 / 10 / 3, 1.0, leak 2, bounty 10, Blink 2.5 every 6 s (0.8 s)', () => {
    expect(row(blinkstrider)).toEqual({
      ...base,
      hp: 110,
      shield: 50,
      regenPerSec: 10,
      speed: 1,
      leak: 2,
      bounty: 10,
      traits: ['shielded', 'blink'],
    });
    expect(blinkstrider.blink).toEqual({ everyTicks: 360, tellTicks: 48, tiles: 2.5 });
    expect([blinkstrider.cloaked, blinkstrider.pulse, blinkstrider.shieldAura]).toEqual([
      false,
      null,
      null,
    ]);
  });

  it('Aegis Cantor: 150 HP, shield 100 / 15 / 3, 0.8, leak 2, bounty 14, aura 15/s within 2', () => {
    expect(row(cantor)).toEqual({
      ...base,
      hp: 150,
      shield: 100,
      regenPerSec: 15,
      speed: 0.8,
      leak: 2,
      bounty: 14,
      traits: ['shielded', 'shield_aura'],
    });
    expect(cantor.shieldAura).toEqual({ radiusTiles: 2, radiusSq: 4, shieldPerTick: 0.25 });
    // Continuous (D137): no pulse.
    expect([cantor.pulse, cantor.blink, cantor.cloaked]).toEqual([null, null, false]);
  });

  it('every mechanic they use runs (no gate refuses them)', () => {
    for (const f of ['enemy.cloak', 'enemy.blink', 'enemy.shieldAura'] as const) {
      expect(FEATURE_GATES[f], f).toBeNull();
    }
  });
});

describe('the Veilwalker (enemies.md § 2.5: untouchable until Revealed)', () => {
  it('a tower beside it neither targets nor hurts it until it is Revealed', () => {
    const { state, ctx } = setup();
    placeTower(state, GUN, 1, 1); // fx_gun: hitscan 10 kinetic, range 3
    const v = spawn(state, veilwalker, { dist: 1 });
    expect(cloakedOut(v)).toBe(true);
    expect(canHit(v, { ground: true, air: true })).toBe(false);
    for (let i = 0; i < 120; i++) towers(state, ctx);
    expect([v.hp, v.shieldHp]).toEqual([90, 30]);
    expect(applyDamage(state, v, 50, 'energy', TOWER)).toBe(0);
    v.revealedTicks = 1; // as a detector sets it
    for (let i = 0; i < 2 && v.shieldHp === 30; i++) towers(state, ctx);
    expect(v.shieldHp).toBeLessThan(30);
  });
});

describe('the Blinkstrider (enemies.md § 3 Blink)', () => {
  it('tells 0.8 s before each 6 s mark, holding still, then lands 2.5 tiles on', () => {
    const { state, ctx } = setup();
    const b = spawn(state, blinkstrider, { dist: 0.5 });
    const log: string[] = [];
    let held = 0;
    for (let t = 0; t <= 361; t++) {
      enemyAbilities(state, ctx);
      if (b.paceMul === 0) held++;
      for (const e of state.events as Ev[]) {
        if (e.type === 'BlinkTell' || e.type === 'Blinked') log.push(`${t} ${e.type}`);
      }
      state.events.length = 0;
    }
    expect(log).toEqual(['312 BlinkTell', '360 Blinked']);
    expect(held).toBe(48);
    expect(b.dist).toBeCloseTo(3, 12);
  });
});
