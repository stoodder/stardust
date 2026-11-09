import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import { ENV_SKY } from '../../content/palettes/env.ts';
import {
  gradeAt,
  gradeOf,
  LIGHT_FADE_TICKS,
  lightAt,
  lightMix,
  lightPosition,
  lightStops,
  skyImage,
  SKY_SHARE,
} from './lighting.ts';

// A2M3's shape: gold before wave 1, dusk by wave 11 (act2.md § A2M3).
const stops = lightStops('act2.gold', [{ wave: 11, env: 'act2.dusk' }]);

describe('the lighting schedule (T410a)', () => {
  it("starts on the map's env and steps evenly per wave to each key", () => {
    expect(stops).toEqual([
      { wave: 0, env: 'act2.gold' },
      { wave: 11, env: 'act2.dusk' },
    ]);
    expect(lightPosition(stops, 0)).toBe(0);
    expect(lightPosition(stops, 1)).toBeCloseTo(1 / 11);
    expect(lightPosition(stops, 6)).toBeCloseTo(6 / 11);
    expect(lightPosition(stops, 11)).toBe(1);
    expect(lightPosition(stops, 14)).toBe(1);
  });

  it('holds between keys that hold, and passes through each key in turn', () => {
    const held = lightStops('act2.gold', [
      { wave: 2, env: 'act2.gold' },
      { wave: 4, env: 'act2.dusk' },
      { wave: 6, env: 'act3' },
    ]);
    expect(lightMix(held, lightPosition(held, 1))).toMatchObject({ from: 'act2.gold', t: 0.5 });
    expect(lightMix(held, lightPosition(held, 3))).toEqual({
      stop: 1,
      from: 'act2.gold',
      to: 'act2.dusk',
      t: 0.5,
    });
    expect(lightMix(held, lightPosition(held, 5))).toMatchObject({ from: 'act2.dusk', to: 'act3' });
    expect(lightMix(held, lightPosition(held, 9))).toEqual({
      stop: 2,
      from: 'act2.dusk',
      to: 'act3',
      t: 1,
    });
  });

  it('eases from the wave before over LIGHT_FADE_TICKS, and steps under reduced motion', () => {
    const w2 = lightPosition(stops, 2);
    const w3 = lightPosition(stops, 3);
    expect(lightAt(stops, 3, 100, 100, false)).toBeCloseTo(w2);
    expect(lightAt(stops, 3, 100, 100 + LIGHT_FADE_TICKS / 2, false)).toBeCloseTo((w2 + w3) / 2);
    expect(lightAt(stops, 3, 100, 100 + LIGHT_FADE_TICKS, false)).toBe(w3);
    expect(lightAt(stops, 3, 100, 100, true)).toBe(w3);
    // Before wave 1 there is nothing to ease from.
    expect(lightAt(stops, 0, 0, 5, false)).toBe(0);
  });
});

describe('the grade (the shade)', () => {
  it("leaves the map's own env unchanged and only ever darkens", () => {
    expect(gradeOf('act2.gold', 'act2.gold')).toEqual({ r: 255, g: 255, b: 255 });
    for (const env of ['act1', 'act2.dusk', 'act3', 'finale'] as const) {
      const c = gradeOf('act2.gold', env);
      for (const v of [c.r, c.g, c.b]) expect(v).toBeLessThanOrEqual(255);
    }
  });

  it('lights gold as dusk with the dusk light (a lilac: blue over red over green)', () => {
    const dusk = gradeOf('act2.gold', 'act2.dusk');
    expect(dusk).toEqual(rgbOf('act2.dusk.light'));
    expect(dusk.b).toBeGreaterThan(dusk.r);
    expect(dusk.r).toBeGreaterThan(dusk.g);
    // Halfway, halfway between.
    const mid = gradeAt('act2.gold', stops, 0.5);
    expect(mid.g).toBe(Math.round((255 + dusk.g) / 2));
  });
});

describe('skyImage', () => {
  const w = 16;
  const h = 64;
  const img = skyImage('act2.dusk', w, h);
  const px = (x: number, y: number): readonly number[] => {
    const i = (y * w + x) * 4;
    return [img.data[i]!, img.data[i + 1]!, img.data[i + 2]!, img.data[i + 3]!];
  };

  it('draws the env sky top first, then fades to the void below', () => {
    const top = rgbOf(ENV_SKY['act2.dusk'][0]!);
    expect(px(0, 0)).toEqual([top.r, top.g, top.b, 255]);
    const below = Math.round(h * SKY_SHARE) + Math.round(h / 8) + 1;
    for (let x = 0; x < w; x++) expect(px(x, below)[3], `x ${x}`).toBe(0);
    expect(px(0, h - 1)[3]).toBe(0);
  });

  it('dithers the fade (some pixels on, some off, in the fade rows)', () => {
    const y = Math.round(h * SKY_SHARE) + 4;
    const alphas = new Set(Array.from({ length: w }, (_, x) => px(x, y)[3]));
    expect(alphas).toEqual(new Set([0, 255]));
  });
});
