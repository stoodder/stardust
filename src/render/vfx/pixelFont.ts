// The in-world 3×5 bitmap font (art-direction §9, Fonts: "in-world Phaser text uses a
// code-generated 3×5 bitmap font defined as glyph grids"). Digits, plus, and minus for floating
// numbers, and capitals, space, "%", and "!" for callouts and labels ("CROSSFIRE!",
// "+25% RANGE"; D059). Pure RGBA output (no canvas), so it's unit-tested; overlayTextures.ts
// registers the strings render draws.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { GLYPH_H, GLYPH_W, GLYPHS } from '../../content/sprites/font3x5.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';

export { GLYPH_H, GLYPH_W };

/** Whether the font can draw every character of `text`. */
export function canDraw(text: string): boolean {
  return text.split('').every((ch) => Object.hasOwn(GLYPHS, ch));
}

/**
 * `text` in the 3×5 font in `color`, 1 px apart, with a 1 px `outline` around every lit pixel
 * (8-neighbour), so it reads on any ground. Throws on a character the font lacks.
 */
export function textImage(text: string, color: ColorName, outline: ColorName = 'ink.0'): RgbaImage {
  // Every glyph is one UTF-16 unit (the minus sign included), so split is enough.
  const chars = text.split('');
  const inner = chars.length * (GLYPH_W + 1) - 1;
  const w = Math.max(1, inner) + 2;
  const h = GLYPH_H + 2;
  const lit = new Uint8Array(w * h);
  chars.forEach((ch, i) => {
    const g = GLYPHS[ch];
    if (g === undefined) throw new RangeError(`pixelFont: no glyph for '${ch}'`);
    for (let y = 0; y < GLYPH_H; y++) {
      for (let x = 0; x < GLYPH_W; x++) {
        if (g[y]?.charAt(x) === '#') lit[(y + 1) * w + 1 + i * (GLYPH_W + 1) + x] = 1;
      }
    }
  });
  const data = new Uint8ClampedArray(w * h * 4);
  const fg = rgbOf(color);
  const ol = rgbOf(outline);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let c = null;
      if (lit[y * w + x] === 1) {
        c = fg;
      } else {
        for (let dy = -1; dy <= 1 && c === null; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < w && ny < h && lit[ny * w + nx] === 1) {
              c = ol;
              break;
            }
          }
        }
      }
      if (c === null) continue;
      const i = (y * w + x) * 4;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = 255;
    }
  }
  return { w, h, data };
}
