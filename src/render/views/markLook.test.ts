// T508: the Mark's eye and Truthlight's (markLook.ts; art-direction §8 *Status visuals*).
import { describe, expect, it } from 'vitest';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { HEALTH_BAR_MAX_W } from '../vfx/healthBar.ts';
import {
  EYE_H,
  EYE_OFFSET_X,
  EYE_W,
  eyeImage,
  eyeKindOf,
  MARK_LID,
  MARK_PUPIL,
  MARK_RIM,
  TRUTH_FILL,
  TRUTH_LID,
  type EyeKind,
} from './markLook.ts';

/** The (x, y) of every pixel of `kind`'s eye in `color`. */
function pixels(kind: EyeKind, color: ColorName): string[] {
  const img = eyeImage(kind);
  const c = rgbOf(color);
  const out: string[] = [];
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const i = (y * img.w + x) * 4;
      const d = img.data;
      if (d[i + 3] === 255 && d[i] === c.r && d[i + 1] === c.g && d[i + 2] === c.b) {
        out.push(`${x},${y}`);
      }
    }
  }
  return out;
}

function opaque(kind: EyeKind): number {
  const d = eyeImage(kind).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] === 255) n++;
  return n;
}

describe('the Mark’s eye', () => {
  it('is a 9×7 almond: a pink lid round a single pupil, rimmed in ink, hollow inside', () => {
    const img = eyeImage('mark');
    expect([img.w, img.h]).toEqual([EYE_W, EYE_H]);
    expect(pixels('mark', MARK_PUPIL)).toEqual(['4,3']);
    expect(pixels('mark', MARK_LID)).toHaveLength(12);
    expect(pixels('mark', MARK_RIM).length).toBeGreaterThan(12);
    // Lid + pupil + rim, and the inside left clear.
    const lit = 12 + 1 + pixels('mark', MARK_RIM).length;
    expect(opaque('mark')).toBe(lit);
    expect(pixels('mark', MARK_RIM)).not.toContain('3,3'); // inside the lid: clear, not rim
  });

  it('Truthlight’s is the same lid in gold, filled white: a different shape, not just colour', () => {
    expect(pixels('truth', TRUTH_LID)).toEqual(pixels('mark', MARK_LID)); // the same lid
    expect(pixels('truth', TRUTH_FILL)).toHaveLength(11); // the whole inside
    expect(opaque('truth')).toBe(opaque('mark') + 10); // the 10 clear inside pixels filled
  });

  it('stands right of the widest health bar', () => {
    expect(EYE_OFFSET_X).toBeGreaterThan(HEALTH_BAR_MAX_W / 2);
  });

  it('picks Truthlight’s while a unit can’t evade, else a Mark’s, else none', () => {
    expect(eyeKindOf(0, 0, 0)).toBeNull();
    expect(eyeKindOf(30, 0.15, 0)).toBe('mark');
    expect(eyeKindOf(30, 0.35, 30)).toBe('truth');
    expect(eyeKindOf(0, 0, 5)).toBe('truth');
  });
});
