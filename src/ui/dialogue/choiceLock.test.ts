// A locked choice's debounce (D144 S4): Next spammed through the briefing never answers the
// question that slides in under the cursor, at a fast or a slow spam; once it stops, a mouse needs
// to move over the option, and a key a fresh down.
import { describe, expect, it } from 'vitest';
import {
  choicePressAccepted,
  nextRevealTap,
  pointerMoved,
  restartChoiceLock,
  TAP_SLOP_PX,
  tapOnReveal,
  type PointerAt,
} from './choiceLock.ts';

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

/** A pointermove at (x, y) reporting `movementX`, `movementY`. */
const at = (x: number, y: number, movementX = 0, movementY = 0) => ({
  clientX: x,
  clientY: y,
  movementX,
  movementY,
});

describe('a mouse that moved over the option (R3 F1)', () => {
  it('counts a move that reports movement', () => {
    expect(pointerMoved(at(100, 50, 3, -1), { x: 97, y: 51 })).toBe(true);
    // Even with no position seen before it.
    expect(pointerMoved(at(100, 50, 0, 2), null)).toBe(true);
  });

  it('counts a move to a new spot that reports no movement (Firefox, WebKit)', () => {
    expect(pointerMoved(at(104, 50), { x: 100, y: 50 })).toBe(true);
    expect(pointerMoved(at(100, 47), { x: 100, y: 50 })).toBe(true);
  });

  it('never counts the move sent as an option slides in under a still cursor', () => {
    // Same spot as the last seen (the click on Next), no movement.
    expect(pointerMoved(at(100, 50), { x: 100, y: 50 })).toBe(false);
    // Nothing seen yet and no movement: not a move.
    expect(pointerMoved(at(100, 50), null)).toBe(false);
  });

  it('a still cursor never answers; a moved one does once the lock has passed', () => {
    const until = LOCK;
    const still = pointerMoved(at(100, 50), { x: 100, y: 50 });
    const slid = pointerMoved(at(140, 50), { x: 100, y: 50 });
    const press = (moved: boolean) =>
      choicePressAccepted({ until, downAt: until + 5, now: until + 9, pointer: true, moved });
    expect(press(still)).toBe(false);
    expect(press(slid)).toBe(true);
  });
});

describe('a tap on the spot of the tap that brought the choice on (R3 F2)', () => {
  const reveal: PointerAt = { x: 640, y: 600 };

  /** Taps Next's spot every `everyMs` (a little jitter), the choice shown at 0 by the first. */
  function tapSteadily(everyMs: number, forMs: number) {
    let until = LOCK;
    let r: PointerAt | null = reveal;
    const answered: number[] = [];
    for (let t = everyMs, k = 0; t < forMs; t += everyMs, k++) {
      const spot = { x: reveal.x + (k % 3) * 4 - 4, y: reveal.y + (k % 2) * 5 };
      // The page's capture listener first (the lock's restart, the reveal kept or cleared).
      until = restartChoiceLock(until, t, LOCK);
      r = nextRevealTap(spot, r);
      const onReveal = tapOnReveal(spot, r);
      if (choicePressAccepted({ until, downAt: t, now: t + 60, onReveal })) answered.push(t);
    }
    return { until, reveal: r, answered };
  }

  it('Next tapped about once a second on one spot answers nothing, past the lock', () => {
    for (const everyMs of [900, 1000, 1200]) {
      const { until, reveal: r, answered } = tapSteadily(everyMs, 10_000);
      expect(answered).toEqual([]);
      // Every tap past the lock: it's the spot that refuses, not the lock.
      expect(until).toBe(LOCK);
      expect(r).toEqual(reveal);
    }
  });

  it('a deliberate tap elsewhere on the option answers, and clears the spot for later', () => {
    const off = { x: reveal.x + TAP_SLOP_PX + 1, y: reveal.y };
    const r = nextRevealTap(off, reveal);
    expect(r).toBeNull();
    expect(
      choicePressAccepted({ until: LOCK, downAt: 2000, now: 2060, onReveal: tapOnReveal(off, r) }),
    ).toBe(true);
    // A touch landed elsewhere: the old spot answers again.
    expect(tapOnReveal(reveal, r)).toBe(false);
  });

  it('the spot is TAP_SLOP_PX on either axis; a choice that came on by itself has none', () => {
    expect(tapOnReveal({ x: reveal.x + TAP_SLOP_PX, y: reveal.y - TAP_SLOP_PX }, reveal)).toBe(
      true,
    );
    expect(tapOnReveal({ x: reveal.x, y: reveal.y + TAP_SLOP_PX + 1 }, reveal)).toBe(false);
    expect(tapOnReveal(reveal, null)).toBe(false);
  });

  it('a tap still needs the lock to have passed, as any press', () => {
    expect(choicePressAccepted({ until: LOCK, downAt: LOCK - 1, now: LOCK + 50 })).toBe(false);
    expect(choicePressAccepted({ until: LOCK, downAt: LOCK, now: LOCK + 50 })).toBe(true);
  });
});
