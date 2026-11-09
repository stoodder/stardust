// The harness's medal check (`parMedals`) and the report's medal marks (T202c).
import { describe, expect, it } from 'vitest';
import type { HeadlessResult } from '../sim/index.ts';
import { PLAIN_CONTENT, fakeResult, fakeRun } from './__fixtures__/harness.ts';
import { runKey, type RunRequest } from './checks.ts';
import { medalChecks, medalMarks } from './medals.ts';

const map = PLAIN_CONTENT.maps.fx_map;
const withPar = (parMedals: typeof map.builds.parMedals) => ({
  ...map,
  builds: { ...map.builds, parMedals },
});
const earned = (r: HeadlessResult, challenge: 'earned' | 'forfeited'): HeadlessResult => ({
  ...r,
  medals: { ...r.medals, challenge },
});

describe('medal check', () => {
  it('none without parMedals', () => {
    expect(medalChecks(map, [1, 2])).toEqual([]);
  });

  it('par must earn every listed medal on every seed', () => {
    const [spec] = medalChecks(withPar(['challenge']), [1, 2]);
    expect(spec).toMatchObject({ id: 'medals', subject: 'par', title: 'par earns challenge' });
    const results: Record<string, HeadlessResult> = {
      'par#1': earned(fakeResult('won', 20), 'earned'),
      'par#2': earned(fakeResult('won', 18), 'forfeited'),
    };
    const out = spec!.evaluate((req: RunRequest) => fakeRun(req, results[runKey(req)]!));
    expect(out.ok).toBe(false);
    expect(out.summary).toBe('1/2 earned');
    expect(out.failures).toEqual(['seed 2: challenge not earned (V · ·)']);
  });
});

describe('medal marks', () => {
  it('V P C, with · for each medal not earned', () => {
    expect(medalMarks(earned(fakeResult('won', 20), 'earned'))).toBe('V P C');
    expect(medalMarks(fakeResult('lost', 0))).toBe('· · ·');
    expect(medalMarks(null)).toBe('—');
  });
});
