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
});
