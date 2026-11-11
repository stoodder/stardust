// Act III part two on the Sector map (T712; core-loop.md § 1.1, art-direction.md § 10): Unsung
// and Let Them In on their revisits' places, the finale teased once Let Them In is won (as M6
// teased Empty Slot), and what the won maps change on the chart: the plant dark after A3M5, Dome
// Row open after A3M6.
import { describe, expect, it } from 'vitest';
import { STAR_MAP_NODES, starMapProblems } from '../content/starMap.ts';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import { rgbOf, type ColorName } from '../content/palettes/master.ts';
import type { RgbaImage } from '../render/sprites/rasterize.ts';
import { PLANT, VATS, starMapChart } from '../ui/screens/starMapChart.ts';
import { starMapView } from './starMap.ts';

function is(img: RgbaImage, x: number, y: number, name: ColorName): boolean {
  const i = (y * img.w + x) * 4;
  const c = rgbOf(name);
  return img.data[i] === c.r && img.data[i + 1] === c.g && img.data[i + 2] === c.b;
}

function count(img: RgbaImage, name: ColorName, x0: number, y0: number, x1: number, y1: number) {
  let n = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (is(img, x, y, name)) n++;
  return n;
}

describe('the revisits stand by the places they revisit', () => {
  it('A3M5 16 px east of A2M4 (the plant), A3M6 16 px east of A1M1 (Dome Row), on the chart', () => {
    const a2m4 = STAR_MAP_NODES.a2_m04;
    const a1m1 = STAR_MAP_NODES.a1_m01;
    expect(STAR_MAP_NODES.a3_m05).toMatchObject({ x: a2m4.x + 16, y: a2m4.y + 8 });
    expect(STAR_MAP_NODES.a3_m06).toMatchObject({ x: a1m1.x + 16, y: a1m1.y + 8 });
    // The finale at the Deep Halls' mouth, on the Long Walk's trail.
    expect(STAR_MAP_NODES.fin_m01).toMatchObject({ x: 412, y: 60 });
    expect(starMapProblems()).toEqual([]);
  });
});

describe('starMapView, Act III part two', () => {
  it('after A3M4: Unsung next up by the plant, its vats still burning', () => {
    const view = starMapView(DEV_SAVES.after_a3m4_keep.build());
    expect(view.phase).toBe('act3');
    expect(view.marker).toBe('a3_m04');
    expect(view.frontier).toBe('a3_m05');
    expect(view.nodes.at(-1)).toMatchObject({ id: 'a3_m05', state: 'open', x: 488, y: 176 });
    expect(view.nodes.at(-1)?.label).toBe(
      'Shift 16, Unsung, Second Harvest at night. Next up. 0 of 3 medals.',
    );
    expect(view.changes).toEqual([]);
  });

  it('after A3M5: Let Them In next up on Dome Row; the plant gone dark', () => {
    const view = starMapView(DEV_SAVES.after_a3m5_keep.build());
    expect(view.phase).toBe('act3');
    expect(view.marker).toBe('a3_m05');
    expect(view.frontier).toBe('a3_m06');
    const next = view.nodes.at(-1)!;
    expect(next).toMatchObject({ id: 'a3_m06', state: 'open', place: 'Dome Row at night' });
    expect(next.brief?.medals.map((m) => m.name)).toEqual([
      'Victory',
      'Perfect',
      'Nothing Repossessed',
    ]);
    expect(view.nodes.some((n) => n.id === 'fin_m01')).toBe(false);
    expect(view.changes).toEqual(['plant_dark']);
  });

  it('after A3M6: the finale teased ("Coming soon", its tagline, no briefing), Dome Row open', () => {
    const view = starMapView(DEV_SAVES.after_a3m6.build());
    expect(view.phase).toBe('act3');
    expect(view.act).toBe('3');
    expect(view.marker).toBe('a3_m06');
    expect(view.frontier).toBe('fin_m01');
    const teaser = view.nodes.at(-1)!;
    expect(teaser).toMatchObject({ id: 'fin_m01', state: 'coming_soon', brief: null, index: 18 });
    expect(teaser.label).toBe(
      'Shift 18, Clearing the Way, The Long Walk to the Deep Halls. Coming soon. Walk them home. ' +
        'The choir sings the jingle as a funeral hymn, and your counter counts down to zero.',
    );
    // The leg from the marker to the teaser wears the accent; every earlier leg is steel.
    expect(view.legs.at(-1)?.accent).toBe(true);
    expect(view.legs.slice(0, -1).every((l) => !l.accent)).toBe(true);
    expect(view.regions.map((r) => r.id)).toContain('deep_halls');
    expect(view.changes).toEqual(['plant_dark', 'domes_open']);
  });
});

/** A vat's centre on the chart. */
const at = (v: { x: number; y: number }) => ({ x: PLANT.x + v.x, y: PLANT.y + v.y });
/** Pixels of `c` in Dome Row: the band inside the colony's south wall (y 291–303). */
const row = (img: RgbaImage, c: ColorName) => count(img, c, 270, 291, 422, 303);

describe('the chart after a win', () => {
  it("the vats: violet by day, at full blaze through the Long Night, cold once A3M5's won", () => {
    const day = starMapChart('act2.gold');
    const blaze = starMapChart('act3');
    const dark = starMapChart('act3', [], ['plant_dark']);
    for (const v of VATS.map(at)) {
      expect(is(day, v.x, v.y, 'violet.3')).toBe(true);
      expect(is(day, v.x, v.y - 1, 'violet.4')).toBe(true);
      expect(is(blaze, v.x, v.y, 'violet.4')).toBe(true);
      expect(count(blaze, 'violet.2', v.x - 4, v.y - 4, v.x + 4, v.y + 4)).toBeGreaterThan(4);
      expect(is(dark, v.x, v.y, 'ink.0')).toBe(true);
      expect(count(dark, 'violet.4', v.x - 4, v.y - 4, v.x + 4, v.y + 4)).toBe(0);
    }
  });

  it("Dome Row's domes open and warm once A3M6 is won: gold windows, doors, light on the yard", () => {
    const shut = starMapChart('act3', [], ['plant_dark']);
    const open = starMapChart('act3', [], ['plant_dark', 'domes_open']);
    expect(row(shut, 'gold.1')).toBe(0);
    expect(row(open, 'gold.3')).toBeGreaterThanOrEqual(8);
    expect(row(open, 'gold.2')).toBeGreaterThanOrEqual(8);
    expect(row(open, 'gold.1')).toBeGreaterThan(row(open, 'gold.2'));
    expect(row(open, 'act3.emergency')).toBe(0);
    // Nothing outside Dome Row changes.
    for (let y = 0; y < 360; y++) {
      if (y >= 291 && y <= 303) continue;
      for (let x = 0; x < 640; x++) {
        const i = (y * 640 + x) * 4;
        if (open.data[i] !== shut.data[i]) throw new Error(`(${x}, ${y}) changed`);
      }
    }
  });
});
