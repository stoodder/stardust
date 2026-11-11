// The reserved memo ids (T800b, `PLANNED_MEMOS`): well formed, unique, delivered after their map,
// and, once their task registers one, registered as planned.
import { describe, expect, it } from 'vitest';
import { CAMPAIGN_PLAN_IDS } from '../campaign.ts';
import { MEMOS, MEMO_ID, PLANNED_MEMOS } from './index.ts';

describe('PLANNED_MEMOS (the finale)', () => {
  it("reserves finale.md's memo_fin_01, after the finale", () => {
    expect(PLANNED_MEMOS.map((m) => [m.id, m.afterMap])).toEqual([['memo_fin_01', 'fin_m01']]);
  });

  it.each(PLANNED_MEMOS)('$id is a well-formed id on a planned map', (m) => {
    expect(m.id).toMatch(MEMO_ID);
    expect(CAMPAIGN_PLAN_IDS).toContain(m.afterMap);
    expect(m.task).toMatch(/^T\d{3}/);
  });

  it.each(PLANNED_MEMOS)('$id, once registered, arrives after its planned map', (m) => {
    const def = MEMOS[m.id];
    if (def !== undefined) expect(def.afterMap).toBe(m.afterMap);
  });
});
