// The star map's chart (art-direction.md § 10): a still, seeded 640×360 picture whose north band
// deepens with the phase, never uses the Hollow's acid, keeps the corner chrome's ground clear of
// landmarks, and draws its legs in steel or the act accent.
import { describe, expect, it } from 'vitest';
import { luminance } from '../../content/palettes/color.ts';
import { MASTER, rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { STAR_MAP_RESERVED } from '../../content/starMap.ts';
import type { RgbaImage } from '../../render/sprites/rasterize.ts';
import { LEG_STOP, chartAccent, starMapChart } from './starMapChart.ts';

const gold = starMapChart('act2.gold');
const dusk = starMapChart('act2.dusk');
const night = starMapChart('act3');

/** The chart's mean luminance. */
function mean(img: RgbaImage): number {
  let sum = 0;
  for (let y = 0; y < 360; y++) for (let x = 0; x < 640; x++) sum += luminance(at(img, x, y));
  return sum / (640 * 360);
}

function at(img: RgbaImage, x: number, y: number): { r: number; g: number; b: number } {
  const i = (y * img.w + x) * 4;
  return { r: img.data[i]!, g: img.data[i + 1]!, b: img.data[i + 2]! };
}

function is(img: RgbaImage, x: number, y: number, name: ColorName): boolean {
  const p = at(img, x, y);
  const c = rgbOf(name);
  return p.r === c.r && p.g === c.g && p.b === c.b;
}

function count(img: RgbaImage, names: readonly ColorName[], area = { x: 0, y: 0, w: 640, h: 360 }) {
  let n = 0;
  for (let y = area.y; y < area.y + area.h; y++) {
    for (let x = area.x; x < area.x + area.w; x++) if (names.some((c) => is(img, x, y, c))) n++;
  }
  return n;
}

/** Whether column 100's row y is in the north band's hatch. */
function band(img: RgbaImage, y: number): boolean {
  return is(img, 100, y, 'ink.0') || is(img, 100, y, 'ink.2');
}

describe('the star map chart', () => {
  it('is a 640×360 opaque picture, the same every time', () => {
    expect(gold.w).toBe(640);
    expect(gold.h).toBe(360);
    for (let i = 3; i < gold.data.length; i += 4)
      if (gold.data[i] !== 255) throw new Error('alpha');
    expect(starMapChart('act2.gold').data).toEqual(gold.data);
  });

  it('sits in the environment band: darker on average than a battle ground step', () => {
    let sum = 0;
    for (let y = 0; y < 360; y++) for (let x = 0; x < 640; x++) sum += luminance(at(gold, x, y));
    expect(sum / (640 * 360)).toBeLessThan(luminance(rgbOf('act2.grass.2')));
    let duskSum = 0;
    for (let y = 0; y < 360; y++)
      for (let x = 0; x < 640; x++) duskSum += luminance(at(dusk, x, y));
    expect(duskSum).toBeLessThan(sum);
  });

  it("deepens the north band with the phase, and never draws the Hollow's acid", () => {
    expect(band(gold, 20)).toBe(true);
    expect(band(gold, 34)).toBe(false);
    expect(band(dusk, 34)).toBe(true);
    const acid: ColorName[] = ['acid.0', 'acid.1', 'acid.2', 'acid.3', 'acid.4'];
    expect(Object.keys(MASTER).filter((k) => k.startsWith('acid.'))).toHaveLength(acid.length);
    for (const phase of ['act2.gold', 'act2.dusk', 'act3', 'dawn'] as const) {
      expect(count(starMapChart(phase), acid)).toBe(0);
    }
  });

  it('keeps landmarks out of the corner chrome', () => {
    const landmarks: ColorName[] = [
      'white.0',
      'teal.3',
      'violet.3',
      'orange.3',
      'steel.2',
      'blue.2',
    ];
    for (const r of STAR_MAP_RESERVED) expect(count(gold, landmarks, r)).toBe(0);
  });

  it("puts a few cold violet pixels in Rig Nine's spoil from the start", () => {
    const n = count(gold, ['violet.3'], { x: 506, y: 70, w: 30, h: 20 });
    expect(n).toBeGreaterThanOrEqual(3);
    expect(n).toBeLessThanOrEqual(4);
  });

  it('draws legs dashed, in steel or the accent, short of each node', () => {
    const from = { x: 200, y: 300 };
    const to = { x: 260, y: 300 };
    const steel = starMapChart('act2.gold', [{ from, to, accent: false }]);
    const accent = starMapChart('act2.gold', [{ from, to, accent: true }]);
    const row = { x: 200, y: 300, w: 61, h: 1 };
    expect(count(steel, ['steel.3'], row)).toBeGreaterThan(10);
    expect(count(accent, [chartAccent('act2.gold')], row)).toBeGreaterThan(10);
    // Nothing within LEG_STOP of either end.
    const near = { x: 200, y: 300, w: LEG_STOP - 1, h: 1 };
    expect(count(accent, [chartAccent('act2.gold')], near)).toBe(0);
    // Dashed: 2 on, 2 off.
    const xs = [];
    for (let x = 200 + LEG_STOP; x < 260 - LEG_STOP; x++)
      if (is(accent, x, 300, 'orange.3')) xs.push(x);
    expect(xs.length).toBeLessThan(260 - 200 - 2 * LEG_STOP);
  });

  it("goes to night at Act II's close: darker, its domes dimmed, half their windows alarm red", () => {
    expect(mean(night)).toBeLessThan(mean(dusk));
    expect(band(night, 60)).toBe(true);
    const colony = { x: 268, y: 196, w: 157, h: 109 };
    // The domes' white shells and teal rims go dark; windows show in the act's emergency red.
    expect(count(night, ['white.0', 'teal.3'], colony)).toBe(0);
    expect(count(gold, ['white.0'], colony)).toBeGreaterThan(100);
    // Half of them, at most one per dome (the colony holds at most 52 placed domes and Dome Row).
    const windows = count(night, ['act3.emergency'], colony);
    expect(windows).toBeGreaterThan(5);
    expect(windows).toBeLessThan(40);
  });

  it('dresses the night Spires in dark rock with a few crystal glints, not violet peaks', () => {
    const spires = { x: 196, y: 72, w: 424, h: 70 };
    const glints = count(night, ['act3.crystal.3'], spires);
    expect(glints).toBeGreaterThanOrEqual(4);
    expect(glints).toBeLessThan(40);
    // The bright crystal steps stay rare: the glyphs, not the cliffs, are what reads.
    expect(count(night, ['act3.crystal.2', 'act3.crystal.3'], spires)).toBeLessThan(80);
    // The day phases carry none.
    expect(count(dusk, ['act3.crystal.3'])).toBe(0);
    // The frontier's leg is Act III's red.
    expect(chartAccent('act3')).toBe('red.3');
  });
});
