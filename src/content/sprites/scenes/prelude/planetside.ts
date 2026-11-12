// Tumble IV planetside, for the prelude's stills (M10, T1003; bible.md § 3 *Tumble IV*;
// art-direction § 3 *Act I*): the Long Afternoon's cyan sky and its clouds, the Spires (the
// northern ridges of pink clay with pink-gold glints in the rock and Everglow's rigs on their
// crests), and the terraced green valley below them. The descent, the touchdown and Dome Row share
// these painters; each asks for colours by name through its still's ink (stamp.ts), so the three
// stills paint the same world in their own legends.
import type { ColorName } from '../../../palettes/master.ts';
import { hash01, plot, type CharGrid } from '../../helpers.ts';
import { dithered, eachOnLine, fill, SCENE_W } from '../sceneKit.ts';
import type { SceneInk } from './stamp.ts';

/** The colours the planetside painters use: every still that calls them names these. */
export const PLANETSIDE_COLORS = [
  'act1.sky.0',
  'act1.sky.1',
  'act1.sky.2',
  'white.0',
  'white.1',
  'act1.clay.0',
  'act1.clay.1',
  'act1.clay.2',
  'act1.clay.3',
  'act1.clay.4',
  'act1.shade',
  'act1.grass.0',
  'act1.grass.1',
  'act1.grass.2',
  'act1.grass.3',
  'gold.4',
  'pink.3',
  'steel.1',
  'steel.2',
  'steel.3',
  'teal.4',
] as const satisfies readonly ColorName[];

type Planetside = (typeof PLANETSIDE_COLORS)[number];

/** The still's character for one of the planetside colours. */
function inkOf(ink: SceneInk): (c: Planetside) => string {
  return (c) => ink.char(c);
}

/** The Long Afternoon's sky from `y0` (its deepest cyan) to `y1` (pale at the horizon). */
export function paintSky(g: CharGrid, ink: SceneInk, y0: number, y1: number): void {
  const c = inkOf(ink);
  const ramp = [c('act1.sky.0'), c('act1.sky.1'), c('act1.sky.2')];
  fill(g, 0, y0, SCENE_W - 1, y1, (x, y) =>
    dithered(ramp, ((y - y0) / Math.max(1, y1 - y0)) ** 1.2, x, y),
  );
}

/**
 * A fair-weather cloud: a row of lumps lit white on top, its belly shaded toward the sky's pale
 * cyan, flat underneath. `w` is its width; `seed` varies the lumps.
 */
export function paintCloud(
  g: CharGrid,
  ink: SceneInk,
  cx: number,
  baseY: number,
  w: number,
  seed: number,
): void {
  const c = inkOf(ink);
  const lumps = Math.max(2, Math.round(w / 9));
  const tops: { x: number; r: number }[] = [];
  for (let i = 0; i < lumps; i++) {
    const t = lumps === 1 ? 0.5 : i / (lumps - 1);
    const mid = 1 - Math.abs(t - 0.5) * 1.4;
    tops.push({
      x: cx - w / 2 + t * w,
      r: 3 + mid * (w / 7) + hash01(i, seed, 3) * 3,
    });
  }
  fill(g, Math.floor(cx - w / 2 - 8), baseY - 30, Math.ceil(cx + w / 2 + 8), baseY, (x, y) => {
    let inside = false;
    let lit = 0;
    for (const l of tops) {
      const d = Math.hypot((x - l.x) / 1.15, y - (baseY - l.r * 0.6));
      if (d <= l.r) {
        inside = true;
        lit = Math.max(lit, (baseY - l.r * 0.6 - y) / l.r + (l.x - x) / (l.r * 3));
      }
    }
    if (!inside) return null;
    const depth = (baseY - y) / 6;
    if (depth < 0.45) return y === baseY ? c('act1.sky.1') : c('act1.sky.2');
    if (lit > 0.55) return c('white.1');
    if (lit > -0.05 || depth > 1.6) return dithered([c('act1.sky.2'), c('white.0')], 0.4 + lit, x, y);
    return c('act1.sky.2');
  });
}

/** One crest of the Spires: where it stands, how wide its base is, and how high it rises. */
export interface Peak {
  readonly x: number;
  readonly w: number;
  readonly h: number;
}

/** The ridge's height above `baseY` at column x: the tallest crest over x, roughened. */
function ridgeAt(peaks: readonly Peak[], x: number, seed: number): number {
  let top = 0;
  for (const p of peaks) {
    const t = 1 - Math.abs(x - p.x) / (p.w / 2);
    if (t <= 0) continue;
    // A jagged crest: steep near the top, a few broken steps down its flanks.
    const shape = t ** 1.6 * p.h;
    const step = Math.floor(shape / 3) * 3;
    top = Math.max(top, shape * 0.6 + step * 0.4);
  }
  return top + (hash01(x >> 1, seed, 17) - 0.5) * 2;
}

/**
 * The Spires: a ridge of pink clay crests standing on `baseY`, lit from the west (the afternoon
 * sun), their shaded faces sinking to the deep clay and the shade, pink-gold glints in the rock
 * (bible § 3). `haze` (0–1) lifts the far ridges toward the sky. Returns the ridge top per column.
 */
export function paintSpires(
  g: CharGrid,
  ink: SceneInk,
  baseY: number,
  peaks: readonly Peak[],
  seed: number,
  haze = 0,
): number[] {
  const c = inkOf(ink);
  const tops: number[] = [];
  for (let x = 0; x < SCENE_W; x++) {
    const h = ridgeAt(peaks, x, seed);
    const top = Math.round(baseY - h);
    tops.push(top);
    if (h <= 0.5) continue;
    const slope = ridgeAt(peaks, x + 2, seed) - ridgeAt(peaks, x - 2, seed);
    for (let y = top; y <= baseY; y++) {
      const depth = (y - top) / Math.max(4, h);
      // West-facing (rising to the right) faces catch the sun; the others fall into shade.
      const lit = slope > 0.4 ? 1 : slope < -0.4 ? -1 : 0;
      let v = 0.62 + lit * 0.24 - depth * 0.38;
      // Strata: a darker line every few rows across the lit faces.
      if ((y + (x >> 3)) % 7 === 0 && lit >= 0) v -= 0.18;
      v = v * (1 - haze) + haze * 0.92;
      let ch = dithered(
        [c('act1.shade'), c('act1.clay.0'), c('act1.clay.1'), c('act1.clay.2'), c('act1.clay.3')],
        Math.max(0, Math.min(1, v)),
        x,
        y,
      );
      if (haze > 0.5) ch = dithered([c('act1.clay.2'), c('act1.clay.3'), c('act1.sky.2')], v, x, y);
      if (y === top && lit > 0) ch = c(haze > 0.5 ? 'act1.clay.4' : 'act1.clay.3');
      // Pink-gold glints: stardust seams catching the light (never on hazed ridges).
      if (haze < 0.5 && lit >= 0 && depth > 0.15 && hash01(x, y, seed + 5) < 0.012) {
        ch = hash01(x, y, seed + 6) < 0.5 ? c('gold.4') : c('pink.3');
      }
      plot(g, x, y, ch);
    }
  }
  return tops;
}

/**
 * An Everglow extraction rig on a crest: a steel derrick (two legs, cross-braces), a gantry arm
 * off its top, and a teal beacon. `h` is its height from its foot at (x, footY).
 */
export function paintRig(g: CharGrid, ink: SceneInk, x: number, footY: number, h: number): void {
  const c = inkOf(ink);
  const spread = Math.max(2, Math.round(h / 4));
  const topY = footY - h;
  eachOnLine(x - spread, footY, x, topY, (px, py) => plot(g, px, py, c('steel.1')));
  eachOnLine(x + spread, footY, x + 1, topY, (px, py) => plot(g, px, py, c('steel.3')));
  for (let y = footY - 3; y > topY + 1; y -= 3) {
    const half = Math.round(((y - topY) / h) * spread);
    for (let dx = -half; dx <= half; dx++) plot(g, x + dx, y, c('steel.2'));
  }
  // The gantry arm and its cable.
  for (let dx = 1; dx <= Math.round(h / 2.5); dx++) plot(g, x + dx, topY + 1, c('steel.2'));
  const armEnd = x + Math.round(h / 2.5);
  for (let y = topY + 2; y < topY + 2 + Math.round(h / 3); y++) plot(g, armEnd, y, c('steel.1'));
  plot(g, x, topY - 1, c('teal.4'));
  plot(g, x + 1, topY - 1, c('teal.4'));
}

/**
 * The terraced valley between `y0` (far) and `y1` (near): green steps cut into the slope, each a
 * lit lip over a darker riser, pink clay showing where the riser is steep. `bands` steps.
 */
export function paintTerraces(
  g: CharGrid,
  ink: SceneInk,
  y0: number,
  y1: number,
  bands: number,
  seed: number,
): void {
  const c = inkOf(ink);
  const span = y1 - y0;
  for (let x = 0; x < SCENE_W; x++) {
    for (let b = 0; b < bands; b++) {
      const t0 = b / bands;
      const wave = Math.sin(x * 0.021 + b * 1.7 + seed) * 4 + Math.sin(x * 0.07 + b) * 1.5;
      const top = Math.round(y0 + t0 ** 1.1 * span + wave * (0.4 + t0));
      const bottom = Math.round(y0 + ((b + 1) / bands) ** 1.1 * span + wave * (0.4 + t0));
      for (let y = top; y <= Math.min(y1, bottom + 2); y++) {
        const k = (y - top) / Math.max(1, bottom - top);
        let ch: string;
        if (y === top) ch = c('act1.grass.3');
        else if (k < 0.55) ch = dithered([c('act1.grass.1'), c('act1.grass.2')], 0.9 - k, x, y);
        else if (k < 0.8) ch = dithered([c('act1.clay.1'), c('act1.grass.1')], 0.7, x, y);
        else ch = c('act1.grass.0');
        plot(g, x, y, ch);
      }
    }
  }
}
