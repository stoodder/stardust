// Flag-variant reference profiles (T700a; BuildsDef.referenceProfileByFlag): a run whose story
// flags match a cell is owned by that cell's profile and plays its par build, first match wins;
// any other run, the map's own (balance/profile.ts). The harness keys its runs by them (T764).
// Validation's side ([flag-profile]) is render/__fixtures__/devM7.test.ts's.
import { describe, expect, it } from 'vitest';
import { FIXTURE, fxMap } from '../content/__fixtures__/content.ts';
import { compileContent } from '../content/compile.ts';
import {
  flagProfileCell,
  parBuildFor,
  referenceProfileFor,
  referenceRunProfile,
} from './profile.ts';

const WARREN = { ...fxMap.referenceProfile, towers: ['fx_gun'] } as const;
const PAR = { loadout: ['fx_gun'], steps: [{ wave: 1, build: 'fx_gun', tile: [1, 1] }] } as const;
const content = compileContent({
  ...FIXTURE,
  maps: {
    fx_map: {
      ...fxMap,
      flagVariants: { door_choice: ['convoy', 'warren'] },
      referenceProfileByFlag: [
        { when: { door_choice: 'warren' }, profile: WARREN, parBuild: PAR },
        { when: { door_choice: 'convoy' }, profile: fxMap.referenceProfile },
      ],
    },
  },
});
const map = content.maps.fx_map;
const [warrenCell, convoyCell] = map.builds.referenceProfileByFlag;

describe('referenceProfileByFlag', () => {
  it('compiles each cell, its par build against its own profile', () => {
    expect(warrenCell).toMatchObject({
      when: { door_choice: 'warren' },
      profile: { towers: ['fx_gun'] },
      parBuild: { loadout: ['fx_gun'], technicianAbility: 'fx_strike' },
    });
    // A cell without a par build plays the map's.
    expect(convoyCell?.parBuild).toBeNull();
  });

  it('picks the matching cell, else the map’s own profile and par', () => {
    expect(flagProfileCell(map, { door_choice: 'warren' })).toBe(warrenCell);
    // Flags a cell doesn't name don't stop it matching.
    expect(flagProfileCell(map, { door_choice: 'warren', quill_choice: 'purge' })).toBe(warrenCell);
    expect(referenceProfileFor(map, { door_choice: 'warren' }).towers).toEqual(['fx_gun']);
    expect(parBuildFor(map, { door_choice: 'warren' }).loadout).toEqual(['fx_gun']);
    expect(flagProfileCell(map, { door_choice: 'convoy' })).toBe(convoyCell);
    expect(parBuildFor(map, { door_choice: 'convoy' })).toBe(map.builds.parBuild);
    for (const flags of [{}, { quill_choice: 'purge' as const }]) {
      expect(flagProfileCell(map, flags)).toBeNull();
      expect(referenceProfileFor(map, flags)).toBe(map.builds.referenceProfile);
      expect(parBuildFor(map, flags)).toBe(map.builds.parBuild);
    }
  });

  it('feeds the run profile (no flags: today’s behaviour)', () => {
    expect(referenceRunProfile(map, content)).toMatchObject({ kind: 'reference', specs: [] });
    const warren = referenceRunProfile(map, content, 'standard', undefined, {
      door_choice: 'warren',
    });
    expect(warren).toMatchObject({ kind: 'reference', difficulty: 'standard', specs: [] });
  });
});
