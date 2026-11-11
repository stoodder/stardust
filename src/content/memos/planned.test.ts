// The reserved memo ids (T700b, `PLANNED_MEMOS`): well-formed, unique, delivered after their map,
// and, once their task registers one, registered as planned.
import { describe, expect, it } from 'vitest';
import { CAMPAIGN_PLAN_IDS } from '../campaign.ts';
import { MEMOS, MEMO_ID, PLANNED_MEMOS } from './index.ts';

describe('PLANNED_MEMOS (Act III part two)', () => {
  it("reserves act3.md's memo_a3_04..06, one after each M7 map", () => {
    expect(PLANNED_MEMOS.map((m) => [m.id, m.afterMap])).toEqual([
      ['memo_a3_04', 'a3_m04'],
      ['memo_a3_05', 'a3_m05'],
      ['memo_a3_06', 'a3_m06'],
    ]);
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
