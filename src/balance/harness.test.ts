// The harness end to end on the fixture map: planning, running each run once, judging, and
// the run-level checks.
import { describe, expect, it } from 'vitest';
import type { CompiledContent, CompiledTier } from '../content/compiled.ts';
import { FIXTURE_CONTENT, type FixtureIds } from '../sim/__fixtures__/sim.ts';
import {
  FLAG_VARIANT_CONTENT,
  QUIET_WAVE_CONTENT,
  THANK_YOU_CREDITS,
} from './__fixtures__/fireControl.ts';
import {
  FIXTURE_CATALOG,
  NO_SPLASH_CONTENT,
  PICK_CONTENT,
  PLAIN_CONTENT,
} from './__fixtures__/harness.ts';
import { evaluateFlagRule, flagRule } from '../story/flags.ts';
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
        'parNoAbilities#2',
        'par@story#1',
      ]),
    );
    expect(keys).toHaveLength(11);
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

  it('#16b: a map with fleeing groups runs spareFleeing against par on seeds 1–3', () => {
    const r = runMap(FIXTURE_CONTENT, 'fx_map', { seeds: 3 });
    const free = r.checks.filter((c) => c.id === '16');
    expect(free.map((c) => c.subject)).toEqual(['spareFleeing']);
    expect(free[0]!.ok).toBe(true);
    const spare = r.runs.find((x) => x.build === 'spareFleeing' && x.seed === 1)!.result!;
    // Every tower spares the four runners: all of them leak (for 0), none is killed.
    expect(spare.stats.tagLeaked.fleeing).toBe(4);
    expect(spare.stats.tagKilled.fleeing).toBe(0);
    expect(r.checks.find((c) => c.id === '12')?.ok).toBe(true);
    expect(r.checks.find((c) => c.id === 'steps')?.failures.join()).not.toMatch(/spareFleeing/);
  });

  it('#16a: a map with a Quiet Wave runs par holding fire through it, on seeds 1–3', () => {
    const r = runMap(QUIET_WAVE_CONTENT, 'fx_map', { seeds: 3 });
    const free = r.checks.filter((c) => c.id === '16');
    expect(free.map((c) => [c.subject, c.ok])).toEqual([
      ['holdFireWhile:quiet_wave', true],
      ['spareFleeing', true],
    ]);
    expect(free[0]!.summary).toMatch(/quiet wave leaked 5\/5/);
    for (const seed of [1, 2, 3]) {
      const held = r.runs.find((x) => x.build === 'holdFireWhile:quiet_wave' && x.seed === seed)!;
      const par = r.runs.find((x) => x.build === 'par' && x.seed === seed)!;
      // Old Thrum leaks 1 (5 points); the four younglings leak for 0.
      expect(held.marginPct).toBe(par.marginPct - 5);
      expect(held.result!.stats.holdFireUses).toBe(1);
      expect(held.result!.stats.tagKilled.quiet_wave).toBe(0);
      // Par itself fires on the Quiet Wave.
      expect(par.result!.stats.tagKilled.quiet_wave).toBe(5);
    }
    expect(r.checks.find((c) => c.id === '12')?.ok).toBe(true);
  });

  it('#16a: the held run sets spared_quiet_wave by its rule; par, which fires, does not', () => {
    const r = runMap(QUIET_WAVE_CONTENT, 'fx_map', { seeds: 1, build: 'holdFireWhile:quiet_wave' });
    const held = r.runs.find((x) => x.build === 'holdFireWhile:quiet_wave')!.result!;
    const rule = flagRule('spared_quiet_wave')!;
    expect(evaluateFlagRule(rule.value, held.stats)).toBe(true);
    const par = runMap(QUIET_WAVE_CONTENT, 'fx_map', { seeds: 1, build: 'par' });
    const parRun = par.runs.find((x) => x.build === 'par')!.result!;
    expect(evaluateFlagRule(rule.value, parRun.stats)).toBe(false);
  });

  it('#14: a map whose script reads a flag runs par under each value, on seeds 1–3', () => {
    const r = runMap(FLAG_VARIANT_CONTENT, 'fx_map', { seeds: 3 });
    const variants = r.checks.filter((c) => c.id === '14');
    expect(variants.map((c) => [c.subject, c.ok])).toEqual([
      ['flag:spared_quiet_wave=true', true],
      ['flag:spared_quiet_wave=false', true],
    ]);
    expect(r.checks.some((c) => c.summary === 'refused')).toBe(false);
    for (const seed of [1, 2, 3]) {
      const run = (b: string) => r.runs.find((x) => x.build === b && x.seed === seed)!.result!;
      // The flag reaches the script: only `true` gets the W3 grant.
      const t = run('flag:spared_quiet_wave=true').stats.creditsEarned;
      const f = run('flag:spared_quiet_wave=false').stats.creditsEarned;
      expect(t - f).toBe(THANK_YOU_CREDITS);
      expect(run('par').stats.creditsEarned).toBe(f);
    }
    expect(
      buildFor(
        'flag:spared_quiet_wave=maybe',
        FLAG_VARIANT_CONTENT.maps.fx_map,
        FLAG_VARIANT_CONTENT,
      ),
    ).toBeNull();
    expect(r.checks.find((c) => c.id === '12')?.ok).toBe(true);
  });

  it('reports a run whose config is refused as a failed run, not a crash', () => {
    // A beam attack on the par loadout's gun, which the sim refuses until M4.
    const gun = PLAIN_CONTENT.towers.fx_gun;
    const [t1, ...rest] = gun.tiers;
    const beam = { ...t1!, attack: { ...t1!.attack, kind: 'beam' } } as CompiledTier;
    const refused: CompiledContent<FixtureIds> = {
      ...PLAIN_CONTENT,
      towers: { ...PLAIN_CONTENT.towers, fx_gun: { ...gun, tiers: [beam, ...rest] } },
    };
    const r = runMap(refused, 'fx_map', { seeds: 1, build: 'par' });
    expect(r.ok).toBe(false);
    expect(r.checks.find((c) => c.id === '1')?.failures[0]).toMatch(
      /seed 1: error: [^]*a 'beam' attack \(fx_gun\) is not simulated until M4/,
    );
  });

  it('names builds by label', () => {
    const map = PLAIN_CONTENT.maps.fx_map;
    expect(buildFor('par', map, PLAIN_CONTENT)).toBe(map.builds.parBuild);
    expect(buildFor('alt:gun_only', map, PLAIN_CONTENT)).toBe(map.builds.altBuilds.gun_only);
    expect(buildFor('alwaysCallEarly', map, PLAIN_CONTENT)?.callEarly).toBe(true);
    const quiet = buildFor('parNoAbilities', map, PLAIN_CONTENT)!;
    expect(quiet.steps.map((s) => s.kind)).toEqual(['build', 'upgrade', 'build', 'targeting']);
    expect(quiet.technicianAbility).toBe(map.builds.parBuild.technicianAbility);
    expect(buildFor('alt:nope', map, PLAIN_CONTENT)).toBeNull();
    expect(buildFor('spareFleeing', map, PLAIN_CONTENT)?.steps[0]?.kind).toBe('spareRunners');
    expect(buildFor('holdFireWhile:quiet_wave', map, PLAIN_CONTENT)?.steps[0]).toEqual({
      wave: 1,
      kind: 'holdFireWhile',
      tag: 'quiet_wave',
    });
    expect(buildFor('holdFireWhile:fleeing', map, PLAIN_CONTENT)).toBeNull();
  });

  it('a campaign run adds the monotonic check; --map skips it and says so', () => {
    const all = runCampaign(PLAIN_CONTENT, { seeds: 1 });
    expect(all.maps[0]!.checks.find((c) => c.id === '3')?.summary).toBe('first map in its chain');
    const one = runCampaign(PLAIN_CONTENT, { seeds: 1, mapId: 'fx_map' });
    expect(one.maps[0]!.checks.find((c) => c.id === '3')).toBeUndefined();
    expect(one.maps[0]!.notChecked.join()).toMatch(/monotonic/);
    expect(() => runCampaign(PLAIN_CONTENT, { mapId: 'a1_m01' })).toThrow(/unknown campaign map/);
  });

  it('#15: on a pick-list map, runs par with each companion (seeds 1–3); the first is the default', () => {
    const r = runMap(PICK_CONTENT, 'fx_map', { seeds: 3 });
    const pick = r.checks.filter((c) => c.id === '15');
    expect(pick.map((c) => c.subject)).toEqual(['companion:bricks', 'companion:quill']);
    for (const c of pick) expect(c.summary).not.toMatch(/refused/);
    const hash = (build: string, seed: number): string | undefined =>
      r.runs.find((x) => x.build === build && x.seed === seed && !x.repeat)?.result?.hash;
    for (const seed of [1, 2, 3]) {
      expect(hash('companion:bricks', seed)).toBeDefined();
      expect(hash('companion:bricks', seed)).toBe(hash('par', seed));
      expect(hash('companion:quill', seed)).not.toBe(hash('par', seed));
    }
    // The runs cast slot 2 cleanly with either companion.
    expect(r.checks.find((c) => c.id === 'steps')?.failures.join()).not.toMatch(/companion:/);
    expect(r.checks.find((c) => c.id === '12')?.ok).toBe(true);
    const map = PICK_CONTENT.maps.fx_map;
    expect(buildFor('companion:quill', map, PICK_CONTENT)?.companion).toBe('quill');
    expect(buildFor('companion:zibzab', map, PICK_CONTENT)).toBeNull();
    expect(buildFor('companion:bricks', PLAIN_CONTENT.maps.fx_map, PLAIN_CONTENT)).toBeNull();
  });

  it('#9: par on Story (seed 1) wins with a margin at least its Standard median', () => {
    const r = runMap(PLAIN_CONTENT, 'fx_map', { seeds: 3, build: 'par' });
    const story = r.checks.find((c) => c.id === '9')!;
    expect(story.subject).toBe('par');
    expect(story.ok).toBe(true);
    expect(story.summary).toMatch(/won \(100%\) vs Standard median \d+/);
    const run = r.runs.find((x) => x.build === 'par@story')!;
    expect(run.result!.maxIntegrity).toBe(30);
    expect(buildFor('par@story', PLAIN_CONTENT.maps.fx_map, PLAIN_CONTENT)).toBe(
      PLAIN_CONTENT.maps.fx_map.builds.parBuild,
    );
  });

  it('#5 and #6: a no-counter build loses on the reference profile and with the full catalog', () => {
    const r = runMap(NO_SPLASH_CONTENT, 'fx_map', { seeds: 3, catalog: FIXTURE_CATALOG });
    const five = r.checks.find((c) => c.id === '5')!;
    const six = r.checks.find((c) => c.id === '6')!;
    expect([five.subject, five.ok]).toEqual(['noCounter:splash', true]);
    expect([six.subject, six.ok]).toEqual(['noCounter:splash', true]);
    expect(six.summary).toMatch(/lost at W\d/);
    expect(six.summary).not.toMatch(/left out/);
    // The full-catalog runs really carry the catalog: more integrity, more credits, the Bulkhead.
    const full = r.runs.find((x) => x.build === 'noCounter:splash@fullCatalog' && x.seed === 1)!;
    const ref = r.runs.find((x) => x.build === 'noCounter:splash' && x.seed === 1)!;
    expect(full.result!.maxIntegrity).toBe(ref.result!.maxIntegrity + 3);
    expect(full.result!.stats.integrityLost).toBeGreaterThan(ref.result!.stats.integrityLost);
    // --build splash keeps both no-counter checks and their runs.
    const only = runMap(NO_SPLASH_CONTENT, 'fx_map', {
      seeds: 1,
      build: 'splash',
      catalog: FIXTURE_CATALOG,
    });
    expect(only.runs.map((x) => x.build).toSorted()).toEqual([
      'noCounter:splash',
      'noCounter:splash@fullCatalog',
    ]);
  });

  it('#6 fails when the catalog does replace the counter, and when the catalog is refused', () => {
    // On the live catalog the fixture content has no Rivet: the full-catalog profile is refused.
    const live = runMap(NO_SPLASH_CONTENT, 'fx_map', { seeds: 1, build: 'splash' });
    const six = live.checks.find((c) => c.id === '6')!;
    expect(six.ok).toBe(false);
    expect(six.failures[0]).toMatch(/fullCatalog profile: .*names a tower or ability/);
  });
});
