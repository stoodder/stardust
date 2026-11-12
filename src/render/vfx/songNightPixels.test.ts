import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import { HALF_H, HALF_W } from '../iso.ts';
import { lumOf, MASK_DARK, MASK_LIT, noDark } from './darknessPixels.ts';
import {
  drawSongNightMask,
  drawSunMask,
  sunKeys,
  isSunlit,
  LIFT_GOLD,
  LIFT_NONE,
  LIFT_PAD,
  songNightTones,
  sunLifts,
  sunLightAt,
  sunStep,
  SUN_STEPS,
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

/** The light a sun pixel adds (rgb × alpha, 0–255 a channel). */
const added = (word: number): { r: number; g: number; b: number } => {
  const a = (word >>> 24) / 255;
  return { r: (word & 0xff) * a, g: ((word >>> 8) & 0xff) * a, b: ((word >>> 16) & 0xff) * a };
};
const sum = (c: { r: number; g: number; b: number }): number => c.r + c.g + c.b;
/** The light `sunLightAt` adds there, as the test reads it back. */
const lightAt = (k: number, raked: boolean, lift: number) =>
  sunLightAt(k, raked, lift, { r: 0, g: 0, b: 0 });
const near = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) => {
  expect(Math.abs(a.r - b.r)).toBeLessThan(1.5);
  expect(Math.abs(a.g - b.g)).toBeLessThan(1.5);
  expect(Math.abs(a.b - b.b)).toBeLessThan(1.5);
};

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
    near(added(sun[east]!), lightAt(KEYS[east]!, false, LIFT_NONE));
    // Somewhere along the row the rake shows, brighter than the light behind it.
    let raked = 0;
    for (let gx = 0; gx < 10; gx += 0.1) {
      const i = pixelAt(gx, 5);
      if (sun[i] !== 0 && sum(added(sun[i]!)) > sum(lightAt(KEYS[i]!, false, LIFT_NONE)) + 20)
        raked++;
    }
    expect(raked).toBeGreaterThan(0);
    // Risen: the morning's light everywhere it reached, no rake; warmer to the east.
    drawSunMask(sun, KEYS, SUN_STEPS);
    near(added(sun[west]!), lightAt(KEYS[west]!, false, LIFT_NONE));
    near(added(sun[pixelAt(5, 5)]!), lightAt(KEYS[pixelAt(5, 5)]!, false, LIFT_NONE));
    expect(added(sun[east]!).g).toBeGreaterThan(added(sun[west]!).g);
  });
});

describe('Dawn’s morning light (M8 R2): rose on the darks, gold and teal on the highlights', () => {
  const GROUND = ['act3.ground.0', 'act3.ground.1', 'act3.ground.2', 'act3.ground.3'] as const;

  it('never turns Act III’s ground olive: the darks stay violet, east and west, raked or not', () => {
    for (const name of GROUND) {
      const g = rgbOf(name);
      for (const k of [0, 0.5, 1]) {
        for (const raked of [false, true]) {
          const l = lightAt(k, raked, LIFT_NONE);
          const r = g.r + l.r;
          const gr = g.g + l.g;
          const b = g.b + l.b;
          expect(b, `${name} @${k}${raked ? ' raked' : ''}`).toBeGreaterThan(gr);
          expect(r, `${name} @${k}${raked ? ' raked' : ''}`).toBeGreaterThan(gr);
        }
      }
    }
  });

  it('warms toward the east, where the sun stands', () => {
    expect(lightAt(1, false, LIFT_NONE).g).toBeGreaterThan(lightAt(0, false, LIFT_NONE).g);
    expect(lightAt(1, false, LIFT_NONE).r).toBeGreaterThan(lightAt(0, false, LIFT_NONE).r);
  });

  it('lifts the road a step in gold and the pads in teal', () => {
    const plain = lightAt(0.5, false, LIFT_NONE);
    const road = lightAt(0.5, false, LIFT_GOLD);
    const pad = lightAt(0.5, false, LIFT_PAD);
    expect(road.r).toBeGreaterThan(plain.r);
    expect(road.g).toBeGreaterThan(plain.g);
    expect(pad.g).toBeGreaterThan(plain.g);
    expect(pad.b).toBeGreaterThan(plain.b);
    expect(pad.g - plain.g).toBeGreaterThan(pad.r - plain.r);
  });

  it('flags each pixel by its ground: road and gate gold, pads teal, the rest none', () => {
    const tiles = ['#', 'o', 'C', '.'];
    const lifts = sunLifts(W, H, 0, 0, origin, (c, r) =>
      c >= 0 && r >= 0 && c < 4 && r < 1
        ? tiles[c]!
        : c >= 0 && r >= 0 && c < 10 && r < 10
          ? '.'
          : null,
    );
    expect(lifts[pixelAt(0.5, 0.5)]).toBe(LIFT_GOLD);
    expect(lifts[pixelAt(1.5, 0.5)]).toBe(LIFT_PAD);
    expect(lifts[pixelAt(2.5, 0.5)]).toBe(LIFT_GOLD);
    expect(lifts[pixelAt(3.5, 0.5)]).toBe(LIFT_NONE);
    expect(lifts[pixelAt(5.5, 5.5)]).toBe(LIFT_NONE);
  });
});
