import { describe, expect, it } from 'vitest';
import { PLAIN_CONTENT } from './__fixtures__/harness.ts';
import { runCampaign } from './harness.ts';
import { formatMarkdown, formatText } from './report.ts';

const report = runCampaign(PLAIN_CONTENT, { seeds: 1 });

describe('balance reports', () => {
  it('the console summary has a verdict per map, every check, and leaks per wave', () => {
    const text = formatText(report);
    expect(text).toMatch(/^fx_map \(act 1, defend\) · band 80–100 · \d+ runs · .* · FAIL$/m);
    expect(text).toMatch(/^ {2}ok {3}#1 par wins: 1\/1 won$/m);
    expect(text).toMatch(/^ {2}FAIL #steps build steps run cleanly/m);
    expect(text).toMatch(/^ {4}none +3 +6 +won/m);
    expect(text.split('\n').at(-1)).toMatch(/^sim: 1 map · .* · FAIL \(2 failed checks\)$/);
  });

  it('the Markdown report has the check table and a per-wave table per build', () => {
    const md = formatMarkdown(report);
    expect(md).toContain('## fx_map · FAIL');
    expect(md).toContain('| Wave | Spawned | Killed | Leaked | Integrity lost |');
    expect(md).toContain('### par · seed 1: per wave');
    expect(md).toContain('| W2 |');
  });
});
