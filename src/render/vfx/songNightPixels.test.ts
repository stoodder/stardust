import { describe, expect, it } from 'vitest';
import { HALF_H, HALF_W } from '../iso.ts';
import { lumOf, MASK_DARK, MASK_LIT, noDark } from './darknessPixels.ts';
import {
  drawSongNightMask,
  drawSunMask,
  sunKeys,
  isSunlit,
  songNightTones,
  sunStep,
  SUN_RAKE_ALPHA,
  SUN_STEPS,
  SUN_WASH_ALPHA,
} from './songNightPixels.ts';

// A 10×10 map seen whole: its grid (0, 0) at the top of a 360×200 buffer.
const COLS = 10;
const W = 360;
const H = 200;
const origin = { x: 180, y: 10 };
/** The buffer pixel over grid point (gx, gy). */
const KEYS = sunKeys(W, H, 0, 0, origin, COLS);
const pixelAt = (gx: number, gy: number): number =>
  Math.floor((gx + gy) * HALF_H + origin.y) * W + Math.floor((gx - gy) * HALF_W + origin.x);

/** A sun pixel's additive alpha (0–1). */
const alpha = (word: number): number => (word >>> 24) / 255;

describe("the finale's night (T831)", () => {
  it('darkens the world only: no veil and no lift on the actors', () => {
    const t = songNightTones(noDark());
    expect(t.veil).toBe(0xffffff);
    expect(t.lift).toBe(0);
    expect(t.ground).toBe(t.world);
    expect(lumOf(t.world)).toBeLessThan(0.3);
    expect(lumOf(t.world)).toBeGreaterThan(0.02);
  });

  it('is dark everywhere but the song’s discs before Dawn', () => {
    const px = new Uint32Array(W * H);
    const discs = [{ x: 3, y: 3, radiusSq: 2.5 * 2.5 }];
    drawSongNightMask(px, W, H, 0, 0, origin, discs, 1, null, KEYS, 0);
    expect(px[pixelAt(3, 3)]).toBe(MASK_LIT);
    expect(px[pixelAt(3, 5.3)]).toBe(MASK_LIT); // inside, 2.3 tiles off
    expect(px[pixelAt(3, 5.8)]).toBe(MASK_DARK); // outside, 2.8 tiles off
    expect(px[pixelAt(8, 8)]).toBe(MASK_DARK);
    // No disc counted: no hole.
    drawSongNightMask(px, W, H, 0, 0, origin, discs, 0, null, KEYS, 0);
    expect(px[pixelAt(3, 3)]).toBe(MASK_DARK);
  });
});

describe('Dawn: the sun rakes in from the east (T831)', () => {
  it('never lights or darkens beyond the drawn ground (a clear base)', () => {
    const base = new Uint32Array(W * H).fill(MASK_DARK);
    const out = pixelAt(9.5, 5);
    base[out] = MASK_LIT;
    const keys = sunKeys(W, H, 0, 0, origin, COLS, base);
    expect(Number.isNaN(keys[out])).toBe(true);
    const night = new Uint32Array(W * H);
    const sun = new Uint32Array(W * H);
    drawSongNightMask(night, W, H, 0, 0, origin, [], 0, base, keys, SUN_STEPS / 2);
    drawSunMask(sun, keys, SUN_STEPS / 2);
    expect(night[out]).toBe(MASK_LIT);
    expect(sun[out]).toBe(0);
    expect(sun[pixelAt(9.5, 4)]).not.toBe(0);
  });

  it('quantizes Dawn’s progress to SUN_STEPS', () => {
    expect(sunStep(0)).toBe(0);
    expect(sunStep(0.5)).toBe(SUN_STEPS / 2);
    expect(sunStep(1)).toBe(SUN_STEPS);
    expect(sunStep(2)).toBe(SUN_STEPS);
  });

  it('lights nothing before it rises and everything once it has', () => {
    for (const gx of [-6, 0, 5, 10, 16]) {
      expect(isSunlit(gx, COLS, 0)).toBe(false);
      expect(isSunlit(gx, COLS, SUN_STEPS)).toBe(true);
    }
  });

  it('reaches the east (high grid x) first and crosses westward, its front only advancing', () => {
    for (let step = 1; step < SUN_STEPS; step++) {
      // East of a lit point is lit; the lit share only grows with the step.
      for (let gx = -4; gx < 14; gx++) {
        if (isSunlit(gx, COLS, step))
          expect(isSunlit(gx + 1, COLS, step), `${gx} @${step}`).toBe(true);
        if (isSunlit(gx, COLS, step))
          expect(isSunlit(gx, COLS, step + 1), `${gx} @${step}`).toBe(true);
      }
    }
    const half = SUN_STEPS / 2;
    expect(isSunlit(9, COLS, half)).toBe(true);
    expect(isSunlit(0, COLS, half)).toBe(false);
  });

  it('clears the night behind the front, and paints the rake there and the wash behind', () => {
    const night = new Uint32Array(W * H);
    const sun = new Uint32Array(W * H);
    const step = SUN_STEPS / 2;
    drawSongNightMask(night, W, H, 0, 0, origin, [], 0, null, KEYS, step);
    drawSunMask(sun, KEYS, step);
    const east = pixelAt(9.5, 5);
    const west = pixelAt(0.5, 5);
    expect(night[east]).toBe(MASK_LIT);
    expect(night[west]).toBe(MASK_DARK);
    expect(sun[west]).toBe(0);
    expect(alpha(sun[east]!)).toBeCloseTo(SUN_WASH_ALPHA, 2);
    // Somewhere along the row the rake shows, brighter than the wash.
    let raked = 0;
    for (let gx = 0; gx < 10; gx += 0.1) {
      if (Math.abs(alpha(sun[pixelAt(gx, 5)]!) - SUN_RAKE_ALPHA) < 0.01) raked++;
    }
    expect(raked).toBeGreaterThan(0);
    // Risen: the wash everywhere it reached, no rake.
    drawSunMask(sun, KEYS, SUN_STEPS);
    expect(alpha(sun[west]!)).toBeCloseTo(SUN_WASH_ALPHA, 2);
    expect(alpha(sun[pixelAt(5, 5)]!)).toBeCloseTo(SUN_WASH_ALPHA, 2);
  });
});
