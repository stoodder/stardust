// The harness's M5 rows (T500a; D137): Escort margins are measured since T305c, the Holdout's
// floor since T605, the Choir's Voices since T804, and the jam limit (#10) is checked
// since T702 on every map that sends a jammer (D146; balance/jamLimit.ts).
import { describe, expect, it } from 'vitest';
import { HARNESS_GATES } from './refusals.ts';

describe('HARNESS_GATES (M5)', () => {
  it('name the task or milestone that lifts each row', () => {
    expect(HARNESS_GATES.objectives).toBeNull();
    // Retargeted by D141; the Holdout's floor is checked since T605 (balance/holdout.test.ts).
    expect(HARNESS_GATES.holdout).toBeNull();
    expect(HARNESS_GATES.choir).toBeNull(); // D154: T804 (tools/devVoices.test.ts)
    expect(HARNESS_GATES.jamLimit).toBeNull(); // #10 since T702 (balance/jamLimit.ts)
  });
});
