// "Shareholder Value"'s crash site (crashLanding.ts; T730b): each plate leaves the hull in turn,
// arcs over, and lands on its own tile as its own piece of the shell; under reduced motion it lies
// there at once; the hangar opens once the platform is out.
import { describe, expect, it } from 'vitest';
import {
  ARC_PX,
  FLIGHT_TICKS,
  HULL_PX,
  PLATE_LOOKS,
  plateFrame,
  platePose,
  platformOut,
  STAGGER_TICKS,
  type PlatePose,
} from './crashLanding.ts';

const pose = (): PlatePose => ({ waiting: true, share: 0, liftPx: 0, landed: false });

describe('the plates (T730b)', () => {
  it('are four pieces of the shell, one per tile in the order they opened', () => {
    expect([0, 1, 2, 3].map(plateFrame)).toEqual(['v0', 'v1', 'v2', 'v3']);
    expect(plateFrame(PLATE_LOOKS)).toBe('v0');
  });

  it('leave the hull one after another, arc over, and land on their tile', () => {
    const p = pose();
    // The second plate waits on the hull while the first leaves.
    expect(platePose(STAGGER_TICKS - 1, 1, false, p).waiting).toBe(true);
    // Off the hull at its height.
    platePose(0, 0, false, p);
    expect(p).toEqual({ waiting: false, share: 0, liftPx: HULL_PX, landed: false });
    // Over the top of the arc halfway, higher than the hull.
    platePose(FLIGHT_TICKS / 2, 0, false, p);
    expect(p.share).toBeCloseTo(0.5);
    expect(p.liftPx).toBeGreaterThan(HULL_PX);
    expect(p.liftPx).toBeLessThanOrEqual(HULL_PX + ARC_PX);
    // Down on its tile.
    platePose(FLIGHT_TICKS, 0, false, p);
    expect(p).toEqual({ waiting: false, share: 1, liftPx: 0, landed: true });
    expect(platePose(FLIGHT_TICKS + 3 * STAGGER_TICKS, 3, false, p).landed).toBe(true);
  });

  it('lie there at once under reduced motion', () => {
    expect(platePose(0, 3, true, pose())).toEqual({
      waiting: false,
      share: 1,
      liftPx: 0,
      landed: true,
    });
  });
});

/** A boss whose second phase has `hangar`. */
const boss = (alive: boolean, hangar: unknown) => ({
  alive,
  def: { boss: { phases: [{ hangar: null }, { hangar }] } },
});

describe('the hangar (T730b)', () => {
  it('opens once a live boss with a hangar phase is on the field', () => {
    expect(platformOut({ used: 0, items: [] })).toBe(false);
    expect(platformOut({ used: 1, items: [{ alive: true, def: { boss: null } }] })).toBe(false);
    expect(platformOut({ used: 1, items: [boss(true, null)] })).toBe(false);
    expect(platformOut({ used: 1, items: [boss(false, { count: 2 })] })).toBe(false);
    expect(platformOut({ used: 1, items: [boss(true, { count: 2 })] })).toBe(true);
    // Only the pool's used slots count.
    expect(platformOut({ used: 0, items: [boss(true, { count: 2 })] })).toBe(false);
  });
});
