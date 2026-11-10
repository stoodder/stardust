// The harness's M5 rows (T500a; D137): Escort margins wait for T305c, and the jam limit moves to
// M6 (no M5 map has a jammer).
import { describe, expect, it } from 'vitest';
import { HARNESS_GATES } from './refusals.ts';

describe('HARNESS_GATES (M5)', () => {
  it('name the task or milestone that lifts each row', () => {
    expect(HARNESS_GATES.objectives).toBe('T305c');
    expect(HARNESS_GATES.jamLimit).toBe('M6');
  });
});
