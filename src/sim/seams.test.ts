// The M2 seams (T200): the new commands are declared (and live, each tested with its task); the
// new state fields start blank and are hashed; the links and allies systems run in the pipeline;
// FEATURE_GATES refuses per feature.
import { describe, expect, it } from 'vitest';
import { FIXTURE_CONTENT, fixtureConfig, fixtureSim, type FixtureIds } from './__fixtures__/sim.ts';
import { copyCommand, type Command } from './commands.ts';
import { ALLY_BLANK, TOWER_BLANK, ZONE_BLANK } from './entities.ts';
import { FEATURE_GATES, gateRefusals, modifierFeature } from './gates.ts';
import type { Modifier } from './config.ts';
import { createState } from './state.ts';
import { links } from './systems/links.ts';
import { createScratch, type TickContext } from './tick.ts';

type Cmd = Command<FixtureIds>;

describe('commands declared ahead of their tasks', () => {
  // Every M2 command is live: holdFire and spareRunners (T206a; fireControl.test.ts) and
  // specialize (T202b; specialize.test.ts). clear, interact, and scriptInput arrive in M3.
  it('copyCommand deep-copies every new command', () => {
    const cmds: readonly Cmd[] = [
      { type: 'specialize', towerUid: 1, spec: 'a' },
      { type: 'holdFire', target: 'all', on: true },
      { type: 'holdFire', target: 1, on: false },
      { type: 'spareRunners', target: 'all', on: true },
    ];
    for (const cmd of cmds) {
      const copy = copyCommand(cmd);
      expect(copy).toEqual(cmd);
      expect(copy).not.toBe(cmd);
    }
  });
});

describe('M2 state fields', () => {
  it('start blank', () => {
    const state = createState(FIXTURE_CONTENT.maps.fx_map, 1);
    expect(state.holdFireAll).toBe(false);
    expect(state.spareRunnersAll).toBe(false);
    expect(state.notFiringAnnounced).toBe(false);
    expect(state.linksDirty).toBe(false);
    expect(state.leakAbsorbLeft).toBe(0);
    expect(state.medals).toEqual({ victory: 'open', perfectCore: 'open', challenge: 'open' });
    const zero = { quiet_wave: 0, youngling: 0, fleeing: 0, medal_exempt: 0 };
    expect(state.stats).toMatchObject({
      holdFireTicks: 0,
      holdFireUses: 0,
      ticksSinceFiredAtSkitterkin: 0,
      tagSpawned: zero,
      tagLeaked: zero,
      tagKilled: zero,
      medalExemptLeaks: 0,
    });
    // Separate objects, so counting one tag list never moves another.
    expect(state.stats.tagSpawned).not.toBe(state.stats.tagLeaked);
    expect(TOWER_BLANK).toMatchObject({ spec: null, holdFire: false, spareRunners: false });
    expect(TOWER_BLANK.linkMask).toBe(0);
    expect(ZONE_BLANK.kind).toBe('strike');
    expect(ALLY_BLANK).toMatchObject({ kind: null, mode: 'post', health: 1, targetSlot: -1 });
  });

  it('pool blanks hold only scalars and frozen values (Object.assign would share the rest)', () => {
    for (const blank of [TOWER_BLANK, ZONE_BLANK, ALLY_BLANK]) {
      for (const v of Object.values(blank)) {
        if (typeof v === 'object' && v !== null) expect(Object.isFrozen(v)).toBe(true);
      }
    }
  });

  it('are hashed', () => {
    const base = fixtureSim().hash();
    // The live state is read-only to callers; Reflect pokes it to prove hash() covers a field.
    const flipped = fixtureSim();
    Reflect.set(flipped.state, 'holdFireAll', true);
    expect(flipped.hash()).not.toBe(base);
    const tagged = fixtureSim();
    Reflect.set(tagged.state.stats.tagLeaked, 'fleeing', 1);
    expect(tagged.hash()).not.toBe(base);
    const linked = fixtureSim();
    linked.enqueue({ type: 'build', tile: [1, 1], tower: 'fx_gun' });
    linked.applyPending();
    const unlinked = fixtureSim();
    unlinked.enqueue({ type: 'build', tile: [1, 1], tower: 'fx_gun' });
    unlinked.applyPending();
    Reflect.set(linked.state.towers.items[0]!, 'linkMask', 1);
    expect(linked.hash()).not.toBe(unlinked.hash());
  });
});

describe('the links seam', () => {
  it('build, upgrade, and sell mark links dirty; the links system clears it', () => {
    const sim = fixtureSim();
    sim.enqueue({ type: 'build', tile: [1, 1], tower: 'fx_gun' });
    sim.applyPending();
    expect(sim.state.linksDirty).toBe(true);
    sim.step(); // links runs after status
    expect(sim.state.linksDirty).toBe(false);
    sim.enqueue({ type: 'upgrade', towerUid: 1 });
    sim.applyPending();
    expect(sim.state.linksDirty).toBe(true);
    sim.step();
    sim.enqueue({ type: 'sell', towerUid: 1 });
    sim.applyPending();
    expect(sim.state.linksDirty).toBe(true);
  });

  it('does nothing while clean', () => {
    const cfg = fixtureConfig();
    const map = FIXTURE_CONTENT.maps.fx_map;
    const state = createState(map, 1);
    const ctx: TickContext = {
      content: FIXTURE_CONTENT,
      map,
      config: cfg,
      scratch: createScratch(),
    };
    links(state, ctx);
    expect(state.linksDirty).toBe(false);
  });
});

describe('FEATURE_GATES', () => {
  it('names a task (or a milestone) for every closed gate', () => {
    for (const owner of Object.values(FEATURE_GATES)) {
      if (owner !== null) expect(owner).toMatch(/^(T\d+[a-z]?|M\d+)$/);
    }
  });

  it('maps every modifier to its own gate', () => {
    const mods: Modifier<FixtureIds>[] = [
      { kind: 'towerStat', tower: '*', stat: 'damage', pct: 0.05, source: 's' },
      { kind: 'towerCost', tower: 'fx_gun', tiers: 'spec', pct: -0.25, source: 's' },
      { kind: 'enemyStat', stat: 'hp', pct: -0.3, source: 's' },
      { kind: 'economy', stat: 'coreIntegrity', set: 30, source: 's' },
      { kind: 'economy', stat: 'bounty', pct: 0.05, source: 's' },
      { kind: 'sellRefund', flat: 0.05, source: 's' },
      { kind: 'abilityStat', ability: 'fx_strike', stat: 'radius', flat: 0.5, source: 's' },
      { kind: 'countdown', pct: 0.5, source: 's' },
      { kind: 'linkBonus', pct: 0.5, source: 's' },
      { kind: 'tileBonus', tile: 'highGround', flat: 0.15, source: 's' },
      { kind: 'leakAbsorb', flat: 5, source: 's' },
      { kind: 'firstBuildFree', source: 's' },
      { kind: 'freeCast', wave: 1, source: 's' },
    ];
    const features = mods.map((m) => modifierFeature(m));
    expect(features).toEqual([
      'modifier.towerStat',
      'modifier.towerCost',
      'modifier.enemyStat',
      'modifier.economy.coreIntegrity',
      'modifier.economy.bounty',
      'modifier.sellRefund',
      'modifier.abilityStat',
      'modifier.countdown',
      'modifier.linkBonus',
      'modifier.tileBonus',
      'modifier.leakAbsorb',
      'modifier.firstBuildFree',
      'modifier.freeCast',
    ]);
    for (const f of features) expect(Object.hasOwn(FEATURE_GATES, f)).toBe(true);
  });

  it('refuses only what a config uses, once per feature, and lifts per row', () => {
    const cfg = fixtureConfig({
      specsUnlocked: ['fx_gun'],
      difficulty: 'story',
      modifiers: [
        { kind: 'firstBuildFree', source: 'protocol:rapid_deploy' },
        { kind: 'freeCast', wave: 1, source: 'protocol:ready_room' },
        { kind: 'freeCast', wave: 2, source: 'again' },
      ],
    });
    expect(gateRefusals(cfg)).toEqual([
      "a 'firstBuildFree' modifier (protocol:rapid_deploy) is not simulated until T304d",
      "a 'freeCast' modifier (protocol:ready_room) is not simulated until T304d",
    ]);
    const lifted: typeof FEATURE_GATES = { ...FEATURE_GATES, 'modifier.firstBuildFree': null };
    expect(gateRefusals(cfg, lifted)).toHaveLength(1);
    expect(gateRefusals(fixtureConfig())).toEqual([]);
  });
});
