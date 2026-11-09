// Slot 2 and Suppressing Fire (T207a): the companion slot, the segment zone's geometry (D031: the
// clicked path tile ±1 along each ground route through it), its slow and beam-tick damage, the
// `abilityStat` modifiers (Rapport, Coolant, Mk II), and the slot's config rules. Uses the content
// fixture's fx_suppress (Bricks's; 50 s cooldown, 20 Kinetic/s, slowed 50%, 5 s, 3 tiles) on
// fx_map, whose path `a` runs (0,0) → (2,0) → (2,3) → (3,3) → (3,4) → (5,4): 10 tiles, so tile i
// of the path has its center at route distance i.
import { describe, expect, it } from 'vitest';
import type { CompiledMapDef, CompiledRoute } from '../../content/compiled.ts';
import type { IdSpace } from '../../content/types.ts';
import { enemyDef, MAP, ROAD, setup, spawn, WALKER } from '../__fixtures__/combat.ts';
import {
  FIXTURE_CONTENT,
  fixtureConfig,
  fixtureSim,
  type FixtureIds,
} from '../__fixtures__/sim.ts';
import type { Command } from '../commands.ts';
import type { Modifier, SimConfig } from '../config.ts';
import type { SimEvent } from '../events.ts';
import { gateRefusals } from '../gates.ts';
import { createSim } from '../sim.ts';
import {
  abilities,
  abilityConfigErrors,
  abilityStats,
  applyAbilityCommand,
  SEGMENT_TICK_TICKS,
  segmentSpan,
} from './abilities.ts';

type AbilityCmd = Extract<Command<IdSpace>, { type: 'ability' }>;
const SUPPRESS = FIXTURE_CONTENT.abilities.fx_suppress;
const STRIKE = FIXTURE_CONTENT.abilities.fx_strike;
const DURATION = 300; // 5 s
const COOLDOWN = 3000; // 50 s

/** Bricks present with fx_suppress in slot 2. */
const BRICKS: Partial<SimConfig<FixtureIds>> = {
  companion: 'bricks',
  abilities: { slot1: 'fx_strike', slot2: 'fx_suppress', slot2State: 'present' },
};
const cast = (col: number, row: number, slot: 1 | 2 = 2): AbilityCmd => ({
  type: 'ability',
  slot,
  target: [col, row],
});

function tickAbilities(s: ReturnType<typeof setup>, n: number): void {
  for (let i = 0; i < n; i++) {
    abilities(s.state, s.ctx);
    s.state.tick++;
  }
}

/** An `abilityStat` modifier: every ability's cooldown unless `over` says otherwise. */
const mod = (over: Partial<Extract<Modifier<IdSpace>, { kind: 'abilityStat' }>>) =>
  ({ kind: 'abilityStat', ability: '*', stat: 'cooldown', source: 'test', ...over }) as const;

const errs = (over: Partial<SimConfig<IdSpace>>): string[] =>
  abilityConfigErrors({ ...fixtureConfig(), ...over });

describe('Suppressing Fire content', () => {
  it('compiles to a segment: 5 s, ±1 tile, and the companion it belongs to', () => {
    expect(SUPPRESS.cooldownTicks).toBe(COOLDOWN);
    expect(SUPPRESS.companion).toBe('bricks');
    expect(SUPPRESS.effect).toEqual({
      kind: 'segment',
      type: 'kinetic',
      damagePerSec: 20,
      slowPct: 0.5,
      durationTicks: DURATION,
      reachTiles: 1,
    });
    expect(STRIKE.companion).toBeNull();
    expect(SEGMENT_TICK_TICKS).toBe(15);
  });
});

describe('slot 2', () => {
  it("holds the companion's ability only while the companion is present", () => {
    const present = setup(BRICKS);
    expect(applyAbilityCommand(present.state, present.ctx, cast(2, 2))).toBeNull();
    expect(present.state.abilityCooldownTicks).toEqual([0, COOLDOWN]);
    expect(present.state.stats.abilityUses).toBe(1);
    const absent = setup({
      companion: 'bricks',
      abilities: { slot1: 'fx_strike', slot2: 'fx_suppress', slot2State: 'absent' },
    });
    expect(applyAbilityCommand(absent.state, absent.ctx, cast(2, 2))).toBe('noAbility');
    const none = setup();
    expect(applyAbilityCommand(none.state, none.ctx, cast(2, 2))).toBe('noAbility');
  });

  it('runs its own cooldown, separate from slot 1', () => {
    const s = setup(BRICKS);
    expect(applyAbilityCommand(s.state, s.ctx, cast(2, 2))).toBeNull();
    expect(applyAbilityCommand(s.state, s.ctx, cast(2, 2))).toBe('abilityOnCooldown');
    expect(applyAbilityCommand(s.state, s.ctx, cast(2, 2, 1))).toBeNull(); // the strike
    tickAbilities(s, COOLDOWN);
    expect(s.state.abilityCooldownTicks[1]).toBe(0);
    expect(applyAbilityCommand(s.state, s.ctx, cast(2, 2))).toBeNull();
  });
});

describe('the segment (D031: the clicked path tile ±1 along the route)', () => {
  it('opens a zone over tiles i−1 … i+1, padded to cover them whole', () => {
    const s = setup(BRICKS);
    expect(applyAbilityCommand(s.state, s.ctx, cast(2, 2))).toBeNull(); // path tile 4
    const z = s.state.zones.items[0]!;
    expect(z).toMatchObject({
      alive: true,
      kind: 'segment',
      x: 2.5,
      y: 2.5,
      route: ROAD,
      distFrom: 2.5,
      distTo: 5.5,
      ticksLeft: DURATION,
      damage: 20,
      damageType: 'kinetic',
      slowPct: 0.5,
      abilitySlot: 2,
    });
    expect(s.state.events).toEqual([
      { type: 'AbilityUsed', slot: 2, uid: z.uid, ability: 'fx_suppress', target: [2, 2] },
    ]);
  });

  it('keeps 3 tiles at the route ends by shifting inward', () => {
    const spawnEnd = setup(BRICKS);
    applyAbilityCommand(spawnEnd.state, spawnEnd.ctx, cast(0, 0)); // the spawn: tiles 0–2
    expect(spawnEnd.state.zones.items[0]).toMatchObject({ distFrom: 0, distTo: 2.5 });
    const coreEnd = setup(BRICKS);
    applyAbilityCommand(coreEnd.state, coreEnd.ctx, cast(5, 4)); // the core: tiles 7–9
    expect(coreEnd.state.zones.items[0]).toMatchObject({ distFrom: 6.5, distTo: 9 });
  });

  it('segmentSpan gives the zone its stretch (the HUD preview draws the same tiles)', () => {
    const out = { lo: -1, hi: -1, distFrom: -1, distTo: -1 };
    expect(segmentSpan(ROAD, 2, 2, 1, out)).toBe(true);
    expect(out).toEqual({ lo: 3, hi: 5, distFrom: 2.5, distTo: 5.5 });
    expect(segmentSpan(ROAD, 0, 0, 1, out)).toBe(true);
    expect(out).toEqual({ lo: 0, hi: 2, distFrom: 0, distTo: 2.5 });
    expect(segmentSpan(ROAD, 5, 4, 1, out)).toBe(true);
    expect(out).toEqual({ lo: 7, hi: 9, distFrom: 6.5, distTo: 9 });
    // Off the route, or an air lane: false, and `out` is left alone.
    expect(segmentSpan(ROAD, 1, 1, 1, out)).toBe(false);
    expect(segmentSpan({ ...ROAD, kind: 'air' }, 2, 2, 1, out)).toBe(false);
    expect(out).toEqual({ lo: 7, hi: 9, distFrom: 6.5, distTo: 9 });
  });

  it('needs a ground path tile: a pad, decor, or an off-map tile is rejected (invalidTarget)', () => {
    for (const t of [
      [1, 1],
      [0, 2],
      [4, 0],
      [6, 0],
    ] as const) {
      const s = setup(BRICKS);
      expect(applyAbilityCommand(s.state, s.ctx, cast(t[0], t[1])), String(t)).toBe(
        'invalidTarget',
      );
      expect(s.state.zones.live).toBe(0);
      expect(s.state.abilityCooldownTicks).toEqual([0, 0]);
    }
  });

  it('opens one zone per ground route through the tile (and none for air lanes)', () => {
    const second: CompiledRoute = Object.freeze({ ...ROAD, id: 'b' });
    const map: CompiledMapDef<IdSpace> = { ...MAP, routes: { ...MAP.routes, b: second } };
    const s = setup(BRICKS);
    const ctx = { ...s.ctx, map };
    expect(applyAbilityCommand(s.state, ctx, cast(2, 2))).toBeNull();
    const zones = s.state.zones.items.filter((z) => z.alive);
    expect(zones.map((z) => z.route?.id)).toEqual(['a', 'b']);
    const used = s.state.events[0];
    expect(used?.type === 'AbilityUsed' && used.uid).toBe(zones[0]!.uid);
    // Each zone works on its own route's enemies only, so nobody is hit twice.
    const onA = spawn(s.state, enemyDef('fx_tank', { hp: 1000 }), { dist: 4 });
    const onB = spawn(s.state, enemyDef('fx_tank', { hp: 1000 }), { dist: 4, route: second });
    tickAbilities({ state: s.state, ctx }, SEGMENT_TICK_TICKS);
    expect(onA.hp).toBe(995);
    expect(onB.hp).toBe(995);
  });

  it('slows every enemy on it by 50% (as Chilled), inclusive at both ends, every tick', () => {
    const s = setup(BRICKS);
    applyAbilityCommand(s.state, s.ctx, cast(2, 2));
    const inside = spawn(s.state, WALKER, { dist: 4 });
    const from = spawn(s.state, WALKER, { dist: 2.5 });
    const to = spawn(s.state, WALKER, { dist: 5.5 });
    const before = spawn(s.state, WALKER, { dist: 2.49 });
    const after = spawn(s.state, WALKER, { dist: 5.51 });
    tickAbilities(s, 1); // the cast tick: it slows at once
    expect([inside, from, to].map((e) => e.chillMul)).toEqual([0.5, 0.5, 0.5]);
    expect([before, after].map((e) => e.chillMul)).toEqual([1, 1]);
    // A stronger chill already running wins (the strongest-source rule).
    const cold = spawn(s.state, WALKER, { dist: 4 });
    cold.chillPct = 0.6;
    cold.chillMul = 0.4;
    cold.chillTicks = 30;
    tickAbilities(s, 1);
    expect(cold.chillPct).toBe(0.6);
  });

  it('deals 20 Kinetic/s in 0.25 s beam ticks for 5 s, then frees its zone', () => {
    const s = setup(BRICKS);
    const tank = spawn(s.state, enemyDef('fx_tank', { hp: 1000 }), { dist: 4 });
    applyAbilityCommand(s.state, s.ctx, cast(2, 2));
    tickAbilities(s, SEGMENT_TICK_TICKS - 1);
    expect(tank.hp).toBe(1000);
    tickAbilities(s, 1); // 0.25 s in: the first beam tick
    expect(tank.hp).toBe(995);
    tickAbilities(s, DURATION - SEGMENT_TICK_TICKS - 1);
    expect(s.state.zones.live).toBe(1);
    tickAbilities(s, 1); // the zone's last tick lands the 20th beam tick
    expect(tank.hp).toBe(900);
    expect(s.state.zones.live).toBe(0);
    tickAbilities(s, 60);
    expect(tank.hp).toBe(900);
  });

  it('applies armor per beam tick (armor × 0.25), with the 20% floor', () => {
    const s = setup(BRICKS);
    const plated = spawn(s.state, enemyDef('fx_plated', { hp: 1000, armor: 4 }), { dist: 4 });
    const heavy = spawn(s.state, enemyDef('fx_heavy', { hp: 1000, armor: 40 }), { dist: 4.5 });
    applyAbilityCommand(s.state, s.ctx, cast(2, 2));
    tickAbilities(s, DURATION);
    expect(plated.hp).toBe(1000 - 20 * (5 - 1));
    expect(heavy.hp).toBeCloseTo(1000 - 20 * 1, 9); // the floor: 20% of 5
  });

  it('books its kills to slot 2', () => {
    const s = setup(BRICKS);
    const e = spawn(s.state, WALKER, { dist: 4 }); // 30 HP: six beam ticks
    applyAbilityCommand(s.state, s.ctx, cast(2, 2));
    tickAbilities(s, 6 * SEGMENT_TICK_TICKS);
    expect(e.alive).toBe(false);
    const died = s.state.events.find(
      (ev): ev is Extract<SimEvent<IdSpace>, { type: 'EnemyDied' }> => ev.type === 'EnemyDied',
    );
    expect(died?.killer).toEqual({ kind: 'ability', slot: 2 });
  });
});

describe('ability modifiers (abilityStat)', () => {
  it('Rapport cuts its ability by 15%; Coolant adds to it, never multiplies', () => {
    const rapport = mod({ ability: 'fx_suppress', pct: -0.15, source: 'rd:rapport_bricks' });
    const coolant = mod({ pct: -0.05, source: 'shop:ability_coolant' });
    expect(abilityStats(SUPPRESS, [rapport]).cooldownTicks).toBe(2550);
    expect(abilityStats(SUPPRESS, [rapport, coolant]).cooldownTicks).toBe(2400);
    expect(abilityStats(STRIKE, [rapport, coolant]).cooldownTicks).toBe(2565);
    expect(abilityStats(STRIKE, []).cooldownTicks).toBe(STRIKE.cooldownTicks);
    // A flat cooldown change is in seconds; a cooldown never drops below a tick.
    expect(abilityStats(STRIKE, [mod({ flat: -5 })]).cooldownTicks).toBe(2400);
    expect(abilityStats(STRIKE, [mod({ pct: -2 })]).cooldownTicks).toBe(1);
  });

  it('Mk II widens the strike to radius 2.0; segments have no radius', () => {
    const mk2 = mod({ ability: 'fx_strike', stat: 'radius', flat: 0.5, source: 'rd:mk2' });
    expect(abilityStats(STRIKE, [mk2]).radiusTiles).toBe(2);
    expect(abilityStats(SUPPRESS, [mk2]).radiusTiles).toBe(0);
    const s = setup({ ...BRICKS, modifiers: [mk2] });
    applyAbilityCommand(s.state, s.ctx, cast(2, 2, 1));
    expect(s.state.zones.items[0]!.radiusSq).toBe(4);
  });

  it('casts start the modified cooldown', () => {
    const rapport = mod({ ability: 'fx_suppress', pct: -0.15 });
    const s = setup({ ...BRICKS, modifiers: [rapport] });
    applyAbilityCommand(s.state, s.ctx, cast(2, 2));
    expect(s.state.abilityCooldownTicks).toEqual([0, 2550]);
  });
});

describe('the slot config (abilityConfigErrors)', () => {
  it('accepts no companion, a present one, and an absent one', () => {
    expect(errs({})).toEqual([]);
    expect(errs(BRICKS)).toEqual([]);
    expect(
      errs({
        companion: 'bricks',
        abilities: { slot1: 'fx_strike', slot2: 'fx_suppress', slot2State: 'absent' },
      }),
    ).toEqual([]);
  });

  it('refuses a slot 2 without its companion, or with the wrong ability', () => {
    expect(
      errs({ abilities: { slot1: null, slot2: 'fx_suppress', slot2State: 'present' } }).join(),
    ).toMatch(/with no companion/);
    expect(errs({ companion: 'bricks' }).join()).toMatch(/needs a slot/);
    expect(
      errs({ companion: 'bricks', abilities: { slot1: null, slot2: null, slot2State: 'present' } }),
    ).toEqual(["abilities.slot2: companion 'bricks' is present but slot 2 is empty"]);
    expect(
      errs({
        companion: 'quill',
        abilities: { slot1: null, slot2: 'fx_suppress', slot2State: 'present' },
      }).join(),
    ).toMatch(/'fx_suppress' is not companion 'quill'/);
    expect(
      errs({
        companion: 'bricks',
        abilities: { slot1: null, slot2: 'fx_strike', slot2State: 'present' },
      }).join(),
    ).toMatch(/'fx_strike' is not companion 'bricks'/);
  });

  it('refuses an ability modifier naming an unknown ability, or a radius with none', () => {
    const unknown = mod({ ability: 'nope', pct: -0.1 });
    expect(errs({ modifiers: [unknown] }).join()).toMatch(/unknown ability 'nope'/);
    expect(
      errs({
        modifiers: [
          { kind: 'abilityStat', ability: 'fx_suppress', stat: 'radius', flat: 1, source: 's' },
        ],
      }).join(),
    ).toMatch(/radius of 'fx_suppress', which has none/);
  });

  it('createSim accepts a companion, slot 2, and ability modifiers (the gates are lifted)', () => {
    const cfg = fixtureConfig({
      companion: 'bricks',
      abilities: { slot1: 'fx_strike', slot2: 'fx_suppress', slot2State: 'present' },
      modifiers: [{ kind: 'abilityStat', ability: '*', stat: 'cooldown', pct: -0.05, source: 's' }],
    });
    expect(gateRefusals(cfg)).toEqual([]);
    expect(() => createSim(cfg)).not.toThrow();
    expect(() => fixtureSim({ companion: 'bricks' })).toThrow(/needs a slot/);
  });
});

/** Casts Suppressing Fire on (2,1) at tick 10, then runs 6 s. */
function suppressRun(seed: number, paused: boolean) {
  const sim = fixtureSim({ ...BRICKS, seed });
  sim.enqueue({ type: 'callWave' });
  for (let i = 0; i < 10; i++) sim.step();
  sim.enqueue({ type: 'ability', slot: 2, target: [2, 1] });
  if (paused) sim.applyPending();
  for (let i = 0; i < 360; i++) sim.step();
  return sim;
}

describe('through the sim', () => {
  it('casts from slot 2 and runs the zone out', () => {
    const sim = suppressRun(1, false);
    const out: SimEvent<FixtureIds>[] = [];
    sim.drainEvents(out);
    expect(out.find((e) => e.type === 'AbilityUsed')).toMatchObject({
      slot: 2,
      ability: 'fx_suppress',
      target: [2, 1],
    });
    expect(sim.state.zones.live).toBe(0);
    expect(sim.state.abilityCooldownTicks[1]).toBe(COOLDOWN - 360);
  });

  it('is deterministic, and aiming while paused equals casting on the next tick', () => {
    expect(suppressRun(7, false).hash()).toBe(suppressRun(7, false).hash());
    expect(suppressRun(3, true).hash()).toBe(suppressRun(3, false).hash());
  });
});
