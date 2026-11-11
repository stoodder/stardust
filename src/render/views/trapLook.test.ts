// T630a: Underfoot's snare (trapLook.ts): its jaws, its breath, its last second's blink.
import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import { STEPPED_ALPHA } from '../vfx/fxTiming.ts';
import { ringImage } from '../vfx/overlayPixels.ts';
import {
  BLINK_TICKS,
  BREATH_TICKS,
  TRAP_COLOR,
  TRAP_JAW,
  TRAP_TILES,
  TRAP_UNDER,
  trapAlpha,
  trapImage,
  WARN_TICKS,
} from './trapLook.ts';

function px(img: { w: number; data: Uint8ClampedArray }, x: number, y: number): number[] {
  const i = (y * img.w + x) * 4;
  return [img.data[i]!, img.data[i + 1]!, img.data[i + 2]!, img.data[i + 3]!];
}
const rgba = (c: Parameters<typeof rgbOf>[0]): number[] => {
  const { r, g, b } = rgbOf(c);
  return [r, g, b, 255];
};

describe("Underfoot's snare (T630a)", () => {
  it('is the moss ring with green.4 jaws biting in at its points', () => {
    const trap = trapImage();
    const ring = ringImage(TRAP_TILES, TRAP_COLOR, false, TRAP_UNDER);
    expect([trap.image.w, trap.image.h]).toEqual([ring.image.w, ring.image.h]);
    expect([trap.cx, trap.cy]).toEqual([ring.cx, ring.cy]);
    // The ring's own left point is unchanged; the jaws sit just inside it, either side of the axis.
    expect(px(trap.image, 0, trap.cy)).toEqual(rgba(TRAP_COLOR));
    expect(px(trap.image, 1, trap.cy - 1)).toEqual(rgba(TRAP_JAW));
    expect(px(trap.image, trap.image.w - 2, trap.cy + 1)).toEqual(rgba(TRAP_JAW));
    expect(px(trap.image, trap.cx - 1, 1)).toEqual(rgba(TRAP_JAW));
    // The middle stays open: it's a ring, not a disc.
    expect(px(trap.image, trap.cx, trap.cy)[3]).toBe(0);
  });

  it('breathes 100% ↔ 60% while armed, blinks at 4 Hz in its last second, holds under reduced motion', () => {
    const armed = new Set<number>();
    for (let t = WARN_TICKS + 1; t < WARN_TICKS + 4 * BREATH_TICKS; t++)
      armed.add(trapAlpha(t, false));
    expect([...armed].toSorted((a, b) => a - b)).toEqual([STEPPED_ALPHA[1], 1]);
    const warn = new Set<number>();
    for (let t = 1; t <= WARN_TICKS; t++) warn.add(trapAlpha(t, false));
    expect([...warn].toSorted((a, b) => a - b)).toEqual([0, 1]);
    expect(trapAlpha(BLINK_TICKS, false)).toBe(0);
    for (let t = 1; t < 300; t++) expect(trapAlpha(t, true)).toBe(1);
    expect(trapAlpha(0, true)).toBe(0);
  });
});
