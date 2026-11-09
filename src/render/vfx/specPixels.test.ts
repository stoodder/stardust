// T407b's spec looks (specPixels.ts): the seeker's climb and trail, the capacitor orb's steps and
// its 3 Hz flicker at full, and Flak Curtain's puff.
import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import {
  CURTAIN_PUFF,
  ORB_RADIUS_PX,
  SEEKER_CLIMB_TICKS,
  SEEKER_FAN_PX,
  SEEKER_FAN_TICKS,
  TRAIL_STEPS,
  chargeAlpha,
  chargeLevel,
  orbImage,
  puffAlpha,
  puffImage,
  puffRise,
  seekerFan,
  seekerLift,
} from './specPixels.ts';
import { STEPPED_ALPHA, TELL_STEP_TICKS } from './fxTiming.ts';

describe('seekers', () => {
  it('climb from the muzzle to the body over their first ticks, in whole pixels, then hold', () => {
    expect(seekerLift(0, 16, 16 + 12)).toBe(16);
    expect(seekerLift(SEEKER_CLIMB_TICKS / 2, 16, 28)).toBe(22);
    expect(seekerLift(SEEKER_CLIMB_TICKS, 16, 28)).toBe(28);
    expect(seekerLift(500, 16, 28)).toBe(28);
    for (let a = 0; a <= SEEKER_CLIMB_TICKS; a++) {
      expect(Number.isInteger(seekerLift(a, 16, 28))).toBe(true);
    }
  });

  it('trail white-hot exhaust, flame, then smoke down the stepped-alpha ladder', () => {
    expect(TRAIL_STEPS[0]).toMatchObject({ color: 'white.1', alpha: 1 });
    expect(TRAIL_STEPS[1]?.color).toBe('orange.4');
    // Never brighter further back; the last step is the faintest one.
    for (let k = 1; k < TRAIL_STEPS.length; k++) {
      expect(TRAIL_STEPS[k]!.alpha).toBeLessThanOrEqual(TRAIL_STEPS[k - 1]!.alpha);
    }
    expect(TRAIL_STEPS.at(-1)).toMatchObject({ alpha: STEPPED_ALPHA[3] });
    expect(TRAIL_STEPS.every((s) => (STEPPED_ALPHA as readonly number[]).includes(s.alpha))).toBe(
      true,
    );
  });

  it('fan out from their volley-mates and ease back onto their line', () => {
    expect([0, 1, 2, 3].map((k) => seekerFan(k, 0))).toEqual([...SEEKER_FAN_PX]);
    expect([0, 1, 2, 3].map((k) => seekerFan(k, SEEKER_FAN_TICKS))).toEqual([0, 0, 0, 0]);
    expect(Math.abs(seekerFan(3, SEEKER_FAN_TICKS / 2))).toBe(4);
    expect(seekerFan(4, 0)).toBe(seekerFan(0, 0));
  });
});

describe('the capacitor orb', () => {
  it('grows a step per quarter of the charge, never smoothly', () => {
    expect(chargeLevel(0, 240)).toBe(0);
    expect(chargeLevel(1, 240)).toBe(1);
    expect(chargeLevel(59, 240)).toBe(1);
    expect(chargeLevel(60, 240)).toBe(2);
    expect(chargeLevel(180, 240)).toBe(4);
    expect(chargeLevel(239, 240)).toBe(4);
    expect(chargeLevel(500, 240)).toBe(4);
    // A rate bonus's shorter charge fills the steps sooner.
    expect(chargeLevel(150, 200)).toBe(4);
  });

  it('flickers 100% ↔ 60% at full on the 3 Hz tell step; steady under reduced motion', () => {
    expect(chargeAlpha(3, 179, false)).toBe(1);
    const steps = new Set<number>();
    for (let t = 180; t < 240; t++) steps.add(chargeAlpha(4, t, false));
    expect([...steps].toSorted((a, b) => a - b)).toEqual([STEPPED_ALPHA[1], STEPPED_ALPHA[0]]);
    // It changes at most once every TELL_STEP_TICKS ticks (the flicker cap).
    for (let t = 180; t < 240; t++) {
      const k = Math.floor(t / TELL_STEP_TICKS);
      expect(chargeAlpha(4, t, false)).toBe(chargeAlpha(4, k * TELL_STEP_TICKS, false));
    }
    for (let t = 180; t < 240; t++) expect(chargeAlpha(4, t, true)).toBe(1);
  });

  it('draws a white heart in a blue.4 disc inside a blue.3 halo', () => {
    for (let level = 1; level < ORB_RADIUS_PX.length; level++) {
      const r = ORB_RADIUS_PX[level]!; // level < length
      const img = orbImage(r);
      expect([img.w, img.h]).toEqual([2 * r + 1, 2 * r + 1]);
      const at = (x: number, y: number): number[] =>
        Array.from(img.data.slice((y * img.w + x) * 4, (y * img.w + x) * 4 + 4));
      const white = rgbOf('white.1');
      const halo = rgbOf('blue.3');
      if (r >= 2) expect(at(r, r)).toEqual([white.r, white.g, white.b, 255]);
      // The edge pixel straight above the heart is the halo, at 60%.
      expect(at(r, 0)).toEqual([halo.r, halo.g, halo.b, Math.round(STEPPED_ALPHA[1] * 255)]);
      // Corners stay clear: it's round.
      if (r >= 2) expect(at(0, 0)[3]).toBe(0);
    }
  });
});

describe("Flak Curtain's puff", () => {
  it('is a 5×5 grey blot with rounded corners, a lighter rim round a dark core', () => {
    const img = puffImage();
    expect([img.w, img.h]).toEqual([5, 5]);
    const px = (x: number, y: number): number[] =>
      Array.from(img.data.slice((y * 5 + x) * 4, (y * 5 + x) * 4 + 4));
    expect(px(0, 0)[3]).toBe(0);
    const core = rgbOf(CURTAIN_PUFF.core);
    const rim = rgbOf(CURTAIN_PUFF.rim);
    expect(px(2, 2)).toEqual([core.r, core.g, core.b, 255]);
    expect(px(2, 0)).toEqual([rim.r, rim.g, rim.b, 255]);
  });

  it('hangs 1.2 s, fading 100 → 60 → 35 → 15%, rising a pixel every 300 ms', () => {
    expect(puffAlpha(0)).toBe(STEPPED_ALPHA[0]);
    expect(puffAlpha(300)).toBe(STEPPED_ALPHA[1]);
    expect(puffAlpha(700)).toBe(STEPPED_ALPHA[2]);
    expect(puffAlpha(1000)).toBe(STEPPED_ALPHA[3]);
    expect(puffAlpha(1200)).toBe(0);
    expect([0, 299, 300, 1199].map(puffRise)).toEqual([0, 0, 1, 3]);
  });
});
