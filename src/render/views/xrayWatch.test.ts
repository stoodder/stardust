// The x-ray's watch (review R3, R2-S3): Bricks's x-ray comes on while a tower draws in front of him,
// and it lists the towers he shows through.
import { describe, expect, it } from 'vitest';
import type { Rect } from '../vfx/xrayPixels.ts';
import { XrayWatch, type Drawn } from './xrayWatch.ts';

function drawn(depth: number, x: number, y: number, w: number, h: number): Drawn {
  return {
    depth,
    bounds(out: Rect): Rect {
      out.x = x;
      out.y = y;
      out.w = w;
      out.h = h;
      return out;
    },
  };
}

describe("the x-ray's watch (review R3)", () => {
  const watch = new XrayWatch();
  const him = drawn(100, 0, 0, 28, 30);

  it('sees a tower in front of him, and none behind or beside', () => {
    expect(watch.hidden(him, [drawn(116, 2, 8, 32, 44)])).toBe(true);
    expect(watch.hidden(him, [drawn(84, 2, -20, 32, 44)])).toBe(false);
    expect(watch.hidden(him, [drawn(116, 40, 8, 32, 44)])).toBe(false);
    expect(watch.hidden(him, [])).toBe(false);
    // One among several is enough.
    expect(watch.hidden(him, [drawn(84, 2, -20, 32, 44), drawn(116, 2, 8, 32, 44)])).toBe(true);
  });

  it('lists every tower in front that overlaps him once one covers enough, none behind', () => {
    const big = drawn(116, 2, 8, 32, 44);
    const graze = drawn(120, 26, 0, 30, 40); // in front, 2 px of overlap: below 15%
    const behind = drawn(84, 2, -20, 32, 44);
    expect(watch.hidden(him, [behind, big, graze])).toBe(true);
    expect(watch.front).toEqual([big, graze]);
    // A graze alone neither turns it on nor leaves a list behind.
    expect(watch.hidden(him, [graze])).toBe(false);
    expect(watch.front).toEqual([]);
  });

  it('never shows for a hidden body', () => {
    expect(watch.hidden(drawn(100, 0, 0, 0, 0), [drawn(116, 0, 0, 40, 40)])).toBe(false);
  });
});
