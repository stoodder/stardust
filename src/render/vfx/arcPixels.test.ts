import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import { ARC_JITTER_PX, ARC_SEGMENTS, arcStrokeImage, jaggedArc } from './arcPixels.ts';

describe('the chain arc (art-direction §7 Energy)', () => {
  it('is a 2 px white-hot core between blue.3 edges, rimmed in ink at 60% (D097)', () => {
    const img = arcStrokeImage();
    expect([img.w, img.h]).toEqual([1, 6]);
    const at = (y: number): number[] => Array.from(img.data.slice(y * 4, y * 4 + 4));
    const ink = rgbOf('ink.0');
    const blue = rgbOf('blue.3');
    const white = rgbOf('white.1');
    expect(at(0)).toEqual([ink.r, ink.g, ink.b, 153]);
    expect(at(1)).toEqual([blue.r, blue.g, blue.b, 255]);
    expect(at(2)).toEqual([white.r, white.g, white.b, 255]);
    expect(at(3)).toEqual([white.r, white.g, white.b, 255]);
    expect(at(4)).toEqual([blue.r, blue.g, blue.b, 255]);
    expect(at(5)).toEqual([ink.r, ink.g, ink.b, 153]);
  });

  it('runs end to end in whole pixels, its kinks within the jitter of the straight line', () => {
    const out: number[] = [];
    let seed = 7;
    for (let k = 0; k < 20; k++) {
      seed = jaggedArc(10, 20, 70, 50, seed, out);
      expect(out).toHaveLength(2 * (ARC_SEGMENTS + 1));
      expect(out.slice(0, 2)).toEqual([10, 20]);
      expect(out.slice(-2)).toEqual([70, 50]);
      for (let i = 0; i <= ARC_SEGMENTS; i++) {
        const x = out[2 * i]!;
        const y = out[2 * i + 1]!;
        expect(Number.isInteger(x) && Number.isInteger(y)).toBe(true);
        // Distance from the line through the ends.
        const d = Math.abs((60 * (20 - y) - (10 - x) * 30) / Math.hypot(60, 30));
        expect(d).toBeLessThanOrEqual(ARC_JITTER_PX + 1);
      }
    }
  });

  it('is regenerated from its seed: the same seed, the same arc; a new one, a new arc', () => {
    const a: number[] = [];
    const b: number[] = [];
    const next = jaggedArc(0, 0, 50, 0, 123, a);
    jaggedArc(0, 0, 50, 0, 123, b);
    expect(b).toEqual(a);
    jaggedArc(0, 0, 50, 0, next, b);
    expect(b).not.toEqual(a);
  });
});
