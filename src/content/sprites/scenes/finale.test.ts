// The finale's stills (T843): valid, the size the epilogue and the Dawn's stage draw them at, their
// beats in the frames T810 stages, painted on demand and kept out of the boot registry, and their
// light where the DOM puts words over them.
import { describe, expect, it, vi } from 'vitest';
import { luminance } from '../../palettes/color.ts';
import { PALETTES, PALETTE_IDS } from '../../palettes/index.ts';
import { rgbOf, type ColorName } from '../../palettes/master.ts';
import { grid } from '../helpers.ts';
import { SPRITES } from '../index.ts';
import { isCustomChar, STANDARD_LEGEND } from '../legend.ts';
import type { SpriteDef } from '../types.ts';
import { validateSprites } from '../validate.ts';
import { dawnMoteAt, DAWN_SUN } from './dawn.ts';
import {
  DAWN_FRAMES,
  ENDING_STILL,
  FINALE_SCENE_SPRITES,
  finaleSceneDef,
  sceneDawn,
  sceneOrbit,
  sceneWayside,
} from './finale.ts';
import { defineScene, SCENE_H, SCENE_W } from './sceneKit.ts';

/** A grid frame's rows (every still's frames are full grids). */
function rowsOf(def: SpriteDef, frame: string): readonly string[] {
  const f = def.frames[frame];
  if (!Array.isArray(f)) throw new Error(`${def.id} ${frame}: not a grid frame`);
  return f as readonly string[];
}

/** The master colour a still's grid character paints. */
function colorOf(def: SpriteDef, ch: string): ColorName | null {
  if (ch === '.') return null;
  if (isCustomChar(ch)) return def.legend?.[ch] ?? null;
  const slot = STANDARD_LEGEND[ch];
  return slot === undefined ? null : PALETTES[def.palette][slot];
}

/** Mean luminance over a box of a frame. */
function meanLum(def: SpriteDef, frame: string, x0: number, y0: number, x1: number, y1: number) {
  const rows = rowsOf(def, frame);
  let sum = 0;
  let n = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const c = colorOf(def, rows[y]?.[x] ?? '.');
      if (c === null) continue;
      sum += luminance(rgbOf(c));
      n++;
    }
  }
  return sum / n;
}

/** The pixels two frames differ at. */
function diff(def: SpriteDef, a: string, b: string): { x: number; y: number }[] {
  const ra = rowsOf(def, a);
  const rb = rowsOf(def, b);
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < SCENE_H; y++)
    for (let x = 0; x < SCENE_W; x++) if (ra[y]?.[x] !== rb[y]?.[x]) out.push({ x, y });
  return out;
}

describe("the finale's stills (T843)", () => {
  it('validate, at 320×180 (drawn at 2×, the whole 640×360 view), opaque edge to edge', () => {
    expect(validateSprites(FINALE_SCENE_SPRITES, PALETTE_IDS)).toEqual([]);
    for (const def of FINALE_SCENE_SPRITES) {
      expect(def.size).toEqual({ w: 320, h: 180 });
      for (const frame of Object.keys(def.frames)) {
        const rows = rowsOf(def, frame);
        expect(
          rows.some((r) => r.includes('.')),
          `${def.id} ${frame}`,
        ).toBe(false);
      }
    }
  });

  it('carry the frames the stages show', () => {
    expect(Object.keys(sceneDawn.frames)).toEqual([...DAWN_FRAMES]);
    expect(Object.keys(sceneWayside.frames)).toEqual(['still']);
    expect(Object.keys(sceneOrbit.frames)).toEqual(['still', 'blink_1']);
    expect(Object.keys(sceneOrbit.anims ?? {})).toEqual(['blink']);
    expect(ENDING_STILL).toEqual({ stay: 'scene.wayside', go: 'scene.orbit' });
    expect(finaleSceneDef('scene.dawn')).toBe(sceneDawn);
  });

  it('stay out of the boot registry (SPRITES, so the atlas and the initial JS)', () => {
    const ids = new Set(SPRITES.map((s) => s.id as string));
    for (const def of FINALE_SCENE_SPRITES) expect(ids.has(def.id)).toBe(false);
  });

  it('paint on the first read of their frames, once', () => {
    const paint = vi.fn(() => ({ still: grid(SCENE_W, SCENE_H, 'A') }));
    const def = defineScene({
      id: 'scene.lazy_fixture',
      palette: 'finale',
      legend: { A: 'ink.0' },
      paint,
    });
    expect(paint).not.toHaveBeenCalled();
    const frames = def.frames;
    expect(paint).toHaveBeenCalledTimes(1);
    expect(def.frames).toBe(frames);
    expect(paint).toHaveBeenCalledTimes(1);
  });

  it("never draw the Hollow's acid (warm gold is remembered; § 1, principle 6)", () => {
    for (const def of FINALE_SCENE_SPRITES) {
      for (const color of Object.values(def.legend ?? {})) expect(color).not.toMatch(/^acid\./);
    }
  });
});

describe('the Dawn', () => {
  it('breaks gold at the horizon over a deep dark sky and a dark ledge for the lines', () => {
    const top = meanLum(sceneDawn, 'dawn', 0, 0, 319, 20);
    const sun = meanLum(sceneDawn, 'dawn', DAWN_SUN.x - 20, 86, DAWN_SUN.x + 20, 100);
    expect(sun).toBeGreaterThan(top * 8);
    // The line panel (~432×80 at 2×, bottom centre: 1× x 52–268, y 130–176) sits on dark.
    expect(meanLum(sceneDawn, 'dawn', 52, 134, 268, 176)).toBeLessThan(0.03);
  });

  it("adds Ishael's mote at Ves'thara's shoulder on its beat, and only then", () => {
    const { x, y } = dawnMoteAt();
    const dawn = rowsOf(sceneDawn, 'dawn');
    const mote = rowsOf(sceneDawn, 'mote');
    expect(colorOf(sceneDawn, mote[y]![x]!)).toBe('white.1');
    expect(colorOf(sceneDawn, dawn[y]![x]!)).not.toBe('white.1');
    // Everything that changes is her (and the mote): east of the choir, nowhere else.
    for (const p of diff(sceneDawn, 'dawn', 'mote')) expect(p.x).toBeGreaterThan(260);
  });

  it('raises the visor and changes nothing but the helmet (no face is ever drawn)', () => {
    const changed = diff(sceneDawn, 'mote', 'visor');
    expect(changed.length).toBeGreaterThan(20);
    for (const p of changed) {
      expect(p.x).toBeGreaterThanOrEqual(80);
      expect(p.x).toBeLessThanOrEqual(112);
      expect(p.y).toBeGreaterThanOrEqual(50);
      expect(p.y).toBeLessThanOrEqual(80);
    }
    // The raised plate stands above the helmet's crown, catching the light.
    const visor = rowsOf(sceneDawn, 'visor');
    const lit = changed.filter((p) => {
      const c = colorOf(sceneDawn, visor[p.y]![p.x]!);
      return p.y < 58 && (c === 'gold.4' || c === 'white.1');
    });
    expect(lit.length).toBeGreaterThan(8);
  });

  it('keeps the faces and figures in the upper 70% (the lines take the rest)', () => {
    // Nothing but the ledge and the Technician's back below the choir's feet.
    const rows = rowsOf(sceneDawn, 'mote');
    for (let y = 127; y < SCENE_H; y++) {
      for (let x = 130; x < SCENE_W; x++) {
        const c = colorOf(sceneDawn, rows[y]![x]!);
        expect(c === null || c.startsWith('finale.ground') || c.startsWith('ink.')).toBe(true);
      }
    }
  });
});

describe('the final images', () => {
  it("keeps Wayside's top third calm sky under the status line", () => {
    const sky = new Set(['A', 'B', 'C', 'D', 'E', 'R', 'N']);
    const rows = rowsOf(sceneWayside, 'still');
    for (let y = 0; y < 60; y++) {
      for (const ch of rows[y]!.split('')) expect(sky.has(ch)).toBe(true);
    }
    // No sun or glint behind the words (x 112–208 at 1×, y 20–32).
    expect(meanLum(sceneWayside, 'still', 112, 20, 208, 32)).toBeLessThan(0.2);
  });

  it("writes WAYSIDE on the colony's sign", () => {
    const rows = rowsOf(sceneWayside, 'still');
    const orange = rows.join('').split('Y').length - 1;
    expect(orange).toBeGreaterThan(40);
  });

  it("blinks QUILL's eye on the relay, and nothing else", () => {
    const changed = diff(sceneOrbit, 'still', 'blink_1');
    expect(changed.length).toBeGreaterThan(0);
    for (const p of changed) {
      expect(Math.abs(p.x - 112)).toBeLessThanOrEqual(3);
      expect(Math.abs(p.y - 49)).toBeLessThanOrEqual(3);
    }
  });

  it('puts the relay in the upper half and the planet across the lower', () => {
    expect(meanLum(sceneOrbit, 'still', 100, 40, 124, 64)).toBeGreaterThan(0.3);
    expect(meanLum(sceneOrbit, 'still', 0, 0, 319, 30)).toBeLessThan(0.05);
    // The planet's day side is lit, its night side dark.
    expect(meanLum(sceneOrbit, 'still', 260, 150, 319, 179)).toBeGreaterThan(
      meanLum(sceneOrbit, 'still', 20, 168, 80, 179) * 4,
    );
  });
});
