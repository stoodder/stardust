import { describe, expect, it } from 'vitest';
import { createVoiceBook } from './voices.ts';

describe('the voice book', () => {
  it('rate-limits a sound by its minimum gap', () => {
    const book = createVoiceBook<string>(16);
    const rules = { priority: 0 as const, minGapMs: 70 };
    expect(book.admit('shot', rules, 0)).toEqual({ ok: true, cut: [] });
    book.add('shot', 0, 0, 0.05, 'a');
    expect(book.admit('shot', rules, 0.05)).toEqual({ ok: false, reason: 'rate' });
    expect(book.admit('shot', rules, 0.07).ok).toBe(true);
    // Other sounds aren't limited by it.
    expect(book.admit('pop', rules, 0.01).ok).toBe(true);
  });

  it("caps a sound's voices by cutting its oldest", () => {
    const book = createVoiceBook<string>(16);
    const rules = { priority: 1 as const, maxVoices: 2 };
    book.add('boom', 1, 0, 1, 'a');
    book.add('boom', 1, 0.1, 1.1, 'b');
    expect(book.admit('boom', rules, 0.2)).toEqual({ ok: true, cut: ['a'] });
    expect(book.live(0.2)).toBe(1);
  });

  it('steals the oldest lowest-priority voice when full, never a higher one', () => {
    const book = createVoiceBook<string>(3);
    book.add('alarm', 3, 0, 5, 'alarm');
    book.add('shot', 0, 0.1, 5, 'shot1');
    book.add('shot', 0, 0.2, 5, 'shot2');
    expect(book.admit('pop', { priority: 1 }, 0.3)).toEqual({ ok: true, cut: ['shot1'] });
    book.add('pop', 1, 0.3, 5, 'pop');
    // Full of priority ≥ 1 voices except shot2; a priority-0 sound may only take shot2.
    expect(book.admit('click', { priority: 0 }, 0.4)).toEqual({ ok: true, cut: ['shot2'] });
    book.add('click', 0, 0.4, 5, 'click');
    // Now a priority-0 sound finds only the click (equal priority, so it's fair game)...
    expect(book.admit('click2', { priority: 0 }, 0.5)).toEqual({ ok: true, cut: ['click'] });
    // ...and with only higher-priority voices left, it's dropped.
    const full = createVoiceBook<string>(1);
    full.add('alarm', 3, 0, 5, 'alarm');
    expect(full.admit('shot', { priority: 0 }, 1)).toEqual({ ok: false, reason: 'full' });
  });

  it('forgets voices that have ended', () => {
    const book = createVoiceBook<string>(1);
    book.add('a', 3, 0, 0.5, 'a');
    expect(book.admit('b', { priority: 0 }, 0.4).ok).toBe(false);
    expect(book.admit('b', { priority: 0 }, 0.5).ok).toBe(true);
    expect(book.live(0.6)).toBe(0);
  });
});
