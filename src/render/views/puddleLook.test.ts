// T705: Big Glorp's puddle look (puddleLook.ts): the pool's pixels and its drying fade.
import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import { STEPPED_ALPHA } from '../vfx/fxTiming.ts';
import { discImage } from '../vfx/overlayPixels.ts';
import {
  DRY_TICKS,
  PUDDLE_GLINT,
  PUDDLE_RIM,
  puddleAlpha,
  puddleImage,
  puddleKey,
} from './puddleLook.ts';

function px(img: { w: number; data: Uint8ClampedArray }, x: number, y: number): number[] {
  const i = (y * img.w + x) * 4;
  return [img.data[i]!, img.data[i + 1]!, img.data[i + 2]!, img.data[i + 3]!];
}
const rgba = (c: Parameters<typeof rgbOf>[0]): number[] => {
  const { r, g, b } = rgbOf(c);
  return [r, g, b, 255];
};

describe("Big Glorp's puddle (T705)", () => {
  it('is a translucent pool with a solid rim and glints, the size of its reach', () => {
    const p = puddleImage(1);
    const disc = discImage(1, PUDDLE_RIM);
    expect([p.image.w, p.image.h, p.cx, p.cy]).toEqual([
      disc.image.w,
      disc.image.h,
      disc.cx,
      disc.cy,
    ]);
    expect(px(p.image, 0, p.cy)).toEqual(rgba(PUDDLE_RIM)); // the rim's left point
    const inside = px(p.image, p.cx + 2, p.cy + 2);
    expect(inside[3]).toBeGreaterThan(0);
    expect(inside[3]).toBeLessThan(255); // the fill is see-through
    let glints = 0;
    for (let y = 0; y < p.image.h; y++) {
      for (let x = 0; x < p.image.w; x++) {
        if (px(p.image, x, y).join() === rgba(PUDDLE_GLINT).join()) glints++;
      }
    }
    expect(glints).toBe(3);
    expect(puddleKey(1)).toBe('fx.puddle_1');
    expect(puddleKey(1.1)).toBe('fx.puddle_1'); // snapped to the ring bake step
  });

  it('holds whole, then dries in steps over its last half second', () => {
    expect(puddleAlpha(180, false)).toBe(1);
    expect(puddleAlpha(DRY_TICKS + 1, false)).toBe(1);
    expect(puddleAlpha(DRY_TICKS, false)).toBe(STEPPED_ALPHA[0]);
    expect(puddleAlpha(1, false)).toBe(STEPPED_ALPHA[3]);
    expect(puddleAlpha(0, false)).toBe(0);
    expect(puddleAlpha(1, true)).toBe(1); // reduced motion: whole until it's gone
    const fade = Array.from({ length: DRY_TICKS }, (_, i) => puddleAlpha(DRY_TICKS - i, false));
    for (let i = 1; i < fade.length; i++) expect(fade[i]!).toBeLessThanOrEqual(fade[i - 1]!);
  });
});
