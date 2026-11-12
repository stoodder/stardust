// The post-game Sector map's dawn by ending (T843; art-direction § 10, the `dawn` row): the morning's
// light from the east, Wayside's open walk under Stay, the unlit colony and a freighter's trail
// under Go. T863 passes C5's answer to `starMapChart`.
import { describe, expect, it } from 'vitest';
import { luminance } from '../../content/palettes/color.ts';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { walkX } from '../../content/sprites/starmap/dawn.ts';
import { STAR_MAP_RESERVED } from '../../content/starMap.ts';
import { starMapChart } from './starMapChart.ts';

const CHANGES = ['plant_dark', 'domes_open'] as const;
const none = starMapChart('dawn', [], CHANGES);
const stay = starMapChart('dawn', [], CHANGES, 'stay');
const go = starMapChart('dawn', [], CHANGES, 'go');

function is(img: ReturnType<typeof starMapChart>, x: number, y: number, c: ColorName): boolean {
  const i = (y * 640 + x) * 4;
  const { r, g, b } = rgbOf(c);
  return img.data[i] === r && img.data[i + 1] === g && img.data[i + 2] === b;
}

function count(
  img: ReturnType<typeof starMapChart>,
  colors: readonly ColorName[],
  box = { x: 0, y: 0, w: 640, h: 360 },
): number {
  let n = 0;
  for (let y = box.y; y < box.y + box.h; y++)
    for (let x = box.x; x < box.x + box.w; x++) if (colors.some((c) => is(img, x, y, c))) n++;
  return n;
}

function meanLum(img: ReturnType<typeof starMapChart>, x0: number, x1: number): number {
  let s = 0;
  let n = 0;
  for (let y = 120; y < 320; y++)
    for (let x = x0; x < x1; x++) {
      const i = (y * 640 + x) * 4;
      s += luminance({ r: img.data[i]!, g: img.data[i + 1]!, b: img.data[i + 2]! });
      n++;
    }
  return s / n;
}

describe('the dawn chart by ending (T843)', () => {
  it('is the same picture every time', () => {
    expect(starMapChart('dawn', [], CHANGES, 'stay').data).toEqual(stay.data);
  });

  it('warms the east with the first morning, and leaves the other phases alone', () => {
    const night = starMapChart('act3', [], CHANGES);
    expect(meanLum(none, 560, 630) / meanLum(none, 20, 90)).toBeGreaterThan(
      meanLum(night, 560, 630) / meanLum(night, 20, 90),
    );
    expect(starMapChart('act3', [], CHANGES, 'stay').data).toEqual(night.data);
  });

  it('opens the Long Walk through Wayside under Stay: gold trail, Skitterkin walking it', () => {
    let gold = 0;
    for (let y = 198; y < 304; y += 2) if (is(stay, walkX(y), y, 'gold.3')) gold++;
    expect(gold).toBeGreaterThan(40);
    expect(count(stay, ['coral.3', 'coral.4'], { x: 296, y: 150, w: 60, h: 154 })).toBeGreaterThan(
      10,
    );
    expect(count(go, ['coral.3', 'coral.4'], { x: 296, y: 150, w: 60, h: 154 })).toBe(0);
  });

  it('leaves the colony unlit under Go, and one freighter trail leaving east', () => {
    const colony = { x: 268, y: 196, w: 157, h: 109 };
    expect(count(stay, ['gold.3'], colony)).toBeGreaterThan(count(go, ['gold.3'], colony) + 30);
    // The trail's lit run, toward its head at the east edge; none under Stay.
    const run = { x: 560, y: 270, w: 72, h: 50 };
    expect(count(go, ['steel.3', 'white.0'], run)).toBeGreaterThan(20);
    expect(count(stay, ['steel.3', 'white.0'], run)).toBe(0);
    expect(is(go, 628, 313, 'white.1')).toBe(true);
    expect(is(stay, 628, 313, 'white.1')).toBe(false);
  });

  it('keeps every ending landmark out of the corner chrome', () => {
    const marks: ColorName[] = ['coral.3', 'coral.4', 'white.1'];
    for (const img of [stay, go])
      for (const r of STAR_MAP_RESERVED) expect(count(img, marks, r)).toBe(0);
  });
});
