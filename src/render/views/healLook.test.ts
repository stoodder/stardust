// T703: the healer aura's and the open panel's looks (healLook.ts): the pulse's timing, radii and
// fade, the ✚'s lift, the spark's blink, reduced motion, and the pixel images.
import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import {
  PANEL_ROWS,
  PLUS_SIZE,
  PULSE_FROM,
  PULSE_STEPS,
  PULSE_STEP_TICKS,
  PULSE_TICKS,
  panelImage,
  panelSpark,
  plusImage,
  plusLifted,
  pulseAlpha,
  pulseRadius,
  pulseStep,
} from './healLook.ts';

describe('the heal pulse (art-direction §8 `healer`: an expanding ring pulse)', () => {
  it('runs once a second in PULSE_STEPS steps, then rests; offset per uid', () => {
    const steps = Array.from({ length: PULSE_TICKS }, (_, t) => pulseStep(t, 0, false));
    expect(steps[0]).toBe(0);
    expect(steps[PULSE_STEP_TICKS]).toBe(1);
    expect(steps[PULSE_STEPS * PULSE_STEP_TICKS - 1]).toBe(PULSE_STEPS - 1);
    expect(steps[PULSE_STEPS * PULSE_STEP_TICKS]).toBe(-1);
    expect(pulseStep(PULSE_TICKS, 0, false)).toBe(0); // the next second
    expect(pulseStep(0, 1, false)).not.toBe(pulseStep(0, 0, false));
  });

  it('expands from a quarter of the radius to the ring, fading as it goes', () => {
    expect(pulseRadius(1.5, 0)).toBeCloseTo(1.5 * PULSE_FROM, 12);
    expect(pulseRadius(1.5, PULSE_STEPS - 1)).toBeCloseTo(1.5, 12);
    for (let s = 1; s < PULSE_STEPS; s++) {
      expect(pulseRadius(1.5, s)).toBeGreaterThan(pulseRadius(1.5, s - 1));
      expect(pulseAlpha(s)).toBeLessThan(pulseAlpha(s - 1));
    }
  });

  it('under reduced motion: no pulse, the ✚ still, the spark steady', () => {
    for (let t = 0; t < PULSE_TICKS; t++) {
      expect(pulseStep(t, 3, true)).toBe(-1);
      expect(plusLifted(t, 3, true)).toBe(false);
      expect(panelSpark(t, 3, true)).toBe(true);
    }
  });

  it('the ✚ lifts on the pulse’s second half; the spark blinks on the 3 Hz tell step', () => {
    expect(plusLifted(0, 0, false)).toBe(false);
    expect(plusLifted(PULSE_TICKS / 2, 0, false)).toBe(true);
    expect(panelSpark(0, 0, false)).toBe(true);
    expect(panelSpark(10, 0, false)).toBe(false);
  });
});

describe('the images', () => {
  it('the ✚ is a green cross with a white heart in an ink rim', () => {
    const img = plusImage();
    expect([img.w, img.h]).toEqual([PLUS_SIZE, PLUS_SIZE]);
    const at = (x: number, y: number): number[] => {
      const i = (y * img.w + x) * 4;
      return [img.data[i]!, img.data[i + 1]!, img.data[i + 2]!, img.data[i + 3]!];
    };
    const { r, g, b } = rgbOf('white.1');
    expect(at(3, 3)).toEqual([r, g, b, 255]);
    const green = rgbOf('green.4');
    expect(at(3, 1)).toEqual([green.r, green.g, green.b, 255]);
    expect(at(0, 0)[3]).toBe(0);
  });

  it('the open panel lights its spark only in frame 1', () => {
    const o = rgbOf('orange.4');
    const has = (frame: 0 | 1): boolean => {
      const img = panelImage(frame);
      for (let i = 0; i < img.data.length; i += 4) {
        if (img.data[i] === o.r && img.data[i + 1] === o.g && img.data[i + 2] === o.b) return true;
      }
      return false;
    };
    expect([has(0), has(1)]).toEqual([false, true]);
    expect(PANEL_ROWS.every((rows) => rows.every((row) => row.length === rows[0]!.length))).toBe(
      true,
    );
  });
});
