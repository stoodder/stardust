// Detection as a counter answer (T406; enemies.md § 3.1): the Lookout Shack answers detection from
// any tier, and Scanner Sweep only when cast. The Lookout has no attack, so the placement-aware model
// judges it by how far it sees: a Lookout whose detection radius (+ the static slack) can't reach a
// cloaked unit's route doesn't answer.
import { describe, expect, it } from 'vitest';
import {
  answerScope,
  answersCarried,
  rangeReached,
  towersReached,
  type ReachedTower,
  type ReachTile,
} from './counterAnswers.ts';
import { RAW_CONTENT } from './registry.ts';
import { COUNTER_ANSWERS } from './rules.ts';

const LOOKOUT = RAW_CONTENT.towers.lookout;
const ROUTE: readonly ReachTile[] = [
  [0, 0],
  [10, 0],
];
const scope = answerScope('detection', 2, [
  { traits: ['cloaked'], body: 'void', layer: 'ground', route: ROUTE },
]);

const at = (tier: number, row: number, spec: 'a' | 'b' | null = null): ReachedTower => ({
  tower: 'lookout',
  tier,
  spec,
  at: { tile: [5, row], highGround: false },
});

const range = (t: ReachedTower): number | null => rangeReached(LOOKOUT, t);

describe('detection answers (T406)', () => {
  it("reads the Lookout's reach as its detection radius, tier by tier and by spec", () => {
    expect(rangeReached(LOOKOUT, at(1, 0))).toBe(2.5);
    expect(rangeReached(LOOKOUT, at(3, 0))).toBe(3.5);
    expect(rangeReached(LOOKOUT, at(4, 0, 'a'))).toBe(5);
    expect(rangeReached(LOOKOUT, at(4, 0, 'b'))).toBe(3.5);
  });

  it('a placed Lookout answers only if it can see the route; Scanner Sweep only when cast', () => {
    const carried = (t: ReachedTower, cast: string[] = []): string[] =>
      answersCarried(COUNTER_ANSWERS.detection, scope, [t], cast, range);
    expect(carried(at(1, 3))).toEqual(['lookout']); // 3 ≤ 2.5 + 0.5
    expect(carried(at(1, 4))).toEqual([]);
    expect(carried(at(4, 5, 'a'))).toEqual(['lookout']); // Crow's Nest sees 5
    expect(carried(at(1, 9), ['scanner_sweep'])).toEqual(['scanner_sweep']);
    // A loadout Lookout the build never places still counts (it could stand anywhere).
    expect(
      answersCarried(COUNTER_ANSWERS.detection, scope, towersReached(['lookout'], []), [], range),
    ).toEqual(['lookout']);
  });
});
