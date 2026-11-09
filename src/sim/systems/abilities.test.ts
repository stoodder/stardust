// The abilities system (T113): Orbital Strike validation, cooldowns, the delayed strike through the
// damage pipeline, the early-call cut, and determinism. Uses the content fixture's fx_strike (45 s
// cooldown, 200 Explosive, radius 1.5, 1 s delay) on fx_map, whose path `a` runs (0,0) → (2,0) →
// (2,3) → (3,3) → (3,4) → (5,4).
import { describe, expect, it } from 'vitest';
import type { IdSpace } from '../../content/types.ts';
import { enemyDef, setup, spawn, WALKER } from '../__fixtures__/combat.ts';
import { fixtureSim, FIXTURE_CONTENT, type FixtureIds } from '../__fixtures__/sim.ts';
import { applyDamage } from '../combat/damage.ts';
import type { Command } from '../commands.ts';
import type { SimEvent } from '../events.ts';
import { abilities, applyAbilityCommand, reduceAbilityCooldowns } from './abilities.ts';

type AbilityCmd = Extract<Command<IdSpace>, { type: 'ability' }>;
const STRIKE = FIXTURE_CONTENT.abilities.fx_strike;
const DELAY = STRIKE.effect.delayTicks; // 60
const COOLDOWN = STRIKE.cooldownTicks; // 2700
/** Tile (2,2): its center (2.5, 2.5) lies on the path at route distance 4. */
const TARGET = [2, 2] as const;
const cast = (target: readonly [number, number] | undefined, slot: 1 | 2 = 1) =>
  (target === undefined
    ? { type: 'ability', slot }
    : { type: 'ability', slot, target: [target[0], target[1]] }) satisfies AbilityCmd;

/** Runs the abilities system `n` times, advancing the tick like runTick does. */
function tickAbilities(s: ReturnType<typeof setup>, n: number): void {
  for (let i = 0; i < n; i++) {
    abilities(s.state, s.ctx);
    s.state.tick++;
  }
}

const died = (events: readonly SimEvent<IdSpace>[]) =>
  events.filter(
    (e): e is Extract<SimEvent<IdSpace>, { type: 'EnemyDied' }> => e.type === 'EnemyDied',
  );

describe('applyAbilityCommand: validation', () => {
  it('rejects slot 2 and an empty slot 1 (noAbility)', () => {
    const s = setup();
    expect(applyAbilityCommand(s.state, s.ctx, cast(TARGET, 2))).toBe('noAbility');
    const empty = setup({ abilities: { slot1: null, slot2: null, slot2State: 'none' } });
    expect(applyAbilityCommand(empty.state, empty.ctx, cast(TARGET))).toBe('noAbility');
  });

  it('rejects a missing, off-map, or fractional target (invalidTarget)', () => {
    const s = setup();
    for (const t of [undefined, [6, 0], [0, 5], [-1, 2], [1.5, 2]] as const) {
      expect(applyAbilityCommand(s.state, s.ctx, cast(t)), String(t)).toBe('invalidTarget');
    }
    expect(s.state.zones.live).toBe(0);
    expect(s.state.abilityCooldownTicks).toEqual([0, 0]);
  });

  it('accepts any tile on the map, path or not, and is ready from tick 0', () => {
    for (const t of [TARGET, [0, 0], [5, 4], [4, 3]] as const) {
      const s = setup();
      expect(applyAbilityCommand(s.state, s.ctx, cast(t)), String(t)).toBeNull();
    }
  });

  it('opens a zone, starts the cooldown, counts the use, and emits AbilityUsed', () => {
    const s = setup();
    expect(applyAbilityCommand(s.state, s.ctx, cast(TARGET))).toBeNull();
    const zone = s.state.zones.items[0]!;
    expect(zone).toMatchObject({
      alive: true,
      x: 2.5,
      y: 2.5,
      radiusSq: 2.25,
      ticksLeft: DELAY,
      damage: 200,
      damageType: 'explosive',
      abilitySlot: 1,
    });
    expect(s.state.abilityCooldownTicks).toEqual([COOLDOWN, 0]);
    expect(s.state.stats.abilityUses).toBe(1);
    expect(s.state.events).toEqual([
      { type: 'AbilityUsed', slot: 1, uid: zone.uid, ability: 'fx_strike', target: [2, 2] },
    ]);
  });

  it('rejects a second cast until the cooldown has run out (abilityOnCooldown)', () => {
    const s = setup();
    applyAbilityCommand(s.state, s.ctx, cast(TARGET));
    // Cast at the start of tick 0 (applyCommands), so the abilities system runs for tick 0 too.
    tickAbilities(s, COOLDOWN - 1);
    expect(s.state.abilityCooldownTicks[0]).toBe(1);
    expect(applyAbilityCommand(s.state, s.ctx, cast(TARGET))).toBe('abilityOnCooldown');
    tickAbilities(s, 1);
    // Ready at the start of tick COOLDOWN: exactly 45 s after the cast.
    expect(s.state.tick).toBe(COOLDOWN);
    expect(s.state.abilityCooldownTicks[0]).toBe(0);
    expect(applyAbilityCommand(s.state, s.ctx, cast(TARGET))).toBeNull();
    expect(s.state.stats.abilityUses).toBe(2);
  });
});

describe('the strike', () => {
  it('lands exactly delayTicks after the cast, then frees its zone', () => {
    const s = setup();
    const e = spawn(s.state, WALKER, { dist: 4 }); // on the target tile's center
    applyAbilityCommand(s.state, s.ctx, cast(TARGET));
    tickAbilities(s, DELAY); // ticks 0 … DELAY − 1: the reticle
    expect(e.alive).toBe(true);
    expect(s.state.zones.items[0]!.ticksLeft).toBe(0);
    tickAbilities(s, 1); // tick DELAY: impact
    expect(e.alive).toBe(false);
    expect(s.state.zones.live).toBe(0);
  });

  it('hits every ground enemy within the radius (inclusive), not those outside or in the air', () => {
    const s = setup();
    const center = spawn(s.state, WALKER, { dist: 4 }); // (2.5, 2.5)
    const edge = spawn(s.state, WALKER, { dist: 2.5 }); // (2.5, 1.0): exactly 1.5 away
    const corner = spawn(s.state, WALKER, { dist: 5.5 }); // (3.0, 3.5): √1.25 away
    const outside = spawn(s.state, WALKER, { dist: 2.4 }); // (2.4, 0.5): just outside
    const flyer = spawn(s.state, enemyDef('fx_flyer', { layer: 'air' }), { dist: 4 });
    applyAbilityCommand(s.state, s.ctx, cast(TARGET));
    s.state.events.length = 0;
    tickAbilities(s, DELAY + 1);
    expect([center, edge, corner].map((e) => e.alive)).toEqual([false, false, false]);
    expect(outside.alive).toBe(true);
    expect(outside.hp).toBe(WALKER.hp);
    expect(flyer.alive).toBe(true);
    expect(flyer.hp).toBe(WALKER.hp);
    // Kills are booked to the ability slot, in ascending slot order.
    const kills = died(s.state.events);
    expect(kills.map((k) => k.uid)).toEqual([center.uid, edge.uid, corner.uid]);
    for (const k of kills) expect(k.killer).toEqual({ kind: 'ability', slot: 1 });
    expect(s.state.stats.skitterkinKilled).toBe(3);
  });

  it('deals its damage through the pipeline (armor and shields apply)', () => {
    const tank = enemyDef('fx_tank', { hp: 1000, armor: 3 });
    const s = setup();
    const hit = spawn(s.state, tank, { dist: 4 });
    const shielded = spawn(
      s.state,
      enemyDef('fx_shield', { hp: 1000, shield: { hp: 50, regenPerTick: 0, regenDelayTicks: 60 } }),
      { dist: 4 },
    );
    // The same hits, dealt straight through applyDamage on twins in a second state.
    const ref = setup();
    const twin = spawn(ref.state, tank, { dist: 4 });
    const twin2 = spawn(ref.state, shielded.def!, { dist: 4 });
    const src = { kind: 'ability', slot: 1 } as const;
    applyDamage(ref.state, twin, 200, 'explosive', src);
    applyDamage(ref.state, twin2, 200, 'explosive', src);
    applyAbilityCommand(s.state, s.ctx, cast(TARGET));
    tickAbilities(s, DELAY + 1);
    expect(hit.hp).toBe(twin.hp);
    expect(hit.hp).toBeLessThan(1000 - 150); // armor took a little, not most
    expect(shielded.hp).toBe(twin2.hp);
    expect(shielded.shieldHp).toBe(0);
  });

  it('lands on nothing harmlessly', () => {
    const s = setup();
    applyAbilityCommand(s.state, s.ctx, cast([5, 0]));
    tickAbilities(s, DELAY + 1);
    expect(s.state.zones.live).toBe(0);
    expect(s.state.events.filter((e) => e.type !== 'AbilityUsed')).toEqual([]);
  });
});

describe('reduceAbilityCooldowns (early wave call)', () => {
  it('cuts every remaining cooldown, never below 0', () => {
    const s = setup();
    s.state.abilityCooldownTicks[0] = 900;
    reduceAbilityCooldowns(s.state, 300);
    expect(s.state.abilityCooldownTicks).toEqual([600, 0]);
    reduceAbilityCooldowns(s.state, 1000);
    expect(s.state.abilityCooldownTicks).toEqual([0, 0]);
  });
});

/** Casts at tick 10 on a walker placed by the test, then runs `ticks`. */
function strikeRun(seed: number, paused: boolean) {
  const sim = fixtureSim({ seed });
  for (let i = 0; i < 10; i++) sim.step();
  sim.enqueue({ type: 'ability', slot: 1, target: [2, 0] });
  if (paused) sim.applyPending();
  for (let i = 0; i < DELAY + 5; i++) sim.step();
  return sim;
}

describe('through the sim', () => {
  it('applies the command, ticks the zone, and resolves it', () => {
    const sim = strikeRun(1, false);
    const out: SimEvent<FixtureIds>[] = [];
    sim.drainEvents(out);
    const used = out.find((e) => e.type === 'AbilityUsed');
    expect(used).toMatchObject({ slot: 1, ability: 'fx_strike', target: [2, 0] });
    const uid = used?.type === 'AbilityUsed' ? used.uid : -1;
    expect(uid).toBeGreaterThan(0);
    expect(sim.state.zones.items.some((z) => z.uid === uid && z.alive)).toBe(false);
    expect(sim.state.abilityCooldownTicks[0]).toBe(COOLDOWN - (DELAY + 5));
  });

  it('is deterministic: same seed and commands give the same hash', () => {
    expect(strikeRun(7, false).hash()).toBe(strikeRun(7, false).hash());
  });

  it('a strike aimed while paused (applyPending) equals one cast at the next tick', () => {
    expect(strikeRun(3, true).hash()).toBe(strikeRun(3, false).hash());
  });
});
