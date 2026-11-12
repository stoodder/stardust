// Shared tools for the finale's full-screen stills (T843; art-direction § 6, *The finale's
// stills*): a 320×180 char canvas the DOM shows at 2× (640×360, the whole game view), the 4×4
// ordered dither every menu backdrop uses for its gradients, and `defineScene`, which declares a
// still that paints lazily (on the first read of its frames, as portraits do), so importing the
// finale's chunk paints nothing until a still is shown.
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, type CharGrid } from '../helpers.ts';
import type { ColorName } from '../../palettes/master.ts';
import type { AnimDef, CustomChar, PaletteId, SpriteDef } from '../types.ts';

/** A still's size in authored px: half the 640×360 game view, shown at 2×. */
export const SCENE_W = 320;
export const SCENE_H = 180;

/** 4×4 ordered-dither thresholds (0–15), the backdrop's and the apron's pattern. */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;

/** The dither threshold at (x, y), in [0, 1). */
export function bayer(x: number, y: number): number {
  return (BAYER4[(y & 3) * 4 + (x & 3)] ?? 0) / 16;
}

/**
 * The step of `ramp` for a value `v` in [0, 1], ordered-dithered between neighbouring steps at
 * (x, y), so a smooth gradient lands in whole palette steps with a 4×4 seam between each pair.
 */
export function dithered(ramp: readonly string[], v: number, x: number, y: number): string {
  const n = ramp.length - 1;
  const t = Math.min(n, Math.max(0, v * n));
  const i = Math.min(n, Math.floor(t + bayer(x, y)));
  return ramp[i] ?? ramp[n] ?? '.';
}

/** A blank still (transparent everywhere), `h` rows tall (a tall still pans; default SCENE_H). */
export function sceneGrid(blank = '.', h: number = SCENE_H): CharGrid {
  return grid(SCENE_W, h, blank);
}

/** A copy of a still (to paint a later frame over an earlier one). */
export function copyGrid(g: CharGrid): CharGrid {
  return g.map((row) => [...row]);
}

/**
 * Paints every pixel in the box that `pick` names a character for (null leaves it), clipped to
 * the grid (SCENE_W wide, as tall as the grid: a tall still's rows below SCENE_H paint too).
 */
export function fill(
  g: CharGrid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  pick: (x: number, y: number) => string | null,
): void {
  const h = Math.max(SCENE_H, g.length);
  for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) {
    for (let x = Math.max(0, x0); x <= Math.min(SCENE_W - 1, x1); x++) {
      const ch = pick(x, y);
      if (ch !== null) plot(g, x, y, ch);
    }
  }
}

/** One still, painted on demand. */
export interface SceneSpec<Id extends string> {
  readonly id: Id;
  readonly palette: PaletteId;
  readonly legend: Readonly<Partial<Record<CustomChar, ColorName>>>;
  /**
   * The still's height in authored px (default SCENE_H). Only a still the stage pans is taller
   * (the prelude's descent, 320×300); it is still SCENE_W wide and anchored at its bottom centre.
   */
  readonly h?: number;
  /** Paints every frame, each SCENE_W × `h` (called once, on the first read). */
  readonly paint: () => Readonly<Record<string, CharGrid>>;
  readonly anims?: Readonly<Record<string, AnimDef>>;
}

/**
 * Declares a still: a 320×180 sprite (or 320×`h`), no outline (its own edges are its pixels),
 * anchored at its bottom centre. Painting is lazy: `frames` paints every frame the first time it
 * is read.
 */
export function defineScene<const Id extends string>(spec: SceneSpec<Id>): SpriteDef<Id> {
  const h = spec.h ?? SCENE_H;
  let painted: Readonly<Record<string, readonly string[]>> | null = null;
  const frames = (): Readonly<Record<string, readonly string[]>> => {
    if (painted !== null) return painted;
    const out: Record<string, readonly string[]> = {};
    for (const [name, g] of Object.entries(spec.paint())) {
      if (g.length !== h || g.some((row) => row.length !== SCENE_W)) {
        throw new Error(`${spec.id}: frame ${name} is not ${SCENE_W}×${h}`);
      }
      out[name] = g.map((row) => row.join(''));
    }
    painted = out;
    return out;
  };
  return defineSprite({
    id: spec.id,
    size: { w: SCENE_W, h },
    anchor: { x: SCENE_W / 2, y: h },
    palette: spec.palette,
    outline: 'none',
    legend: spec.legend,
    get frames() {
      return frames();
    },
    ...(spec.anims === undefined ? {} : { anims: spec.anims }),
  });
}

/** Calls `each` for every pixel of a 1 px line from (x0, y0) to (x1, y1) (Bresenham). */
export function eachOnLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  each: (x: number, y: number) => void,
): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    each(x, y);
    if (x === x1 && y === y1) return;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}
