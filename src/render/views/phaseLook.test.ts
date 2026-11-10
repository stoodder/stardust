// Phasing's minimal look (T503; phaseLook.ts): solid units draw whole; a tell alternates whole and
// dithered on the sim's 3 Hz tell step (whole under reduced motion); a Phased unit is a steady,
// faint dithered ghost; the broken ring steps with the tell and holds while Phased.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import { rgbOf } from '../../content/palettes/master.ts';
import type { Enemy } from '../../sim/index.ts';
import {
  PHASED_ALPHA,
  PHASED_PLAIN_ALPHA,
  PHASED_RIM_ALPHA,
  PHASED_RIM_COLOR,
  TELL_DITHER_ALPHA,
  ghostRimImage,
  phaseAlpha,
  phaseDithered,
  phaseRingAlpha,
  phaseState,
} from './phaseLook.ts';

const LIVE = compileContent(RAW_CONTENT);
const MOTH = LIVE.enemies.riftmoth;

function moth(phased: boolean, phaseTicks: number): Enemy {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- only these fields are read
  return { alive: true, uid: 1, def: MOTH, phased, phaseTicks } as Enemy;
}

describe('phasing’s look', () => {
  it('a solid unit (or one that never phases) draws whole and ringless', () => {
    for (const e of [moth(false, 100), { ...moth(false, 10), def: LIVE.enemies.mote }]) {
      expect(phaseState(e)).toBe('solid');
      expect([
        phaseDithered(e, false),
        phaseAlpha(e, true, false),
        phaseRingAlpha(e, false),
      ]).toEqual([false, 1, 0]);
    }
  });

  it('the tell flickers whole and dithered on the 10-tick step; whole under reduced motion', () => {
    const high = moth(false, 25); // 20–29 ticks left: the step's high half
    const low = moth(false, 15); // 10–19: dithered
    expect([phaseState(high), phaseState(low)]).toEqual(['tell', 'tell']);
    expect([phaseDithered(high, false), phaseAlpha(high, true, false)]).toEqual([false, 1]);
    expect([phaseDithered(low, false), phaseAlpha(low, true, false)]).toEqual([
      true,
      TELL_DITHER_ALPHA,
    ]);
    expect([phaseDithered(low, true), phaseAlpha(low, true, true)]).toEqual([false, 1]);
    expect(phaseRingAlpha(high, false)).toBeGreaterThan(phaseRingAlpha(low, false));
    expect(phaseRingAlpha(low, true)).toBe(phaseRingAlpha(high, true));
  });

  it('Phased: a steady dithered ghost, fainter still without a dithered variant', () => {
    const e = moth(true, 40);
    expect(phaseState(e)).toBe('phased');
    expect([phaseDithered(e, false), phaseDithered(e, true)]).toEqual([true, true]);
    expect(phaseAlpha(e, true, false)).toBe(PHASED_ALPHA);
    expect(phaseAlpha(e, false, false)).toBe(PHASED_PLAIN_ALPHA);
    expect(PHASED_PLAIN_ALPHA).toBeLessThan(PHASED_ALPHA);
    expect(phaseRingAlpha(e, false)).toBe(phaseRingAlpha(moth(true, 3), true));
  });
});

describe('the Phased ghost’s rim (review U10)', () => {
  // A 4×3 silhouette: a solid 2×2 block at (1,0)-(2,1), and one more pixel at (1,2).
  const W = 4;
  const H = 3;
  const solid = new Set(['1,0', '2,0', '1,1', '2,1', '1,2']);
  const data = new Uint8ClampedArray(W * H * 4);
  for (const k of solid) {
    const [x, y] = k.split(',').map(Number) as [number, number];
    data[(y * W + x) * 4 + 3] = 255;
  }

  it('is 1 px of white.1 just outside the silhouette, never on it, in an image 1 px bigger', () => {
    const img = ghostRimImage(data, W, H);
    expect([img.w, img.h]).toEqual([W + 2, H + 2]);
    const c = rgbOf(PHASED_RIM_COLOR);
    const lit: string[] = [];
    for (let y = 0; y < img.h; y++) {
      for (let x = 0; x < img.w; x++) {
        const o = (y * img.w + x) * 4;
        if (img.data[o + 3] === 0) continue;
        expect([img.data[o], img.data[o + 1], img.data[o + 2]]).toEqual([c.r, c.g, c.b]);
        lit.push(`${x - 1},${y - 1}`); // back in the source's pixels
      }
    }
    for (const p of lit) expect(solid.has(p), p).toBe(false);
    // Every clear 4-neighbour of the silhouette is lit; diagonal-only corners are not.
    for (const p of ['1,-1', '2,-1', '0,0', '3,0', '0,1', '3,1', '0,2', '2,2', '1,3']) {
      expect(lit, p).toContain(p);
    }
    expect(lit).not.toContain('0,-1');
    expect(lit).toHaveLength(9);
    expect(PHASED_RIM_ALPHA).toBe(0.5);
  });

  it('rims nothing for an empty frame', () => {
    const img = ghostRimImage(new Uint8ClampedArray(W * H * 4), W, H);
    expect(img.data.some((v) => v !== 0)).toBe(false);
  });
});
