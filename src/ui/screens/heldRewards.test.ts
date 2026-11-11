import { describe, expect, it } from 'vitest';
import { heldRewardsLine } from './heldRewards.ts';
import type { RunRewards } from './state.ts';

const medal = (name: string, isNew: boolean) => ({ id: name, name, earned: true, isNew, intel: 1 });

function view(rewards: Partial<RunRewards>) {
  const base: RunRewards = {
    medals: [],
    stardust: {
      source: 'first_clear',
      amount: 0,
      base: 320,
      wavesResolved: 14,
      waveCount: 14,
      fromWave: null,
    },
    objectives: [],
    intel: 0,
    lifetimePests: 0,
    stardustNote: null,
    firstPayday: false,
    issued: [],
    saveNotice: null,
    transactions: [],
    memos: [],
    revocations: [],
    stones: true,
  };
  return { mapId: 'a3_m03', rewards: { ...base, ...rewards } };
}

describe("a Holdout's held-back rewards in the base (core-loop.md § 6.2)", () => {
  it('names the new medals, then the Stardust and Intel paid', () => {
    expect(
      heldRewardsLine(
        view({
          medals: [
            medal('Victory', true),
            medal('Held the Door', false),
            medal('Much Obliged', true),
          ],
          stardust: { ...view({}).rewards.stardust, amount: 320 },
          intel: 2,
        }),
      ),
    ).toBe('Victory, Much Obliged · +320 Stardust · +2 Intel');
  });

  it('is empty when the run paid nothing (a replay with every medal on file)', () => {
    expect(heldRewardsLine(view({ medals: [medal('Victory', false)] }))).toBe('');
  });
});
