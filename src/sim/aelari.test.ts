// The Aelari line units in play (T403): Glimmer, Weft Warden, and Lightwing as compiled from
// their data (enemies.md § 5.2), through the shield pipeline (§ 2.3: overflow, the regen delay,
// Story's scaling) and the ShieldHit ripple a hit on a shield emits.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { IdSpace } from '../content/types.ts';
import { setup, spawn } from './__fixtures__/combat.ts';
import { applyDamage } from './combat/damage.ts';
import type { DamageSource, SimEvent } from './events.ts';
import { status } from './systems/status.ts';
import { scaledEnemy } from './systems/waves.ts';

const LIVE = compileContent(RAW_CONTENT);
const { glimmer, weft_warden, lightwing } = LIVE.enemies;
const TOWER: DamageSource = { kind: 'tower', uid: 99 };

type Ev = SimEvent<IdSpace>;
const shieldHits = (events: readonly Ev[]): Extract<Ev, { type: 'ShieldHit' }>[] =>
  events.filter((e): e is Extract<Ev, { type: 'ShieldHit' }> => e.type === 'ShieldHit');

describe('the Aelari line units (enemies.md § 5.2)', () => {
  it('compile from the roster: shield / regen per s / delay s at 60 ticks per second', () => {
    const row = (e: typeof glimmer): unknown => ({
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
    const crystal = { faction: 'aelari', body: 'crystalline' };
    expect(row(glimmer)).toEqual({
      hp: 60,
      armor: 0,
      shield: 40,
      regenPerSec: 10,
      delayTicks: 180,
      speed: 1.1,
      leak: 1,
      bounty: 6,
      layer: 'ground',
      ...crystal,
      traits: ['shielded'],
    });
    expect(row(weft_warden)).toEqual({
      hp: 250,
      armor: 3,
      shield: 200,
      regenPerSec: 20,
      delayTicks: 180,
      speed: 0.6,
      leak: 3,
      bounty: 18,
      layer: 'ground',
      ...crystal,
      traits: ['shielded', 'armored'],
    });
    expect(row(lightwing)).toEqual({
      hp: 60,
      armor: 0,
      shield: 60,
      regenPerSec: 10,
      delayTicks: 240,
      speed: 1.3,
      leak: 1,
      bounty: 8,
      layer: 'air',
      ...crystal,
      traits: ['flying', 'shielded'],
    });
    for (const e of [glimmer, weft_warden, lightwing]) {
      expect([e.pulse, e.blink, e.boss, e.hushes, e.cloaked]).toEqual([
        null,
        null,
        null,
        false,
        false,
      ]);
    }
  });
});

describe('the shield pipeline in play (enemies.md § 2.3)', () => {
  it('Energy strips a Glimmer at ×2, Kinetic at ×0.5; the overflow converts back to raw', () => {
    const { state } = setup();
    const g = spawn(state, glimmer);
    expect(applyDamage(state, g, 10, 'kinetic', TOWER)).toBe(0);
    expect(g.shieldHp).toBe(35);
    // 20 Energy: 40 against 35 shield, 5 over → 2.5 raw to HP.
    expect(applyDamage(state, g, 20, 'energy', TOWER)).toBeCloseTo(2.5, 12);
    expect([g.shieldHp, g.hp]).toEqual([0, 57.5]);
  });

  it("a Weft Warden's overflow meets its light armor", () => {
    const { state } = setup();
    const w = spawn(state, weft_warden);
    // 120 Energy → 240 against 200 shield; 40 over → 20 raw, minus armor 3.
    expect(applyDamage(state, w, 120, 'energy', TOWER)).toBe(17);
    expect(w.shieldHp).toBe(0);
  });

  it('regenerates after its delay without a hit, and a hit on a broken shield restarts it', () => {
    const { state } = setup();
    const g = spawn(state, glimmer);
    applyDamage(state, g, 40, 'energy', TOWER); // 80 against 40: broken
    expect(g.shieldHp).toBe(0);
    for (let i = 0; i < 120; i++) status(state);
    applyDamage(state, g, 1, 'kinetic', TOWER); // on the broken shield: the delay restarts
    for (let i = 0; i < 180; i++) status(state);
    expect(g.shieldHp).toBe(0);
    status(state);
    expect(g.shieldHp).toBeCloseTo(10 / 60, 12);
    for (let i = 0; i < 300; i++) status(state);
    expect(g.shieldHp).toBe(40); // capped at max
  });

  it('Story (−30% shields) spawns a weaker shield that refills in the same time', () => {
    const story = scaledEnemy(weft_warden, { hp: -0.3, shield: -0.3, speed: 0 });
    expect(story.shield!.hp).toBeCloseTo(140, 9);
    expect(story.shield!.regenPerTick * 60).toBeCloseTo(14, 9);
    expect(story.shield!.regenDelayTicks).toBe(180);
    expect(story.hp).toBeCloseTo(175, 9);
  });
});

describe('ShieldHit (the ripple)', () => {
  it('fires for each hit that lands on a shield, `broken` on the one that breaks it', () => {
    const { state } = setup();
    const g = spawn(state, glimmer, { dist: 2 });
    applyDamage(state, g, 10, 'kinetic', TOWER);
    applyDamage(state, g, 100, 'energy', TOWER);
    applyDamage(state, g, 5, 'kinetic', TOWER); // the shield is down: no ripple
    expect(shieldHits(state.events)).toEqual([
      { type: 'ShieldHit', uid: g.uid, x: g.x, y: g.y, broken: false },
      { type: 'ShieldHit', uid: g.uid, x: g.x, y: g.y, broken: true },
    ]);
  });

  it('breaks on a hit that exactly empties the shield, and nothing reaches HP', () => {
    const { state } = setup();
    const g = spawn(state, glimmer);
    expect(applyDamage(state, g, 20, 'energy', TOWER)).toBe(0); // 40 against 40
    expect([g.shieldHp, g.hp]).toEqual([0, 60]);
    expect(shieldHits(state.events).map((e) => e.broken)).toEqual([true]);
  });

  it("doesn't fire for a hit that can't land (a leaving unit)", () => {
    const { state } = setup();
    const g = spawn(state, glimmer);
    g.leaving = true;
    applyDamage(state, g, 10, 'energy', TOWER);
    expect(shieldHits(state.events)).toEqual([]);
  });
});
