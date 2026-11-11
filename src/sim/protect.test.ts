// Protect the asset (T305a; design/maps.md § 5.2, D101): a leak on an asset route costs the asset
// meter instead of the core, by its leak value (0 for a fleeing unit, floored at 1 for the Quiet
// Wave, all of it for a boss); Emergency Bulkhead guards the core only; the asset at 0 loses the
// map; Perfect Core means nothing got through to either; and the damage bands render reads.
import { describe, expect, it } from 'vitest';
import type { CompiledAsset, CompiledEnemyDef } from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { MAP, WALKER, enemyDef, setup, spawn } from './__fixtures__/combat.ts';
import { FIXTURE_CONTENT, fixtureConfig, type FixtureIds } from './__fixtures__/sim.ts';
import type { SimEvent } from './events.ts';
import { applyRunModifiers } from './economy.ts';
import { ASSET_CRITICAL_SHARE, assetDamage, isAssetLost } from './objectives.ts';
import { createSim } from './sim.ts';
import { createState, type SimState } from './state.ts';
import { cleanup } from './systems/cleanup.ts';
import { movement } from './systems/movement.ts';

const LIVE = compileContent(RAW_CONTENT);

/** fx_map as a Protect map whose asset (on the rock) takes the leaks of `routes`. */
function protectMap(routes: readonly string[], integrity = 10): typeof MAP {
  const asset: CompiledAsset = { name: 'Rig', integrity, marker: 'rock', tile: [0, 2], routes };
  return Object.assign({}, MAP, { objective: 'protect' as const, asset });
}

/** A bare state on `map` with its tick context. */
function protectSetup(map: typeof MAP): ReturnType<typeof setup> {
  const { ctx } = setup();
  return { state: createState(map, 1), ctx: { ...ctx, map } };
}

/** Puts `e` a hair before its route's end, so the next movement leaks it. */
function atEnd(
  state: SimState,
  def: CompiledEnemyDef = WALKER,
  tags: readonly string[] = [],
): void {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test: tags are WaveTags
  spawn(state, def, { dist: MAP.routes.a!.lengthTiles - 0.001, tags: tags as never });
}

function eventTypes(state: SimState): string[] {
  return state.events.map((e) => e.type);
}

describe('a leak on an asset route (movement)', () => {
  it('costs the asset its leak value, not the core', () => {
    const { state, ctx } = protectSetup(protectMap(['a']));
    atEnd(state);
    movement(state, ctx);
    expect([state.asset, state.integrity]).toEqual([9, 20]);
    expect(state.stats.integrityLost).toBe(0);
    expect(state.events).toEqual([
      { type: 'EnemyLeaked', uid: expect.any(Number), enemy: 'fx_walker', leak: 0 },
      {
        type: 'AssetHit',
        uid: expect.any(Number),
        enemy: 'fx_walker',
        lost: 1,
        x: expect.any(Number),
        y: expect.any(Number),
      },
    ]);
  });

  it('leaves leaks on other routes to the core', () => {
    const { state, ctx } = protectSetup(protectMap(['sky']));
    atEnd(state);
    movement(state, ctx);
    expect([state.asset, state.integrity]).toEqual([10, 19]);
    expect(eventTypes(state)).toEqual(['EnemyLeaked']);
  });

  it('costs nothing for a fleeing runner, and floors the Quiet Wave at 1', () => {
    const { state, ctx } = protectSetup(protectMap(['a'], 2));
    atEnd(state, WALKER, ['fleeing']);
    movement(state, ctx);
    expect(state.asset).toBe(2);
    expect(state.events.at(-1)).toMatchObject({ type: 'AssetHit', lost: 0 });
    const big = enemyDef('fx_thrum', { leak: 5 });
    atEnd(state, big, ['quiet_wave']);
    movement(state, ctx);
    expect(state.asset).toBe(1);
    expect(state.events.at(-1)).toMatchObject({ type: 'AssetHit', lost: 1 });
  });

  it('is drained by a boss: AssetLost, then cleanup loses the map', () => {
    const { state, ctx } = protectSetup(protectMap(['a']));
    const boss = enemyDef('fx_boss', { boss: LIVE.enemies.chitterbloom.boss });
    atEnd(state, boss);
    movement(state, ctx);
    expect([state.asset, state.integrity]).toEqual([0, 20]);
    expect(eventTypes(state)).toEqual(['EnemyLeaked', 'AssetHit', 'AssetLost']);
    expect(isAssetLost(state)).toBe(true);
    cleanup(state, ctx);
    expect(state.outcome).toBe('lost');
    expect(state.medals).toEqual({
      victory: 'forfeited',
      perfectCore: 'forfeited',
      challenge: 'forfeited',
    });
    expect(eventTypes(state).at(-1)).toBe('MapLost');
  });

  it("isn't absorbed by Emergency Bulkhead, which guards the core", () => {
    const { state, ctx } = protectSetup(protectMap(['a']));
    state.leakAbsorbLeft = 5;
    atEnd(state, enemyDef('fx_big', { leak: 3 }));
    movement(state, ctx);
    expect([state.asset, state.leakAbsorbLeft]).toEqual([7, 5]);
  });

  it('a neutral unit at the asset delivers and leaves', () => {
    const { state, ctx } = protectSetup(protectMap(['a']));
    atEnd(state, enemyDef('fx_mail', { neutral: true, leak: 0 }));
    movement(state, ctx);
    expect(state.asset).toBe(10);
    expect(eventTypes(state)).toEqual(['NeutralExited']);
  });
});

/** Plays fx_map as a Protect map (every path leak at the asset) with nothing built, to its end. */
function play(integrity: number) {
  const cfg = fixtureConfig({
    loadout: [],
    content: { ...FIXTURE_CONTENT, maps: { fx_map: protectMap(['a'], integrity) } },
  });
  const sim = createSim(cfg);
  const out: SimEvent<FixtureIds>[] = [];
  sim.enqueue({ type: 'callWave' });
  while (sim.state.outcome === 'playing' && sim.state.tick < 60 * 120) {
    sim.step();
    sim.drainEvents(out);
  }
  return { sim, out };
}

describe('a Protect run', () => {
  it('is lost when the asset reaches 0, with the core untouched', () => {
    const { sim, out } = play(3); // W1's three walkers
    expect(sim.state.outcome).toBe('lost');
    expect([sim.state.asset, sim.state.integrity]).toEqual([0, 20]);
    const types = out.map((e) => e.type);
    expect(types.indexOf('AssetLost')).toBeLessThan(types.indexOf('MapLost'));
  });

  it('is won with the asset above 0; any leak at it forfeits Perfect Core', () => {
    const { sim } = play(10); // 5 walkers leak 1 each; the 4 fleeing runners leak 0
    expect(sim.state.outcome).toBe('won');
    expect([sim.state.asset, sim.state.integrity]).toEqual([5, 20]);
    expect(sim.state.medals.perfectCore).toBe('forfeited');
  });
});

describe('assetDamage (the rig props and the HUD meter)', () => {
  it('bands the meter: intact, damaged, critical at half, lost', () => {
    expect(ASSET_CRITICAL_SHARE).toBe(0.5);
    expect(assetDamage(0, 0)).toBe('none');
    expect(assetDamage(10, 10)).toBe('intact');
    expect(assetDamage(9, 10)).toBe('damaged');
    expect(assetDamage(6, 10)).toBe('damaged');
    expect(assetDamage(5, 10)).toBe('critical');
    expect(assetDamage(1, 10)).toBe('critical');
    expect(assetDamage(0, 10)).toBe('lost');
  });

  it('isAssetLost is false on a map without an asset', () => {
    expect(isAssetLost({ asset: 0, maxAsset: 0 })).toBe(false);
  });
});

describe('the asset meter under run modifiers (applyRunModifiers; D150 Story softens a Protect asset)', () => {
  const story = {
    kind: 'economy',
    stat: 'assetIntegrity',
    pct: 0.5,
    source: 'difficulty',
  } as const;

  it("scales a Protect map's asset and its full value, as Story's ×1.5 does", () => {
    const map = protectMap(['a'], 12);
    const state = createState(map, 1);
    applyRunModifiers(state, map, [story]);
    expect([state.asset, state.maxAsset]).toEqual([18, 18]);
  });

  it('leaves the asset alone with no modifier, floors it at 1, and ignores a map without one', () => {
    const map = protectMap(['a'], 12);
    const plain = createState(map, 1);
    applyRunModifiers(plain, map, []);
    expect([plain.asset, plain.maxAsset]).toEqual([12, 12]);
    const floored = createState(map, 1);
    applyRunModifiers(floored, map, [{ ...story, pct: -1 }]);
    expect([floored.asset, floored.maxAsset]).toEqual([1, 1]);
    const none = createState(MAP, 1);
    applyRunModifiers(none, MAP, [story]);
    expect([none.asset, none.maxAsset]).toEqual([0, 0]);
  });
});
