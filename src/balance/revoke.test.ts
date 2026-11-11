// The revocation's story variants (balance/revokeChecks.ts; T606) on the dev revoke range
// (render/__fixtures__/devM6.ts `dev_revoke`: the Clean Exit in W2 takes an Everglow class): par
// runs once per Everglow class in its loadout, the cue forced onto it, and must win at the
// forgiving floor; a map that revokes nothing has no such runs.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { DEV_CONTENT } from '../render/__fixtures__/devBattle.ts';
import { buildFor, runMap } from './harness.ts';
import {
  revocableClasses,
  revokeClassOf,
  revokeFactions,
  revokeVariantChecks,
  revokeVariantLabel,
} from './revokeChecks.ts';

const content = compileContent(DEV_CONTENT);
const maps: Readonly<Record<string, (typeof content.maps)[keyof typeof content.maps]>> =
  content.maps;
const MAP = maps.dev_revoke!;

describe('revocation variants (#14; T606)', () => {
  it("are one par run per class of the cue's faction in par's loadout", () => {
    expect(revokeFactions(MAP)).toEqual(['everglow']);
    expect(MAP.builds.parBuild.loadout).toEqual(['rivet', 'sprinkler', 'zapcoil']);
    expect(revocableClasses(MAP, MAP.builds.parBuild, content)).toEqual(['rivet', 'sprinkler']);
    expect(revokeVariantChecks(MAP, content, [1, 2, 3]).map((c) => c.subject)).toEqual([
      'revoke:rivet',
      'revoke:sprinkler',
    ]);
    // No revocation on the map: no variants.
    expect(revokeFactions(maps.dev_range!)).toEqual([]);
    expect(revokeVariantChecks(maps.dev_range!, content, [1])).toEqual([]);
  });

  it('name their class, and run par (a class the cue could not take is no build)', () => {
    expect(revokeVariantLabel('rivet')).toBe('revoke:rivet');
    expect(revokeClassOf('revoke:rivet')).toBe('rivet');
    expect(revokeClassOf('revoke:rivet@story')).toBe('rivet');
    expect(revokeClassOf('par')).toBe(null);
    expect(buildFor('revoke:sprinkler', MAP, content)).toBe(MAP.builds.parBuild);
    expect(buildFor('revoke:zapcoil', MAP, content)).toBe(null);
  });

  it('force the cue onto their class, and hold it to the forgiving floor', () => {
    const report = runMap(content, 'dev_revoke', { seeds: 1, build: 'revoke:sprinkler' });
    const check = report.checks.find((c) => c.id === '14')!;
    expect(check).toMatchObject({ subject: 'revoke:sprinkler', ok: true });
    const run = report.runs.find((r) => r.build === 'revoke:sprinkler')!;
    expect(run.result?.revoked).toEqual({ towers: ['sprinkler'], abilities: ['dev_strike'] });
    // Losing both Rivets mid-W2 leaves the dev range's par (no rebuild) under the floor.
    const rivet = runMap(content, 'dev_revoke', { seeds: 1, build: 'revoke:rivet' });
    expect(rivet.checks.find((c) => c.id === '14')).toMatchObject({
      ok: false,
      failures: ['seed 1: margin 15 is under the floor 20'],
    });
  });
});
