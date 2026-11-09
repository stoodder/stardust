import { describe, expect, it } from 'vitest';
import { fakeResult, PLAIN_CONTENT } from './__fixtures__/harness.ts';
import { runCampaign } from './harness.ts';
import { formatMarkdown, formatText, linkUptime, towerDps } from './report.ts';

const report = runCampaign(PLAIN_CONTENT, { seeds: 1 });

describe('balance reports', () => {
  it('the console summary has a verdict per map, every check, and leaks per wave', () => {
    const text = formatText(report);
    expect(text).toMatch(/^fx_map \(act 1, defend\) · band 80–100 · \d+ runs · .* · FAIL$/m);
    expect(text).toMatch(/^ {2}ok {3}#1 par wins: 1\/1 won$/m);
    expect(text).toMatch(/^ {2}FAIL #steps build steps run cleanly/m);
    expect(text).toMatch(/^ {4}none +3 +6 +won/m);
    expect(text.split('\n').at(-1)).toMatch(/^sim: 1 map · .* · FAIL \(3 failed checks\)$/);
  });

  it('the Markdown report has the check table and a per-wave table per build', () => {
    const md = formatMarkdown(report);
    expect(md).toContain('## fx_map · FAIL');
    expect(md).toContain('| Wave | Spawned | Killed | Leaked | Integrity lost |');
    expect(md).toContain('### par · seed 1: per wave');
    expect(md).toContain('| W2 |');
    expect(md).toContain('| Medals | Link uptime | Hash |');
    expect(md).toContain('| Tower | Tile | Tier | Built (tick) | Shots | Kills | Damage | DPS |');
    expect(md).toMatch(/Ability kills: \d+\. Ally kills: \d+\. Link uptime: /);
  });

  it('link uptime is each link’s share of the run, and DPS is damage over the tower’s life', () => {
    const r = { ...fakeResult('won', 20), ticks: 1000 };
    expect(linkUptime(null)).toBe('—');
    expect(linkUptime(r)).toBe('—');
    const linked = { ...r, stats: { ...r.stats, linkTicks: { crossfire: 780, sitting_ducks: 5 } } };
    expect(linkUptime(linked)).toBe('crossfire 78%, sitting_ducks 1%');
    const t = {
      uid: 1,
      tower: 'rivet',
      tile: [0, 0] as const,
      builtTick: 400,
      soldTick: -1,
      tier: 1,
      shots: 30,
      kills: 3,
      damage: 240,
    };
    expect(towerDps(t, 1000)).toBe(24); // 240 HP over 600 ticks (10 s)
    expect(towerDps({ ...t, soldTick: 520 }, 1000)).toBe(120); // sold after 2 s
    expect(towerDps({ ...t, builtTick: 1000 }, 1000)).toBe(0);
  });
});
