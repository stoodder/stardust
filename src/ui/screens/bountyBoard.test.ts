import { describe, expect, it } from 'vitest';
import { BOUNTY_COPY, bountyRows, kipScore } from './bountyBoard.ts';

describe('the Pest Bounty Board (core-loop § 6.6)', () => {
  it('keeps Kip #1 and the player #2, whatever the score', () => {
    for (const p of [0, 1, 7, 120, 540, 9_999, 123_456]) {
      const rows = bountyRows(p, 'JPT-1 Ada', false);
      expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5]);
      expect(rows[0]?.score).toBeGreaterThan(p);
      expect(rows[1]).toMatchObject({ name: 'JPT-1 Ada', score: p, you: true });
      for (const r of rows.slice(2)) expect(r.score).toBeLessThanOrEqual(p);
      expect(rows.filter((r) => r.you)).toHaveLength(1);
    }
    expect(kipScore(100)).toBe(119);
  });

  it('puts Kip on assignment from A2M4', () => {
    expect(bountyRows(10, 'You', false)[0]?.note).toBe(BOUNTY_COPY.kip);
    expect(bountyRows(10, 'You', true)[0]?.note).toBe('(on assignment: Reclamation)');
  });
});
