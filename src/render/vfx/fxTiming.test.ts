import { describe, expect, it } from 'vitest';
import {
  BEAM_MS,
  beamCore,
  beamWidth,
  fadeAlpha,
  pulseRadius,
  SHAKE_MS,
  shakeOffset,
  STEPPED_ALPHA,
  STRIKE_BURSTS,
  FLOAT_MS,
  FLOAT_RISE_PX,
  floatRise,
  LEAK_SHAKE_MS,
  leakShakeOffset,
  SUPPRESS_FADE_TICKS,
  SUPPRESS_FLICKER_MS,
  suppressAlpha,
} from './fxTiming.ts';

describe('fadeAlpha', () => {
  it('steps through the 100/60/35/15 ladder', () => {
    expect([0, 0.6, 0.8, 0.9, 1].map(fadeAlpha)).toEqual([1, 0.6, 0.35, 0.15, 0.15]);
    for (const t of [0, 0.25, 0.5, 0.75, 0.99]) expect(STEPPED_ALPHA).toContain(fadeAlpha(t));
  });
});

describe('pulseRadius', () => {
  it('grows in quarter tiles from one step to the full radius', () => {
    expect(pulseRadius(2, 0)).toBe(0.25);
    expect(pulseRadius(2, 0.5)).toBe(1.25);
    expect(pulseRadius(2, 0.999)).toBe(2);
    expect(pulseRadius(2, 1)).toBe(2);
    expect(pulseRadius(0.1, 0.5)).toBe(0.25);
  });
});

describe('beamWidth', () => {
  it('narrows 8 → 6 → 4 → 2 around a core of at least 2 px, then is gone', () => {
    const widths = [0, BEAM_MS * 0.3, BEAM_MS * 0.6, BEAM_MS * 0.9].map(beamWidth);
    expect(widths).toEqual([8, 6, 4, 2]);
    expect(widths.map(beamCore)).toEqual([4, 2, 2, 2]);
    expect(beamWidth(BEAM_MS)).toBe(0);
    expect(beamWidth(-1)).toBe(0);
  });
});

describe('STRIKE_BURSTS', () => {
  it('stays inside the 1.5-tile strike radius, with the center first', () => {
    expect(STRIKE_BURSTS[0]).toEqual({ dx: 0, dy: 0, delayMs: 0 });
    for (const b of STRIKE_BURSTS) expect(Math.hypot(b.dx, b.dy)).toBeLessThan(1.5);
  });
});

describe('shakeOffset', () => {
  it('uses integer offsets of at most 2 px and settles to 0', () => {
    for (let ms = 0; ms < SHAKE_MS; ms += 10) {
      const [x, y] = shakeOffset(ms);
      expect(Number.isInteger(x) && Number.isInteger(y)).toBe(true);
      expect(Math.max(Math.abs(x), Math.abs(y))).toBeLessThanOrEqual(2);
    }
    expect(shakeOffset(SHAKE_MS)).toEqual([0, 0]);
  });
});

describe('feedback juice timing (D026)', () => {
  it('shakes 1 px on a leak, then settles', () => {
    for (let ms = 0; ms < LEAK_SHAKE_MS; ms += 10) {
      const [x, y] = leakShakeOffset(ms);
      expect(Math.abs(x) + Math.abs(y)).toBeLessThanOrEqual(1);
    }
    expect(leakShakeOffset(LEAK_SHAKE_MS)).toEqual([0, 0]);
  });

  it('rises floating numbers in whole pixels up to the full rise', () => {
    expect(floatRise(0)).toBe(0);
    expect(Number.isInteger(floatRise(333))).toBe(true);
    expect(floatRise(FLOAT_MS)).toBe(FLOAT_RISE_PX);
    expect(floatRise(FLOAT_MS * 2)).toBe(FLOAT_RISE_PX);
  });
});

describe("suppressAlpha (Suppressing Fire's ground strip)", () => {
  it('flickers 100/60 while it runs, steady under reduced motion, then fades in steps', () => {
    expect(suppressAlpha(0, 300, false)).toBe(STEPPED_ALPHA[0]);
    expect(suppressAlpha(SUPPRESS_FLICKER_MS, 300, false)).toBe(STEPPED_ALPHA[1]);
    expect(suppressAlpha(2 * SUPPRESS_FLICKER_MS, 300, false)).toBe(STEPPED_ALPHA[0]);
    expect(suppressAlpha(SUPPRESS_FLICKER_MS, 300, true)).toBe(STEPPED_ALPHA[0]);
    expect(suppressAlpha(0, SUPPRESS_FADE_TICKS, false)).toBe(STEPPED_ALPHA[2]);
    expect(suppressAlpha(0, 1, true)).toBe(STEPPED_ALPHA[3]);
  });
});
