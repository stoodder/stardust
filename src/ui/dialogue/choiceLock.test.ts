// A locked choice's debounce (D144 S4): Next spammed through the briefing never answers the
// question that slides in under the cursor, at a fast or a slow spam; once it stops, a mouse needs
// to move over the option, and a key a fresh down.
import { describe, expect, it } from 'vitest';
import { choicePressAccepted, restartChoiceLock } from './choiceLock.ts';

const LOCK = 700;

/** Clicks every `everyMs` from `fromMs` for `forMs`, the choice shown at 0: what each answers. */
function spam(everyMs: number, fromMs: number, forMs: number) {
  let until = LOCK;
  const answered: number[] = [];
  for (let t = fromMs; t < fromMs + forMs; t += everyMs) {
    until = restartChoiceLock(until, t, LOCK);
    // The cursor never moved (it was on Next); even counting it as moved, the down was early.
    for (const moved of [false, true]) {
      if (choicePressAccepted({ until, downAt: t, now: t + 10, pointer: true, moved })) {
        answered.push(t);
      }
    }
  }
  return { until, answered };
}

describe('the choice lock debounces (S4)', () => {
  for (const everyMs of [45, 140]) {
    it(`a click every ${everyMs} ms answers nothing, however long it goes on`, () => {
      const { until, answered } = spam(everyMs, 5, 5000);
      expect(answered).toEqual([]);
      // Still shut: the last click restarted it.
      expect(until).toBeGreaterThan(5000);
      // Stopped: past the lock, a still mouse still can't answer; one that moved can.
      const later = until + 1;
      expect(restartChoiceLock(until, later, LOCK)).toBe(until);
      expect(choicePressAccepted({ until, downAt: later, now: later, pointer: true })).toBe(false);
      expect(
        choicePressAccepted({ until, downAt: later, now: later, pointer: true, moved: true }),
      ).toBe(true);
      // A key's fresh down needs no move.
      expect(choicePressAccepted({ until, downAt: later, now: later })).toBe(true);
    });
  }

  it('leaves an open choice open', () => {
    expect(restartChoiceLock(0, 100, LOCK)).toBe(0);
    expect(choicePressAccepted({ until: 0, downAt: 5, now: 5, pointer: true })).toBe(true);
  });
});
