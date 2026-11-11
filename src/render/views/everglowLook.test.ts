// Everglow Security's looks (T603; everglowLook.ts): the haste ring's metronome, the speed lines,
// the shutdown's power-off line and falling price tag, and the faction's death row.
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
  priceTagImage,
  SHUTDOWN_HALF_W,
  SHUTDOWN_LINE_MS,
  SHUTDOWN_MS,
  shutdownLine,
  SPEED_LINES_SIZE,
  speedLinesFrame,
  speedLinesImage,
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

describe('the speed lines', () => {
  it('are three orange streaks in an ink rim, stepping back a pixel between frames', () => {
    for (const f of [0, 1] as const) {
      const img = speedLinesImage(f);
      expect([img.w, img.h]).toEqual([SPEED_LINES_SIZE, SPEED_LINES_SIZE]);
    }
    const a = speedLinesImage(0);
    const b = speedLinesImage(1);
    expect(px(a, 2, 1)).toEqual(rgba(HASTE_COLOR)); // frame 0's top streak starts at x 1 (+ rim)
    expect(px(b, 1, 1)).toEqual(rgba(HASTE_COLOR)); // frame 1's a pixel further back
    expect(px(a, 1, 1)).toEqual(rgba('ink.0'));
    expect(px(a, 0, 0)[3]).toBe(0); // clear outside the rim
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

  it('the price tag: a white tag on a steel string, a punched hole, a gold price line, an ink rim', () => {
    const img = priceTagImage();
    expect([img.w, img.h]).toEqual([7, 10]);
    expect(px(img, 3, 1)).toEqual(rgba('steel.4')); // the string
    expect(px(img, 3, 4)).toEqual(rgba('ink.1')); // the hole
    expect(px(img, 3, 6)).toEqual(rgba('gold.3')); // the price
    expect(px(img, 1, 5)).toEqual(rgba('white.1'));
    expect(px(img, 0, 5)).toEqual(rgba('ink.0'));
  });
});
