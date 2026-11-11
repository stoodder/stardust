// Everglow Security's looks (T603, T630a; everglowLook.ts): the haste ring's metronome and swell,
// the speed marks and their heading, the shutdown's power-off line and falling price tag, and the
// faction's death row.
import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import { PRESENTATION } from '../../content/presentation.ts';
import { STEPPED_ALPHA } from '../vfx/fxTiming.ts';
import { deathStyle } from './deathLook.ts';
import {
  HASTE_COLOR,
  METRONOME_HIGH_TICKS,
  METRONOME_TICKS,
  metronomeHigh,
  screenHeading,
  SHUTDOWN_HALF_W,
  SHUTDOWN_LINE_MS,
  SHUTDOWN_MS,
  shutdownLine,
  SPEED_MARKS_H,
  SPEED_MARKS_W,
  speedLinesFrame,
  speedMarksImage,
  SWELL_COLOR,
  SWELL_PX,
  swellPx,
  swellRingImage,
  TAG_FALL_MS,
  TAG_MS,
  tagDrop,
} from './everglowLook.ts';

/** The pixel at (x, y) as [r, g, b, a]. */
function px(img: { w: number; data: Uint8ClampedArray }, x: number, y: number): number[] {
  const i = (y * img.w + x) * 4;
  return [img.data[i]!, img.data[i + 1]!, img.data[i + 2]!, img.data[i + 3]!];
}
const rgba = (c: Parameters<typeof rgbOf>[0]): number[] => {
  const { r, g, b } = rgbOf(c);
  return [r, g, b, 255];
};

describe('the haste ring’s metronome', () => {
  it('beats bright for a sixth of each half second, on sim ticks; steady under reduced motion', () => {
    expect(METRONOME_TICKS).toBe(30);
    const highs = Array.from({ length: METRONOME_TICKS }, (_, t) => metronomeHigh(t, false));
    expect(highs.filter(Boolean)).toHaveLength(METRONOME_HIGH_TICKS);
    expect(metronomeHigh(0, false)).toBe(true);
    expect(metronomeHigh(METRONOME_HIGH_TICKS, false)).toBe(false);
    expect(metronomeHigh(METRONOME_TICKS, false)).toBe(true);
    for (let t = 0; t < 90; t++) expect(metronomeHigh(t, true)).toBe(true);
  });
});

describe('the swell (T630a)', () => {
  it('ticks out on the beat, a step further for its second half, gone between beats', () => {
    expect(swellPx(0, false)).toBe(SWELL_PX);
    expect(swellPx(METRONOME_HIGH_TICKS - 1, false)).toBe(2 * SWELL_PX);
    expect(swellPx(METRONOME_HIGH_TICKS, false)).toBe(0);
    expect(swellPx(METRONOME_TICKS, false)).toBe(SWELL_PX);
    for (let t = 0; t < 60; t++) expect(swellPx(t, true)).toBe(0);
  });

  it("is a solid orange.4 ellipse SWELL_PX outside the ring, on the ring's centre", () => {
    const ring = swellRingImage(2, SWELL_PX);
    const wide = swellRingImage(2, 2 * SWELL_PX);
    expect(wide.image.w - ring.image.w).toBe(2 * SWELL_PX);
    expect(ring.cx).toBe((ring.image.w - 1) / 2);
    // Its rightmost pixel on the centre row is lit, in the swell colour.
    expect(px(ring.image, ring.image.w - 1, ring.cy)).toEqual(rgba(SWELL_COLOR));
    expect(px(ring.image, ring.cx, ring.cy)[3]).toBe(0);
  });
});

describe('the speed marks (T630a: a double chevron, pointing the way the unit walks)', () => {
  it('are a » in an ink rim, lit leading, stepping back a pixel between frames', () => {
    for (const f of [0, 1] as const) {
      const img = speedMarksImage(f, 1);
      expect([img.w, img.h]).toEqual([SPEED_MARKS_W, SPEED_MARKS_H]);
    }
    const a = speedMarksImage(0, 1);
    const b = speedMarksImage(1, 1);
    // Frame 0's leading chevron tip, on the middle row at the right edge (inside the rim).
    expect(px(a, SPEED_MARKS_W - 2, 3)).toEqual(rgba('orange.4'));
    expect(px(a, 2, 1)).toEqual(rgba(HASTE_COLOR)); // the trailing chevron's top
    expect(px(b, 1, 1)).toEqual(rgba(HASTE_COLOR)); // a pixel further back
    expect(px(a, 0, 0)[3]).toBe(0); // clear outside the rim
  });

  it('mirror for a unit walking left', () => {
    const r = speedMarksImage(0, 1);
    const l = speedMarksImage(0, -1);
    for (let y = 0; y < SPEED_MARKS_H; y++) {
      for (let x = 0; x < SPEED_MARKS_W; x++) {
        expect(px(l, x, y)).toEqual(px(r, SPEED_MARKS_W - 1 - x, y));
      }
    }
  });

  it("read the heading on screen: the iso camera's x is col − row", () => {
    expect(screenHeading(1, 0)).toBe(1);
    expect(screenHeading(0, -1)).toBe(1);
    expect(screenHeading(-1, 0)).toBe(-1);
    expect(screenHeading(0, 1)).toBe(-1);
    expect(screenHeading(1, 1)).toBe(0);
  });

  it('alternate on the half-beat, offset per uid; frame 0 under reduced motion', () => {
    const frames = new Set<number>();
    for (let t = 0; t < 60; t++) frames.add(speedLinesFrame(t, 1, false));
    expect([...frames].toSorted((a, b) => a - b)).toEqual([0, 1]);
    expect(speedLinesFrame(0, 1, false)).not.toBe(speedLinesFrame(0, 3, false));
    for (let t = 0; t < 60; t++) expect(speedLinesFrame(t, 5, true)).toBe(0);
  });
});

describe('the shutdown (enemies.md § 8: a clean shutdown and a falling price tag)', () => {
  it('Everglow Security shuts down in every act; no other faction does', () => {
    for (const act of [1, 2, 3, 'finale'] as const) {
      const dial = PRESENTATION.byAct[act].skitterkinDeath;
      expect(deathStyle(dial, 'everglow')).toBe('shutdown');
      expect(deathStyle(dial, 'skitterkin')).not.toBe('shutdown');
      expect(deathStyle(dial, 'aelari')).toBe('shatter');
      expect(deathStyle(dial, 'hollow')).toBe('unravel');
    }
  });

  it('the power-off line collapses to a dot in whole pixels, then winks out', () => {
    expect(shutdownLine(0)).toEqual({ halfW: SHUTDOWN_HALF_W, alpha: 1 });
    const widths: number[] = [];
    for (let ms = 0; ms < SHUTDOWN_LINE_MS; ms += 5) widths.push(shutdownLine(ms).halfW);
    for (let i = 1; i < widths.length; i++) expect(widths[i]!).toBeLessThanOrEqual(widths[i - 1]!);
    for (const w of widths) expect(Number.isInteger(w) && w >= 1).toBe(true);
    expect(shutdownLine(SHUTDOWN_LINE_MS)).toEqual({ halfW: 0, alpha: STEPPED_ALPHA[0] });
    expect(shutdownLine(SHUTDOWN_MS - 1).alpha).toBe(STEPPED_ALPHA[STEPPED_ALPHA.length - 1]);
    expect(shutdownLine(SHUTDOWN_MS).alpha).toBe(0);
    expect(shutdownLine(-1).alpha).toBe(0);
  });

  it('the tag falls under gravity to the ground, lies there, then fades out by TAG_MS', () => {
    expect(tagDrop(0, 9, false)).toEqual({ dy: 0, alpha: 1 });
    const mid = tagDrop(TAG_FALL_MS / 2, 9, false);
    expect(mid.dy).toBeGreaterThan(0);
    expect(mid.dy).toBeLessThan(9 / 2); // accelerating: under half the way at half the time
    expect(tagDrop(TAG_FALL_MS, 9, false)).toEqual({ dy: 9, alpha: 1 });
    expect(tagDrop(TAG_MS - 1, 9, false)).toEqual({ dy: 9, alpha: STEPPED_ALPHA.at(-1) });
    expect(tagDrop(TAG_MS, 9, false).alpha).toBe(0);
    // Reduced motion: it fades where it hung.
    expect(tagDrop(TAG_FALL_MS, 9, true)).toEqual({ dy: 0, alpha: 1 });
  });
});
