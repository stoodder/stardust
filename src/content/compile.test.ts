import { describe, expect, it } from 'vitest';
import { FIXTURE, fxBuilds, fxLayout, fxMap, fxWaves } from './__fixtures__/content.ts';
import { ContentCompileError, compileContent } from './compile.ts';
import type { CompiledContent } from './compiled.ts';
import { deepFreeze, mergePatch } from './compileHelpers.ts';
import { mapDefinersFor } from './define.ts';
import { RAW_CONTENT } from './registry.ts';
import { DEFAULT_COUNTDOWN_SEC } from './rules.ts';
import type { IdSpace, MapDef, RawContent, TowerDef } from './types.ts';
import type { FixtureIds } from './__fixtures__/content.ts';

const content: CompiledContent<FixtureIds> = compileContent(FIXTURE);
const map = content.maps.fx_map;

/**
 * Compiles content expecting failure; returns the compile errors. Validation errors (tagged
 * `[rule]`, validate.test.ts) are left out: broken fixtures here often break a design rule too.
 */
function errorsFor(raw: RawContent<IdSpace>): readonly string[] {
  try {
    compileContent(raw);
  } catch (e) {
    if (e instanceof ContentCompileError) return e.errors.filter((m) => !m.startsWith('['));
    throw e;
  }
  throw new Error('expected compileContent to fail');
}
const loose = mapDefinersFor<IdSpace>();
function withMap(patch: Partial<MapDef<IdSpace>>): RawContent<IdSpace> {
  return { ...FIXTURE, maps: { fx_map: loose.defineMap({ ...fxMap, ...patch }) } };
}

describe('compileContent: live registries', () => {
  it('compiles the live registries', () => {
    const live = compileContent(RAW_CONTENT);
    expect(Object.keys(live.towers)).toEqual(Object.keys(RAW_CONTENT.towers));
    expect(live.campaign).toEqual(RAW_CONTENT.campaign);
  });
});

describe('compileContent: towers and tier patches', () => {
  it('resolves each tier in full, merging patches deeply', () => {
    const [t1, t2, t3] = content.towers.fx_gun.tiers;
    expect(t1.attack).toMatchObject({ kind: 'hitscan', damage: 10, cooldownTicks: 30, rangeSq: 9 });
    // T2 patches only damage; the rest carries over from T1.
    expect(t2).toMatchObject({ tier: 2, cost: 80, defaultPriority: 'first' });
    expect(t2.attack).toMatchObject({
      kind: 'hitscan',
      type: 'kinetic',
      damage: 12,
      rangeTiles: 3,
    });
    expect(t2.targets).toEqual({ ground: true, air: true });
    // T3 patches T2, not T1.
    expect(t3.attack).toMatchObject({ damage: 12, cooldownTicks: 24, armorPierce: 3 });
  });

  it('resolves specs on top of tier 3, including priority overrides', () => {
    const specs = content.towers.fx_gun.specs;
    expect(specs?.a).toMatchObject({ tier: 4, name: 'Fx Storm', cost: 300 });
    expect(specs?.a.attack).toMatchObject({ armorPierce: 0, spinUpTicks: 60, cooldownTicks: 8 });
    expect(specs?.b.defaultPriority).toBe('strong');
    expect(specs?.b.attack).toMatchObject({ ignoresArmor: true, rangeSq: 36, cooldownTicks: 120 });
    expect(content.towers.fx_sprinkler.specs).toBeNull();
  });

  it('fills every optional attack field (monomorphic shapes)', () => {
    expect(content.towers.fx_gun.tiers[0].attack).toEqual({
      kind: 'hitscan',
      type: 'kinetic',
      damage: 10,
      cooldownTicks: 30,
      rangeTiles: 3,
      rangeSq: 9,
      minRangeTiles: 0,
      minRangeSq: 0,
      detectCapTiles: 0,
      armorPierce: 0,
      ignoresArmor: false,
      spinUpTicks: 0,
      targetFilter: null,
      echo: null,
    });
  });

  it("caps a detecting tier's attack at its detection radius (the Lantern; D139)", () => {
    const gun = FIXTURE.towers.fx_gun;
    const seer: TowerDef = {
      ...gun,
      tiers: [{ ...gun.tiers[0], detect: { radiusTiles: 3 } }, { cost: 1 }, { cost: 1 }],
      // Fx Rail reaches 6, so it sees 6.
      specs: { ...gun.specs!, b: { ...gun.specs!.b, detect: { radiusTiles: 6 } } },
    };
    const raw: RawContent<IdSpace> = { ...FIXTURE, towers: { ...FIXTURE.towers, fx_gun: seer } };
    const out = compileContent(raw);
    const tiers = out.towers.fx_gun!.tiers;
    // Tier 2 inherits tier 1's detection; the specs inherit tier 3's unless they patch it.
    expect(tiers.map((t) => t.attack?.detectCapTiles)).toEqual([3, 3, 3]);
    expect(out.towers.fx_gun!.specs?.a.attack?.detectCapTiles).toBe(3);
    expect(out.towers.fx_gun!.specs?.b.attack?.detectCapTiles).toBe(6);
    // A tier that doesn't detect has no cap.
    expect(content.towers.fx_gun.specs?.b.attack?.detectCapTiles).toBe(0);
    // The live Lantern: each tier's reach is its detection radius.
    const live = compileContent(RAW_CONTENT).towers.lantern;
    for (const t of [...live.tiers, live.specs!.a, live.specs!.b]) {
      expect(t.attack?.detectCapTiles).toBe(t.detect?.radiusTiles);
    }
  });

  it('refuses a detecting tier whose attack reaches past its detection radius', () => {
    const gun = FIXTURE.towers.fx_gun; // range 3
    const { specs: _specs, ...plain } = gun; // no specs: one error, tier 1's
    const far: TowerDef = {
      ...plain,
      tiers: [{ ...gun.tiers[0], detect: { radiusTiles: 2.5 } }, { cost: 1 }, { cost: 1 }],
    };
    const errors = errorsFor({ ...FIXTURE, towers: { ...FIXTURE.towers, fx_gun: far } });
    expect(errors[0]).toBe(
      "towers.fx_gun.tiers[0].attack.rangeTiles: a tower that detects can't reach past its detection radius (3 > 2.5)",
    );
  });

  it('compiles lobbed attacks, and replaces an attack whose kind changes', () => {
    const mortar = content.towers.fx_mortar;
    expect(mortar.tiers[0].attack).toMatchObject({
      kind: 'lobbed',
      flightTicks: 48,
      splashSq: 0.81,
      minRangeTiles: 1,
      minRangeSq: 1,
      lead: true,
    });
    expect(mortar.tiers[2].attack).toMatchObject({
      damage: 30,
      splashTiles: 1.2,
      cooldownTicks: 100,
    });
    const rocket = mortar.specs?.a.attack;
    expect(rocket?.kind).toBe('projectile');
    expect(rocket).toMatchObject({ minRangeTiles: 0, speedTilesPerTick: 0.1 });
    expect(rocket).not.toHaveProperty('flightTicks');
    expect(mortar.specs?.b.effects).toEqual([
      { status: 'corroded', stacks: 3, maxStacks: 3, shieldRegenMul: 1 },
    ]);
  });

  it('compiles pulse attacks and replaces effect arrays whole', () => {
    const [t1, t2, t3] = content.towers.fx_sprinkler.tiers;
    expect(t1.defaultPriority).toBeNull();
    expect(t1.attack).toMatchObject({ kind: 'pulse', cooldownTicks: 60, rangeSq: 4 });
    expect(t1.effects).toEqual([{ status: 'chilled', pct: 0.25, durationTicks: 90 }]);
    expect(t2.attack?.rangeTiles).toBe(2.3);
    expect(t2.effects).toEqual([{ status: 'chilled', pct: 0.3, durationTicks: 90 }]);
    expect(t3.effects).toEqual([
      { status: 'chilled', pct: 0.35, durationTicks: 90 },
      { status: 'soaked', durationTicks: 180 },
    ]);
    expect(t3.attack?.rangeTiles).toBe(2.3);
  });

  it('never mutates the authored definitions', () => {
    expect(FIXTURE.towers.fx_gun.tiers[0].attack?.damage).toBe(10);
    const base = { a: { x: 1, y: [1, 2] }, b: 2 };
    const out = mergePatch(base, { a: { y: [3] } });
    expect(out).toEqual({ a: { x: 1, y: [3] }, b: 2 });
    expect(base).toEqual({ a: { x: 1, y: [1, 2] }, b: 2 });
  });

  it('reports an attack whose kind changes without every field its kind needs', () => {
    const broken: TowerDef = {
      ...FIXTURE.towers.fx_gun,
      tiers: [
        FIXTURE.towers.fx_gun.tiers[0],
        { cost: 1, attack: { kind: 'lobbed', flightSec: 1 } },
        { cost: 1 },
      ],
    };
    const errors = errorsFor({ ...FIXTURE, towers: { ...FIXTURE.towers, fx_gun: broken } });
    expect(errors[0]).toBe(
      "towers.fx_gun.tiers[1].attack: 'lobbed' attack is missing type, damage, ratePerSec, rangeTiles, projectile, splashTiles, lead",
    );
    // The incomplete attack carries into tier 3 and both specs, each reported where it compiles.
    expect(errors.map((e) => e.split(':')[0])).toEqual([
      'towers.fx_gun.tiers[1].attack',
      'towers.fx_gun.tiers[2].attack',
      'towers.fx_gun.specs.a.attack',
      'towers.fx_gun.specs.b.attack',
    ]);
  });

  it('refuses bomblets that land in no time (flightSec rounding to 0 ticks; C9)', () => {
    const mortar = FIXTURE.towers.fx_mortar;
    const bomblets = {
      count: 2,
      damage: 5,
      splashTiles: 0.5,
      scatterTiles: 1,
      flightSec: 0,
      projectile: 'projectile.thumper_shell' as const,
    };
    const broken: TowerDef = {
      ...mortar,
      tiers: [mortar.tiers[0], mortar.tiers[1], { ...mortar.tiers[2], attack: { bomblets } }],
    };
    const errors = errorsFor({ ...FIXTURE, towers: { ...FIXTURE.towers, fx_mortar: broken } });
    expect(errors).toContain(
      'towers.fx_mortar.tiers[2].attack.bomblets.flightSec: must last at least one tick (got 0)',
    );
  });
});

describe('compileContent: enemies and abilities', () => {
  it('converts seconds to ticks and per-second values to per-tick', () => {
    const runner = content.enemies.fx_runner;
    expect(runner.speedTilesPerTick).toBe(2 / 60);
    expect(runner.spawnIntervalTicks).toBe(30);
    expect(runner.shield).toEqual({ hp: 10, regenPerTick: 3 / 60, regenDelayTicks: 120 });
    expect(runner.restValue).toBe(1);
    expect(content.enemies.fx_walker.shield).toBeNull();
    expect(content.abilities.fx_strike).toMatchObject({ cooldownTicks: 2700 });
    expect(content.abilities.fx_strike.effect).toMatchObject({ delayTicks: 60, radiusSq: 2.25 });
  });
});

describe('compileContent: maps', () => {
  it('parses the tile grid row-major', () => {
    expect(map.cols).toBe(6);
    expect(map.rows).toBe(5);
    expect(map.tiles).toHaveLength(30);
    expect(map.tiles[2 * map.cols + 3]).toBe('^');
    expect(map.tiles[4 * map.cols + 5]).toBe('C');
    expect(map.coreIntegrity).toBe(20);
    expect(map.companion).toBeNull();
  });

  it('caches the route list in route order, the same objects as `routes`', () => {
    expect(map.routeList).toEqual(Object.values(map.routes));
    map.routeList.forEach((r) => expect(map.routes[r.id]).toBe(r));
  });

  it('compiles routes into polylines through tile centers with cumulative lengths', () => {
    const a = map.routes.a;
    expect(a?.kind).toBe('path');
    expect(a?.xs.slice(0, 3)).toEqual([0.5, 1.5, 2.5]);
    expect(a?.ys.slice(0, 4)).toEqual([0.5, 0.5, 0.5, 1.5]);
    expect(a?.cumLenTiles).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(a?.lengthTiles).toBe(9);
    const sky = map.routes.sky;
    expect(sky).toMatchObject({ kind: 'air', layer: 'air', cumLenTiles: [0, 5], lengthTiles: 5 });
  });

  it('compiles waves to ticks, with act and enemy defaults', () => {
    const [w1, w2] = map.waves;
    expect(w1?.number).toBe(1);
    expect(w1?.countdownTicks).toBe(DEFAULT_COUNTDOWN_SEC[1] * 60);
    expect(w1?.groups[0]).toMatchObject({ count: 3, intervalTicks: 48, delayTicks: 0, tags: [] });
    expect(w1?.lastSpawnTicks).toBe(96);
    expect(w2?.countdownTicks).toBe(600);
    expect(w2?.groups[1]).toMatchObject({ intervalTicks: 30, delayTicks: 60, tags: ['fleeing'] });
    expect(w2?.lastSpawnTicks).toBe(60 + 3 * 30);
  });

  it('resolves wave-group ids to the compiled definitions', () => {
    const group = map.waves[0]?.groups[0];
    expect(group?.enemy).toBe(content.enemies.fx_walker);
    expect(group?.route).toBe(map.routes.a);
  });

  it('compiles towerUnlockWave into countdown unlock events ahead of authored events', () => {
    expect(map.lockedTowersAtStart).toEqual(['fx_mortar', 'fx_sprinkler']);
    expect(map.events.slice(0, 2)).toEqual([
      {
        id: 'unlock_tower_fx_mortar',
        on: { wave: 2, phase: 'countdown' },
        when: null,
        actions: [{ unlockTowerClass: 'fx_mortar' }],
        once: true,
      },
      {
        id: 'unlock_tower_fx_sprinkler',
        on: { wave: 2, phase: 'countdown' },
        when: null,
        actions: [{ unlockTowerClass: 'fx_sprinkler' }],
        once: true,
      },
    ]);
    expect(map.events.map((e) => e.id)).toEqual([
      'unlock_tower_fx_mortar',
      'unlock_tower_fx_sprinkler',
      'w02_radio',
      'late_gift',
    ]);
  });

  it('converts script times to ticks', () => {
    const gift = map.events[3];
    expect(gift?.on).toEqual({ wave: 2, phase: { afterTicks: 90 } });
    expect(gift?.once).toBe(false);
    expect(gift?.actions[1]).toEqual({
      setClickable: { marker: 'rock', on: true, fallback: { tick: 600 } },
    });
    expect(map.events[2]?.once).toBe(true);
  });

  it('compiles builds into tagged steps with defaults resolved', () => {
    const par = map.builds.parBuild;
    expect(par.technicianAbility).toBe('fx_strike');
    expect(par.callEarly).toBe(false);
    expect(par.companion).toBeNull();
    expect(par.steps.map((s) => s.kind)).toEqual([
      'build',
      'upgrade',
      'build',
      'ability',
      'targeting',
    ]);
    expect(par.steps[3]).toEqual({
      wave: 2,
      kind: 'ability',
      slot: 1,
      target: [2, 2],
      when: { afterTicks: 120 },
    });
    expect(map.builds.altBuilds.gun_only?.callEarly).toBe(true);
    expect(map.builds.noCounterBuilds).toEqual({});
    expect(map.builds.marginBand).toBeNull();
  });
});

describe('compileContent: freezing', () => {
  it('deep-freezes the output', () => {
    expect(Object.isFrozen(content)).toBe(true);
    expect(Object.isFrozen(content.towers.fx_gun.tiers[1].attack)).toBe(true);
    expect(Object.isFrozen(map.routes.a?.cumLenTiles)).toBe(true);
    expect(Object.isFrozen(map.waves[1]?.groups[0]?.tags)).toBe(true);
    expect(() => {
      // @ts-expect-error -- compiled content is readonly; this proves it is frozen at runtime too
      content.towers.fx_gun.tiers[0].cost = 1;
    }).toThrow(TypeError);
  });

  it('deepFreeze handles shared references and leaves primitives alone', () => {
    const shared = { n: 1 };
    const tree = deepFreeze({ a: shared, b: [shared], c: 'x' });
    expect(Object.isFrozen(tree.b)).toBe(true);
    expect(Object.isFrozen(shared)).toBe(true);
    expect(deepFreeze(3)).toBe(3);
  });
});

describe('compileContent: errors', () => {
  it('reports unknown ids in waves, unlocks, builds, and scripts', () => {
    const errors = errorsFor(
      withMap({
        waves: loose.defineWaves([
          { groups: [{ enemy: 'fx_walkr', count: 1, route: 'a' }] },
          { groups: [{ enemy: 'fx_walker', count: 1, route: 'b' }] },
        ]),
        towerUnlockWave: { fx_mortr: 2, fx_gun: 9 },
        events: [
          { id: 'e', on: { wave: 1, phase: 'start' }, actions: [{ unlockTowerClass: 'x' }] },
        ],
        parBuild: { loadout: ['fx_gun', 'nope'], technicianAbility: 'zap', steps: [] },
      }),
    );
    expect(errors).toEqual([
      "maps.fx_map.waves[0].groups[0]: unknown enemy 'fx_walkr'",
      "maps.fx_map.waves[1].groups[0]: unknown route 'b'",
      "maps.fx_map.towerUnlockWave: unknown tower 'fx_mortr'",
      'maps.fx_map.towerUnlockWave.fx_gun: wave 9 is not a wave of this map',
      "maps.fx_map.events[0].actions[0]: unknown tower 'x'",
      "maps.fx_map.parBuild.loadout: unknown tower 'nope'",
      "maps.fx_map.parBuild.technicianAbility: unknown ability 'zap'",
    ]);
  });

  it('reports registry keys that differ from ids, and unknown campaign maps', () => {
    const errors = errorsFor({
      ...FIXTURE,
      enemies: { ...FIXTURE.enemies, walker: FIXTURE.enemies.fx_walker },
      campaign: ['fx_map', 'missing_map'],
    });
    expect(errors).toEqual([
      "enemies.walker: registered under 'walker' but its id is 'fx_walker'",
      "campaign[1]: unknown map 'missing_map'",
    ]);
  });

  it('reports malformed tile grids', () => {
    const errors = errorsFor(withMap({ tiles: ['S##...', '.o#o.', '..#?o.', '.o##x.'] }));
    expect(errors).toEqual([
      'maps.fx_map.tiles: 4 rows, but size.rows is 5',
      'maps.fx_map.tiles[1]: 5 columns, but size.cols is 6',
      "maps.fx_map.tiles[2][3]: '?' is not in the tile legend",
    ]);
  });

  it('reports duplicate route and event ids, bad steps, and invalid durations', () => {
    const errors = errorsFor(
      withMap({
        airLanes: [{ id: 'a', points: [[0, 0]] }],
        events: [
          { id: 'unlock_tower_fx_mortar', on: { wave: 1, phase: { afterSec: -1 } }, actions: [] },
        ],
        parBuild: {
          ...fxBuilds.parBuild,
          steps: [{ wave: 1, upgrade: [1, 1], sell: [1, 1] }],
        },
        noCounterBuilds: { air: fxBuilds.parBuild },
      }),
    );
    expect(errors).toEqual([
      'maps.fx_map.airLanes[0]: a route needs at least 2 tiles',
      "maps.fx_map.airLanes[0]: duplicate route id 'a'",
      expect.stringMatching(
        /^maps\.fx_map\.events\[0\]\.on\.afterSec: a duration must be .* \(got -1\)$/,
      ),
      "maps.fx_map.events: duplicate event id 'unlock_tower_fx_mortar'",
      "maps.fx_map.noCounterBuilds.air: not one of the map's requiredCounters",
      'maps.fx_map.parBuild.steps[0]: a step needs exactly one action key (found upgrade, sell)',
    ]);
  });

  it('throws one error listing every problem', () => {
    const raw: RawContent<IdSpace> = { ...FIXTURE, campaign: ['fx_map', 'missing_map'] };
    expect(() => compileContent(raw)).toThrow(/Content failed to compile \(1\):\n- campaign\[1\]/);
  });

  it('runs validate() first, so content that breaks a design rule never compiles', () => {
    const raw = withMap({ threatIntel: ['fast'] });
    expect(() => compileContent(raw)).toThrow(
      /\(1\):\n- \[threat-intel\] maps\.fx_map\.threatIntel: missing shielded/,
    );
  });
});

it('the fixture layout, waves, and builds compose into its map', () => {
  expect(fxMap).toMatchObject({ ...fxLayout, waves: fxWaves });
});
