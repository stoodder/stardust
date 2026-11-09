// Type-level tests: each `@ts-expect-error` below must be an error, or `npm run typecheck` fails
// ("unused directive"). That's what proves a typo'd id doesn't compile. The runtime assertions
// only keep Vitest happy.
import { describe, expect, it } from 'vitest';
import { FIXTURE_ENTITIES, fx, fxBuilds } from './__fixtures__/content.ts';
import { defineRegistry, defineTower } from './define.ts';
import type { AbilityId, EnemyId, MapId, TierPatch, TowerId } from './types.ts';

describe('id unions derived from registries', () => {
  it('rejects a typo’d id anywhere a map refers to another kind', () => {
    const waves = fx.defineWaves([
      // @ts-expect-error -- 'fx_walkr' is not an enemy id
      { groups: [{ enemy: 'fx_walkr', count: 1, route: 'a' }] },
    ]);
    const layout = fx.defineMapLayout({
      ...fx.defineMapLayout({
        id: 'fx_typo',
        act: 1,
        env: 'act1',
        objective: 'defend',
        size: { cols: 1, rows: 1 },
        tiles: ['.'],
        paths: [],
        startCredits: 0,
        stardust: 0,
        threatIntel: [],
        requiredCounters: [],
        companion: null,
      }),
      // @ts-expect-error -- 'fx_mortr' is not a tower id
      towerUnlockWave: { fx_mortr: 3 },
    });
    const builds = fx.defineBuilds({
      ...fxBuilds,
      parBuild: {
        loadout: ['fx_gun'],
        // @ts-expect-error -- 'fx_strik' is not an ability id
        technicianAbility: 'fx_strik',
        // @ts-expect-error -- 'fx_gnu' is not a tower id
        steps: [{ wave: 1, build: 'fx_gnu', tile: [0, 0] }],
      },
    });
    expect([waves, layout, builds]).toHaveLength(3);
  });

  it('rejects a typo’d id against the live registries', () => {
    // @ts-expect-error -- not a tower id (live towers arrive with T105c; 'rivett' stays a typo)
    const tower: TowerId = 'rivett';
    // @ts-expect-error -- not an enemy id
    const enemy: EnemyId = 'nibblr';
    // @ts-expect-error -- not an ability id
    const ability: AbilityId = 'orbital_strik';
    // @ts-expect-error -- not a map id
    const map: MapId = 'a1_m1';
    expect([tower, enemy, ability, map]).toHaveLength(4);
  });

  it('derives fixture ids from the fixture registries', () => {
    const ids: (keyof typeof FIXTURE_ENTITIES.towers)[] = ['fx_gun', 'fx_mortar', 'fx_sprinkler'];
    expect(ids).toEqual(Object.keys(FIXTURE_ENTITIES.towers));
  });
});

describe('definition shapes', () => {
  it('rejects a registry key that differs from its definition id', () => {
    const gun = FIXTURE_ENTITIES.towers.fx_gun;
    // @ts-expect-error -- key 'gun' doesn't match id 'fx_gun'
    const registry = defineRegistry({ gun });
    expect(Object.keys(registry)).toEqual(['gun']);
  });

  it('rejects unknown fields and wrong units in tier patches', () => {
    // @ts-expect-error -- 'damge' is not an attack field
    const typo: TierPatch = { cost: 1, attack: { damge: 1 } };
    // @ts-expect-error -- content uses seconds and tiles; `rangeTicks` doesn't exist
    const units: TierPatch = { cost: 1, attack: { rangeTicks: 1 } };
    // @ts-expect-error -- every patch states its own cost
    const noCost: TierPatch = { attack: { damage: 1 } };
    expect([typo, units, noCost]).toHaveLength(3);
  });

  it('requires a complete tier 1', () => {
    const tower = defineTower({
      id: 'fx_incomplete',
      faction: 'everglow',
      role: 'x',
      sprites: { base: 'tower.x', icon: 'icon.x' },
      tiers: [
        // @ts-expect-error -- tier 1 needs targets and defaultPriority
        { cost: 1 },
        { cost: 1 },
        { cost: 1 },
      ],
    });
    expect(tower.id).toBe('fx_incomplete');
  });
});
