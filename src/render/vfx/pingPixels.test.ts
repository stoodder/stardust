import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import { pingArrowImage, pingBob, PING_BOB_PX } from './pingPixels.ts';

describe('the playfield pointer (D059)', () => {
  it('is a gold arrow with an ink edge, pointing down', () => {
    const img = pingArrowImage();
    const at = (x: number, y: number) =>
      Array.from(img.data.subarray((y * img.w + x) * 4, (y * img.w + x) * 4 + 4));
    const gold = rgbOf('gold.3');
    const ink = rgbOf('ink.0');
    expect(at(4, 4)).toEqual([gold.r, gold.g, gold.b, 255]);
    expect(at(4, img.h - 1)).toEqual([ink.r, ink.g, ink.b, 255]);
    expect(at(0, 0)[3]).toBe(0);
  });

  it('bobs 2 px, and holds still under reduced motion', () => {
    expect(pingBob(0, false)).toBe(PING_BOB_PX);
    expect(pingBob(300, false)).toBe(0);
    expect(pingBob(300, true)).toBe(0);
    expect(pingBob(0, true)).toBe(0);
  });
});
