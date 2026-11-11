// T608: the Stasis Bloom's look rules (bloomLook.ts): the disc's reach is the sim's, its colour is
// the spec's, and a pulse flashes it for PULSE_FLASH_TICKS.
import { describe, expect, it } from 'vitest';
import {
  bloomColors,
  bloomReach,
  PULSE_FLASH_TICKS,
  PULSE_RING_TICKS,
  pulseFlash,
  pulseRing,
  pulseRingImage,
  ringColor,
  STREAK_MS,
  streakAlpha,
  type BloomTower,
} from './bloomLook.ts';
import { STEPPED_ALPHA } from '../vfx/fxTiming.ts';
import { ringImage } from '../vfx/overlayPixels.ts';
import { rgbOf } from '../../content/palettes/master.ts';

const FIELD = { radiusTiles: 2, pulseEveryTicks: 600, pullBackTiles: 0 };

function tower(over: Partial<BloomTower> = {}): BloomTower {
  return {
    alive: true,
    spec: null,
    tierDef: { field: FIELD },
    linkFieldRadiusTiles: 0,
    linkPulseSoonerTicks: 0,
    detectPct: 0,
    cooldownTicks: 0,
    firstFiredTick: -1,
    holdFire: false,
    ...over,
  };
}

describe('the Bloom look (T608)', () => {
  it("reaches the sim's reach: radius, Pinned Down, the radius tune-up", () => {
    expect(bloomReach(tower())).toBe(2);
    expect(bloomReach(tower({ linkFieldRadiusTiles: 0.3, detectPct: 0.05 }))).toBeCloseTo(2.415);
    expect(bloomReach(tower({ alive: false }))).toBe(0);
    expect(bloomReach(tower({ tierDef: { field: null } }))).toBe(0);
    expect(bloomReach(tower({ tierDef: null }))).toBe(0);
  });

  it('blue for the tiers, violet for Gravity Well, teal for Timeless Garden', () => {
    expect(bloomColors({ spec: null })).toEqual({
      disc: 'blue.3',
      flash: 'blue.4',
      ring: 'blue.4',
    });
    expect(bloomColors({ spec: 'a' }).ring).toBe('violet.4');
    expect(bloomColors({ spec: 'b' }).ring).toBe('teal.4');
  });

  it('flashes for PULSE_FLASH_TICKS after a pulse, on the Stillmind beat too', () => {
    expect(pulseFlash(tower({ cooldownTicks: 600 }))).toBe(false); // never pulsed
    expect(pulseFlash(tower({ cooldownTicks: 600, firstFiredTick: 5 }))).toBe(true);
    const last = 600 - PULSE_FLASH_TICKS + 1;
    expect(pulseFlash(tower({ cooldownTicks: last, firstFiredTick: 5 }))).toBe(true);
    expect(pulseFlash(tower({ cooldownTicks: last - 1, firstFiredTick: 5 }))).toBe(false);
    expect(pulseFlash(tower({ cooldownTicks: 0, firstFiredTick: 5 }))).toBe(false);
    const still = { linkPulseSoonerTicks: 60, firstFiredTick: 5 };
    expect(pulseFlash(tower({ ...still, cooldownTicks: 540 }))).toBe(true);
    expect(pulseFlash(tower({ ...still, cooldownTicks: 600 }))).toBe(false); // upgraded mid-wait
  });
});

describe('the Bloom look, polished (T630a)', () => {
  it("its ring is the spec's .4 while the pulse is ready, a step darker while it recharges", () => {
    const c = bloomColors({ spec: 'a' });
    expect(ringColor(tower({ cooldownTicks: 0 }), c)).toBe('violet.4');
    expect(ringColor(tower({ cooldownTicks: 40 }), c)).toBe('violet.3');
  });

  it('its burst ring grows to the reach in quarter tiles after a pulse, fading down the ladder', () => {
    const fired = (since: number): BloomTower =>
      tower({ firstFiredTick: 5, cooldownTicks: FIELD.pulseEveryTicks - since });
    expect(pulseRing(tower(), 2, false).alpha).toBe(0); // never pulsed
    const first = pulseRing(fired(0), 2, false);
    expect(first.alpha).toBe(1);
    expect(first.tiles).toBeLessThan(2);
    expect(pulseRing(fired(PULSE_RING_TICKS / 2), 2, false).tiles).toBe(2);
    let last = 0;
    for (let k = 0; k < PULSE_RING_TICKS; k++) {
      const r = pulseRing(fired(k), 2, false);
      expect(r.tiles % 0.25).toBe(0);
      expect(r.tiles).toBeGreaterThanOrEqual(last);
      expect(STEPPED_ALPHA).toContain(r.alpha);
      last = r.tiles;
    }
    expect(pulseRing(fired(PULSE_RING_TICKS), 2, false).alpha).toBe(0);
    // Reduced motion: at the reach from the start.
    expect(pulseRing(fired(0), 2, true).tiles).toBe(2);
  });

  it('the burst is a white ring set with six petal-points in the spec colour', () => {
    const img = pulseRingImage(2, 'violet.4');
    const plain = ringImage(2, 'white.1', false, 'ink.0');
    expect(img.image.w).toBeGreaterThan(plain.image.w);
    const v = rgbOf('violet.4');
    let petals = 0;
    for (let i = 0; i < img.image.data.length; i += 4) {
      const d = img.image.data;
      if (d[i] === v.r && d[i + 1] === v.g && d[i + 2] === v.b && d[i + 3] === 255) petals++;
    }
    // Six points of a few pixels each.
    expect(petals).toBeGreaterThanOrEqual(6 * 3);
    expect(petals).toBeLessThanOrEqual(6 * 4);
  });

  it("a pull's streak steps down the alpha ladder and is gone by STREAK_MS", () => {
    expect(streakAlpha(0)).toBe(1);
    expect(streakAlpha(STREAK_MS - 1)).toBe(STEPPED_ALPHA[3]);
    expect(streakAlpha(STREAK_MS)).toBe(0);
  });
});
