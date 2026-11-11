// T608: the Stasis Bloom's look rules (bloomLook.ts): the disc's reach is the sim's, its colour is
// the spec's, and a pulse flashes it for PULSE_FLASH_TICKS.
import { describe, expect, it } from 'vitest';
import {
  bloomColors,
  bloomReach,
  PULSE_FLASH_TICKS,
  pulseFlash,
  type BloomTower,
} from './bloomLook.ts';

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
    expect(bloomColors({ spec: null })).toEqual({ disc: 'blue.3', flash: 'blue.4', ring: 'blue.4' });
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
