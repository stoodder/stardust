// Each assertion's judgment, on synthetic runs of the fixture map (no sim needed).
import { describe, expect, it } from 'vitest';
import type { HeadlessResult } from '../sim/index.ts';
import { PLAIN_CONTENT, fakeResult, fakeRun } from './__fixtures__/harness.ts';
import { mapChecks, median, runKey, type CheckSpec, type RunRequest } from './checks.ts';
import { refusedFeatures } from './refusals.ts';
import { FIXTURE_CONTENT } from '../sim/__fixtures__/sim.ts';

const map = PLAIN_CONTENT.maps.fx_map;

/** Judges `spec` with results looked up by run key (a missing one is a won run at 100%). */
function judge(spec: CheckSpec, results: Readonly<Record<string, HeadlessResult>>) {
  return spec.evaluate((req: RunRequest) =>
    fakeRun(req, results[runKey(req)] ?? fakeResult('won', 20)),
  );
}
const parAt = (integrity: number) => ({ 'par#1': fakeResult('won', integrity) });
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

  it('#8 every alt build wins at or above the forgiving floor', () => {
    const c = find('8', 'alt:gun_only');
    expect(judge(c, { 'alt:gun_only#1': fakeResult('won', 4) }).ok).toBe(true); // 20%
    expect(judge(c, { 'alt:gun_only#1': fakeResult('won', 3) }).ok).toBe(false);
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

  it('#5 a no-counter build must lose before the final third, and #6 is refused until T204', () => {
    const withCounter = {
      ...map,
      builds: { ...map.builds, noCounterBuilds: { splash: map.builds.altBuilds.gun_only! } },
    };
    const checks = mapChecks(withCounter, [1], [1]);
    const five = checks.find((c) => c.id === '5')!;
    expect(five.subject).toBe('noCounter:splash');
    // fx_map has 2 waves, so the build must lose by W1.
    expect(judge(five, { 'noCounter:splash#1': fakeResult('lost', 0, 1) }).ok).toBe(true);
    expect(judge(five, { 'noCounter:splash#1': fakeResult('lost', 0, 2) }).ok).toBe(false);
    expect(
      judge(
        checks.find((c) => c.id === '6')!,
        {},
      ).failures[0],
    ).toMatch(/T204/);
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
    const refused = refusedFeatures(FIXTURE_CONTENT.maps.fx_map); // fleeing runners
    expect(refused.map((c) => c.id)).toEqual(['16']);
    expect(
      refused[0]!.evaluate(() => fakeRun({ build: 'par', seed: 1 }, fakeResult('won', 20))).ok,
    ).toBe(false);
  });

  it('median', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
});
