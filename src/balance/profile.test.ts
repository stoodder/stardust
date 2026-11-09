import { describe, expect, it } from 'vitest';
import { FIXTURE_CONTENT, type FixtureIds } from '../sim/__fixtures__/sim.ts';
import { fullCatalogModifiers, profileModifiers, runConfig } from './profile.ts';

const map = FIXTURE_CONTENT.maps.fx_map;

describe('profiles', () => {
  it('an issued-kit profile (no purchases) grants no modifiers', () => {
    expect(profileModifiers(map.builds.referenceProfile)).toEqual([]);
  });

  it('refuses purchases until meta/modifiers.ts exists (T204)', () => {
    const base = map.builds.referenceProfile;
    expect(() => profileModifiers<FixtureIds>({ ...base, specs: ['fx_gun'] })).toThrow(
      /T204.*specs \(fx_gun\)/,
    );
  });

  it('refuses the full-catalog profile until T204', () => {
    expect(() => fullCatalogModifiers()).toThrow(/T204/);
  });

  it('builds a Standard config from a build', () => {
    const b = map.builds.altBuilds.gun_only!;
    expect(runConfig(FIXTURE_CONTENT, map, b, [], 7)).toMatchObject({
      mapId: 'fx_map',
      seed: 7,
      loadout: ['fx_gun'],
      companion: null,
      modifiers: [],
      difficulty: 'standard',
      abilities: { slot1: 'fx_strike', slot2: null, slot2State: 'none' },
    });
  });

  it("fills slot 2 from the map's companion, or the build's pick on a pick-list map", () => {
    const b = map.builds.parBuild;
    const bricks = { ...map, companion: { id: 'bricks', state: 'present' } } as const;
    expect(runConfig(FIXTURE_CONTENT, bricks, b, [], 1)).toMatchObject({
      companion: 'bricks',
      abilities: { slot1: 'fx_strike', slot2: 'fx_suppress', slot2State: 'present' },
    });
    const pick = { ...map, companion: { pick: ['bricks', 'quill'] } } as const;
    expect(runConfig(FIXTURE_CONTENT, pick, { ...b, companion: 'quill' }, [], 1)).toMatchObject({
      companion: 'quill',
      abilities: { slot2: 'fx_chime', slot2State: 'present' },
    });
    expect(() => runConfig(FIXTURE_CONTENT, map, { ...b, companion: 'bricks' }, [], 1)).toThrow(
      /no companion to pick/,
    );
  });
});
