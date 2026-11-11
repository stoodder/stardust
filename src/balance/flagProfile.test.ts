// Flag-variant reference profiles (T700a; BuildsDef.referenceProfileByFlag): a run whose story
// flags match a cell is owned by that cell's profile and plays its par build, first match wins;
// any other run, the map's own (balance/profile.ts). The harness keys its runs by them (T764).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { DEV_CONTENT } from '../render/__fixtures__/devBattle.ts';
import { bearersMap } from '../render/__fixtures__/devM7.ts';
import {
  flagProfileCell,
  parBuildFor,
  referenceProfileFor,
  referenceRunProfile,
} from './profile.ts';

const WARREN = { ...bearersMap.referenceProfile, towers: ['zapcoil'] as const, specs: [] };
const PAR = {
  loadout: ['zapcoil' as const],
  steps: [{ wave: 1, build: 'zapcoil' as const, tile: [7, 2] as const }],
};
const content = compileContent({
  ...DEV_CONTENT,
  maps: {
    ...DEV_CONTENT.maps,
    dev_bearers: {
      ...bearersMap,
      referenceProfileByFlag: [
        { when: { door_choice: 'warren' }, profile: WARREN, parBuild: PAR },
        // A later cell that also matches warren never wins: the first match does.
        { when: { door_choice: 'warren' as const }, profile: bearersMap.referenceProfile },
      ],
    },
  },
});
const map = content.maps['dev_bearers' as keyof typeof content.maps];

describe('referenceProfileByFlag', () => {
  it('compiles each cell, its par build against its own profile', () => {
    expect(map.builds.referenceProfileByFlag[0]).toMatchObject({
      when: { door_choice: 'warren' },
      profile: { towers: ['zapcoil'] },
      parBuild: { loadout: ['zapcoil'], technicianAbility: 'dev_strike' },
    });
    expect(map.builds.referenceProfileByFlag[1]?.parBuild).toBeNull();
  });

  it('picks the first matching cell, else the map’s own profile and par', () => {
    expect(flagProfileCell(map, { door_choice: 'warren' })).toBe(
      map.builds.referenceProfileByFlag[0],
    );
    expect(referenceProfileFor(map, { door_choice: 'warren' }).towers).toEqual(['zapcoil']);
    expect(parBuildFor(map, { door_choice: 'warren' }).loadout).toEqual(['zapcoil']);
    for (const flags of [{}, { door_choice: 'convoy' as const }]) {
      expect(flagProfileCell(map, flags)).toBeNull();
      expect(referenceProfileFor(map, flags)).toBe(map.builds.referenceProfile);
      expect(parBuildFor(map, flags)).toBe(map.builds.parBuild);
    }
  });

  it('feeds the run profile (no flags: today’s behaviour)', () => {
    const own = referenceRunProfile(map, content);
    expect(own.specs).toEqual(map.builds.referenceProfile.specs);
    const warren = referenceRunProfile(map, content, 'standard', undefined, {
      door_choice: 'warren',
    });
    expect(warren).toMatchObject({ kind: 'reference', specs: [] });
  });
});
