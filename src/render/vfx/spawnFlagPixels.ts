// The "incoming" flag (T326, T431; core-loop.md § 2.2): a small pennant on a pole planted on each
// spawn the next wave comes from, pulsing at 1 Hz in phase with the HUD's call pulse (still under
// reduced motion). Pure pixels; views/SpawnFlagView.ts draws them. The pennant is `red.3` with a
// `white.1` chevron pointing down the path (a shape, not only a color: "they come from here"), the
// pole `steel.4`, all edged in `ink.0` so it reads on any ground.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';

// prettier-ignore
const FLAG_ROWS: readonly string[] = [
  'ooooooo..',
  'o|rrrrro.',
  'o|r#rrrro',
  'o|rr#rrro',
  'o|r#rrrro',
  'o|rrrrro.',
  'o|ooooo..',
  'o|o......',
  'o|o......',
  'o|o......',
  'o|o......',
  'ooo......',
];

const COLORS: Readonly<Record<string, ColorName>> = {
  o: 'ink.0',
  '|': 'steel.4',
  r: 'red.3',
  '#': 'white.1',
};

/** The flag's foot (its pole's base) within the image: it stands on the spawn tile's center. */
export const FLAG_FOOT = { x: 1, y: FLAG_ROWS.length - 1 } as const;

/** The flag (9×12): a pennant on a pole, the pole's foot at FLAG_FOOT. */
export function spawnFlagImage(): RgbaImage {
  const h = FLAG_ROWS.length;
  const w = FLAG_ROWS[0]?.length ?? 0;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const name = COLORS[FLAG_ROWS[y]?.charAt(x) ?? '.'];
      if (name === undefined) continue;
      const c = rgbOf(name);
      const i = (y * w + x) * 4;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = 255;
    }
  }
  return { w, h, data };
}

/** The flag's alpha in its pulse: full, then dimmed for the off half (always full when reduced). */
export function spawnFlagAlpha(on: boolean, reduced: boolean): number {
  return reduced || on ? 1 : 0.55;
}
