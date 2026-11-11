// "Shareholder Value"'s crash site (crashLanding.ts; T730b): each plate leaves the hull in turn,
// arcs over, and lands on its own tile as its own piece of the shell; under reduced motion it lies
// there at once; the hangar opens once the platform is out.
import { describe, expect, it } from 'vitest';
import {
  ARC_MAX_PX,
  arcPx,
  FLIGHT_MAX_TICKS,
  FLIGHT_MIN_TICKS,
  flightTicks,
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
    const tiles = 4;
    const flight = flightTicks(tiles);
    // The second plate waits on the hull while the first leaves.
    expect(platePose(STAGGER_TICKS - 1, 1, tiles, false, p).waiting).toBe(true);
    // Off the hull at its height.
    platePose(0, 0, tiles, false, p);
    expect(p).toEqual({ waiting: false, share: 0, liftPx: HULL_PX, landed: false });
    // Over the top of the arc halfway, higher than the hull.
    platePose(flight / 2, 0, tiles, false, p);
    expect(p.share).toBeCloseTo(0.5);
    expect(p.liftPx).toBeGreaterThan(HULL_PX);
    expect(p.liftPx).toBeLessThanOrEqual(HULL_PX + arcPx(tiles));
    // Down on its tile.
    platePose(flight, 0, tiles, false, p);
    expect(p).toEqual({ waiting: false, share: 1, liftPx: 0, landed: true });
    expect(platePose(flight + 3 * STAGGER_TICKS, 3, tiles, false, p).landed).toBe(true);
  });

  it('fly longer and higher the farther they are thrown, within bounds', () => {
    expect(flightTicks(0)).toBe(FLIGHT_MIN_TICKS);
    expect(flightTicks(10)).toBeGreaterThan(flightTicks(3));
    expect(flightTicks(60)).toBe(FLIGHT_MAX_TICKS);
    expect(arcPx(10)).toBeGreaterThan(arcPx(1));
    expect(arcPx(60)).toBe(ARC_MAX_PX);
  });

  it('lie there at once under reduced motion', () => {
    expect(platePose(0, 3, 12, true, pose())).toEqual({
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
