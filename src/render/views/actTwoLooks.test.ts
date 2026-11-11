// T430a's Act II looks, as pure rules: the hush tell's ring and lean, the Hollow's hitch and
// glitch, the fleeing runner's glance and scurry, the death tone by act and faction, and the
// shield bubble's flash.
import { describe, expect, it } from 'vitest';
import { RING_STEP_TILES } from '../vfx/overlayPixels.ts';
import { SHIMMER_MS, STEPPED_ALPHA, TELL_STEP_TICKS, tellHigh } from '../vfx/fxTiming.ts';
import { PRESENTATION } from '../../content/presentation.ts';
import { deathStyle } from './deathLook.ts';
import {
  BOLT_TEMPO,
  FLEE_TEMPO,
  fleeTempo,
  GLANCE_MAX_MS,
  GLANCE_MIN_MS,
  GLANCE_MS,
  glanceFacing,
  glancing,
} from './fleeLook.ts';
import {
  GLITCH_MAX_MS,
  GLITCH_MIN_MS,
  GLITCH_MS,
  glitches,
  hollowGlitch,
  STUTTER_HOLD_MS,
  STUTTER_MAX_MS,
  type HollowGlitch,
} from './hollowLook.ts';
import {
  HUSH_RING_FROM_TILES,
  HUSH_RING_TO_TILES,
  HUSH_TELL_TICKS,
  hushRingRadius,
} from './hushLook.ts';
import { BUBBLE_HIT_MS, BUBBLE_IDLE_ALPHA, bubbleAlpha } from './shieldLook.ts';

describe('the tell step (3 Hz on sim ticks)', () => {
  it('flips every TELL_STEP_TICKS ticks, a full cycle in a third of a second; steady when reduced', () => {
    expect(TELL_STEP_TICKS * 2).toBe(20); // 60 ticks/s ÷ 20 = 3 Hz, the flicker cap
    expect([0, 9, 10, 19, 20].map((t) => tellHigh(t, false))).toEqual([
      true,
      true,
      false,
      false,
      true,
    ]);
    expect([10, 15].map((t) => tellHigh(t, true))).toEqual([true, true]);
    expect(SHIMMER_MS * 2 * 3).toBeGreaterThanOrEqual(1000);
  });
});

describe('the hush tell', () => {
  it('its ring closes from 0.75 to 0.25 tiles over the 0.5 s tell, in quarter tiles', () => {
    expect(HUSH_TELL_TICKS).toBe(30);
    expect(hushRingRadius(0)).toBe(HUSH_RING_FROM_TILES);
    expect(hushRingRadius(HUSH_TELL_TICKS)).toBe(HUSH_RING_TO_TILES);
    expect(hushRingRadius(HUSH_TELL_TICKS * 3)).toBe(HUSH_RING_TO_TILES);
    let last = Infinity;
    for (let t = 0; t <= HUSH_TELL_TICKS; t++) {
      const r = hushRingRadius(t);
      expect(r).toBeLessThanOrEqual(last);
      expect(Math.round(r / RING_STEP_TILES) * RING_STEP_TILES).toBe(r);
      last = r;
    }
  });
});

describe("the Hollow's walk", () => {
  const g: HollowGlitch = { hold: false, offsetPx: 0 };

  it('only the Hollow glitches', () => {
    expect(['hollow', 'skitterkin', 'aelari', 'everglow'].map(glitches)).toEqual([
      true,
      false,
      false,
      false,
    ]);
  });

  it('every unit hitches once a period, briefly, on a schedule of its own', () => {
    for (const uid of [1, 2, 37, 400]) {
      let held = 0;
      let runs = 0;
      let was = false;
      for (let ms = 0; ms < STUTTER_MAX_MS * 3; ms++) {
        const h = hollowGlitch(uid, ms, false, g).hold;
        if (h) held++;
        if (h && !was) runs++;
        was = h;
      }
      expect(runs).toBeGreaterThanOrEqual(2);
      expect(held).toBeLessThanOrEqual(runs * STUTTER_HOLD_MS);
    }
    // Two units don't hitch in step.
    const a = [];
    const b = [];
    for (let ms = 0; ms < STUTTER_MAX_MS * 2; ms += 10) {
      a.push(hollowGlitch(1, ms, false, g).hold);
      b.push(hollowGlitch(2, ms, false, g).hold);
    }
    expect(a).not.toEqual(b);
  });

  it('shoves a frame 1–2 px sideways now and then, never under reduced motion', () => {
    let shoves = 0;
    for (let ms = 0; ms < GLITCH_MAX_MS * 3; ms++) {
      const off = hollowGlitch(5, ms, false, g).offsetPx;
      expect(Math.abs(off)).toBeLessThanOrEqual(2);
      if (off !== 0) shoves++;
      expect(hollowGlitch(5, ms, true, g).offsetPx).toBe(0);
    }
    expect(shoves).toBeGreaterThan(0);
    // At most one shove a period (the shortest is GLITCH_MIN_MS).
    expect(shoves).toBeLessThanOrEqual(
      (Math.ceil((GLITCH_MAX_MS * 3) / GLITCH_MIN_MS) + 1) * GLITCH_MS,
    );
  });
});

describe('a fleeing runner', () => {
  it('glances back briefly once a period', () => {
    for (const uid of [3, 8, 99]) {
      let on = 0;
      for (let ms = 0; ms < GLANCE_MAX_MS * 2; ms++) if (glancing(uid, ms)) on++;
      expect(on).toBeGreaterThan(0);
      // At most one glance a period (the shortest is GLANCE_MIN_MS).
      expect(on).toBeLessThanOrEqual(
        (Math.ceil((GLANCE_MAX_MS * 2) / GLANCE_MIN_MS) + 1) * GLANCE_MS,
      );
    }
  });

  it('looks back over its shoulder toward what follows it', () => {
    // Walking away (NE, NW), it shows its face; walking toward the camera, it turns its head.
    expect((['se', 'sw', 'ne', 'nw'] as const).map(glanceFacing)).toEqual(['sw', 'se', 'sw', 'se']);
  });

  it('scurries: its legs run faster than walkers, faster still when bolting', () => {
    expect(fleeTempo(false, false)).toBe(1);
    expect(fleeTempo(true, false)).toBe(FLEE_TEMPO);
    expect(fleeTempo(true, true)).toBe(BOLT_TEMPO);
    expect(BOLT_TEMPO).toBeGreaterThan(FLEE_TEMPO);
  });
});

/** The Skitterkin's death is each act's presentation dial (core-loop.md § 6.7). */
const dial = (act: 1 | 2 | 3 | 'finale') => PRESENTATION.byAct[act].skitterkinDeath;

describe('the death tone (enemies.md § 8)', () => {
  it('Act I pops with confetti; Act II pops quietly; later acts lie still', () => {
    expect(deathStyle(dial(1), 'skitterkin')).toBe('comic');
    expect(deathStyle(dial(2), 'skitterkin')).toBe('quiet');
    expect(deathStyle(dial(3), 'skitterkin')).toBe('still');
    expect(deathStyle(dial('finale'), 'skitterkin')).toBe('still');
  });

  it('the Aelari shatter, the Hollow unravel (every act), Everglow shuts down (T603)', () => {
    expect(deathStyle(dial(2), 'aelari')).toBe('shatter');
    expect(deathStyle(dial(2), 'hollow')).toBe('unravel');
    expect(deathStyle(dial('finale'), 'hollow')).toBe('unravel');
    expect(deathStyle(dial(3), 'everglow')).toBe('shutdown');
    expect(deathStyle(dial(1), 'hollow')).toBe('unravel');
  });
});

describe('the shield bubble', () => {
  it('holds faint, flashes whole on a hit, and steps back down', () => {
    expect(bubbleAlpha(Number.NEGATIVE_INFINITY)).toBe(BUBBLE_IDLE_ALPHA);
    expect(bubbleAlpha(0)).toBe(STEPPED_ALPHA[0]);
    expect(bubbleAlpha(BUBBLE_HIT_MS * 0.5)).toBe(STEPPED_ALPHA[1]);
    expect(bubbleAlpha(BUBBLE_HIT_MS)).toBe(BUBBLE_IDLE_ALPHA);
    expect(bubbleAlpha(-5)).toBe(BUBBLE_IDLE_ALPHA);
    expect(BUBBLE_IDLE_ALPHA).toBeGreaterThan(0);
  });
});
