// T607: Lulled (design/enemies.md § 2.4; systems/status.ts `lullPass`, `cooldownHeld`), from the
// live Hum Choir [Lullaby] on fx_map's road ((0,0) → (2,0) → (2,3) → …; a unit at dist 3 stands at
// (2.5, 1.5), 1 tile from a Choir on (2,2); one at dist 0 is 2.83 off, outside its 2.5) against the
// live Maw (gather), Digger (burrow), Blinkstrider (blink), Rift Moth (phase), and the Glass Witch
// (a boss's pulse). The systems run by hand: status, then the enemy abilities.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { CompiledContent, CompiledEnemyDef, CompiledTier } from '../../content/compiled.ts';
import { LULLED_COOLDOWN_MULT, LULLED_COOLDOWN_MULT_BOSS } from '../../content/rules.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import type { IdSpace } from '../../content/types.ts';
import { placeTower, setup, spawn } from '../__fixtures__/combat.ts';
import { enemyAbilities } from '../enemyAbilities/index.ts';
import type { Enemy, Tower } from '../entities.ts';
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { cooldownHeld, isLulled, lullPass, lullPeriod, lullReachSq, status } from './status.ts';

const LIVE: CompiledContent<IdSpace> = compileContent(RAW_CONTENT);
const E = LIVE.enemies;
const CHOIR = LIVE.towers.choir!;
const LULLABY: CompiledTier = CHOIR.specs!.a;

function world(): { state: SimState; ctx: TickContext } {
  const { state, ctx } = setup();
  return { state, ctx: { ...ctx, content: LIVE } };
}

function lullaby(state: SimState, col = 2, row = 2): Tower {
  const t = placeTower(state, CHOIR, col, row, LULLABY);
  t.alive = true;
  return t;
}

/** A pulse's timer, read only once it's set (0 before its first tick alive). */
function pulseCounter(e: Enemy): number {
  return e.pulseTicks > 0 ? e.pulseTicks : 1e9;
}

function tick(state: SimState, ctx: TickContext): void {
  status(state);
  enemyAbilities(state, ctx);
  state.tick++;
}

/** Ticks until `counter(e)` first falls to `tell` or below (its tell starts), from a fresh spawn. */
function ticksToTell(
  def: CompiledEnemyDef,
  counter: (e: Enemy) => number,
  tell: number,
  lulled: boolean,
): number {
  const { state, ctx } = world();
  if (lulled) lullaby(state);
  const e = spawn(state, def, { dist: 3 });
  tick(state, ctx); // its first tick alive sets the timer
  for (let n = 1; n < 10_000; n++) {
    tick(state, ctx);
    if (counter(e) <= tell) return n;
  }
  return -1;
}

describe('Lulled: who (enemies.md § 2.4)', () => {
  it('the beat periods follow the rules: ×1.5 holds 1 tick in 3, ×1.25 1 in 5', () => {
    expect([LULLED_COOLDOWN_MULT, LULLED_COOLDOWN_MULT_BOSS]).toEqual([1.5, 1.25]);
    expect([lullPeriod(LULLED_COOLDOWN_MULT), lullPeriod(LULLED_COOLDOWN_MULT_BOSS)]).toEqual([
      3, 5,
    ]);
  });

  it('every unit within 2.5 of a Lullaby, both layers; nobody outside, nobody without one', () => {
    const { state } = world();
    const near = spawn(state, E.maw!, { dist: 3 });
    const flyer = spawn(state, E.riftmoth!, { dist: 4 });
    const far = spawn(state, E.maw!, { dist: 0 });
    lullPass(state);
    expect([near.lulled, flyer.lulled, far.lulled]).toEqual([false, false, false]);
    lullaby(state);
    lullPass(state);
    expect([isLulled(near), isLulled(flyer), isLulled(far)]).toEqual([true, true, false]);
    // A plain T3 Choir (no Lullaby) lulls nobody.
    const plain = world();
    placeTower(plain.state, CHOIR, 2, 2, 3).alive = true;
    const m = spawn(plain.state, E.maw!, { dist: 3 });
    lullPass(plain.state);
    expect(m.lulled).toBe(false);
  });

  it('never a neutral unit, nor one nothing reaches (burrowed, Phased, leaving)', () => {
    const { state } = world();
    lullaby(state);
    const gerald = spawn(state, E.gerald!, { dist: 3 });
    const dug = spawn(state, E.digger!, { dist: 3 });
    dug.burrowed = true;
    const phased = spawn(state, E.riftmoth!, { dist: 3 });
    phased.phased = true;
    const going = spawn(state, E.maw!, { dist: 3 });
    going.leaving = true;
    lullPass(state);
    expect([gerald, dug, phased, going].map((e) => e.lulled)).toEqual([false, false, false, false]);
  });

  it('its radius tune-up widens it (rank 3: +5%; `Tower.detectPct`)', () => {
    expect(lullReachSq({ radiusTiles: 2.5, radiusSq: 6.25 }, 0)).toBe(6.25);
    const { state } = world();
    const t = lullaby(state, 2, 3); // (2.5, 3.5): the Maw at dist 0 is 3.6 off
    const m = spawn(state, E.maw!, { dist: 0 });
    lullPass(state);
    expect(m.lulled).toBe(false);
    t.detectPct = 0.5; // 3.75
    lullPass(state);
    expect(m.lulled).toBe(true);
  });

  it('holds a cooldown on 1 tick in 3 (a boss: 1 in 5); leaving resets the beat', () => {
    const { state } = world();
    const t = lullaby(state);
    const m = spawn(state, E.maw!, { dist: 3 });
    const boss = spawn(state, E.glass_witch!, { dist: 3 });
    const held = [0, 0];
    for (let i = 0; i < 30; i++) {
      lullPass(state);
      if (cooldownHeld(m)) held[0]!++;
      if (cooldownHeld(boss)) held[1]!++;
    }
    expect(held).toEqual([10, 6]);
    t.alive = false;
    lullPass(state);
    expect([m.lulled, m.lullBeat, cooldownHeld(m)]).toEqual([false, 0, false]);
  });

  it('doesn’t stack: two Lullabies hold the same beat as one', () => {
    const { state } = world();
    lullaby(state, 2, 2);
    lullaby(state, 3, 1);
    const m = spawn(state, E.maw!, { dist: 3 });
    let held = 0;
    for (let i = 0; i < 30; i++) {
      lullPass(state);
      if (cooldownHeld(m)) held++;
    }
    expect(held).toBe(10);
  });
});

describe('Lulled: what it stretches (the wait before a tell, ×1.5; a boss’s ×1.25)', () => {
  const cases: [string, CompiledEnemyDef, (e: Enemy) => number, number][] = [
    ['the Maw’s gather', E.maw!, (e) => e.gatherTicks, E.maw!.gather!.tellTicks],
    ['the Digger’s dig', E.digger!, (e) => e.abilityTicks, E.digger!.burrow!.tellTicks],
    [
      'the Blinkstrider’s blink',
      E.blinkstrider!,
      (e) => e.blinkTicks,
      E.blinkstrider!.blink!.tellTicks,
    ],
    ['the Rift Moth’s phase', E.riftmoth!, (e) => e.phaseTicks, E.riftmoth!.phase!.tellTicks],
  ];
  for (const [name, def, counter, tell] of cases) {
    it(`${name}: ×1.5`, () => {
      const plain = ticksToTell(def, counter, tell, false);
      const lulled = ticksToTell(def, counter, tell, true);
      expect(plain).toBeGreaterThan(30);
      expect(Math.abs(lulled - plain * LULLED_COOLDOWN_MULT)).toBeLessThanOrEqual(2);
    });
  }

  it('the Glass Witch’s shield pulse (a boss): ×1.25', () => {
    const witch = E.glass_witch!;
    const pulse = witch.boss!.phases[0]!.pulse!;
    const plain = ticksToTell(witch, pulseCounter, pulse.tellTicks, false);
    const lulled = ticksToTell(witch, pulseCounter, pulse.tellTicks, true);
    expect(plain).toBeGreaterThan(30);
    expect(Math.abs(lulled - plain * LULLED_COOLDOWN_MULT_BOSS)).toBeLessThanOrEqual(2);
  });

  it('never the tell itself: a Lulled blink still tells for its full 0.x s, no longer', () => {
    const def = E.blinkstrider!;
    const tell = def.blink!.tellTicks;
    const tellLength = (lulled: boolean): number => {
      const { state, ctx } = world();
      if (lulled) lullaby(state);
      const e = spawn(state, def, { dist: 3 });
      let start = -1;
      for (let n = 0; n < 10_000; n++) {
        tick(state, ctx);
        if (start < 0 && e.blinkTicks > 0 && e.blinkTicks <= tell) start = n;
        if (start >= 0 && e.blinkTicks > tell) return n - start;
      }
      return -1;
    };
    expect(tellLength(true)).toBe(tellLength(false));
    expect(tellLength(true)).toBe(tell);
  });

  it('interrupts nothing: a Lulled unit’s tell still lands', () => {
    const { state, ctx } = world();
    lullaby(state);
    const e = spawn(state, E.blinkstrider!, { dist: 3 });
    const from = e.dist;
    for (let n = 0; n < 2_000 && e.dist === from; n++) tick(state, ctx);
    expect(e.dist).toBeGreaterThan(from); // it blinked
  });
});
