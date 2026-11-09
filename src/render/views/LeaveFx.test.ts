import { describe, expect, it } from 'vitest';
import { exitAlpha } from './LeaveFx.ts';
import { huddleRadius } from './HuddleView.ts';

describe('a leaver running on past the edge (T312b)', () => {
  it('steps down from the leaving 60% to 35% and 15%', () => {
    expect(exitAlpha(0)).toBe(0.6);
    expect(exitAlpha(0.5)).toBe(0.35);
    expect(exitAlpha(0.9)).toBe(0.15);
  });
});

/** huddleRadius of a partial enemy (only the fields it reads). */
function r(e: object): number {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a partial enemy for the reader
  return huddleRadius(e as Parameters<typeof huddleRadius>[0]);
}

describe('huddleRadius (T312b)', () => {
  const base = { leaving: false, burrowed: false, bossPhase: 0 };
  const huddle = { radiusTiles: 1.5, radiusSq: 2.25, regenPerTick: 0.1 };
  it("is an Elder's radius, or a boss phase's, and none while leaving or underground", () => {
    const elder = { ...base, def: { huddle, boss: null } };
    expect(r(elder)).toBe(1.5);
    expect(r({ ...elder, leaving: true })).toBe(0);
    const phases = [{ huddle: null }, { huddle: null }, { huddle }];
    const boss = { ...base, def: { huddle: null, boss: { phases } } };
    expect(r({ ...boss, bossPhase: 2 })).toBe(0);
    expect(r({ ...boss, bossPhase: 3 })).toBe(1.5);
    expect(r({ ...boss, bossPhase: 3, burrowed: true })).toBe(0);
    expect(r({ ...base, def: null })).toBe(0);
  });
});
