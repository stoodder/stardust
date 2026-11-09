// Each assertion's judgment, on synthetic runs of the fixture map (no sim needed).
import { describe, expect, it } from 'vitest';
import type { HeadlessResult } from '../sim/index.ts';
import { QUIET_WAVE_CONTENT } from './__fixtures__/fireControl.ts';
import { PLAIN_CONTENT, fakeResult, fakeRun } from './__fixtures__/harness.ts';
import {
  VACUOUS_NOTE,
  mapChecks,
  median,
  notGradual,
  runKey,
  splitMeta,
  type CheckSpec,
  type RunRequest,
} from './checks.ts';
import { HARNESS_GATES, refusedFeatures } from './refusals.ts';
import { FIXTURE_CONTENT } from '../sim/__fixtures__/sim.ts';

const map = PLAIN_CONTENT.maps.fx_map;

/** Judges `spec` with results looked up by run key (a missing one is a won run at 100%). */
function judge(spec: CheckSpec, results: Readonly<Record<string, HeadlessResult>>) {
  return spec.evaluate((req: RunRequest) =>
    fakeRun(req, results[runKey(req)] ?? fakeResult('won', 20)),
  );
}
const parAt = (integrity: number) => ({ 'par#1': fakeResult('won', integrity) });
/** fx_map's checks about alt:gun_only, with gun_only marked under-built. */
const withOutcome = (outcome: 'lose' | 'either'): CheckSpec[] =>
  mapChecks(
    { ...map, builds: { ...map.builds, altExpectations: { gun_only: { outcome } } } },
    [1],
    [1],
  ).filter((x) => x.subject === 'alt:gun_only');
/** A result whose waves cost `losses` integrity each (of 20); a loss is in the last listed wave. */
function lossy(outcome: 'won' | 'lost', losses: readonly number[]): HeadlessResult {
  const left = 20 - losses.reduce((a, b) => a + b, 0);
  const r = fakeResult(outcome, left, outcome === 'lost' ? losses.length : null);
  const waves = losses.map((integrityLost, i) => ({
    wave: i + 1,
    spawned: 0,
    killed: 0,
    leaked: integrityLost,
    integrityLost,
    startTick: 0,
    early: false,
    earlyBonus: 0,
    clearedTick: 0,
    bankAtPhase: 0,
    unspentAtStart: 0,
  }));
  return { ...r, waves };
}
/** spareFleeing and par runs on seeds 1–2 at these integrities (#16b). */
const spareRuns = (spare: number, par: number): Record<string, HeadlessResult> => ({
  'spareFleeing#1': fakeResult('won', spare),
  'spareFleeing#2': fakeResult('won', spare),
  'par#1': fakeResult('won', par),
  'par#2': fakeResult('won', par),
});
/** A won holdFireWhile:quiet_wave run where `leaked` of 5 quiet-wave units leaked (#16a). */
function heldRun(integrity: number, leaked: number): Record<string, HeadlessResult> {
  const r = fakeResult('won', integrity);
  r.stats.tagSpawned.quiet_wave = 5;
  r.stats.tagLeaked.quiet_wave = leaked;
  return { 'holdFireWhile:quiet_wave#1': r };
}
const find = (id: string, subject: string): CheckSpec =>
  mapChecks(map, [1, 2], [1]).find((c) => c.id === id && c.subject === subject)!;

describe('balance checks', () => {
  it('#1 par wins on every seed', () => {
    const c = find('1', 'par');
    expect(c.needs).toEqual([
      { build: 'par', seed: 1 },
      { build: 'par', seed: 2 },
    ]);
    expect(judge(c, {}).ok).toBe(true);
    expect(judge(c, { 'par#2': fakeResult('lost', 0, 2) }).failures).toEqual([
      'seed 2: lost at W2',
    ]);
  });

  it('#2 the par margin sits inside the act band, both ends', () => {
    const c = find('2', 'par');
    expect(judge(c, { 'par#1': fakeResult('won', 16), 'par#2': fakeResult('won', 20) }).ok).toBe(
      true,
    );
    const low = judge(c, { 'par#1': fakeResult('won', 15) });
    expect(low.failures).toEqual([
      'seed 1: margin 75 is below the band floor 80 (too hard for par)',
    ]);
    expect(low.summary).toContain('75 / 87.5 / 100');
  });

  it('#4 doing nothing must lose', () => {
    const c = find('4', 'none');
    expect(judge(c, { 'none#1': fakeResult('lost', 0, 1) }).ok).toBe(true);
    expect(judge(c, {}).failures).toEqual(['seed 1: won (100%)']);
  });

  it('#7 alwaysCallEarly must win, at most min(band top, par + 10)', () => {
    const c = find('7', 'alwaysCallEarly');
    expect(c.needs).toContainEqual({ build: 'par', seed: 1 });
    expect(judge(c, { ...parAt(17), 'alwaysCallEarly#1': fakeResult('won', 19) }).ok).toBe(true); // 95 ≤ 95
    expect(
      judge(c, { ...parAt(16), 'alwaysCallEarly#1': fakeResult('won', 19) }).failures[0],
    ).toMatch(/margin 95 is above .* = 90/);
    expect(judge(c, { 'alwaysCallEarly#1': fakeResult('lost', 0, 2) }).ok).toBe(false);
  });

  it('#7 flags its fairness bound as vacuous when the cap is 100 on every seed', () => {
    const c = find('7', 'alwaysCallEarly');
    expect(judge(c, { ...parAt(18), 'alwaysCallEarly#1': fakeResult('won', 20) }).summary).toBe(
      `1/1 won, margins 100 ${VACUOUS_NOTE}`,
    );
    expect(judge(c, { ...parAt(17), 'alwaysCallEarly#1': fakeResult('won', 19) }).summary).toBe(
      '1/1 won, margins 95',
    );
  });

  it('par without its ability casts must score below par', () => {
    const c = find('abilities', 'parNoAbilities');
    expect(c.needs).toEqual([
      { build: 'parNoAbilities', seed: 1 },
      { build: 'par', seed: 1 },
    ]);
    expect(judge(c, { ...parAt(19), 'parNoAbilities#1': fakeResult('won', 15) }).ok).toBe(true);
    expect(judge(c, { ...parAt(19), 'parNoAbilities#1': fakeResult('won', 19) }).failures).toEqual([
      "seed 1: margin 95 is not below par's 95: the casts change nothing",
    ]);
    // A par build that casts nothing has no such check.
    const quiet = {
      ...map,
      builds: {
        ...map.builds,
        parBuild: {
          ...map.builds.parBuild,
          steps: map.builds.parBuild.steps.filter((s) => s.kind !== 'ability'),
        },
      },
    };
    expect(mapChecks(quiet, [1], [1]).some((x) => x.id === 'abilities')).toBe(false);
  });

  it('#8 alt build expectations: a stricter floor, and below par', () => {
    const expecting = {
      ...map,
      builds: {
        ...map.builds,
        altExpectations: { gun_only: { belowPar: true as const, minMarginPct: 40 } },
      },
    };
    const checks = mapChecks(expecting, [1], [1]).filter(
      (x) => x.subject === 'alt:gun_only' && x.id === '8',
    );
    expect(checks.map((x) => x.title)).toEqual([
      'alt:gun_only wins with margin ≥ 20',
      'alt:gun_only wins with margin ≥ 40',
      "alt:gun_only wins below par's margin",
    ]);
    const [, floor, below] = checks;
    expect(judge(floor!, { 'alt:gun_only#1': fakeResult('won', 8) }).ok).toBe(true); // 40%
    expect(judge(floor!, { 'alt:gun_only#1': fakeResult('won', 7) }).failures).toEqual([
      'seed 1: margin 35 is below 40',
    ]);
    expect(judge(below!, { ...parAt(19), 'alt:gun_only#1': fakeResult('won', 18) }).ok).toBe(true);
    expect(judge(below!, { ...parAt(18), 'alt:gun_only#1': fakeResult('won', 18) }).ok).toBe(false);
    // An expectation for a build the map lacks is refused, not skipped.
    const stray = {
      ...map,
      builds: { ...map.builds, altExpectations: { nope: { belowPar: true as const } } },
    };
    const refused = mapChecks(stray, [1], [1]).find((x) => x.subject === 'alt:nope')!;
    expect(judge(refused, {}).ok).toBe(false);
  });

  it('#8 every alt build wins at or above the forgiving floor', () => {
    const c = find('8', 'alt:gun_only');
    expect(judge(c, { 'alt:gun_only#1': fakeResult('won', 4) }).ok).toBe(true); // 20%
    expect(judge(c, { 'alt:gun_only#1': fakeResult('won', 3) }).ok).toBe(false);
  });

  it('gradual: no alt build wave costs over half the integrity, and leaks come before a loss', () => {
    const c = find('gradual', 'alt:gun_only');
    expect(judge(c, { 'alt:gun_only#1': lossy('won', [0, 9]) }).ok).toBe(true);
    expect(judge(c, { 'alt:gun_only#1': lossy('won', [0, 11]) }).failures).toEqual([
      'seed 1: W2 costs 11 of 20 integrity, over 50%',
    ]);
    // Two waves of 10 lose gradually; a first leak in the losing wave is a wall.
    expect(judge(c, { 'alt:gun_only#1': lossy('lost', [10, 10]) }).ok).toBe(true);
    expect(notGradual(lossy('lost', [0, 10, 10, 0]))).toBeNull();
    expect(notGradual(lossy('lost', [0, 0, 10]))).toMatch(/only start in W3 .* by W2/);
    expect(judge(c, { 'alt:gun_only#1': lossy('lost', [0, 10, 10]) }).summary).toBe(
      'lost at W3, lost per wave 0,10,10',
    );
  });

  it('#8 an under-built alt build (outcome) skips the forgiving floor', () => {
    const lose = withOutcome('lose');
    expect(lose.map((x) => x.id)).toEqual(['8', 'gradual']);
    expect(lose[0]!.title).toBe('alt:gun_only (under-built) loses');
    expect(judge(lose[0]!, { 'alt:gun_only#1': lossy('lost', [10, 10]) }).ok).toBe(true);
    expect(judge(lose[0]!, { 'alt:gun_only#1': fakeResult('won', 2) }).ok).toBe(false);
    expect(withOutcome('either').map((x) => x.id)).toEqual(['gradual']);
  });

  it('#11 determinism compares two identical par runs', () => {
    const c = find('11', 'par');
    expect(c.needs).toEqual([
      { build: 'par', seed: 1 },
      { build: 'par', seed: 1, repeat: true },
    ]);
    const other = { ...fakeResult('won', 20), hash: 'ffffffffffffffff' };
    expect(judge(c, {}).ok).toBe(true);
    expect(judge(c, { 'par#1#again': other }).ok).toBe(false);
  });

  it('#5 a no-counter build must lose before the final third; #6 it must lose with the full catalog', () => {
    const withCounter = {
      ...map,
      builds: { ...map.builds, noCounterBuilds: { splash: map.builds.altBuilds.gun_only! } },
    };
    const checks = mapChecks(withCounter, [1], [1], ['shop:salvage_rights (M3)']);
    const five = checks.find((c) => c.id === '5')!;
    expect(five.subject).toBe('noCounter:splash');
    // fx_map has 2 waves, so the build must lose by W1.
    expect(judge(five, { 'noCounter:splash#1': fakeResult('lost', 0, 1) }).ok).toBe(true);
    expect(judge(five, { 'noCounter:splash#1': fakeResult('lost', 0, 2) }).ok).toBe(false);
    // #6 is about the same build (its subject), run on the full-catalog profile; any loss passes.
    const six = checks.find((c) => c.id === '6')!;
    expect(six.subject).toBe('noCounter:splash');
    expect(six.needs).toEqual([{ build: 'noCounter:splash@fullCatalog', seed: 1 }]);
    const lost = judge(six, { 'noCounter:splash@fullCatalog#1': fakeResult('lost', 0, 2) });
    expect(lost.ok).toBe(true);
    expect(lost.summary).toBe('lost at W2 (left out, not simulated yet: shop:salvage_rights (M3))');
    const won = judge(six, { 'noCounter:splash@fullCatalog#1': fakeResult('won', 3) });
    expect(won.failures).toEqual(['seed 1: won (15%)']);
  });

  it('#9 par on Story (seed 1) must win with a margin at least its Standard median', () => {
    const nine = mapChecks(map, [1, 2, 3], [1]).find((c) => c.id === '9')!;
    expect(nine.subject).toBe('par');
    const standard = {
      'par#1': fakeResult('won', 16),
      'par#2': fakeResult('won', 18),
      'par#3': fakeResult('won', 20),
    };
    expect(judge(nine, { ...standard, 'par@story#1': fakeResult('won', 18) }).ok).toBe(true);
    const below = judge(nine, { ...standard, 'par@story#1': fakeResult('won', 17) });
    expect(below.failures).toEqual(['seed 1: margin 85 is below the Standard median 90']);
    expect(judge(nine, { ...standard, 'par@story#1': fakeResult('lost', 0, 2) }).ok).toBe(false);
  });

  it('splits a run label into its build and meta', () => {
    expect(splitMeta('par')).toEqual({ build: 'par', meta: 'standard' });
    expect(splitMeta('par@story')).toEqual({ build: 'par', meta: 'story' });
    expect(splitMeta('noCounter:armor@fullCatalog')).toEqual({
      build: 'noCounter:armor',
      meta: 'fullCatalog',
    });
    expect(() => splitMeta('par@hard')).toThrow(/unknown run meta 'hard'/);
  });

  it('guards judge their policy runs', () => {
    const guarded = {
      ...map,
      builds: {
        ...map.builds,
        guards: { spam: { policy: 'spamCheapest' as const, expect: 'lose' as const } },
      },
    };
    const g = mapChecks(guarded, [1], [1]).find((c) => c.id === 'guard')!;
    expect(g.subject).toBe('guard:spam');
    expect(judge(g, { 'guard:spam#1': fakeResult('lost', 0, 2) }).ok).toBe(true);
    expect(judge(g, {}).ok).toBe(false);
  });

  it('refuses map features it cannot check yet', () => {
    expect(refusedFeatures(map)).toEqual([]);
    // #16 is lifted (T206a): fleeing runners are checked, not refused.
    expect(HARNESS_GATES.holdFireRuns).toBeNull();
    expect(refusedFeatures(FIXTURE_CONTENT.maps.fx_map)).toEqual([]);
    // A gate still closed refuses with its task.
    const closed = { ...HARNESS_GATES, holdFireRuns: 'T999' };
    const refused = refusedFeatures(FIXTURE_CONTENT.maps.fx_map, closed);
    expect(refused.map((c) => c.id)).toEqual(['16']);
    const out = refused[0]!.evaluate(() =>
      fakeRun({ build: 'par', seed: 1 }, fakeResult('won', 20)),
    );
    expect(out.ok).toBe(false);
    expect(out.failures[0]).toMatch(/T999/);
  });

  it('#16: Quiet Wave and fleeing maps get the free-choice checks; plain maps none', () => {
    expect(mapChecks(map, [1], [1]).filter((c) => c.id === '16')).toEqual([]);
    const fleeing = mapChecks(FIXTURE_CONTENT.maps.fx_map, [1], [1, 2]);
    const b = fleeing.find((c) => c.id === '16')!;
    expect(b.subject).toBe('spareFleeing');
    expect(judge(b, spareRuns(19, 20)).ok).toBe(true); // 95 ≥ 100 − 5
    expect(judge(b, spareRuns(18, 20)).ok).toBe(false); // 90 < 95
    expect(judge(b, spareRuns(18, 20)).failures[0]).toMatch(/below par's 100 − 5/);
    expect(judge(b, spareRuns(20, 18)).ok).toBe(true); // sparing may beat par

    const quiet = mapChecks(QUIET_WAVE_CONTENT.maps.fx_map, [1], [1]);
    const a = quiet.find((c) => c.subject === 'holdFireWhile:quiet_wave')!;
    expect(judge(a, heldRun(18, 5)).ok).toBe(true);
    expect(judge(a, heldRun(18, 4)).failures[0]).toMatch(/only 4\/5 quiet-wave units leaked/);
    expect(judge(a, heldRun(15, 5)).failures[0]).toMatch(/outside the band 80–100/);
    expect(judge(a, { 'holdFireWhile:quiet_wave#1': fakeResult('lost', 0, 3) }).ok).toBe(false);
  });

  it('median', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
});
