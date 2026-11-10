// The Seer's Lantern's minimal look (T508; art-direction §8 *Status visuals*, Marked; §7 Psionic):
// pure rules, unit-tested, applied by MarkView. T530a polishes them.
// - **Marked:** a 7×5 almond eye in `pink.3` with a single `pink.4` pupil, rimmed in `ink.0` (9×7
//   with the rim, so it reads on bright ground and dark), standing beside the head, just right of
//   the health bar's slot, so neither the bar, the tell glyph, nor Unnerved's squiggle covers it.
// - **Truthlight** (a unit that can't evade): the same eye wide open, its lid `gold.3` and its whole
//   inside `white.1`: a filled eye, not a hollow one, so the shape tells them apart, not the colour.
// Static (no animation), so it reads the same under reduced motion.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';
import { HEALTH_BAR_MAX_W } from '../vfx/healthBar.ts';

export const MARK_LID: ColorName = 'pink.3';
export const MARK_PUPIL: ColorName = 'pink.4';
export const TRUTH_LID: ColorName = 'gold.3';
export const TRUTH_FILL: ColorName = 'white.1';
export const MARK_RIM: ColorName = 'ink.0';

/** The eye with its rim (px). */
export const EYE_W = 9;
export const EYE_H = 7;
/**
 * The eye's left edge sits this far right of the body's centre (px): clear of the widest health
 * bar (HEALTH_BAR_MAX_W, centred) with a pixel between.
 */
export const EYE_OFFSET_X = HEALTH_BAR_MAX_W / 2 + 1;

/** The eye's 7×5 lid ('L'), inside ('I'), and pupil ('P'), inside the 1 px rim. */
const LIDS = ['..LLL..', '.LIIIL.', 'LIIPIIL', '.LIIIL.', '..LLL..'] as const;

export type EyeKind = 'mark' | 'truth';

/** The eye for `kind`: a plain Mark's (hollow, a pupil) or Truthlight's (filled). */
export function eyeImage(kind: EyeKind): RgbaImage {
  const w = EYE_W;
  const h = EYE_H;
  const data = new Uint8ClampedArray(w * h * 4);
  const lid = rgbOf(kind === 'mark' ? MARK_LID : TRUTH_LID);
  const pupil = rgbOf(kind === 'mark' ? MARK_PUPIL : TRUTH_FILL);
  const fill = kind === 'truth' ? rgbOf(TRUTH_FILL) : null;
  const rim = rgbOf(MARK_RIM);
  const lit = (x: number, y: number): boolean => {
    const row = LIDS[y - 1];
    return row !== undefined && x >= 1 && x <= 7 && row[x - 1] !== '.';
  };
  const put = (x: number, y: number, c: { r: number; g: number; b: number }): void => {
    const i = (y * w + x) * 4;
    data[i] = c.r;
    data[i + 1] = c.g;
    data[i + 2] = c.b;
    data[i + 3] = 255;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = lit(x, y) ? LIDS[y - 1]![x - 1]! : '.'; // lit: 1 ≤ y ≤ 5, 1 ≤ x ≤ 7
      if (ch === 'L') put(x, y, lid);
      else if (ch === 'P') put(x, y, pupil);
      else if (ch === 'I') {
        if (fill !== null) put(x, y, fill);
      } else if (lit(x - 1, y) || lit(x + 1, y) || lit(x, y - 1) || lit(x, y + 1)) {
        put(x, y, rim); // the rim: any outside pixel beside the eye
      }
    }
  }
  return { w, h, data };
}

/** Which eye a unit wears: Truthlight's while it can't evade, else a plain Mark's, else none. */
export function eyeKindOf(markTicks: number, markPct: number, noEvadeTicks: number): EyeKind | null {
  if (noEvadeTicks > 0) return 'truth';
  return markTicks > 0 && markPct > 0 ? 'mark' : null;
}
