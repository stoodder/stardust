// The R&D pick runs and the `rnd` check (D060, T228): which picks a map allows, par with each one
// bought, and the "the pick changes a result" expectation a map can declare (`rndPickChanges`).
import { describe, expect, it } from 'vitest';
import type { CompiledMapDef } from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { UpgradeId } from '../content/types.ts';
import { defineUpgrade } from '../content/upgrades/define.ts';
import { UPGRADES } from '../content/upgrades/index.ts';
import type { MetaCatalog } from '../meta/index.ts';
import type { FixtureIds } from '../sim/__fixtures__/sim.ts';
import type { RunRecord, RunRequest } from './checks.ts';
import { FIXTURE_CATALOG, PLAIN_CONTENT, fakeResult, fakeRun } from './__fixtures__/harness.ts';
import { runMap } from './harness.ts';
import { rndPickProfile, rndPicks } from './profile.ts';
import { rndPickChecks, rndPickLabel } from './rndChecks.ts';

/** A Mk II-like pick for every ability ('*'), stocked from the start. */
const fx_wide = defineUpgrade({
  id: 'fx_wide',
  name: 'Fixture Wide Strike',
  copy: null,
  kind: 'rnd',
  currency: 'intel',
  availableAfter: null,
  ranks: [{ price: 2, grants: [{ kind: 'abilityStat', ability: '*', stat: 'radius', flat: 1.5 }] }],
});
const RND_CATALOG: MetaCatalog = {
  ...FIXTURE_CATALOG,
  upgrades: {
    ...FIXTURE_CATALOG.upgrades,
    fx_wide,
    // Tunes Orbital Strike, which the fixture's par never casts; and a slot purchase (no grants).
    orbital_strike_mk2: UPGRADES.orbital_strike_mk2,
  },
};
const map = PLAIN_CONTENT.maps.fx_map;
type Map = CompiledMapDef<FixtureIds>;
const withBuilds = (m: Map, over: Partial<Map['builds']>): Map => ({
  ...m,
  builds: { ...m.builds, ...over },
});

describe('rndPicks: the R&D picks a map allows', () => {
  it('a stocked R&D item that tunes an ability par casts, not already owned', () => {
    expect(rndPicks(map, PLAIN_CONTENT, RND_CATALOG)).toEqual(['fx_wide']);
    // A par that never casts has no pick.
    const quiet = withBuilds(map, {
      parBuild: {
        ...map.builds.parBuild,
        steps: map.builds.parBuild.steps.filter((s) => s.kind !== 'ability'),
      },
    });
    expect(rndPicks(quiet, PLAIN_CONTENT, RND_CATALOG)).toEqual([]);
  });

  it('on the live campaign: none on A1M1 (stocked after it), Mk II and Rapport from A1M2', () => {
    const live = compileContent(RAW_CONTENT);
    expect(rndPicks(live.maps.a1_m01, live)).toEqual([]);
    const a1m2 = live.maps.a1_m02;
    expect(rndPicks(a1m2, live)).toEqual(['orbital_strike_mk2', 'rapport_bricks']);
    // One the reference profile already owns isn't a pick.
    const owned = {
      ...a1m2,
      builds: {
        ...a1m2.builds,
        referenceProfile: { ...a1m2.builds.referenceProfile, shop: { orbital_strike_mk2: 1 } },
      },
    };
    expect(rndPicks(owned, live)).toEqual(['rapport_bricks']);
  });

  it("the pick's profile is the reference profile plus the pick's grants", () => {
    const p = rndPickProfile(map, PLAIN_CONTENT, 'fx_wide', RND_CATALOG);
    expect(p.modifiers.map((m) => m.source)).toEqual(['rnd:fx_wide']);
  });
});

/**
 * Judges `rndPickChanges: [pick]` on the fixture map, which allows only Rapport here, with fake
 * runs: par's and the pick's per seed (a perfect win unless `results` says otherwise).
 */
function judge(pick: UpgradeId, results: Record<string, ReturnType<typeof fakeResult>>) {
  const m = withBuilds(map, { rndPickChanges: [pick] });
  const spec = rndPickChecks(m, ['rapport_bricks'], [1, 2]).find((c) =>
    c.title.includes('changes'),
  )!;
  const get = (req: RunRequest): RunRecord =>
    fakeRun(req, results[`${req.build}#${req.seed}`] ?? fakeResult('won', 20));
  return spec.evaluate(get);
}

describe('the rnd check', () => {
  it('runs par with each allowed pick, which must win', () => {
    const r = runMap(PLAIN_CONTENT, 'fx_map', { seeds: 2, catalog: RND_CATALOG });
    const wins = r.checks.filter((c) => c.id === 'rnd');
    expect(wins.map((c) => [c.subject, c.ok])).toEqual([['rnd:fx_wide', true]]);
    expect(wins[0]!.summary).toMatch(/^margins .* vs par /);
    expect(r.runs.map((x) => `${x.build}#${x.seed}`)).toEqual(
      expect.arrayContaining(['par@rnd:fx_wide#1', 'par@rnd:fx_wide#2']),
    );
    // --build selects it by the pick's name.
    const only = runMap(PLAIN_CONTENT, 'fx_map', {
      seeds: 1,
      catalog: RND_CATALOG,
      build: 'fx_wide',
    });
    expect(only.checks.filter((c) => c.subject !== '*').map((c) => c.subject)).toEqual([
      'rnd:fx_wide',
    ]);
  });

  it('passes when the pick changes the margin or a medal on some seed', () => {
    const label = rndPickLabel('rapport_bricks');
    const margin = judge('rapport_bricks', { 'par#2': fakeResult('won', 18) });
    expect([margin.ok, margin.summary]).toEqual([true, expect.stringMatching(/changed on seed 2/)]);
    // Same margin (19 of 20 in both), but only the pick's run keeps Perfect Core: fakeResult
    // earns it at 20; a forfeited medal with the same integrity is the case to catch.
    const medal = judge('rapport_bricks', {
      'par#1': {
        ...fakeResult('won', 20),
        medals: { ...fakeResult('won', 20).medals, perfectCore: 'forfeited' },
      },
      [`${label}#1`]: fakeResult('won', 20),
    });
    expect(medal.ok).toBe(true);
  });

  it('fails when every seed plays out the same, and when the pick is not one the map allows', () => {
    const same = judge('rapport_bricks', {});
    expect(same.ok).toBe(false);
    expect(same.failures[0]).toMatch(/^no par result changes with rapport_bricks/);
    const unknown = judge('orbital_strike_mk2', {});
    expect(unknown.ok).toBe(false);
    expect(unknown.failures[0]).toMatch(
      /isn't an R&D pick this map allows \(allowed: rapport_bricks\)/,
    );
  });
});
