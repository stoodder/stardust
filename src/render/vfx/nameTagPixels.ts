// Bricks's name-tag plate (T431; art-direction.md § Dialogue presentation: "a 1 px-bordered `ink.1`
// plate above the tower in the `overlay` layer, with the name in the 3×5 bitmap font"). Pure
// pixels (no Phaser); render/views/NameTagView.ts registers the texture once per name.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';
import { canDraw, textImage } from './pixelFont.ts';

/** The plate's fill and text (art-direction's spec) and its edge: Bricks's name-plate orange. */
export const NAME_TAG_FILL: ColorName = 'ink.1';
export const NAME_TAG_TEXT: ColorName = 'white.1';
export const NAME_TAG_EDGE: ColorName = 'orange.4';
/** The most characters a tag carries (`NameTagDef.name`: ≤ 16 at worst case, D122). */
export const NAME_TAG_MAX_CHARS = 16;

/**
 * A tag's name as the 3×5 font can draw it: capitals, any character it has no glyph for dropped
 * (an apostrophe in a player's `{name}`), runs of spaces closed up, at most NAME_TAG_MAX_CHARS.
 */
export function nameTagText(name: string): string {
  const up = name.toUpperCase();
  let out = '';
  for (const ch of up) if (canDraw(ch)) out += ch;
  return out.replace(/ +/g, ' ').trim().slice(0, NAME_TAG_MAX_CHARS);
}

/**
 * The plate: `text` (already `nameTagText`) in `white.1` on `ink.1`, 1 px of fill round the
 * letters inside a 1 px `orange.4` edge with its corners clipped (the HUD's chamfer in miniature).
 * 4 px a character plus 3: "BISCUIT" is 30×9.
 */
export function nameTagImage(text: string): RgbaImage {
  // The font's outline is the plate's own fill, so it reads as 1 px of padding.
  const t = textImage(text.length === 0 ? ' ' : text, NAME_TAG_TEXT, NAME_TAG_FILL);
  const w = t.w + 2;
  const h = t.h + 2;
  const data = new Uint8ClampedArray(w * h * 4);
  const fill = rgbOf(NAME_TAG_FILL);
  const edge = rgbOf(NAME_TAG_EDGE);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const border = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      const corner = (x === 0 || x === w - 1) && (y === 0 || y === h - 1);
      if (corner) continue;
      const i = (y * w + x) * 4;
      let c = border ? edge : fill;
      if (!border) {
        const j = ((y - 1) * t.w + (x - 1)) * 4;
        if ((t.data[j + 3] ?? 0) > 0) {
          c = { r: t.data[j] ?? 0, g: t.data[j + 1] ?? 0, b: t.data[j + 2] ?? 0 };
        }
      }
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = 255;
    }
  }
  return { w, h, data };
}
