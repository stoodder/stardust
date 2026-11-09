import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import {
  BRACKET_ARM,
  bubbleSize,
  hexBubbleImage,
  solidImage,
  targetBracketImage,
} from './markPixels.ts';

function at(img: { w: number; data: Uint8ClampedArray }, x: number, y: number) {
  const i = (y * img.w + x) * 4;
  return {
    r: img.data[i] ?? 0,
    g: img.data[i + 1] ?? 0,
    b: img.data[i + 2] ?? 0,
    a: img.data[i + 3] ?? 0,
  };
}

describe('the shield bubble', () => {
  it('is a closed 1 px hexagon round the body, lit on its upper left, hollow inside', () => {
    const img = hexBubbleImage(16, 12);
    expect([img.w, img.h]).toEqual([bubbleSize(16, 12).w, bubbleSize(16, 12).h]);
    const mid = Math.floor((img.h - 1) / 2);
    // Its left and right points, the flat top and bottom.
    expect(at(img, 0, mid).a).toBe(255);
    expect(at(img, img.w - 1, mid).a).toBe(255);
    expect(at(img, Math.floor(img.w / 2), 0).a).toBe(255);
    expect(at(img, Math.floor(img.w / 2), img.h - 1).a).toBe(255);
    // The middle is see-through: the body shows.
    expect(at(img, Math.floor(img.w / 2), mid).a).toBe(0);
    // Each row crosses the outline exactly twice or runs along it (closed, no gaps).
    for (let y = 1; y < img.h - 1; y++) {
      let lit = 0;
      for (let x = 0; x < img.w; x++) if (at(img, x, y).a > 0) lit++;
      expect(lit).toBeGreaterThanOrEqual(2);
    }
    const hi = rgbOf('white.1');
    const top = at(img, Math.floor(img.w / 2), 0);
    expect([top.r, top.g, top.b]).toEqual([hi.r, hi.g, hi.b]);
    const edge = rgbOf('blue.3');
    const bottom = at(img, Math.floor(img.w / 2), img.h - 1);
    expect([bottom.r, bottom.g, bottom.b]).toEqual([edge.r, edge.g, edge.b]);
  });
});

describe('the target bracket', () => {
  it('has four green corners with an ink stroke outside, and nothing in the middle', () => {
    const img = targetBracketImage(12, 10);
    const green = rgbOf('green.4');
    const ink = rgbOf('ink.0');
    const corners: [number, number][] = [
      [1, 1],
      [img.w - 2, 1],
      [1, img.h - 2],
      [img.w - 2, img.h - 2],
    ];
    for (const [x, y] of corners) {
      const c = at(img, x, y);
      expect([c.r, c.g, c.b, c.a]).toEqual([green.r, green.g, green.b, 255]);
    }
    const out = at(img, 0, 0);
    expect([out.r, out.g, out.b]).toEqual([ink.r, ink.g, ink.b]);
    expect(at(img, 1 + BRACKET_ARM, 1).a).toBe(0);
    expect(at(img, Math.floor(img.w / 2), Math.floor(img.h / 2)).a).toBe(0);
  });
});

describe('debris pixels', () => {
  it('are solid white squares', () => {
    const img = solidImage(2);
    expect([img.w, img.h]).toEqual([2, 2]);
    expect(Array.from(img.data)).toEqual(Array.from({ length: 16 }, () => 255));
  });
});
