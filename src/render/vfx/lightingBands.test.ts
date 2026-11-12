// The value bands under the lighting grade (D134): at every stop of every map's lighting schedule,
// the world takes the grade (vfx/lighting.ts gradeOf) and the actors don't, and the bands the
// palette tests hold for the ungraded palettes (content/palettes/palettes.test.ts, art-direction
// §1 and §3) still read: the grass under the road, every unit, ally and tower body a band over the
// graded road, the Aelari's knots over it inside a rim under it, and the Hollow's dark body under it
// with its pale outline (the Hollow's inverted outline, made for dark ground) over it.
// T831: a schedule's sky-only keys (the finale's eastern sky, D154's T701 ruling) move the sky
// alone, so the grade never reaches them: the D134 bands hold at every stop of the maps whose world
// a schedule grades (Act II's, as before), and the finale's world (Act III's ground, its night held
// until Dawn) keeps Act III's own bands (palettes.test.ts) at every stop its grade reaches, Dawn's
// lighting set included. Its sky keys warm the horizon per wave, never the world.
import { describe, expect, it } from 'vitest';
import {
  ACT2_BAND_ACTORS,
  AELARI_BAND_FRAMES,
  bodyLuminance,
  contrastRatio,
  type Grade,
  HOLLOW_BAND_FRAMES,
  slotLuminance,
  sprite,
} from '../../content/__fixtures__/valueBands.ts';
import { luminance } from '../../content/palettes/color.ts';
import { ENV_PALETTE_IDS, ENV_PALETTES } from '../../content/palettes/env.ts';
import { PALETTES } from '../../content/palettes/index.ts';
import { rgbOf } from '../../content/palettes/master.ts';
import { compileContent } from '../../content/compile.ts';
import { LIGHTING_SETS, lightingSetsOf } from '../../content/lightingSets.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import { hasDarkness } from '../../sim/index.ts';
import {
  gradeAt,
  gradeOf,
  lightPosition,
  lightStops,
  skyStops,
  worldStops,
  type LightStop,
} from './lighting.ts';

const content = compileContent(RAW_CONTENT);
/** Maps whose world a schedule grades: a key that isn't sky-only (A2M3, A2M6). */
const scheduled = Object.values(content.maps).filter((m) =>
  m.lighting.some((k) => k.skyOnly !== true),
);
/** Maps whose schedule has sky-only keys (the finale). */
const skyKeyed = Object.values(content.maps).filter((m) =>
  m.lighting.some((k) => k.skyOnly === true),
);
/** A lighting set's stop, as LightingView appends it: past every wave. */
const setStop = (key: string): LightStop => ({ wave: Infinity, env: LIGHTING_SETS[key]!.env });

describe('the value bands under the lighting grade (D134)', () => {
  it('has a map with a schedule to check (A2M3)', () => {
    expect(scheduled.map((m) => m.id)).toContain('a2_m03');
  });

  for (const map of scheduled) {
    const base = ENV_PALETTE_IDS.find((id) => id === map.env);
    if (base === undefined) throw new Error(`${map.id}: unknown env ${map.env}`);
    const palette = ENV_PALETTES[base];
    for (const stop of lightStops(base, map.lighting)) {
      const grade: Grade = gradeOf(base, stop.env);
      const where = `${map.id} at ${stop.env} (wave ${stop.wave})`;
      const grass = bodyLuminance(sprite('tile.grass'), 'v0', palette, grade);
      const path = bodyLuminance(sprite('tile.path'), 'tread_x', palette, grade);

      it(`${where}: keeps the graded grass a band below the graded road`, () => {
        expect(path).toBeGreaterThan(grass);
        expect(contrastRatio(path, grass)).toBeGreaterThanOrEqual(1.3);
      });

      it(`${where}: every unit, ally, and tower body (ungraded) sits a band over the road`, () => {
        for (const [id, frame] of ACT2_BAND_ACTORS) {
          const d = sprite(id);
          const l = bodyLuminance(d, frame, PALETTES[d.palette]);
          expect(l, `${id}:${frame}`).toBeGreaterThan(path);
          expect(contrastRatio(l, path), `${id}:${frame}`).toBeGreaterThanOrEqual(1.2);
        }
      });

      it(`${where}: the Hollow's body sits under the road and its pale outline over it`, () => {
        const d = sprite('enemy.mote');
        const outline = luminance(rgbOf(PALETTES[d.palette].outline));
        expect(outline, 'outline').toBeGreaterThan(path);
        for (const frame of HOLLOW_BAND_FRAMES) {
          const l = bodyLuminance(d, frame, PALETTES[d.palette]);
          expect(l, frame).toBeLessThan(grass);
          expect(contrastRatio(l, path), frame).toBeGreaterThanOrEqual(1.6);
        }
      });

      it(`${where}: the Aelari's knots shine over the road inside a rim darker than it`, () => {
        for (const [id, frame] of AELARI_BAND_FRAMES) {
          const d = sprite(id);
          const knots = slotLuminance(d, frame, ['e0', 'e1', 'hi']);
          const rim = slotLuminance(d, frame, ['outline']);
          expect(contrastRatio(knots, path), `${id}:${frame} knots`).toBeGreaterThanOrEqual(2);
          expect(path, `${id}:${frame} rim`).toBeGreaterThan(rim);
          expect(contrastRatio(rim, path), `${id}:${frame} rim`).toBeGreaterThanOrEqual(3);
        }
      });
    }
  }

  it('grades no map whose keys are all sky-only (the finale is checked below)', () => {
    for (const map of scheduled) expect(map.lighting.every((k) => k.skyOnly === true)).toBe(false);
  });

  it('fails the full-strength dusk light (the grade it replaces): the Hollow sank into the road', () => {
    // At the dusk's own light (no GRADE_STRENGTH), the graded road falls to the Hollow's value.
    const palette = ENV_PALETTES['act2.gold'];
    const full = rgbOf('act2.dusk.light');
    const path = bodyLuminance(sprite('tile.path'), 'tread_x', palette, full);
    const d = sprite('enemy.mote');
    const l = bodyLuminance(d, 'walk_se_0', PALETTES[d.palette]);
    expect(contrastRatio(l, path)).toBeLessThan(1.6);
  });
});

describe("the finale's light: Act III's bands under its grade, its sky warming alone (T831)", () => {
  it('has a map with sky-only keys to check (FIN)', () => {
    expect(skyKeyed.map((m) => m.id)).toContain('fin_m01');
  });

  for (const map of skyKeyed) {
    const base = ENV_PALETTE_IDS.find((id) => id === map.env);
    if (base === undefined) throw new Error(`${map.id}: unknown env ${map.env}`);
    const palette = ENV_PALETTES[base];
    const sets = lightingSetsOf(map).map(setStop);
    const world = [...worldStops(base, map.lighting), ...sets];
    const waves = Math.max(...map.lighting.map((k) => k.wave));

    for (const stop of world) {
      const grade: Grade = gradeOf(base, stop.env);
      const where = `${map.id} at ${stop.env} (wave ${stop.wave})`;
      const ground = bodyLuminance(sprite('tile.grass'), 'v0', palette, grade);
      const path = bodyLuminance(sprite('tile.path'), 'tread_x', palette, grade);

      it(`${where}: keeps the ground a band below the road`, () => {
        expect(path).toBeGreaterThan(ground);
        expect(contrastRatio(path, ground)).toBeGreaterThanOrEqual(1.3);
      });

      it(`${where}: every unit, ally, and tower body (ungraded) sits well above the road`, () => {
        for (const [id, frame] of ACT2_BAND_ACTORS) {
          const d = sprite(id);
          const l = bodyLuminance(d, frame, PALETTES[d.palette]);
          expect(l, `${id}:${frame}`).toBeGreaterThan(path);
          expect(contrastRatio(l, path), `${id}:${frame}`).toBeGreaterThanOrEqual(2);
        }
      });

      it(`${where}: the Hollow read by their pale rim over the road`, () => {
        const rim = luminance(rgbOf(PALETTES.hollow.outline));
        expect(contrastRatio(rim, path)).toBeGreaterThanOrEqual(3);
      });
    }

    it(`${map.id}: its sky-only keys carry no darkness, so the sim's darkness never falls`, () => {
      for (const key of map.lighting.filter((k) => k.skyOnly === true)) {
        expect(key.dark ?? 0, `wave ${key.wave}`).toBe(0);
      }
      // Sundown's darkness skips sky-only keys (sim/darkness.ts `darkTarget`, its tests); with no
      // other key carrying any, the map has none.
      if (map.lighting.every((k) => k.skyOnly === true || (k.dark ?? 0) === 0)) {
        expect(hasDarkness(map)).toBe(false);
      }
    });

    it(`${map.id}: the world's grade holds while the sky moves (white until Dawn)`, () => {
      const without = lightStops(
        base,
        map.lighting.filter((k) => k.skyOnly !== true),
      );
      for (let w = 0; w <= waves + 2; w++) {
        const pos = lightPosition(world, w);
        expect(gradeAt(base, world, pos), `wave ${w}`).toEqual(
          gradeAt(base, without, lightPosition(without, w)),
        );
        expect(gradeAt(base, world, pos), `wave ${w}`).toEqual({ r: 255, g: 255, b: 255 });
      }
    });

    it(`${map.id}: the eastern sky warms a step with every wave from W2, and only rises`, () => {
      const stops = skyStops(base, map.lighting);
      // How far the dawn has risen at a sky position: a stop's east (its env's whole sky: 1),
      // the map's own env's: 0, crossfaded between two stops.
      const east = (s: LightStop): number => (s.env === base ? 0 : (s.east ?? 1));
      const risen = (pos: number): number => {
        const k = Math.min(Math.floor(pos), stops.length - 1);
        const a = east(stops[k]!);
        const b = east(stops[k + 1] ?? stops[k]!);
        return a + (b - a) * (pos - k);
      };
      expect(risen(lightPosition(stops, 1)), 'W1: the night held').toBe(0);
      let last = 0;
      for (let w = 2; w <= waves; w++) {
        const r = risen(lightPosition(stops, w));
        expect(r, `wave ${w}`).toBeGreaterThan(last);
        last = r;
      }
      expect(last, 'risen fully by the last key, short of the whole dawn sky').toBe(1);
      for (const k of stops) if (k.east !== undefined) expect(k.env).not.toBe(base);
    });
  }
});
