// The Hold Fire marker (core-loop §2.7, art-direction §8): a holding tower wears a small pause
// plate above its head and dims to `steel.3`, so "this one isn't firing" reads by shape, not by
// color alone. Pure pixels (no Phaser); TowerView registers the texture.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';

/** The tint a holding tower's base and head take (multiply): `steel.3`, about 60% and cool. */
export const HOLD_TINT_COLOR: ColorName = 'steel.3';

/** The plate's pixels: `o` the ink.0 edge, `f` the ink.2 fill, `#` the white.1 pause bars. */
// prettier-ignore
const HOLD_MARKER_ROWS: readonly string[] = [
  '.ooooooo.',
  'offfffffo',
  'of##f##fo',
  'of##f##fo',
  'of##f##fo',
  'of##f##fo',
  'of##f##fo',
  'offfffffo',
  '.ooooooo.',
];

const ROW_COLORS: Readonly<Record<string, ColorName>> = {
  o: 'ink.0',
  f: 'ink.2',
  '#': 'white.1',
};

/** The marker as RGBA (9×9, chamfered corners transparent). */
export function holdMarkerImage(): RgbaImage {
  const h = HOLD_MARKER_ROWS.length;
  const w = HOLD_MARKER_ROWS[0]?.length ?? 0;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const name = ROW_COLORS[HOLD_MARKER_ROWS[y]?.charAt(x) ?? '.'];
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

/** A palette color as a Phaser tint (0xRRGGBB). */
export function tintOf(name: ColorName): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}
