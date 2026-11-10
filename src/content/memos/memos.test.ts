// The Everglow Inbox content (T303, T411): one memo before A1M1 and one after each map, each within
// the style guide's limits, Sterling never using the player's name, the welcome memo carrying the
// Orbital Strike uplink, and A2M2's KFA form filed as its own item.
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
      'memo_a2_02_kfa',
      'memo_a2_02',
      'memo_a2_03',
      'memo_a2_04',
      'memo_a2_05',
      'memo_a2_06',
      'memo_a3_01',
      'memo_a3_02',
      'memo_a3_03',
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
      'a2_m02',
      'a2_m03',
      'a2_m04',
      'a2_m04',
      'a2_m05',
      'a3_m01',
      'a3_m02',
      'a3_m03',
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
    if (m.format === 'form') {
      // A KFA form (§ 6.1): numbered clauses, a stamp in ASCII capitals, and no Everglow cheer.
      expect(m.body).toMatch(/^1\. /m);
      expect(m.stamp).toMatch(/^[A-Z0-9 .!-]{1,20}$/);
      expect(`${m.subject}${m.body}`).not.toContain('!');
    } else if (m.from === 'Everglow Automated Systems') {
      // From A3M2 the Inbox is automated (core-loop.md § 6.4): terse, no exclamation point, no
      // sun, no sign-off (style-guide § 6.1: A3M2's is the first memo without one).
      expect(`${m.subject}${m.body}${m.smallPrint ?? ''}`).not.toContain('!');
      expect(m.body).not.toContain('{glyph:sun}');
      expect(m.signOff).toBeUndefined();
      expect(m.stamp).toBeUndefined();
    } else {
      // Subject lines are cheerful in every act (§ 6.1): every other Everglow memo exclaims.
      expect(m.subject).toContain('!');
      expect(m.stamp).toBeUndefined();
    }
  });

  it("lands the Q3 Bonus memo with A2M4's results, giftless (the bonus is a story transaction)", () => {
    expect(MEMOS.memo_a2_04?.afterMap).toBe('a2_m04');
    expect(MEMOS.memo_a2_04?.gift).toBeUndefined();
    expect(MEMO_IDS.indexOf('memo_a2_04')).toBeLessThan(MEMO_IDS.indexOf('memo_a2_05'));
    // Sterling's one real-looking favour (act2.md § A2M5), word for word.
    expect(MEMOS.memo_a2_06?.body).toContain(
      "Goldie's shelter request? APPROVED! Concrete's on me, Four-Forty-Seven. Stay cozy!",
    );
  });

  it("notices C2's Return in the relocation memo, as Accounting would (an empty bank)", () => {
    expect(MEMOS.memo_a2_05?.extra).toEqual([
      expect.objectContaining({ when: { flag: 'stardust_choice', eq: 'returned' } }),
    ]);
    expect(MEMOS.memo_a2_05?.extra?.[0]?.text).toMatch(/^P\.S\. Accounting says/);
    // The Q3 Bonus memo pays nothing itself and names the bonus it announces.
    expect(MEMOS.memo_a2_04?.body).toContain('400 Stardust');
  });

  it("files A2M2's KFA form as its own item, just before Sterling's memo asking to disregard it", () => {
    const i = MEMO_IDS.indexOf('memo_a2_02_kfa');
    expect(MEMOS.memo_a2_02_kfa?.format).toBe('form');
    expect(MEMO_IDS[i + 1]).toBe('memo_a2_02');
    expect(MEMOS.memo_a2_02?.body).toContain('An automated form went out by mistake.');
    expect(MEMOS.memo_a2_02_kfa?.body).toContain('Status: filed, pending.');
    expect(MEMO_LIST.filter((m) => m.format === 'form').map((m) => m.id)).toEqual([
      'memo_a2_02_kfa',
    ]);
  });

  it('adds the Containment Lapse note to the Record Quarter memo only if the wave was spared', () => {
    expect(MEMOS.memo_a1_05?.extra).toEqual([
      expect.objectContaining({ when: { flag: 'spared_quiet_wave', eq: true } }),
    ]);
    expect(MEMOS.memo_a1_05?.extra?.[0]?.text).toMatch(/^Performance Note: Containment Lapse\./);
  });

  it('files Act III part one as the act file quotes it (T600b): Sterling once more, then the machine', () => {
    expect(MEMOS.memo_a3_01).toMatchObject({
      from: 'Director Joy Sterling, Frontier Operations',
      subject: "We'll Get Through This Together!",
      smallPrint: 'Engineers: Clean Exit Asset Recovery, Phase 1 (Colony Core).',
    });
    expect(MEMOS.memo_a3_01?.body).toContain(
      'I fought for that Preserve, Four-Forty-Seven. I really did. Engineers inbound to secure ' +
        'the colony. Hang in there!',
    );
    expect(MEMOS.memo_a3_02).toMatchObject({
      from: 'Everglow Automated Systems',
      subject: 'Your Access Has Been Updated',
    });
    expect(MEMOS.memo_a3_03).toMatchObject({
      from: 'Everglow Automated Systems',
      subject: 'Personnel Update',
      body: 'Employee #ED-112 (Okonkwo, I.): Unscheduled Departure. Pension: Restructured.',
      smallPrint: 'Beneficiary changes are not accepted after departure.',
    });
  });
});
