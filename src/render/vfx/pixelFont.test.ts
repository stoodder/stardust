import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import { canDraw, GLYPH_H, textImage } from './pixelFont.ts';

/** A glyph's pixels as a string (red channel), to tell glyphs apart. */
const lit = (ch: string): string =>
  Array.from(textImage(ch, 'white.1').data.filter((_, i) => i % 4 === 0)).join(',');

describe('the 3×5 pixel font', () => {
  it('lays glyphs out 1 px apart inside a 1 px outline', () => {
    const img = textImage('−12', 'red.3');
    expect(img.w).toBe(3 * 4 - 1 + 2);
    expect(img.h).toBe(GLYPH_H + 2);
    const at = (x: number, y: number) =>
      Array.from(img.data.subarray((y * img.w + x) * 4, (y * img.w + x) * 4 + 4));
    const red = rgbOf('red.3');
    const ink = rgbOf('ink.0');
    // The minus bar is row 2 of the glyph (row 3 of the image).
    expect(at(1, 3)).toEqual([red.r, red.g, red.b, 255]);
    expect(at(1, 2)).toEqual([ink.r, ink.g, ink.b, 255]);
    // Corners stay clear.
    expect(at(0, 0)[3]).toBe(0);
  });

  it('only draws what it has glyphs for', () => {
    expect(canDraw('+126')).toBe(true);
    expect(canDraw('-100')).toBe(true);
    expect(canDraw('x')).toBe(false);
    expect(() => textImage('a', 'gold.4')).toThrow(/no glyph/);
  });

  it('draws the floating callouts in capitals (D059), with S and 5 told apart', () => {
    expect(canDraw('CROSSFIRE!')).toBe(true);
    expect(canDraw('SITTING DUCKS!')).toBe(true);
    expect(canDraw('ABCDEFGHIJKLMNOPQRSTUVWXYZ ! 0123456789')).toBe(true);
    expect(lit('S')).not.toBe(lit('5'));
  });
});
