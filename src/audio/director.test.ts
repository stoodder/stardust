import { describe, expect, it } from 'vitest';
import {
  battleMusic,
  countdownTick,
  crossedLowIntegrity,
  PAUSED_LEVEL,
  screenMusic,
  type BattleMood,
} from './director.ts';

const MOOD: BattleMood = {
  act: 1,
  wave: 0,
  waveCount: 7,
  waveActive: false,
  integrity: 20,
  outcome: 'playing',
  paused: false,
};

describe('battle music', () => {
  it('starts with the base layer in the setup phase', () => {
    expect(battleMusic(MOOD)).toEqual({
      theme: 'act1_battle',
      layers: { base: 1, drums: 0, lead: 0 },
      level: 1,
    });
  });

  it('adds drums while a wave is on the field, and drops them between waves', () => {
    expect(battleMusic({ ...MOOD, wave: 2, waveActive: true }).layers).toEqual({
      base: 1,
      drums: 1,
      lead: 0,
    });
    expect(battleMusic({ ...MOOD, wave: 2, waveActive: false }).layers.drums).toBe(0);
  });

  it('adds the lead for the last two waves (W6–W7) or when integrity is low', () => {
    expect(battleMusic({ ...MOOD, wave: 5, waveActive: true }).layers.lead).toBe(0);
    expect(battleMusic({ ...MOOD, wave: 6, waveActive: true }).layers.lead).toBe(1);
    expect(battleMusic({ ...MOOD, wave: 7 }).layers.lead).toBe(1);
    expect(battleMusic({ ...MOOD, wave: 3, integrity: 5 }).layers.lead).toBe(1);
    expect(battleMusic({ ...MOOD, wave: 3, integrity: 6 }).layers.lead).toBe(0);
  });

  it('plays quieter while paused, and stops when the map ends', () => {
    expect(battleMusic({ ...MOOD, paused: true }).level).toBe(PAUSED_LEVEL);
    expect(battleMusic({ ...MOOD, outcome: 'won' })).toMatchObject({
      level: 0,
      layers: { base: 0 },
    });
  });

  it('falls back to the Act I theme for acts without one yet', () => {
    expect(battleMusic({ ...MOOD, act: 3 }).theme).toBe('act1_battle');
  });

  it('plays the title theme on the title, and nothing on Results', () => {
    expect(screenMusic('title')).toMatchObject({
      theme: 'title',
      layers: { base: 1, drums: 0, lead: 1 },
    });
    expect(screenMusic('results').theme).toBeNull();
    expect(screenMusic(null).theme).toBeNull();
  });
});

describe('countdown ticks and the integrity alarm', () => {
  it('ticks each of the last three seconds, the last one higher', () => {
    expect(countdownTick(null, 12)).toBeNull();
    expect(countdownTick(4, 3)).toEqual({ pitch: 0 });
    expect(countdownTick(3, 3)).toBeNull();
    expect(countdownTick(3, 2)).toEqual({ pitch: 0 });
    expect(countdownTick(2, 1)).toEqual({ pitch: 7 });
    expect(countdownTick(1, null)).toBeNull();
  });

  it('sounds the alarm once as integrity crosses 5', () => {
    expect(crossedLowIntegrity(6, 5)).toBe(true);
    expect(crossedLowIntegrity(8, 2)).toBe(true);
    expect(crossedLowIntegrity(5, 4)).toBe(false);
    expect(crossedLowIntegrity(3, 0)).toBe(false);
  });
});
