// The Act I Everglow Inbox content (T303): one memo before A1M1 and one after each Act I map, each
// within the style guide's limits, Sterling never using the player's name, and the welcome memo
// carrying the Orbital Strike uplink.
import { describe, expect, it } from 'vitest';
import { ABILITIES } from '../abilities/index.ts';
import { TEXT_LIMITS, tokenProblems, usesName, worstCaseLength } from '../dialogue/rules.ts';
import { TOWERS } from '../towers/index.ts';
import { MEMO_ID, MEMO_IDS, MEMO_LIST, MEMOS } from './index.ts';

describe('the memo content', () => {
  it('delivers memo_a1_00 at the intake and one memo after each map built, in order', () => {
    expect(MEMO_IDS).toEqual([
      'memo_a1_00',
      'memo_a1_01',
      'memo_a1_02',
      'memo_a1_03',
      'memo_a1_04',
      'memo_a1_05',
      'memo_a2_01',
      'memo_a2_02',
    ]);
    expect(MEMO_LIST.map((m) => m.afterMap)).toEqual([
      null,
      'a1_m01',
      'a1_m02',
      'a1_m03',
      'a1_m04',
      'a1_m05',
      'a2_m01',
      'a2_m02',
    ]);
    for (const id of MEMO_IDS) expect(id).toMatch(MEMO_ID);
  });

  it('gives the Orbital Strike uplink with the welcome memo, and no other Act I gift', () => {
    expect(MEMOS.memo_a1_00?.gift).toEqual({ ability: 'orbital_strike' });
    expect(MEMO_LIST.filter((m) => m.gift !== undefined).map((m) => m.id)).toEqual(['memo_a1_00']);
    for (const m of MEMO_LIST) {
      const g = m.gift;
      if (g === undefined) continue;
      if ('ability' in g) expect(Object.keys(ABILITIES)).toContain(g.ability);
      else if ('tower' in g) expect(Object.keys(TOWERS)).toContain(g.tower);
      else expect(g.stardust).toBeGreaterThan(0);
    }
  });

  it.each(MEMO_LIST.map((m) => [m.id, m] as const))('%s fits the limits', (_, m) => {
    const texts = [m.from, m.to, m.subject, m.body, m.signOff ?? '', m.smallPrint ?? ''];
    texts.push(...(m.extra ?? []).map((x) => x.text));
    for (const t of texts) {
      expect(tokenProblems(t)).toEqual([]);
      // Sterling uses the employee number, never the name (characters.md).
      expect(usesName(t)).toBe(false);
    }
    // The body with every extra paragraph that could show (style-guide § 4: body ≤ 600).
    const body = [m.body, ...(m.extra ?? []).map((x) => x.text)].join('\n\n');
    expect(worstCaseLength(body)).toBeLessThanOrEqual(TEXT_LIMITS.memoBody);
    expect(m.smallPrint).toBeDefined();
    expect(worstCaseLength(m.smallPrint ?? '')).toBeLessThanOrEqual(TEXT_LIMITS.smallPrint);
    // Subject lines are cheerful in every act (§ 6.1): Act I's all exclaim.
    expect(m.subject).toContain('!');
  });

  it('adds the Containment Lapse note to the Record Quarter memo only if the wave was spared', () => {
    expect(MEMOS.memo_a1_05?.extra).toEqual([
      expect.objectContaining({ when: { flag: 'spared_quiet_wave', eq: true } }),
    ]);
    expect(MEMOS.memo_a1_05?.extra?.[0]?.text).toMatch(/^Performance Note: Containment Lapse\./);
  });
});
