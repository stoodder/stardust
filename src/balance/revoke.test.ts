// The revocation's story variants (balance/revokeChecks.ts; T606) on the sim fixture with a cue
// 1 s into W2 that revokes an Everglow class (fx_gun and fx_mortar both are): par runs once per
// class of its loadout the cue could take, the cue forced onto it, and must win at the forgiving
// floor with its cue having taken that class; a map that revokes nothing has no such runs.
import { describe, expect, it } from 'vitest';
import type { CompiledContent } from '../content/compiled.ts';
import { secToTicks } from '../shared/time.ts';
import type { FixtureIds } from '../sim/__fixtures__/sim.ts';
import { PLAIN_CONTENT } from './__fixtures__/harness.ts';
import { buildFor, runMap } from './harness.ts';
import {
  revocableClasses,
  revokeClassOf,
  revokeFactions,
  revokeVariantChecks,
  revokeVariantLabel,
} from './revokeChecks.ts';

const PLAIN = PLAIN_CONTENT.maps.fx_map;
/** fx_map with the Clean Exit's shape 1 s into W2. */
const CONTENT: CompiledContent<FixtureIds> = {
  ...PLAIN_CONTENT,
  maps: {
    fx_map: {
      ...PLAIN,
      events: [
        ...PLAIN.events,
        {
          id: 'revoke',
          on: { wave: 2, phase: { afterTicks: secToTicks(1) } },
          when: null,
          once: true,
          actions: [
            { revokeTowerClass: { select: 'mostInvested', faction: 'everglow' }, refundPct: 100 },
          ],
        },
      ],
    },
  },
};
const MAP = CONTENT.maps.fx_map;

describe('revocation variants (#14; T606)', () => {
  it("are one par run per class of the cue's faction in par's loadout", () => {
    expect(revokeFactions(MAP)).toEqual(['everglow']);
    expect(revocableClasses(MAP, MAP.builds.parBuild, CONTENT)).toEqual(['fx_gun', 'fx_mortar']);
    expect(revokeVariantChecks(MAP, CONTENT, [1, 2, 3]).map((c) => c.subject)).toEqual([
      'revoke:fx_gun',
      'revoke:fx_mortar',
    ]);
    // No revocation on the map: no variants.
    expect(revokeFactions(PLAIN)).toEqual([]);
    expect(revokeVariantChecks(PLAIN, PLAIN_CONTENT, [1])).toEqual([]);
  });

  it('name their class, and run par (a class the cue could not take is no build)', () => {
    expect(revokeVariantLabel('fx_gun')).toBe('revoke:fx_gun');
    expect(revokeClassOf('revoke:fx_gun')).toBe('fx_gun');
    expect(revokeClassOf('revoke:fx_gun@story')).toBe('fx_gun');
    expect(revokeClassOf('par')).toBe(null);
    expect(buildFor('revoke:fx_mortar', MAP, CONTENT)).toBe(MAP.builds.parBuild);
    expect(buildFor('revoke:fx_sprinkler', MAP, CONTENT)).toBe(null);
  });

  it('force the cue onto their class, and judge it against the forgiving floor', () => {
    const report = runMap(CONTENT, 'fx_map', { seeds: 1, build: 'revoke:fx_mortar' });
    const run = report.runs.find((r) => r.build === 'revoke:fx_mortar')!;
    expect(run.result?.revoked.towers).toEqual(['fx_mortar']);
    expect(report.checks.find((c) => c.id === '14')?.subject).toBe('revoke:fx_mortar');
    // The judge: a win at the floor passes, one under it fails, and so does a cue that took
    // another class or a loss.
    const [, mortar] = revokeVariantChecks(MAP, CONTENT, [1]);
    const judge = (rec: typeof run): readonly string[] => mortar!.evaluate(() => rec).failures;
    const won = { ...run.result!, outcome: 'won' as const };
    expect(judge({ ...run, result: won, marginPct: 20 })).toEqual([]);
    expect(judge({ ...run, result: won, marginPct: 15 })).toEqual([
      'seed 1: margin 15 is under the floor 20',
    ]);
    const other = { ...won, revoked: { towers: ['fx_gun'], abilities: [] } };
    expect(judge({ ...run, result: other, marginPct: 50 })).toEqual([
      'seed 1: the cue took fx_gun, not fx_mortar',
    ]);
    const lost = { ...won, outcome: 'lost' as const, lostAtWave: 2 };
    expect(judge({ ...run, result: lost })).toEqual(['seed 1: lost at W2']);
  });
});
