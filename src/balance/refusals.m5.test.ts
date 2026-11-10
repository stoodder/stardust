// The harness's M5 rows (T500a; D137): Escort margins are measured since T305c (the Holdout's
// floor and the Choir's Voices wait for their maps), and the jam limit moves to M6 (no M5 map has
// a jammer).
import { describe, expect, it } from 'vitest';
import { HARNESS_GATES } from './refusals.ts';

describe('HARNESS_GATES (M5)', () => {
  it('name the task or milestone that lifts each row', () => {
    expect(HARNESS_GATES.objectives).toBeNull();
    // Retargeted by D141 (sim/m6seams.test.ts).
    expect(HARNESS_GATES.holdout).toBe('T605');
    expect(HARNESS_GATES.choir).toBe('M8');
    expect(HARNESS_GATES.jamLimit).toBe('M7');
  });
});
