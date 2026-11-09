// The minimal detection view (T406): an unrevealed cloaked unit shimmers faint (never hidden: the
// player still sees it, enemies.md § 2.5), a Revealed one draws whole, a leaving unit keeps its
// 60%; Scanner Sweep's circle holds, then fades over its zone's last second.
import { describe, expect, it } from 'vitest';
import type { Enemy } from '../../sim/index.ts';
import { CLOAK_ALPHA_HIGH, CLOAK_ALPHA_LOW, LEAVING_ALPHA, cloakAlpha } from './enemyPose.ts';
import { STEPPED_ALPHA, sweepAlpha } from '../vfx/fxTiming.ts';

const unit = (cloaked: boolean, revealedTicks: number): Enemy =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- only `cloaked` is read off the def
  ({ def: { cloaked }, revealedTicks }) as Enemy;

describe('cloak shimmer', () => {
  it('a cloaked, unrevealed unit steps between two faint alphas; revealed, it is whole', () => {
    expect(cloakAlpha(unit(true, 0), false, false)).toBe(CLOAK_ALPHA_LOW);
    expect(cloakAlpha(unit(true, 0), false, true)).toBe(CLOAK_ALPHA_HIGH);
    expect(CLOAK_ALPHA_LOW).toBeGreaterThan(0);
    expect(cloakAlpha(unit(true, 3), false, true)).toBe(1);
    expect(cloakAlpha(unit(false, 0), false, true)).toBe(1);
    expect(cloakAlpha(unit(true, 0), true, true)).toBe(LEAVING_ALPHA);
  });
});

describe('Scanner Sweep circle', () => {
  it('holds until its last second, then fades to nothing', () => {
    expect(sweepAlpha(600, 60)).toBe(1);
    expect(sweepAlpha(60, 60)).toBe(1);
    // Steps down the ladder, never a smooth blend.
    for (let t = 1; t < 60; t++) expect(STEPPED_ALPHA).toContain(sweepAlpha(t, 60));
    expect(sweepAlpha(5, 60)).toBe(STEPPED_ALPHA[3]);
    expect(sweepAlpha(0, 60)).toBe(0);
  });
});
