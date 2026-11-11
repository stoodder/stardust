// The x-ray's watch (review R3): Bricks's outline comes on while a tower draws in front of him.
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

  it('never shows for a hidden body', () => {
    expect(watch.hidden(drawn(100, 0, 0, 0, 0), [drawn(116, 0, 0, 40, 40)])).toBe(false);
  });
});
