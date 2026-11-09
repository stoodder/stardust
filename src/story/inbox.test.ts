import { describe, expect, it } from 'vitest';
import { MEMOS, type MemoDef } from '../content/memos/index.ts';
import type { StoryContext } from './conditions.ts';
import { memoBody, memosDue, unreadMemos } from './inbox.ts';

const ctx = (map: StoryContext['map'], flags: StoryContext['flags'] = {}): StoryContext => ({
  flags,
  map,
  pestsProcessed: 0,
  seen: [],
  run: null,
});

describe('memo delivery', () => {
  it('delivers the welcome memo and its gift before A1M1', () => {
    expect(memosDue([], [], ctx(null))).toEqual({
      memos: ['memo_a1_00'],
      gifts: [{ memo: 'memo_a1_00', gift: { ability: 'orbital_strike' } }],
    });
  });

  it("delivers each map's memo once it is won, and catches up on all of them", () => {
    expect(memosDue(['memo_a1_00'], ['a1_m01'], ctx('a1_m01')).memos).toEqual(['memo_a1_01']);
    expect(memosDue([], ['a1_m01', 'a1_m02', 'a1_m03'], ctx('a1_m03'))).toEqual({
      memos: ['memo_a1_00', 'memo_a1_01', 'memo_a1_02', 'memo_a1_03'],
      gifts: [{ memo: 'memo_a1_00', gift: { ability: 'orbital_strike' } }],
    });
    // Idempotent: nothing twice.
    const all = ['memo_a1_00', 'memo_a1_01', 'memo_a1_02', 'memo_a1_03'];
    expect(memosDue(all, ['a1_m01', 'a1_m02', 'a1_m03'], ctx('a1_m03'))).toEqual({
      memos: [],
      gifts: [],
    });
  });

  it('holds a memo whose condition fails', () => {
    const gated: MemoDef = {
      ...MEMOS.memo_a1_05!,
      id: 'memo_a1_99',
      when: { flag: 'spared_quiet_wave', eq: true },
    };
    expect(memosDue([], ['a1_m05'], ctx('a1_m05'), [gated]).memos).toEqual([]);
    expect(
      memosDue([], ['a1_m05'], ctx('a1_m05', { spared_quiet_wave: true }), [gated]).memos,
    ).toEqual(['memo_a1_99']);
  });

  it('counts unread memos in delivery order', () => {
    expect(unreadMemos(['memo_a1_00', 'memo_a1_01', 'memo_a1_02'], ['memo_a1_01'])).toEqual([
      'memo_a1_00',
      'memo_a1_02',
    ]);
  });
});

describe('memo bodies', () => {
  it('splits the body at blank lines and keeps single line breaks', () => {
    const faq = memoBody(MEMOS.memo_a1_04!, ctx('a1_m04'));
    expect(faq).toHaveLength(4);
    expect(faq[3]).toBe('Q: Where is the buffer?\nA: Great question!');
  });

  it('adds the Containment Lapse note only when the Quiet Wave was spared', () => {
    const memo = MEMOS.memo_a1_05!;
    const cleared = memoBody(memo, ctx('a1_m05', { spared_quiet_wave: false }));
    const spared = memoBody(memo, ctx('a1_m05', { spared_quiet_wave: true }));
    expect(spared).toHaveLength(cleared.length + 1);
    expect(spared[spared.length - 1]).toMatch(/^Performance Note: Containment Lapse/);
    expect(cleared.join(' ')).not.toContain('Containment Lapse');
  });
});
