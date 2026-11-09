// Small render-drawn pixel art (pure RGBA buffers, unit-tested; registered as textures by the
// views that use them):
// - The **plink spark** (art-direction §8 Armored: a "plink" spark on hits that do nothing): a 7×7
//   white star with steel arms that shrinks over three frames. Gerald wears it on every shot aimed
//   at him (`NeutralHit`, D072).
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';

/** Paints char rows into RGBA with `colors` ('.' is transparent; every row the same width). */
export function paintRows(
  rowsIn: readonly string[],
  colors: Readonly<Record<string, ColorName>>,
): RgbaImage {
  const h = rowsIn.length;
  const w = rowsIn[0]?.length ?? 0;
  const data = new Uint8ClampedArray(w * h * 4);
  rowsIn.forEach((row, y) => {
    if (row.length !== w) throw new Error(`paintRows: row ${y} is ${row.length} wide, not ${w}`);
    for (let x = 0; x < w; x++) {
      const ch = row[x]!; // x < w
      if (ch === '.') continue;
      const name = colors[ch];
      if (name === undefined) throw new Error(`paintRows: no color for '${ch}'`);
      const c = rgbOf(name);
      const i = (y * w + x) * 4;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = 255;
    }
  });
  return { w, h, data };
}

const SPARK_COLORS = { W: 'white.1', s: 'steel.4' } as const;

/** The plink spark's frames (7×7, its center pixel at (3, 3)): a star, a cross, a dot. */
export const PLINK_FRAMES: readonly (readonly string[])[] = [
  ['...s...', '...s...', '..sWs..', 'ssWWWss', '..sWs..', '...s...', '...s...'],
  ['.......', '...s...', '...W...', '.sWWWs.', '...W...', '...s...', '.......'],
  ['.......', '.......', '...s...', '..sWs..', '...s...', '.......', '.......'],
];
/** The spark's center pixel (an edge coordinate: its display origin). */
export const PLINK_CENTER = { x: 3, y: 3 } as const;
/** Each frame shows this long (ms): the whole spark is gone in a blink. */
export const PLINK_FRAME_MS = 50;

export function plinkImages(): RgbaImage[] {
  return PLINK_FRAMES.map((f) => paintRows(f, SPARK_COLORS));
}
