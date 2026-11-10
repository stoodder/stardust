import { describe, expect, it } from 'vitest';
import { CAMPAIGN_PLAN, type CampaignMapId } from '../../content/campaign.ts';
import { BOUNTY_COPY, bountyBoardState, bountyRows, kipScore } from './bountyBoard.ts';

/** The board's state with every map up to and including `last` won (none for null). */
function wonThrough(last: CampaignMapId | null) {
  const at = last === null ? -1 : CAMPAIGN_PLAN.findIndex((m) => m.id === last);
  const won = new Set(CAMPAIGN_PLAN.slice(0, at + 1).map((m) => m.id));
  return bountyBoardState((map) => won.has(map));
}

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

  it('shows from A1M2 won, puts Kip away from A2M4, and retires once A2M6 is won', () => {
    expect(wonThrough(null)).toEqual({ shown: false, kipAway: false });
    expect(wonThrough('a1_m01').shown).toBe(false);
    expect(wonThrough('a1_m02')).toEqual({ shown: true, kipAway: false });
    expect(wonThrough('a2_m03')).toEqual({ shown: true, kipAway: false });
    expect(wonThrough('a2_m04')).toEqual({ shown: true, kipAway: true });
    expect(wonThrough('a2_m05')).toEqual({ shown: true, kipAway: true });
    // Act II's close: the tab is simply gone, for good (a replay of an earlier map can't bring it
    // back; the rule reads wins, never the map just played).
    expect(wonThrough('a2_m06').shown).toBe(false);
    expect(wonThrough('fin_m01').shown).toBe(false);
  });
});
