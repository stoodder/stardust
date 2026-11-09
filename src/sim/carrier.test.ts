// Carriers (sim/carrier.ts): a Brood Hauler's sack bursts on death (design/enemies.md § 5.1).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { applyDamage } from './combat/damage.ts';
import { enemyDef, ROAD, setup, spawn, WALKER } from './__fixtures__/combat.ts';
import type { DamageSource } from './events.ts';

const TOWER: DamageSource = { kind: 'tower', uid: 7 };
const CARRIER = enemyDef('fx_carrier', { hp: 40, carrierYoung: 3 });

describe('carrier sack burst', () => {
  it('a dying carrier emits SackBurst after EnemyDied, where it fell, toward its spawn', () => {
    const { state } = setup();
    const e = spawn(state, CARRIER, { dist: 4.25 });
    const { uid, x, y } = e;
    expect(applyDamage(state, e, 25, 'kinetic', TOWER)).toBe(25);
    expect(state.events).toEqual([]); // not dead yet: no burst
    applyDamage(state, e, 25, 'kinetic', TOWER);
    expect(state.events.map((ev) => ev.type)).toEqual(['EnemyDied', 'SackBurst']);
    expect(state.events[1]).toEqual({
      type: 'SackBurst',
      uid,
      enemy: 'fx_carrier',
      x,
      y,
      route: ROAD.id,
      dist: 4.25,
      young: 3,
    });
  });

  it('the young cost nothing: one bounty, one kill, no entity, no leak', () => {
    const { state } = setup();
    const credits = state.credits;
    const e = spawn(state, CARRIER);
    applyDamage(state, e, 100, 'kinetic', TOWER);
    expect(state.credits - credits).toBe(CARRIER.bounty);
    expect(state.stats.killsByEnemy).toEqual({ fx_carrier: 1 });
    expect(state.enemies.live).toBe(0);
  });

  it('other enemies never burst', () => {
    const { state } = setup();
    applyDamage(state, spawn(state, WALKER), 100, 'kinetic', TOWER);
    expect(state.events.map((ev) => ev.type)).toEqual(['EnemyDied']);
  });

  it('the Brood Hauler is a carrier with the documented numbers (enemies.md § 5.1)', () => {
    const hauler = compileContent(RAW_CONTENT).enemies.hauler;
    expect(hauler).toMatchObject({
      hp: 300,
      armor: 6,
      leak: 3,
      bounty: 15,
      faction: 'skitterkin',
      traits: ['armored'],
      carrierYoung: 3,
    });
    expect(hauler.speedTilesPerTick * 60).toBeCloseTo(0.7, 12);
    expect(hauler.tells).toContain('carrier');
  });
});
