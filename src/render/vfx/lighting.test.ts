import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import { ENV_SKY } from '../../content/palettes/env.ts';
import {
  gradeAt,
  gradeOf,
  GRADE_STRENGTH,
  LIGHT_FADE_TICKS,
  lightAt,
  lightMix,
  lightPosition,
  lightStops,
  moonsImage,
  gradeNumberAt,
  rgbNumber,
  skyImage,
  SKY_MOONS,
  SKY_SHARE,
  stopGrades,
  type LightMix,
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

/** A channel of the dusk's light taken GRADE_STRENGTH of the way from white. */
const at = (v: number): number => Math.round(255 - (255 - v) * GRADE_STRENGTH);

describe('the grade (the shade)', () => {
  it("leaves the map's own env unchanged and only ever darkens", () => {
    expect(gradeOf('act2.gold', 'act2.gold')).toEqual({ r: 255, g: 255, b: 255 });
    for (const env of ['act1', 'act2.dusk', 'act3', 'finale'] as const) {
      const c = gradeOf('act2.gold', env);
      for (const v of [c.r, c.g, c.b]) expect(v).toBeLessThanOrEqual(255);
    }
  });

  it('lights gold as dusk with the dusk light at GRADE_STRENGTH (a lilac: blue over red over green)', () => {
    const dusk = gradeOf('act2.gold', 'act2.dusk');
    const light = rgbOf('act2.dusk.light');
    expect(dusk).toEqual({ r: at(light.r), g: at(light.g), b: at(light.b) });
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

  it('hangs two small moons in every sky, the same in each stop (T430b)', () => {
    const W = 640;
    const H = 360;
    const gold = skyImage('act2.gold', W, H);
    const dusk = skyImage('act2.dusk', W, H);
    for (const m of SKY_MOONS) {
      const cx = Math.round(m.x * W);
      const cy = Math.round(m.y * H);
      expect(cy + m.r).toBeLessThan(H * SKY_SHARE); // in the sky, not its fade
      for (const sky of [gold, dusk]) {
        const i = (cy * W + cx) * 4;
        const lit = rgbOf(m.lit);
        const shade = rgbOf(m.shade);
        const c = [sky.data[i], sky.data[i + 1], sky.data[i + 2]];
        expect([
          [lit.r, lit.g, lit.b],
          [shade.r, shade.g, shade.b],
        ]).toContainEqual(c);
      }
    }
  });

  it('dithers the fade (some pixels on, some off, in the fade rows)', () => {
    const y = Math.round(h * SKY_SHARE) + 4;
    const alphas = new Set(Array.from({ length: w }, (_, x) => px(x, y)[3]));
    expect(alphas).toEqual(new Set([0, 255]));
  });
});

describe('the crossfade without allocation (T501k)', () => {
  const sched = lightStops('act2.gold', [
    { wave: 5, env: 'act2.dusk' },
    { wave: 9, env: 'act3' },
  ]);
  const grades = stopGrades('act2.gold', sched);

  it('writes the mix in place and matches a fresh one', () => {
    const out: LightMix = { stop: 0, from: 'act1', to: 'act1', t: 0 };
    for (const pos of [0, 0.3, 1, 1.5, 2, 3]) {
      expect(lightMix(sched, pos, out)).toBe(out);
      expect(out).toEqual(lightMix(sched, pos));
    }
  });

  it('grades as gradeAt does, as one number', () => {
    const out: LightMix = { stop: 0, from: 'act1', to: 'act1', t: 0 };
    for (const pos of [0, 0.25, 0.5, 1, 1.75, 2]) {
      expect(gradeNumberAt(grades, lightMix(sched, pos, out))).toBe(
        rgbNumber(gradeAt('act2.gold', sched, pos)),
      );
    }
  });
});

describe('moonsImage', () => {
  it('is the sky’s moons alone, on clear, exactly where the sky has them', () => {
    const w = 120;
    const h = 80;
    const sky = skyImage('act2.dusk', w, h);
    const moons = moonsImage(w, h);
    let lit = 0;
    for (let i = 0; i < w * h; i++) {
      if (moons.data[i * 4 + 3] === 0) continue;
      lit++;
      expect(Array.from(moons.data.subarray(i * 4, i * 4 + 4))).toEqual(
        Array.from(sky.data.subarray(i * 4, i * 4 + 4)),
      );
    }
    expect(lit).toBeGreaterThan(SKY_MOONS.length * 9);
  });
});
