// The prelude's stills (M10): all six registered in shot order with their cue frames, valid, kept
// out of the boot registry; and T1002's three (the ad, the haul, the viewport) carrying their
// beats: the ad's twinkle and small print, the freighter's screen lighting a dark hold, the
// viewport's Technician in the Dawn's pose and the ad's light going out.
import { describe, expect, it } from 'vitest';
import { luminance } from '../../../palettes/color.ts';
import { PALETTES, PALETTE_IDS } from '../../../palettes/index.ts';
import { rgbOf, type ColorName } from '../../../palettes/master.ts';
import { ALL_SPRITES } from '../../all.ts';
import { isCustomChar, STANDARD_LEGEND } from '../../legend.ts';
import type { SpriteDef } from '../../types.ts';
import { validateSprites } from '../../validate.ts';
import { technicianBack, TECHNICIAN_HELM } from '../technicianBack.ts';
import { CRAWL, CRAWL_LOOP_W, scenePreludeCrawl, SMALL_PRINT } from './preludeAd.ts';
import { FREIGHTER_SCREEN } from './freighter.ts';
import {
  PRELUDE_FRAMES,
  PRELUDE_STILLS,
  preludeStillDef,
  sceneFreighter,
  scenePreludeAd,
  sceneViewport,
} from './index.ts';
import { VIEWPORT } from './viewport.ts';

const W = 320;
const H = 180;

function rowsOf(def: SpriteDef, frame: string): readonly string[] {
  const f = def.frames[frame];
  if (!Array.isArray(f)) throw new Error(`${def.id} ${frame}: not a grid frame`);
  return f as readonly string[];
}

function colorOf(def: SpriteDef, ch: string): ColorName | null {
  if (ch === '.') return null;
  if (isCustomChar(ch)) return def.legend?.[ch] ?? null;
  const slot = STANDARD_LEGEND[ch];
  return slot === undefined ? null : PALETTES[def.palette][slot];
}

function colorAt(def: SpriteDef, frame: string, x: number, y: number): ColorName | null {
  return colorOf(def, rowsOf(def, frame)[y]?.[x] ?? '.');
}

function meanLum(def: SpriteDef, frame: string, x0: number, y0: number, x1: number, y1: number) {
  let sum = 0;
  let n = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const c = colorAt(def, frame, x, y);
      if (c === null) continue;
      sum += luminance(rgbOf(c));
      n++;
    }
  }
  return sum / n;
}

function diff(def: SpriteDef, a: string, b: string): { x: number; y: number }[] {
  const ra = rowsOf(def, a);
  const rb = rowsOf(def, b);
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < ra.length; y++)
    for (let x = 0; x < W; x++) if (ra[y]?.[x] !== rb[y]?.[x]) out.push({ x, y });
  return out;
}

/** How many pixels of a frame in a box are one of `colors`. */
function count(
  def: SpriteDef,
  frame: string,
  colors: readonly ColorName[],
  box: readonly [number, number, number, number] = [0, 0, W - 1, H - 1],
) {
  const [x0, y0, x1, y1] = box;
  let n = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const c = colorAt(def, frame, x, y);
      if (c !== null && colors.includes(c)) n++;
    }
  }
  return n;
}

/** The ad's crawl band's rows in a frame, joined. */
function crawlBand(frame: string): string {
  return rowsOf(scenePreludeAd, frame)
    .slice(CRAWL.y, CRAWL.y + CRAWL.h)
    .join('');
}

const MINE = [scenePreludeAd, sceneFreighter, sceneViewport] as const;

describe("the prelude's stills", () => {
  it('are the six stills, in shot order, each with its cue frames', () => {
    expect(PRELUDE_STILLS.map((d) => d.id)).toEqual([
      'scene.prelude_ad',
      'scene.freighter',
      'scene.viewport',
      'scene.descent',
      'scene.touchdown',
      'scene.dome_row',
    ]);
    for (const def of PRELUDE_STILLS) {
      const frames = Object.keys(def.frames);
      for (const f of PRELUDE_FRAMES[def.id]) expect(frames, `${def.id} ${f}`).toContain(f);
      expect(preludeStillDef(def.id)).toBe(def);
    }
  });

  it('validate, and stay out of the boot registry', () => {
    expect(validateSprites(PRELUDE_STILLS, PALETTE_IDS)).toEqual([]);
    const ids = new Set(ALL_SPRITES.map((s) => s.id as string));
    for (const def of PRELUDE_STILLS) expect(ids.has(def.id)).toBe(false);
  });

  it("T1002's three are 320×180, opaque edge to edge, and never draw the Hollow's acid", () => {
    for (const def of MINE) {
      expect(def.size).toEqual({ w: W, h: H });
      expect(def.palette).toBe('act1');
      for (const frame of Object.keys(def.frames)) {
        expect(
          rowsOf(def, frame).some((r) => r.includes('.')),
          `${def.id} ${frame}`,
        ).toBe(false);
      }
      for (const c of Object.values(def.legend ?? {})) expect(c).not.toMatch(/^acid\./);
    }
  });
});

describe('the ad (shot 1)', () => {
  it('twinkles at 2 fps under each cue frame (an anim named after it)', () => {
    expect(Object.keys(scenePreludeAd.frames)).toEqual([
      'ad',
      'ad_1',
      'small_print',
      'small_print_1',
    ]);
    expect(scenePreludeAd.anims).toEqual({
      ad: { frames: ['ad', 'ad_1'], fps: 2 },
      small_print: { frames: ['small_print', 'small_print_1'], fps: 2 },
    });
    // Only the sparkles change between beats: a few small crosses.
    const twinkle = diff(scenePreludeAd, 'ad', 'ad_1');
    expect(twinkle.length).toBeGreaterThan(20);
    expect(twinkle.length).toBeLessThan(150);
  });

  it('is a bright brochure: a cyan sky, Evie gold, a pink ribbon, green terraces', () => {
    expect(meanLum(scenePreludeAd, 'ad', 0, 0, W - 1, 100)).toBeGreaterThan(0.4);
    expect(count(scenePreludeAd, 'ad', ['gold.3', 'gold.4'])).toBeGreaterThan(1200);
    expect(count(scenePreludeAd, 'ad', ['pink.3'])).toBeGreaterThan(1500);
    expect(
      count(scenePreludeAd, 'ad', ['act1.grass.2', 'act1.grass.3', 'act1.grass.4']),
    ).toBeGreaterThan(8000);
  });

  it('runs the small print across its foot, and changes nothing else', () => {
    expect(SMALL_PRINT).toContain('LETTUCE NOT FOR EXPORT.');
    for (const [a, b] of [
      ['ad', 'small_print'],
      ['ad_1', 'small_print_1'],
    ] as const) {
      const changed = diff(scenePreludeAd, a, b);
      expect(changed.length).toBeGreaterThan(1000);
      for (const p of changed) {
        expect(p.y).toBeGreaterThanOrEqual(CRAWL.y);
        expect(p.y).toBeLessThan(CRAWL.y + CRAWL.h);
      }
    }
    // The beats differ only in their sparkles: the crawl's scroll is the strip's pan on the stage.
    expect(crawlBand('small_print')).toBe(crawlBand('small_print_1'));
  });

  it("scrolls the crawl without a seam: one loop of its words, the band's own start", () => {
    expect(validateSprites([scenePreludeCrawl], PALETTE_IDS)).toEqual([]);
    expect(ALL_SPRITES.some((s) => (s.id as string) === scenePreludeCrawl.id)).toBe(false);
    const strip = rowsOf(scenePreludeCrawl, 'strip');
    expect(strip.length).toBe(CRAWL.h);
    expect(CRAWL_LOOP_W).toBe(SMALL_PRINT.length * 4);
    for (const row of strip) expect(row.length).toBe(CRAWL_LOOP_W);
    expect(strip.join('').includes('.')).toBe(false);
    // Its first screenful is the band the ad's frame shows, so the pan starts where the still is.
    const band = rowsOf(scenePreludeAd, 'small_print').slice(CRAWL.y, CRAWL.y + CRAWL.h);
    for (let y = 0; y < CRAWL.h; y++) expect(band[y]).toBe(strip[y]?.slice(0, W));
    // The loop's ends meet: it ends on blank band, so repeated it reads on without a jump.
    const words = strip.map((r) => r.slice(-6)).join('');
    expect(words.includes('G')).toBe(false);
  });
});

describe('the haul (shot 2)', () => {
  it("shows the ad in miniature on the screen, Evie's billboard face in it", () => {
    const { x, y, w, h } = FREIGHTER_SCREEN;
    expect(
      count(sceneFreighter, 'cabin', ['gold.4'], [x, y, x + w - 1, y + h - 1]),
    ).toBeGreaterThan(4);
    expect(
      count(sceneFreighter, 'cabin', ['act1.sky.1', 'act1.sky.2'], [x, y, x + w - 1, y + h - 1]),
    ).toBeGreaterThan(400);
  });

  it('is a deep dark hold the screen lights, dark under the line panel', () => {
    const { x, y, w, h } = FREIGHTER_SCREEN;
    const screen = meanLum(sceneFreighter, 'cabin', x, y, x + w - 1, y + h - 1);
    expect(screen).toBeGreaterThan(meanLum(sceneFreighter, 'cabin', 0, 0, W - 1, H - 1) * 6);
    expect(meanLum(sceneFreighter, 'cabin', 52, 140, 268, 176)).toBeLessThan(0.03);
  });

  it('carries the cargo: crate orange, confetti pink on the deck', () => {
    expect(count(sceneFreighter, 'cabin', ['orange.2', 'orange.3'])).toBeGreaterThan(2000);
    expect(
      count(sceneFreighter, 'cabin', ['pink.3', 'pink.4'], [270, 136, W - 1, H - 1]),
    ).toBeGreaterThan(4);
  });
});

describe('the viewport (shot 3)', () => {
  const tech = technicianBack(TECHNICIAN_HELM);

  it("stands the Technician in the Dawn's exact pose, a dark silhouette rimmed by the planet", () => {
    for (const frame of ['ad_on', 'ad_off']) {
      let ink = 0;
      let all = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!tech.inTechnician(x, y)) continue;
          all++;
          if (colorAt(sceneViewport, frame, x, y)?.startsWith('ink.') === true) ink++;
        }
      }
      expect(ink / all).toBeGreaterThan(0.85);
    }
    // The planet's light on the east rim, under the visor: cyan and teal down to the shoulders.
    for (let y = TECHNICIAN_HELM.cy + 8; y < tech.collarY + 24; y += 3) {
      let east = 0;
      for (let x = 0; x < W; x++) if (tech.inTechnician(x, y)) east = x;
      expect(colorAt(sceneViewport, 'ad_off', east, y), `row ${y}`).toMatch(/^(teal|act1\.sky)\./);
    }
  });

  it('fills the glass with a green day side under a cyan rim, space, the star and two moons', () => {
    const { x, y, r } = VIEWPORT;
    const box = [x - r, y - r, x + r, y + r] as const;
    expect(
      count(
        sceneViewport,
        'ad_off',
        ['act1.grass.1', 'act1.grass.2', 'act1.grass.3', 'act1.grass.4'],
        box,
      ),
    ).toBeGreaterThan(3500);
    expect(
      count(sceneViewport, 'ad_off', ['act1.clay.1', 'act1.clay.2', 'act1.clay.3'], box),
    ).toBeGreaterThan(150);
    expect(
      count(sceneViewport, 'ad_off', ['act1.sky.1', 'act1.sky.2', 'teal.4'], box),
    ).toBeGreaterThan(150);
    expect(count(sceneViewport, 'ad_off', ['orange.3', 'orange.4'], box)).toBeGreaterThan(10);
    expect(count(sceneViewport, 'ad_off', ['pink.4'], box)).toBeGreaterThan(2);
  });

  it('puts the ad out: its warm light leaves the hold, the back and the glass, nothing else', () => {
    const warm: ColorName[] = ['gold.0', 'gold.2'];
    expect(count(sceneViewport, 'ad_on', warm, [0, 0, 150, H - 1])).toBeGreaterThan(400);
    expect(count(sceneViewport, 'ad_off', warm)).toBe(0);
    // The planet, the star and the moons don't change; only the ad's ghost leaves the glass.
    const { x, y } = VIEWPORT;
    for (const p of diff(sceneViewport, 'ad_on', 'ad_off')) {
      if (Math.hypot(p.x + 0.5 - x, p.y + 0.5 - y) > VIEWPORT.r) continue;
      expect(p.x).toBeLessThan(200);
      expect(p.y).toBeGreaterThan(94);
    }
  });
});
