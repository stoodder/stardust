// The harness end to end on the fixture map: planning, running each run once, judging, and
// the run-level checks.
import { describe, expect, it } from 'vitest';
import type { CompiledAttack, CompiledContent, CompiledTier } from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
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
  fakeResult,
  fakeRun,
} from './__fixtures__/harness.ts';
import { evaluateFlagRule, flagRule } from '../story/flags.ts';
import {
  buildFor,
  monotonicCheck,
  mustIssueEveryStep,
  runCampaign,
  runMap,
  type MapReport,
} from './harness.ts';

const LIVE = compileContent(RAW_CONTENT);

/** A map report whose one par run (seed 1) ends at `integrity` of 20. */
const reportAt = (mapId: string, integrity: number): MapReport => ({
  mapId,
  act: 1,
  objective: 'defend',
  band: { lo: 80, hi: 100 },
  ok: true,
  checks: [],
  runs: [fakeRun({ build: 'par', seed: 1 }, fakeResult('won', integrity))],
  notChecked: [],
  ms: 0,
});

/** #3 on the second of two maps whose pars end at `first` and `then` of 20. */
const judge3 = (c: CompiledContent, first: number, then: number) => {
  const reports = [reportAt(c.campaign[0]!, first), reportAt('a1_m01', then)];
  monotonicCheck(c, reports);
  return reports[1]!.checks.find((k) => k.id === '3')!;
};

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

  it('#13 times runs on the CPU clock when given one, and the map on the wall clock', () => {
    let wall = 0;
    let cpu = 0;
    const r = runMap(PLAIN_CONTENT, 'fx_map', {
      seeds: 1,
      build: 'none',
      now: () => (wall += 1000),
      cpuNow: () => (cpu += 3000),
    });
    expect(r.runs[0]!.ms).toBe(3000);
    expect(r.ms).toBe(1000);
    const c13 = r.checks.find((c) => c.id === '13')!;
    expect(c13.ok).toBe(false);
    expect(c13.title).toMatch(/CPU/);
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
    // A beam attack on the par loadout's gun, which the sim refuses until T504.
    const gun = PLAIN_CONTENT.towers.fx_gun;
    const [t1, ...rest] = gun.tiers;
    if (t1 === undefined || t1.attack === null) throw new Error('fx_gun has no tier-1 attack');
    const attack: CompiledAttack = {
      ...t1.attack,
      // Spawners wait for M6 (beams run since T504).
      kind: 'spawner',
      ally: 'swarmling',
      maxAlive: 1,
    };
    const spawner: CompiledTier = { ...t1, attack };
    const refused: CompiledContent<FixtureIds> = {
      ...PLAIN_CONTENT,
      towers: { ...PLAIN_CONTENT.towers, fx_gun: { ...gun, tiers: [spawner, ...rest] } },
    };
    const r = runMap(refused, 'fx_map', { seeds: 1, build: 'par' });
    expect(r.ok).toBe(false);
    expect(r.checks.find((c) => c.id === '1')?.failures[0]).toMatch(
      /seed 1: error: [^]*a 'spawner' attack \(fx_gun\) is not simulated until M6/,
    );
  });

  it('requires every step only of par and the sensible alts on their own profiles (T333, T334)', () => {
    const fx = PLAIN_CONTENT.maps.fx_map;
    const under = {
      ...fx,
      builds: { ...fx.builds, altExpectations: { gun_only: { outcome: 'either' } } },
    } as const;
    expect(mustIssueEveryStep(fx, 'par')).toBe(true);
    expect(mustIssueEveryStep(fx, 'alt:gun_only')).toBe(true);
    expect(mustIssueEveryStep(under, 'alt:gun_only')).toBe(false);
    // Par on Story may end the map before its last buys (A1M4's W9 buys behind its strike).
    expect(mustIssueEveryStep(fx, 'par@story')).toBe(false);
    for (const label of ['par@rnd:x', 'none', 'spareFleeing', 'noCounter:air', 'guard:spam']) {
      expect(mustIssueEveryStep(fx, label)).toBe(label === 'par@rnd:x');
    }
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
    // holdFireWhile:<tag> names a tag the map's waves send (T412: any tag, not just the Quiet Wave).
    const quietMap = QUIET_WAVE_CONTENT.maps.fx_map;
    for (const tag of ['quiet_wave', 'fleeing'] as const) {
      expect(buildFor(`holdFireWhile:${tag}`, quietMap, QUIET_WAVE_CONTENT)?.steps[0]).toEqual({
        wave: 1,
        kind: 'holdFireWhile',
        tag,
      });
    }
    expect(buildFor('holdFireWhile:quiet_wave', map, PLAIN_CONTENT)).toBeNull();
    expect(buildFor('holdFireWhile:medal_exempt', quietMap, QUIET_WAVE_CONTENT)).toBeNull();
  });

  it('#3 re-baselines the first map after a boss against its own band (T412)', () => {
    // The live A1M5 (the Matriarch) or A1M4 (no boss), then A1M1 standing in as the next map.
    const a1m1 = LIVE.maps.a1_m01;
    const after = (first: 'a1_m04' | 'a1_m05', rebaseline: boolean): CompiledContent => ({
      ...LIVE,
      maps: { ...LIVE.maps, a1_m01: { ...a1m1, builds: { ...a1m1.builds, rebaseline } } },
      campaign: [first, 'a1_m01'],
    });
    // Without the flag, 100 after 80 (+20) breaks the chain; after a boss it re-baselines in band.
    expect(judge3(after('a1_m05', false), 16, 20).ok).toBe(false);
    const re = judge3(after('a1_m05', true), 16, 20);
    expect(re.ok).toBe(true);
    expect(re.summary).toBe(
      "re-baseline after a1_m05's boss: median 100 in its own band 80–100, previous 80",
    );
    // Its own band still binds it, and the flag needs a boss on the map before.
    expect(judge3(after('a1_m05', true), 20, 15).failures).toEqual([
      'median par margin 75 is outside 80–100',
    ]);
    expect(judge3(after('a1_m04', true), 16, 20).failures[0]).toMatch(
      /first map after a boss, and a1_m04 before it sends none/,
    );
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
