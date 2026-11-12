// Retry checkpoints (T305b; design/core-loop.md § 2.12): which countdowns record one. The emission,
// its tick, and the replay that resumes from it run end to end in app/checkpoints.test.ts.
import { describe, expect, it } from 'vitest';
import { CHECKPOINT_EVERY_WAVES, CHECKPOINTS_FROM_ACT } from '../content/rules.ts';
import { FEATURE_GATES } from './gates.ts';
import { checkpointAt } from './systems/waves.ts';

describe('checkpointAt', () => {
  it('marks every 5th wave from Act II on', () => {
    expect([CHECKPOINT_EVERY_WAVES, CHECKPOINTS_FROM_ACT]).toEqual([5, 2]);
    const act2 = { act: 2, objective: 'defend' } as const;
    const marked = Array.from({ length: 16 }, (_, i) => i + 1).filter((w) => checkpointAt(act2, w));
    expect(marked).toEqual([5, 10, 15]);
    expect(checkpointAt({ act: 3, objective: 'protect' }, 10)).toBe(true);
  });

  it('never in Act I, on a Holdout (no defeat to retry), or in a post-game map', () => {
    expect(checkpointAt({ act: 1, objective: 'defend' }, 5)).toBe(false);
    expect(checkpointAt({ act: 1, objective: 'defend' }, 10)).toBe(false);
    expect(checkpointAt({ act: 3, objective: 'holdout' }, 5)).toBe(false);
    expect(checkpointAt({ act: 'challenge', objective: 'defend' }, 5)).toBe(false);
  });

  it("in the finale, every 5th wave of Phase 1 only (D156): Phase 2's is its script's", () => {
    const fin = { act: 'finale', objective: 'choir' } as const;
    const marked = Array.from({ length: 26 }, (_, i) => i + 1).filter((w) =>
      checkpointAt(fin, w, w > 18 ? 2 : 0),
    );
    expect(marked).toEqual([5, 10, 15]);
  });

  it('is live: its gate row is lifted', () => {
    expect(FEATURE_GATES['run.checkpoints']).toBeNull();
  });
});
