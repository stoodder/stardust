// Harness #18, the song's timing (balance/songChecks.ts; T821): Phase 2's length per rest-multiplier
// answer, the anchor (Keep) inside 3 min ± 30%, the others within ±30% of it.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { fakeResult, fakeRun } from './__fixtures__/harness.ts';
import type { RunRequest } from './checks.ts';
import { SONG_TARGET_SEC, songSeconds, songTimingChecks } from './songChecks.ts';

const FIN = compileContent(RAW_CONTENT).maps.fin_m01;

/** A won run whose Phase 2 lasted `sec` seconds (from tick 60,000). */
const lasted = (req: RunRequest, sec: number) =>
  fakeRun(req, { ...fakeResult('won', 20), phaseStartTick: [0, -1, 60_000, 60_000 + sec * 60] });

const [check] = songTimingChecks(FIN, [1]);

/** #18 over runs whose Phase 2 lasted `secs[answer]` seconds (null: never reached Dawn). */
function run(secs: Record<string, number | null>) {
  return check!.evaluate((r) => {
    const s = secs[r.build.split('=')[1]!]!;
    return s === null ? fakeRun(r, fakeResult('lost', 0)) : lasted(r, s);
  });
}

describe('#18 song timing', () => {
  it('runs par once per quill_choice on the few seeds, on the finale only', () => {
    expect(check!.needs.map((r) => r.build)).toEqual([
      'flag:quill_choice=keep',
      'flag:quill_choice=purge',
      'flag:quill_choice=rewrite',
    ]);
    const a3m6 = compileContent(RAW_CONTENT).maps.a3_m06;
    expect(songTimingChecks(a3m6, [1])).toEqual([]);
  });

  it('passes Keep near 3 min with the others within ±30% of it', () => {
    const secs: Record<string, number> = { keep: 180, purge: 230, rewrite: 150 };
    const out = check!.evaluate((r) => lasted(r, secs[r.build.split('=')[1]!]!));
    expect(out.ok).toBe(true);
    expect(out.summary).toBe('keep 180 s, purge 230 s (1.28×), rewrite 150 s (0.83×)');
  });

  it('fails an anchor outside 126–234 s, an answer past ±30%, or a run with no Dawn', () => {
    expect(run({ keep: 250, purge: 250, rewrite: 250 }).failures).toEqual([
      'keep 250 s is outside 126–234 s',
    ]);
    expect(run({ keep: 180, purge: 240, rewrite: 120 }).failures).toEqual([
      "purge 240 s is 1.33× keep's",
      "rewrite 120 s is 0.67× keep's",
    ]);
    expect(run({ keep: 180, purge: null, rewrite: 150 }).failures).toEqual([
      'purge: a run never reached Dawn',
    ]);
  });

  it('reads Phase 2 from the run’s phase starts', () => {
    expect(songSeconds({ phaseStartTick: [0, -1, 600, 600 + SONG_TARGET_SEC * 60] })).toBe(180);
    expect(songSeconds({ phaseStartTick: [0, -1, 600] })).toBeNull();
    expect(songSeconds(null)).toBeNull();
  });
});
