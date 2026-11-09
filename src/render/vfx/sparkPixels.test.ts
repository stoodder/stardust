import { describe, expect, it } from 'vitest';
import { paintRows, PLINK_FRAMES, plinkImages } from './sparkPixels.ts';

describe('the plink spark', () => {
  it('paints the plink frames at 7×7, shrinking frame by frame', () => {
    const imgs = plinkImages();
    expect(imgs).toHaveLength(PLINK_FRAMES.length);
    const lit = imgs.map((img) => {
      expect([img.w, img.h]).toEqual([7, 7]);
      let n = 0;
      for (let i = 3; i < img.data.length; i += 4) if (img.data[i] === 255) n++;
      return n;
    });
    expect(lit[0]).toBeGreaterThan(lit[1]!);
    expect(lit[1]).toBeGreaterThan(lit[2]!);
    // The center is lit on every frame (white-hot).
    for (const img of imgs) expect(img.data[(3 * 7 + 3) * 4 + 3]).toBe(255);
  });

  it('rejects ragged rows and unknown colors', () => {
    expect(() => paintRows(['ab', 'a'], { a: 'white.0', b: 'ink.0' })).toThrow(/row 1/);
    expect(() => paintRows(['z'], {})).toThrow(/no color/);
  });
});
