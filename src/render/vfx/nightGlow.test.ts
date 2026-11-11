// The Long Night's light (T630b): Act III's maps glow as a full night with no darkness schedule and
// hang the moons; every other env, and every map with darkness, reads exactly as before.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import { ENV_PALETTE_IDS } from '../../content/palettes/env.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import {
  bakesSceneryGlow,
  glowNight,
  hangsMoons,
  isLongNight,
  moonLevel,
  NIGHT_GLOW,
} from './nightGlow.ts';

const maps = Object.values(compileContent(RAW_CONTENT).maps);

describe('the Long Night', () => {
  it('is Act III, and only Act III', () => {
    expect(ENV_PALETTE_IDS.filter((e) => isLongNight(e))).toEqual(['act3']);
    expect(isLongNight(undefined)).toBe(false);
  });

  it('lights Act III as a full night: baked glows at NIGHT_GLOW, the moons full', () => {
    expect(bakesSceneryGlow('act3', false)).toBe(true);
    expect(glowNight('act3', 0)).toBe(NIGHT_GLOW);
    expect(glowNight('act3', 1)).toBe(1);
    expect(hangsMoons('act3', 0)).toBe(true);
    expect(moonLevel('act3', 0)).toBe(1);
    for (const m of maps.filter((x) => x.env === 'act3')) {
      expect(bakesSceneryGlow(m.env, m.dark), m.id).toBe(true);
      expect(hangsMoons(m.env, m.lighting.length), m.id).toBe(true);
    }
  });

  it('leaves every other env exactly as before (its dark, its schedule)', () => {
    for (const env of ENV_PALETTE_IDS.filter((e) => e !== 'act3')) {
      for (const dark of [0, 0.25, 0.5, 1]) {
        expect(glowNight(env, dark)).toBe(dark);
        expect(moonLevel(env, dark)).toBe(dark);
      }
      expect(bakesSceneryGlow(env, false)).toBe(false);
      expect(bakesSceneryGlow(env, true)).toBe(true);
      expect(hangsMoons(env, 0)).toBe(false);
      expect(hangsMoons(env, 2)).toBe(true);
    }
    // The real maps of Acts I–II: as their darkness and schedule say, nothing more.
    for (const m of maps.filter((x) => x.env !== 'act3')) {
      expect(bakesSceneryGlow(m.env, m.dark), m.id).toBe(m.dark);
      expect(hangsMoons(m.env, m.lighting.length), m.id).toBe(m.lighting.length > 0);
    }
  });
});
