import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { UPGRADES, type UpgradeDef } from '../content/upgrades/index.ts';
import { DIFFICULTY_MODIFIERS, metaModifiers } from '../meta/index.ts';
import { FIXTURE_CONTENT, type FixtureIds } from '../sim/__fixtures__/sim.ts';
import { createSim } from '../sim/index.ts';
import { FIXTURE_CATALOG } from './__fixtures__/harness.ts';
import {
  FULL_CATALOG_PROTOCOLS,
  NO_PURCHASES,
  fullCatalogProfile,
  profileModifiers,
  referenceRunProfile,
  runConfig,
} from './profile.ts';

const map = FIXTURE_CONTENT.maps.fx_map;
const base = map.builds.referenceProfile;

/** The fixture map with `over` patched into its reference profile. */
function withProfile(over: Partial<typeof base>): CompiledContent<FixtureIds>['maps']['fx_map'] {
  return { ...map, builds: { ...map.builds, referenceProfile: { ...base, ...over } } };
}

describe('profiles', () => {
  it('an issued-kit profile (no purchases) grants no modifiers on Standard', () => {
    expect(profileModifiers(base, FIXTURE_CONTENT)).toEqual([]);
  });

  it('composes purchases through meta/modifiers.ts, the code the game uses', () => {
    const shop = { reinforced_core: 2, seed_money: 1 } as const;
    expect(profileModifiers({ ...base, shop }, FIXTURE_CONTENT)).toEqual(
      metaModifiers({ upgrades: shop, protocols: [], difficulty: 'standard' }),
    );
    expect(
      profileModifiers({ ...base, shop, protocols: ['head_start'] }, FIXTURE_CONTENT, 'story'),
    ).toEqual(metaModifiers({ upgrades: shop, protocols: ['head_start'], difficulty: 'story' }));
  });

  it("refuses what the mapping refuses, and ids the map's content doesn't have", () => {
    expect(() =>
      profileModifiers({ ...base, protocols: ['head_start', 'linked_up'] }, FIXTURE_CONTENT),
    ).toThrow(/2 protocols equipped, but only 1 slots/);
    expect(() => profileModifiers({ ...base, shop: { tune_rivet: 1 } }, FIXTURE_CONTENT)).toThrow(
      /shop:tune_rivet names a tower or ability this content doesn't have/,
    );
  });

  it('a Story run profile carries the difficulty and its modifiers', () => {
    const story = referenceRunProfile(map, FIXTURE_CONTENT, 'story');
    expect(story).toMatchObject({ kind: 'reference', difficulty: 'story', specs: [] });
    expect(story.modifiers).toEqual(DIFFICULTY_MODIFIERS.story);
    const sim = createSim(runConfig(FIXTURE_CONTENT, map, map.builds.parBuild, story, 1));
    expect(sim.state.integrity).toBe(30);
    expect(sim.state.credits).toBe(300);
  });

  it('the full catalog: every upgrade at its top rank, three protocols, simulated grants only', () => {
    const full = fullCatalogProfile(map, FIXTURE_CONTENT, FIXTURE_CATALOG);
    expect(full.kind).toBe('fullCatalog');
    expect(full.difficulty).toBe('standard');
    const sources = full.modifiers.map((m) => m.source);
    expect(sources.filter((s) => s === 'shop:fx_power')).toHaveLength(3);
    expect(sources.filter((s) => s === 'shop:reinforced_core')).toHaveLength(3);
    for (const p of FULL_CATALOG_PROTOCOLS) expect(sources).toContain(`protocol:${p}`);
    expect(full.leftOut).toEqual(['shop:salvage_rights (M3)']);
    const sim = createSim(runConfig(FIXTURE_CONTENT, map, map.builds.parBuild, full, 1));
    expect(sim.state.integrity).toBe(map.coreIntegrity + 3);
    expect(sim.state.leakAbsorbLeft).toBe(5);
  });

  it('the live full catalog composes on A1M1, leaving out only Salvage Rights', () => {
    const live = compileContent(RAW_CONTENT);
    const a1m1 = live.maps.a1_m01;
    const full = fullCatalogProfile(a1m1, live);
    expect(full.leftOut).toEqual(['shop:salvage_rights (M3)']);
    const every = Object.values<UpgradeDef>(UPGRADES)
      .filter((u) => u.id !== 'salvage_rights' && u.ranks.some((r) => r.grants.length > 0))
      .map((u) => `${u.kind}:${u.id}`);
    for (const s of every) expect(full.modifiers.map((m) => m.source)).toContain(s);
    const b = a1m1.builds.parBuild;
    expect(() => createSim(runConfig(live, a1m1, b, full, 1))).not.toThrow();
  });

  it('builds a config from a build and a profile; specs unlock for loadout towers only', () => {
    const b = map.builds.altBuilds.gun_only!;
    expect(runConfig(FIXTURE_CONTENT, map, b, NO_PURCHASES, 7)).toMatchObject({
      mapId: 'fx_map',
      seed: 7,
      loadout: ['fx_gun'],
      companion: null,
      modifiers: [],
      difficulty: 'standard',
      abilities: { slot1: 'fx_strike', slot2: null, slot2State: 'none' },
      specsUnlocked: [],
    });
    const specs = referenceRunProfile(
      withProfile({ specs: ['fx_gun', 'fx_mortar'] }),
      FIXTURE_CONTENT,
    );
    expect(runConfig(FIXTURE_CONTENT, map, b, specs, 1).specsUnlocked).toEqual(['fx_gun']);
  });

  it("fills slot 2 from the map's companion, or the build's pick on a pick-list map", () => {
    const b = map.builds.parBuild;
    const bricks = { ...map, companion: { id: 'bricks', state: 'present' } } as const;
    expect(runConfig(FIXTURE_CONTENT, bricks, b, NO_PURCHASES, 1)).toMatchObject({
      companion: 'bricks',
      abilities: { slot1: 'fx_strike', slot2: 'fx_suppress', slot2State: 'present' },
    });
    const pick = { ...map, companion: { pick: ['bricks', 'quill'] } } as const;
    expect(
      runConfig(FIXTURE_CONTENT, pick, { ...b, companion: 'quill' }, NO_PURCHASES, 1),
    ).toMatchObject({
      companion: 'quill',
      abilities: { slot2: 'fx_chime', slot2State: 'present' },
    });
    expect(() =>
      runConfig(FIXTURE_CONTENT, map, { ...b, companion: 'bricks' }, NO_PURCHASES, 1),
    ).toThrow(/no companion to pick/);
  });
});
