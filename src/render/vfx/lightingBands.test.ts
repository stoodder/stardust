// The value bands under the lighting grade (D134): at every stop of every map's lighting schedule,
// the world takes the grade (vfx/lighting.ts gradeOf) and the actors don't, and the bands the
// palette tests hold for the ungraded palettes (content/palettes/palettes.test.ts, art-direction
// §1 and §3) still read: the grass under the road, every unit, ally and tower body a band over the
// graded road, the Aelari's knots over it inside a rim under it, and the Hollow's dark body under it
// with its pale outline (the Hollow's inverted outline, made for dark ground) over it.
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
import { RAW_CONTENT } from '../../content/registry.ts';
import { gradeOf, lightStops } from './lighting.ts';

const content = compileContent(RAW_CONTENT);
const scheduled = Object.values(content.maps).filter((m) => m.lighting.length > 0);

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
