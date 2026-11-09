// The harness end to end on the fixture map: planning, running each run once, judging, and
// the run-level checks.
import { describe, expect, it } from 'vitest';
import type { CompiledContent } from '../content/compiled.ts';
import { FIXTURE_CONTENT, type FixtureIds } from '../sim/__fixtures__/sim.ts';
import { PLAIN_CONTENT } from './__fixtures__/harness.ts';
import { buildFor, runCampaign, runMap } from './harness.ts';

describe('balance harness', () => {
  const report = runMap(PLAIN_CONTENT, 'fx_map', { seeds: 2 });

  it('runs each needed run once, plus the determinism repeat', () => {
    const keys = report.runs.map((r) => `${r.build}#${r.seed}${r.repeat ? '+' : ''}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual(
      expect.arrayContaining([
        'par#1',
        'par#2',
        'par#1+',
        'none#1',
        'alwaysCallEarly#2',
        'alt:gun_only#2',
      ]),
    );
    expect(keys).toHaveLength(8);
  });

  it('judges the fixture: its par build leaves steps unissued, which fails the steps check', () => {
    const byId = new Map(report.checks.map((c) => [`${c.id}:${c.subject}`, c]));
    expect(byId.get('1:par')?.ok).toBe(true);
    expect(byId.get('11:par')?.ok).toBe(true);
    expect(byId.get('12:*')?.ok).toBe(true);
    expect(byId.get('13:*')?.ok).toBe(true);
    // 200 credits never stretch to the W2 mortar (120) after the gun and its upgrade.
    const steps = byId.get('steps:*')!;
    expect(steps.ok).toBe(false);
    expect(steps.failures[0]).toMatch(/^par seed 1: step 2 \(build, W2\) never issued/);
    expect(report.ok).toBe(false);
  });

  it('margins are integrity left over max integrity', () => {
    for (const r of report.runs) {
      expect(r.marginPct).toBe((100 * r.result!.integrity) / r.result!.maxIntegrity);
    }
  });

  it('--build keeps only the checks about that build (and the map-level ones)', () => {
    const only = runMap(PLAIN_CONTENT, 'fx_map', { seeds: 1, build: 'gun_only' });
    expect(new Set(only.checks.map((c) => c.subject))).toEqual(new Set(['alt:gun_only', '*']));
    expect(only.runs.map((r) => r.build)).toEqual(['alt:gun_only']);
    expect(() => runMap(PLAIN_CONTENT, 'fx_map', { build: 'nope' })).toThrow(/no build 'nope'/);
  });

  it('times runs with the clock it is given', () => {
    let t = 0;
    const timed = runMap(PLAIN_CONTENT, 'fx_map', { seeds: 1, build: 'none', now: () => (t += 5) });
    expect(timed.runs[0]!.ms).toBe(5);
  });

  it('refuses a map with features it cannot check, without hiding the rest', () => {
    const r = runMap(FIXTURE_CONTENT, 'fx_map', { seeds: 1 });
    expect(r.checks.find((c) => c.id === '16')?.ok).toBe(false);
    expect(r.checks.find((c) => c.id === '1')?.ok).toBe(true);
  });

  it('reports a run whose config is refused as a failed run, not a crash', () => {
    const ref = PLAIN_CONTENT.maps.fx_map.builds.referenceProfile;
    const bought: CompiledContent<FixtureIds> = {
      ...PLAIN_CONTENT,
      maps: {
        fx_map: {
          ...PLAIN_CONTENT.maps.fx_map,
          builds: {
            ...PLAIN_CONTENT.maps.fx_map.builds,
            referenceProfile: { ...ref, specs: ['fx_gun' as const] },
          },
        },
      },
    };
    const r = runMap(bought, 'fx_map', { seeds: 1, build: 'par' });
    expect(r.ok).toBe(false);
    expect(r.checks.find((c) => c.id === '1')?.failures[0]).toMatch(/seed 1: error: .*T204/);
  });

  it('names builds by label', () => {
    const map = PLAIN_CONTENT.maps.fx_map;
    expect(buildFor('par', map, PLAIN_CONTENT)).toBe(map.builds.parBuild);
    expect(buildFor('alt:gun_only', map, PLAIN_CONTENT)).toBe(map.builds.altBuilds.gun_only);
    expect(buildFor('alwaysCallEarly', map, PLAIN_CONTENT)?.callEarly).toBe(true);
    expect(buildFor('alt:nope', map, PLAIN_CONTENT)).toBeNull();
  });

  it('a campaign run adds the monotonic check; --map skips it and says so', () => {
    const all = runCampaign(PLAIN_CONTENT, { seeds: 1 });
    expect(all.maps[0]!.checks.find((c) => c.id === '3')?.summary).toBe('first map in its chain');
    const one = runCampaign(PLAIN_CONTENT, { seeds: 1, mapId: 'fx_map' });
    expect(one.maps[0]!.checks.find((c) => c.id === '3')).toBeUndefined();
    expect(one.maps[0]!.notChecked.join()).toMatch(/monotonic/);
    expect(() => runCampaign(PLAIN_CONTENT, { mapId: 'a1_m01' })).toThrow(/unknown campaign map/);
  });
});
