// The 3×5 bitmap font's glyph grids (art-direction §9, Fonts: "in-world Phaser text uses a
// code-generated 3×5 bitmap font defined as glyph grids"). Pure data, the font's one home: render's
// `vfx/pixelFont.ts` rasterizes strings from it, and sprites that carry lettering (the Rig 9 feed's
// on-screen display) stamp it into their grids with `stampText`.

export const GLYPH_W = 3;
export const GLYPH_H = 5;

// prettier-ignore
export const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '.##', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
  '+': ['...', '.#.', '###', '.#.', '...'],
  '-': ['...', '...', '###', '...', '...'],
  '−': ['...', '...', '###', '...', '...'],
  ' ': ['...', '...', '...', '...', '...'],
  '%': ['#.#', '..#', '.#.', '#..', '#.#'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'],
  '·': ['...', '...', '.#.', '...', '...'],
  ':': ['...', '.#.', '...', '.#.', '...'],
  '.': ['...', '...', '...', '...', '.#.'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'],
  N: ['##.', '#.#', '#.#', '#.#', '#.#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#.#', '#.#', '###', '###', '#.#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'],
};

/** The pixel width of `text` in the font at `scale` (glyphs 1 px apart at scale 1). */
export function textWidth(text: string, scale = 1): number {
  return Math.max(0, text.length * (GLYPH_W + 1) - 1) * scale;
}

/**
 * The lit pixels of `text` at (x, y) (top-left), each glyph pixel a `scale`×`scale` block, glyphs
 * `scale` px apart. Characters the font lacks are skipped.
 */
export function textPixels(
  text: string,
  x: number,
  y: number,
  scale = 1,
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  text.split('').forEach((ch, i) => {
    const g = GLYPHS[ch];
    if (g === undefined) return;
    const ox = x + i * (GLYPH_W + 1) * scale;
    for (let gy = 0; gy < GLYPH_H; gy++) {
      for (let gx = 0; gx < GLYPH_W; gx++) {
        if (g[gy]?.charAt(gx) !== '#') continue;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++)
            out.push({ x: ox + gx * scale + sx, y: y + gy * scale + sy });
        }
      }
    }
  });
  return out;
}
