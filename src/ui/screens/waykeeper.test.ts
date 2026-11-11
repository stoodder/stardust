// T714: the Waykeeper beat (waykeeper.ts): the plate turns once Pebble's naming line is whole (and
// held a beat), at once under reduced motion; the choir gathers over time.
import { describe, expect, it } from 'vitest';
import { RESULTS_FLOW } from '../../content/dialogue/resultsFlow.ts';
import { stagingOf } from '../dialogue/staging.ts';
import { typeMs } from '../dialogue/text.ts';
import {
  CHOIR_EVERY_MS,
  CHOIR_LIGHTS,
  choirGathered,
  isNaming,
  NEW_CALLSIGN,
  OLD_CALLSIGN,
  PLATE_TURN_HOLD_MS,
  plateTurned,
  waykeeperLabel,
} from './waykeeper.ts';

const naming = {
  speaker: 'pebble',
  text: 'I picked Waykeeper. Grandmother says the ones who walk with the song need a name. You have to like it.',
};

describe('the Waykeeper beat (T714)', () => {
  it("is A3M6's debrief, full-screen before the card", () => {
    expect(stagingOf('a3_m06_debrief')).toBe('waykeeper');
    expect(RESULTS_FLOW.a3_m06?.debriefAsScene).toBe(true);
    expect(OLD_CALLSIGN).toBe('Thorn');
    expect(NEW_CALLSIGN).toBe('Waykeeper');
  });

  it('turns the plate once her line is whole and held a beat', () => {
    expect(isNaming(naming)).toBe(true);
    expect(isNaming({ speaker: 'goldie', text: 'Waykeeper' })).toBe(false);
    const typing = { from: 1000, done: false };
    const whole = 1000 + typeMs(naming.text);
    expect(plateTurned([], null, typing, 99_999, false)).toBe(false);
    expect(plateTurned([], naming, typing, whole, false)).toBe(false);
    expect(plateTurned([], naming, typing, whole + PLATE_TURN_HOLD_MS, false)).toBe(true);
    // Next finished the typing: the hold runs from there.
    expect(plateTurned([], naming, { from: 1000, done: true }, 1000 + PLATE_TURN_HOLD_MS, false)).toBe(
      true,
    );
    expect(plateTurned([], naming, typing, 1000, true)).toBe(true);
    expect(plateTurned([naming], null, typing, 0, false)).toBe(true);
    expect(waykeeperLabel(true)).toContain('Callsign: Waykeeper');
  });

  it('gathers the choir one light at a time; all at once under reduced motion', () => {
    expect(choirGathered(0, false)).toBe(0);
    expect(choirGathered(CHOIR_EVERY_MS * 3, false)).toBe(3);
    expect(choirGathered(1e9, false)).toBe(CHOIR_LIGHTS);
    expect(choirGathered(0, true)).toBe(CHOIR_LIGHTS);
  });
});
