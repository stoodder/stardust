// FIN's whole harness (T821; conventions.md § Balance sims), part 2 of 3 (`runMap`'s `part`,
// T778): each file runs a third of the map's checks on seed 1 (the finale doesn't move with the
// seed), so each stays under ~30 s. Together they hold every check once: par's margin in the
// finale's own band (40–60, Voices % of the canonical choir), the no-counter builds losing in
// Phase 1, both alts winning, every #14 cell and #15 companion in band, #18 the song's timing per
// C4, #10, #11, #12, #13 (≤ 2 s CPU a run).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { runMap } from './harness.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

describe('FIN harness, part 2 of 3', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  it('passes every check in its part', () => {
    const report = runMap(compileContent(RAW_CONTENT), 'fin_m01', {
      seeds: 1,
      part: { index: 1, count: 3 },
    });
    const failed = report.checks
      .filter((c) => !c.ok)
      .map((c) => `#${c.id} ${c.subject}: ${c.summary}`);
    expect(failed).toEqual([]);
    expect(report.checks.length).toBeGreaterThan(0);
  });
});
