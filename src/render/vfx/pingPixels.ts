// The playfield pointer (D059): a small gold arrow that bobs over a tower the radio is talking
// about (Bricks's "That one's Denise."). Pure pixels and timing, so they're unit-tested; the view
// is views/PingView.ts. Gold (`gold.3`) like the tile cursor, with an `ink.0` edge for light ground.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';

/** How long a ping shows (ms), and its bob: up 2 px every other quarter second. */
export const PING_MS = 3000;
export const PING_BOB_PX = 2;
const BOB_PERIOD_MS = 500;

// prettier-ignore
const ARROW_ROWS: readonly string[] = [
  '..ooooo..',
  '..o###o..',
  '..o###o..',
  'ooo###ooo',
  'o#######o',
  '.o#####o.',
  '..o###o..',
  '...o#o...',
  '....o....',
];

const COLORS: Readonly<Record<string, ColorName>> = { o: 'ink.0', '#': 'gold.3' };

/** The arrow (9×9, pointing down; its tip is the bottom row's middle pixel). */
export function pingArrowImage(): RgbaImage {
  const h = ARROW_ROWS.length;
  const w = ARROW_ROWS[0]?.length ?? 0;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const name = COLORS[ARROW_ROWS[y]?.charAt(x) ?? '.'];
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

/** The arrow's lift (px) `ms` into a ping: a 2 px bob, still under reduced motion. */
export function pingBob(ms: number, reduced: boolean): number {
  if (reduced) return 0;
  return ms % BOB_PERIOD_MS < BOB_PERIOD_MS / 2 ? PING_BOB_PX : 0;
}
