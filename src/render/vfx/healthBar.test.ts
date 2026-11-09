import { describe, expect, it } from 'vitest';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';
import {
  barMaxHp,
  HEALTH_BAR_H,
  HEALTH_BAR_MAX_W,
  healthBarFill,
  healthBarShown,
  healthBarWidth,
  healthStripImage,
  SHIELD_SEGMENT_PX,
  type HealthBarFill,
} from './healthBar.ts';

/** One pixel of a strip, as [r, g, b, a]. */
function at(img: RgbaImage, x: number, y: number): number[] {
  const i = (y * img.w + x) * 4;
  return [img.data[i]!, img.data[i + 1]!, img.data[i + 2]!, img.data[i + 3]!];
}

/** A palette color, opaque, as [r, g, b, a]. */
function rgba(name: ColorName): number[] {
  const c = rgbOf(name);
  return [c.r, c.g, c.b, 255];
}

const out: HealthBarFill = { hpPx: 0, shieldPx: 0 };

describe('enemy health bars (art-direction §8, T328)', () => {
  it('is 2 px under the body width, even, and 8 to 16 px wide', () => {
    expect(healthBarWidth(12)).toBe(10);
    expect(healthBarWidth(13)).toBe(10);
    expect(healthBarWidth(6)).toBe(8);
    expect(healthBarWidth(40)).toBe(HEALTH_BAR_MAX_W);
    for (let w = 1; w < 60; w++) {
      const b = healthBarWidth(w);
      expect(b % 2).toBe(0);
      expect(b).toBeGreaterThanOrEqual(8);
      expect(b).toBeLessThanOrEqual(16);
    }
  });

  it('shows only while damaged or hovered', () => {
    expect(healthBarShown(20, 20, 0, 0, false)).toBe(false);
    expect(healthBarShown(20, 20, 0, 0, true)).toBe(true);
    expect(healthBarShown(19.5, 20, 0, 0, false)).toBe(true);
    // A dented shield counts as damage; a full one doesn't.
    expect(healthBarShown(20, 20, 10, 10, false)).toBe(false);
    expect(healthBarShown(20, 20, 4, 10, false)).toBe(true);
    // No bar at all: dead, or no max (a boss or a neutral unit).
    expect(healthBarShown(0, 20, 0, 0, true)).toBe(false);
    expect(healthBarShown(20, 0, 0, 0, true)).toBe(false);
  });

  it('fills HP from the left, any HP left showing a pixel', () => {
    expect(healthBarFill(20, 20, 0, 0, 12, out)).toEqual({ hpPx: 12, shieldPx: 0 });
    expect(healthBarFill(10, 20, 0, 0, 12, out)).toEqual({ hpPx: 6, shieldPx: 0 });
    expect(healthBarFill(0.01, 20, 0, 0, 12, out)).toEqual({ hpPx: 1, shieldPx: 0 });
    expect(healthBarFill(0, 20, 0, 0, 12, out)).toEqual({ hpPx: 0, shieldPx: 0 });
  });

  it('puts the shield right after the HP, sharing the bar by their maxima, never past its end', () => {
    // 30 HP + 10 shield on 16 px: 12 + 4.
    expect(healthBarFill(30, 30, 10, 10, 16, out)).toEqual({ hpPx: 12, shieldPx: 4 });
    expect(healthBarFill(30, 30, 5, 10, 16, out)).toEqual({ hpPx: 12, shieldPx: 2 });
    expect(healthBarFill(30, 30, 0, 10, 16, out)).toEqual({ hpPx: 12, shieldPx: 0 });
    // HP down and the shield regrowing: still right after the HP.
    expect(healthBarFill(15, 30, 10, 10, 16, out)).toEqual({ hpPx: 6, shieldPx: 4 });
    // Rounding up both never runs past the end.
    const f = healthBarFill(29.9, 30, 9.9, 10, 16, out);
    expect(f.hpPx + f.shieldPx).toBeLessThanOrEqual(16);
  });

  it('gives a boss and a neutral unit no small bar', () => {
    expect(barMaxHp({ hp: 40, shield: null, boss: null, neutral: false })).toBe(40);
    expect(barMaxHp({ hp: 2500, shield: null, boss: { phases: [] }, neutral: false })).toBe(0);
    expect(barMaxHp({ hp: 10, shield: null, boss: null, neutral: true })).toBe(0);
  });

  it('draws its strips in the palette colors, the shield in segments', () => {
    const hp = healthStripImage('hp');
    expect([hp.w, hp.h]).toEqual([HEALTH_BAR_MAX_W, HEALTH_BAR_H]);
    expect(at(hp, 0, 0)).toEqual(rgba('green.3'));
    // The track carries its 1 px frame on every side.
    const track = healthStripImage('track');
    expect([track.w, track.h]).toEqual([HEALTH_BAR_MAX_W + 2, HEALTH_BAR_H + 2]);
    expect(at(track, 0, 0)).toEqual(rgba('ink.1'));
    expect(at(track, 17, 3)).toEqual(rgba('ink.1'));
    const shield = healthStripImage('shield');
    expect(at(shield, 0, 0)).toEqual(rgba('blue.4'));
    expect(at(shield, SHIELD_SEGMENT_PX, 0)[3]).toBe(0);
    expect(at(shield, SHIELD_SEGMENT_PX + 1, 1)).toEqual(rgba('blue.4'));
  });
});
