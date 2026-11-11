// The Escort's meter view (T305c, T531; app/hudEscort.ts): shown while the map is an Escort, and
// on a Holdout without its lost row (T631).
import { describe, expect, it } from 'vitest';
import { escortMeterView } from './hudEscort.ts';

describe('escortMeterView', () => {
  it('mirrors the escort while the map is one, else hides', () => {
    expect(escortMeterView('escort', 3, 1, 12, 6)).toEqual({
      evacuated: 3,
      total: 12,
      lost: 1,
      maxLost: 6,
      pips: [true, false, false, false, false, false],
      low: false,
      holdout: false,
    });
    expect(escortMeterView('defend', 0, 0, 12, 6)).toBeNull();
  });

  it("shows a Holdout's Evacuated with no lost row, and its alarm at holdoutLow's mark", () => {
    // A3M3: 36 refugees, a 50% floor, so the low mark is a quarter (9) lost.
    const view = escortMeterView('holdout', 20, 8, 36, null, 0.5);
    expect(view).toEqual({
      evacuated: 20,
      total: 36,
      lost: 8,
      maxLost: null,
      pips: null,
      low: false,
      holdout: true,
    });
    expect(escortMeterView('holdout', 20, 9, 36, null, 0.5)?.low).toBe(true);
    // A Holdout map's maxLost (none authored) never draws pips.
    expect(escortMeterView('holdout', 0, 0, 36, 6, 0.5)?.pips).toBeNull();
  });
});
