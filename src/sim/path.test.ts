import { describe, expect, it } from 'vitest';
import type { CompiledRoute } from '../content/compiled.ts';
import { FIXTURE_CONTENT } from './__fixtures__/sim.ts';
import { placeOnRoute, pointAt, remainingDist, segmentAt, type RouteFollower } from './path.ts';

const road = FIXTURE_CONTENT.maps.fx_map.routes.a!; // 10 tiles, 9 unit segments, (0,0) → (5,4)
const sky = FIXTURE_CONTENT.maps.fx_map.routes.sky!; // one diagonal segment, length 5

function follower(): RouteFollower {
  return { route: null, dist: 0, seg: 0, x: 0, y: 0 };
}

describe('segmentAt', () => {
  it('finds the segment with cum[seg] ≤ dist < cum[seg + 1], clamped to the route', () => {
    expect(segmentAt(road, 0)).toBe(0);
    expect(segmentAt(road, 0.999)).toBe(0);
    expect(segmentAt(road, 1)).toBe(1);
    expect(segmentAt(road, 4.5)).toBe(4);
    expect(segmentAt(road, 9)).toBe(8); // the end lies on the last segment
    expect(segmentAt(road, 50)).toBe(8);
    expect(segmentAt(road, -3)).toBe(0);
  });

  it('gives the same answer from any hint, including stale and out-of-range ones', () => {
    for (let d = 0; d <= 9; d += 0.25) {
      const want = segmentAt(road, d);
      for (const hint of [-5, 0, 3, 8, 40]) expect(segmentAt(road, d, hint)).toBe(want);
    }
  });
});

describe('pointAt', () => {
  it('interpolates through tile centers, turning at corners', () => {
    const p = { x: 0, y: 0 };
    expect(pointAt(road, 0, p)).toBe(0);
    expect(p).toEqual({ x: 0.5, y: 0.5 }); // the spawn tile's center
    pointAt(road, 2.5, p); // halfway down from (2,0) to (2,1)
    expect(p).toEqual({ x: 2.5, y: 1 });
    pointAt(road, 3, p); // exactly on the corner tile (2,1)
    expect(p).toEqual({ x: 2.5, y: 1.5 });
    pointAt(road, 9, p);
    expect(p).toEqual({ x: 5.5, y: 4.5 }); // the core tile's center
    pointAt(road, 12, p);
    expect(p).toEqual({ x: 5.5, y: 4.5 }); // clamped
    pointAt(road, -1, p);
    expect(p).toEqual({ x: 0.5, y: 0.5 });
  });

  it('interpolates along a diagonal air lane by distance', () => {
    const p = { x: 0, y: 0 };
    pointAt(sky, 2.5, p); // (2.5,0.5) → (5.5,4.5) is a 3-4-5 triangle
    expect(p.x).toBeCloseTo(4, 12);
    expect(p.y).toBeCloseTo(2.5, 12);
  });

  it('handles a degenerate zero-length route', () => {
    const dot: CompiledRoute = {
      ...road,
      tiles: [[1, 1]],
      xs: [1.5],
      ys: [1.5],
      cumLenTiles: [0],
      lengthTiles: 0,
    };
    const p = { x: 0, y: 0 };
    expect(pointAt(dot, 3, p)).toBe(0);
    expect(p).toEqual({ x: 1.5, y: 1.5 });
  });
});

describe('placeOnRoute / remainingDist', () => {
  it('places a follower and derives seg and position', () => {
    const f = follower();
    expect(remainingDist(f)).toBe(0);
    placeOnRoute(f, road);
    expect(f).toEqual({ route: road, dist: 0, seg: 0, x: 0.5, y: 0.5 });
    expect(remainingDist(f)).toBe(9);
    placeOnRoute(f, road, 6.5);
    expect(f).toMatchObject({ dist: 6.5, seg: 6, x: 3.5, y: 4 }); // (3,3) → (3,4)
    expect(remainingDist(f)).toBe(2.5);
  });
});
