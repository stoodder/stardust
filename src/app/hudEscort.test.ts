// The Escort's meter view (T305c; app/hudEscort.ts): shown only while the map is an Escort.
import { describe, expect, it } from 'vitest';
import { escortMeterView } from './hudEscort.ts';

describe('escortMeterView', () => {
  it('mirrors the escort while the map is one, else hides', () => {
    expect(escortMeterView('escort', 3, 1, 12, 6)).toEqual({
      evacuated: 3,
      total: 12,
      lost: 1,
      maxLost: 6,
    });
    expect(escortMeterView('defend', 0, 0, 12, 6)).toBeNull();
  });
});
