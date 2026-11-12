// Seed reuse (D157; conventions.md § Balance sims, Sim time): a run counts the random numbers each
// RNG stream drew (`HeadlessResult.seedDraws`), and the harness judges a build's later seeds as
// copies of its seed 1 when that run drew none, since the seed reaches a run only through those
// streams. The copies are what a real run gives (the final hash aside), and a run that draws, on
// any stream, gets every seed run again by itself.
import { describe, expect, it } from 'vitest';
import { drewNoRandom, runHeadless, type HeadlessResult } from '../sim/index.ts';
import { runKey, type RunRecord, type RunRequest } from './checks.ts';
import { PLAIN_CONTENT, fakeResult, fakeRun } from './__fixtures__/harness.ts';
import { buildFor, firstSeedOf, judgeMap, mapRunner, planMap, reuseSeed } from './harness.ts';
import { referenceRunProfile, runConfig } from './profile.ts';
import { formatMarkdown, runCount } from './report.ts';

const MAP = PLAIN_CONTENT.maps.fx_map;

/** A fake seed-1 result that drew `draws` numbers on the projectiles stream. */
const drew = (draws: number): HeadlessResult => {
  const r = fakeResult('won', 18);
  return { ...r, seedDraws: { ...r.seedDraws, projectiles: draws } };
};

/** A result without what differs by seed anyway (its final hash: the RNG streams' state). */
const playable = (r: HeadlessResult) => ({ ...r, hash: '' });

describe('a run counts its random draws (seedDraws)', () => {
  it('per stream, and a run that drew none plays alike on every seed', () => {
    const build = buildFor('par', MAP, PLAIN_CONTENT)!;
    const profile = referenceRunProfile(MAP, PLAIN_CONTENT, 'standard');
    const run = (seed: number) =>
      runHeadless(runConfig(PLAIN_CONTENT, MAP, build, profile, seed), build);
    const one = run(1);
    expect(Object.keys(one.seedDraws).toSorted()).toEqual([
      'abilities',
      'allies',
      'movement',
      'projectiles',
      'status',
      'towers',
      'triggers',
      'waves',
    ]);
    expect(drewNoRandom(one)).toBe(true);
    const two = run(2);
    expect(two.hash).not.toBe(one.hash); // the streams' state differs by seed
    expect(playable(two)).toEqual(playable(one));
  });

  it('drewNoRandom reads any stream', () => {
    expect(drewNoRandom(drew(0))).toBe(true);
    expect(drewNoRandom(drew(3))).toBe(false);
    const r = drew(0);
    expect(drewNoRandom({ seedDraws: { ...r.seedDraws, waves: 1 } })).toBe(false);
  });
});

describe('the harness reuses seed 1 for a build that drew nothing (D157)', () => {
  it('only later seeds of the same build, never a repeat, an error, or a run that drew', () => {
    const first = fakeRun({ build: 'par', seed: 1 }, drew(0));
    expect(firstSeedOf({ build: 'par', seed: 3 })).toEqual({ build: 'par', seed: 1 });
    expect(firstSeedOf({ build: 'par', seed: 1 })).toBeNull();
    expect(firstSeedOf({ build: 'par', seed: 1, repeat: true })).toBeNull();
    const copy = reuseSeed(first, { build: 'par', seed: 3 })!;
    expect(copy).toEqual({ ...first, seed: 3, ms: 0, reusedFrom: 1 });
    expect(reuseSeed(first, { build: 'none', seed: 3 })).toBeNull();
    expect(reuseSeed(first, { build: 'par', seed: 1, repeat: true })).toBeNull();
    const drawn = fakeRun({ build: 'par', seed: 1 }, drew(1));
    expect(reuseSeed(drawn, { build: 'par', seed: 2 })).toBeNull();
    const failed: RunRecord = { ...first, error: 'refused', result: null };
    expect(reuseSeed(failed, { build: 'par', seed: 2 })).toBeNull();
  });

  it('judges the copies as the real runs: the same records, but for the hash and the CPU', () => {
    const opts = { seeds: 3 };
    const plan = planMap(PLAIN_CONTENT, 'fx_map', opts);
    const real = mapRunner(PLAIN_CONTENT, 'fx_map', opts);
    const asked: string[] = [];
    const report = judgeMap(
      PLAIN_CONTENT,
      plan,
      (r) => {
        asked.push(runKey(r));
        return real(r);
      },
      () => 0,
    );
    const reused = report.runs.filter((r) => r.reusedFrom !== undefined);
    expect(reused.length).toBeGreaterThan(0);
    for (const rec of reused) {
      expect(asked).not.toContain(runKey({ build: rec.build, seed: rec.seed })); // never run
      const ran = real({ build: rec.build, seed: rec.seed });
      expect(playable(rec.result!)).toEqual(playable(ran.result!));
      expect(rec.marginPct).toBe(ran.marginPct);
    }
    // The report says so: on the map's line, and in the runs table.
    expect(runCount(report)).toMatch(new RegExp(`\\(${reused.length} reused from seed 1`));
    expect(formatMarkdown({ ...EMPTY_CAMPAIGN, maps: [report] })).toContain('= seed 1');
  });

  it('a seed 1 that drew a random number gets every seed run, by itself', () => {
    const plan = planMap(PLAIN_CONTENT, 'fx_map', { seeds: 3 });
    for (const [draws, wantAsked] of [
      [1, true],
      [0, false],
    ] as const) {
      const asked = new Set<string>();
      const run = (r: RunRequest): RunRecord => {
        asked.add(runKey(r));
        return fakeRun(r, drew(draws));
      };
      const report = judgeMap(PLAIN_CONTENT, plan, run, () => 0);
      const later = plan.requests.filter((r) => firstSeedOf(r) !== null);
      expect(later.length).toBeGreaterThan(0);
      expect(later.every((r) => asked.has(runKey(r)))).toBe(wantAsked);
      expect(report.runs.some((r) => r.reusedFrom !== undefined)).toBe(!wantAsked);
    }
  });
});

const EMPTY_CAMPAIGN = { ok: true, maps: [], seeds: 3, build: null, ms: 0, checks: [] };
