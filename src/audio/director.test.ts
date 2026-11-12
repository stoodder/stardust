import { describe, expect, it } from 'vitest';
import {
  battleMusic,
  countdownTick,
  crossedLowIntegrity,
  heldMusic,
  PAUSED_LEVEL,
  screenMusic,
  VOICES_FLOOR,
  voicesLevel,
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
      layers: { base: 1, drums: 0, lead: 0, choir: 0 },
      level: 1,
    });
  });

  it('adds drums while a wave is on the field, and drops them between waves', () => {
    expect(battleMusic({ ...MOOD, wave: 2, waveActive: true }).layers).toEqual({
      base: 1,
      drums: 1,
      lead: 0,
      choir: 0,
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

  it("plays each act's theme, and falls back to Act I's for acts without one", () => {
    expect(battleMusic({ ...MOOD, act: 2 }).theme).toBe('act2_battle');
    expect(battleMusic({ ...MOOD, act: 3 }).theme).toBe('act3_battle');
    expect(battleMusic({ ...MOOD, act: 'finale' }).theme).toBe('fin_walk');
    expect(battleMusic({ ...MOOD, act: 'challenge' }).theme).toBe('act1_battle');
  });

  it("brings in the Hum Choir's harmony line while a Choir stands, and drops it at the map's end", () => {
    expect(battleMusic({ ...MOOD, choir: true }).layers.choir).toBe(1);
    expect(battleMusic({ ...MOOD, choir: false }).layers.choir).toBe(0);
    expect(battleMusic({ ...MOOD, choir: true, outcome: 'won' }).layers.choir).toBe(0);
  });

  it("follows the finale's script phase: the Long Walk, the hymn, Dawn (T850)", () => {
    const fin: BattleMood = { ...MOOD, act: 'finale', waveCount: 26, voices: 1 };
    expect(battleMusic({ ...fin, phase: 0 }).theme).toBe('fin_walk');
    expect(battleMusic({ ...fin, phase: 1 }).theme).toBe('fin_walk');
    expect(battleMusic({ ...fin, phase: 2 }).theme).toBe('choir_hymn');
    expect(battleMusic({ ...fin, phase: 3 }).theme).toBe('dawn_major');
    // A dev map of the finale's act follows it too; another act's map ignores the phase.
    expect(battleMusic({ ...MOOD, act: 3, phase: 2 }).theme).toBe('act3_battle');
  });

  it('swells the singers with the Voices: the procession in Phase 1, the choir in the hymn', () => {
    const fin: BattleMood = { ...MOOD, act: 'finale', waveCount: 26, wave: 25, waveActive: true };
    // Phase 1: the procession's hum is the lead, at the Voices; the choir layer is a Hum Choir's.
    const walk = battleMusic({ ...fin, phase: 1, voices: 0.5, choir: true }).layers;
    expect(walk).toEqual({ base: 1, drums: 1, lead: voicesLevel(0.5), choir: 1 });
    // The last waves don't bring in a lead on a choir map: the singers are the lead.
    expect(battleMusic({ ...fin, phase: 1, voices: 1 }).layers.lead).toBe(1);
    // Phase 2: Pebble leads, the choir behind her follows the Voices.
    const full = battleMusic({ ...fin, phase: 2, voices: 1 }).layers;
    const thin = battleMusic({ ...fin, phase: 2, voices: 0.3 }).layers;
    expect(full).toMatchObject({ lead: 1, choir: 1 });
    expect(thin.lead).toBe(1);
    expect(thin.choir).toBeLessThan(full.choir);
    expect(thin.choir).toBeGreaterThan(VOICES_FLOOR);
    // Dawn: everyone sings.
    expect(battleMusic({ ...fin, phase: 3, voices: 0.3 }).layers).toMatchObject({ lead: 1, choir: 1 });
    // The map's end silences it as any other.
    expect(battleMusic({ ...fin, phase: 3, voices: 1, outcome: 'won' }).level).toBe(0);
  });

  it('moves the singers in steps, from a floor to full', () => {
    expect(voicesLevel(0)).toBe(VOICES_FLOOR);
    expect(voicesLevel(1)).toBe(1);
    expect(voicesLevel(2)).toBe(1);
    expect(voicesLevel(-1)).toBe(VOICES_FLOOR);
    const steps = new Set(Array.from({ length: 101 }, (_, i) => voicesLevel(i / 100)));
    for (const l of steps) expect(Math.round(l * 20) / 20).toBeCloseTo(l, 9);
  });

  it('plays the post-game title after the finale, and holds Dawn under the epilogue', () => {
    expect(screenMusic('title', true)).toMatchObject({
      theme: 'title_dawn',
      layers: { base: 1, lead: 1, choir: 1 },
    });
    expect(screenMusic('results', true).theme).toBeNull();
    expect(heldMusic('dawn_major')).toEqual({
      theme: 'dawn_major',
      layers: { base: 1, drums: 1, lead: 1, choir: 1 },
      level: 1,
    });
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

describe('map beds (T750)', () => {
  it("plays a map's own bed ahead of its act's: A3M4's shelters, A3M5's vats; A3M6 keeps Act III's", () => {
    const act3 = { ...MOOD, act: 3 as const };
    expect(battleMusic({ ...act3, map: 'a3_m04' }).theme).toBe('act3_shelters');
    expect(battleMusic({ ...act3, map: 'a3_m05' }).theme).toBe('act3_vats');
    expect(battleMusic({ ...act3, map: 'a3_m06' }).theme).toBe('act3_battle');
    expect(battleMusic(act3).theme).toBe('act3_battle');
    // The layers still follow the battle.
    expect(battleMusic({ ...act3, map: 'a3_m04', waveActive: true, choir: true }).layers).toEqual({
      base: 1,
      drums: 1,
      lead: 0,
      choir: 1,
    });
  });
});
