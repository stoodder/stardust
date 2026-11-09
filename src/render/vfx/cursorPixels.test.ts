import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import { inTileMask } from '../../content/sprites/helpers.ts';
import {
  CURSOR_COLOR,
  CURSOR_H,
  CURSOR_MARGIN,
  CURSOR_W,
  tileCursorImage,
} from './cursorPixels.ts';

describe('tileCursorImage', () => {
  const img = tileCursorImage();
  const px = (x: number, y: number) => {
    const i = (y * img.w + x) * 4;
    return { r: img.data[i], g: img.data[i + 1], b: img.data[i + 2], a: img.data[i + 3] };
  };
  const gold = rgbOf(CURSOR_COLOR);
  const isGold = (x: number, y: number): boolean => {
    const p = px(x, y);
    return p.a === 255 && p.r === gold.r && p.g === gold.g && p.b === gold.b;
  };

  const goldIn = (x0: number, x1: number, y0: number, y1: number): boolean => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (isGold(x, y)) return true;
    return false;
  };

  it('leaves the tile itself clear', () => {
    expect([img.w, img.h]).toEqual([CURSOR_W, CURSOR_H]);
    for (let y = 0; y < img.h; y++) {
      for (let x = 0; x < img.w; x++) {
        if (inTileMask(x - CURSOR_MARGIN, y - CURSOR_MARGIN)) expect(px(x, y).a).toBe(0);
      }
    }
  });

  it('brackets all four vertices and leaves the middle of each edge open', () => {
    const m = CURSOR_MARGIN;
    expect(goldIn(0, m + 2, 0, img.h - 1)).toBe(true); // left vertex
    expect(goldIn(img.w - m - 3, img.w - 1, 0, img.h - 1)).toBe(true); // right
    expect(goldIn(0, img.w - 1, 0, m)).toBe(true); // top
    expect(goldIn(0, img.w - 1, img.h - m - 1, img.h - 1)).toBe(true); // bottom
    // The middle of the top-left edge (tile x 7–9, y 2–4) is open.
    expect(goldIn(m + 7, m + 9, 0, m + 4)).toBe(false);
  });
});
