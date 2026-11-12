// Stamping battle sprites into the prelude's stills (M10, T1003; art-direction § 6, *The prelude's
// stills*): the descent, the touchdown and Dome Row show the colony's own kit (the dome, Rivet,
// the fence, Evie's billboard, the Nibbler, the Peeker, Gerald), copied 1:1 from the battle
// sprites onto the still's grid so pixel densities never mix (art-direction § 1, principle 7).
// A frame is resolved here the way the baker resolves it (grids, patches, mirrors; the `auto` /
// `auto8` outline in the sprite's own outline colour), then each pixel's master colour is written
// as the still's character for that colour. The stills' own painters ask for colours by name
// through the same ink. A still's legend names every colour it uses, so the copy is exact; a
// colour the still lacks falls back to its nearest (`missed` lists them, and the tests hold every
// prelude still at none).
import { PALETTES } from '../../../palettes/index.ts';
import { rgbOf, type ColorName } from '../../../palettes/master.ts';
import type { CharGrid } from '../../helpers.ts';
import { plot } from '../../helpers.ts';
import { isCustomChar, KEEP, STANDARD_LEGEND, TRANSPARENT } from '../../legend.ts';
import type { CustomChar, FrameDef, PaletteId, SpriteDef } from '../../types.ts';
import { patchList } from '../../validate.ts';

/** A still's colours: the character it paints each master colour with. */
export interface SceneInk {
  /** The still's character for `color` (its nearest colour's if the still lacks it). */
  readonly char: (color: ColorName) => string;
  /** True if the still has `color` exactly. */
  readonly has: (color: ColorName) => boolean;
  /** Every colour asked for so far that the still lacks (the tests hold each still at none). */
  readonly missed: () => readonly ColorName[];
}

/**
 * The ink of a still drawn under `palette` with `legend`: its custom letters first (the colours
 * the still names), then its palette's slots by the standard legend.
 */
export function sceneInk(
  palette: PaletteId,
  legend: Readonly<Partial<Record<CustomChar, ColorName>>>,
): SceneInk {
  const byColor = new Map<ColorName, string>();
  for (const [ch, color] of Object.entries(legend)) {
    if (color !== undefined && !byColor.has(color)) byColor.set(color, ch);
  }
  const slots = PALETTES[palette];
  for (const [ch, slot] of Object.entries(STANDARD_LEGEND)) {
    // The shadow slot draws at half alpha in a sprite; a still's pixels are all opaque.
    if (slot === 'shadow') continue;
    const color = slots[slot];
    if (!byColor.has(color)) byColor.set(color, ch);
  }
  const entries = [...byColor.entries()].map(([color, ch]) => ({ rgb: rgbOf(color), ch }));
  const nearest = new Map<ColorName, string>();
  return {
    has: (color) => byColor.has(color),
    missed: () => [...nearest.keys()],
    char: (color) => {
      const exact = byColor.get(color) ?? nearest.get(color);
      if (exact !== undefined) return exact;
      const c = rgbOf(color);
      let best = TRANSPARENT;
      let bestD = Number.POSITIVE_INFINITY;
      for (const e of entries) {
        const d = (e.rgb.r - c.r) ** 2 + (e.rgb.g - c.g) ** 2 + (e.rgb.b - c.b) ** 2;
        if (d < bestD) {
          bestD = d;
          best = e.ch;
        }
      }
      nearest.set(color, best);
      return best;
    },
  };
}

function isGrid(fd: FrameDef): fd is readonly string[] {
  return Array.isArray(fd);
}

/** A sprite's frame as full rows of its own legend's characters (patches applied, mirrors flipped). */
export function frameRows(def: SpriteDef, name: string): string[] {
  const fd = def.frames[name];
  if (fd === undefined) throw new Error(`${def.id}: no frame '${name}'`);
  if (isGrid(fd)) return [...fd];
  if ('mirrorOf' in fd)
    return frameRows(def, fd.mirrorOf).map((r) => r.split('').toReversed().join(''));
  const out = frameRows(def, fd.from).map((r) => r.split(''));
  for (const p of patchList(fd)) {
    p.rows.forEach((r, dy) => {
      for (let dx = 0; dx < r.length; dx++) {
        const ch = r.charAt(dx);
        const row = out[p.y + dy];
        if (ch === KEEP || row === undefined || p.x + dx >= row.length) continue;
        row[p.x + dx] = ch;
      }
    });
  }
  return out.map((r) => r.join(''));
}

/** The master colour of one of a sprite's characters, or null (transparent, or its shadow). */
export function colorOfChar(def: SpriteDef, ch: string): ColorName | null {
  if (ch === TRANSPARENT) return null;
  const slot = STANDARD_LEGEND[ch];
  if (slot !== undefined) return slot === 'shadow' ? null : PALETTES[def.palette][slot];
  if (isCustomChar(ch)) return def.legend?.[ch] ?? null;
  return null;
}

/** One stamped pixel: where it lands on the still and its master colour. */
export interface StampPixel {
  readonly x: number;
  readonly y: number;
  readonly color: ColorName;
}

/** How a frame is stamped. */
export interface StampOpts {
  /** Flip it left to right about its anchor (a sprite facing the other way). */
  readonly mirror?: boolean;
  /** Recolours by the sprite's own characters before the colours are looked up. */
  readonly recolor?: Readonly<Record<string, string>>;
}

/**
 * The pixels of a sprite's frame with its anchor at (ax, ay) on the still, as the baker draws it:
 * the frame's opaque pixels, ringed by the sprite's outline colour where its outline mode says.
 * Shadow pixels (half-alpha in play) are left out.
 */
export function framePixels(
  def: SpriteDef,
  frame: string,
  ax: number,
  ay: number,
  opts: StampOpts = {},
): StampPixel[] {
  let src = frameRows(def, frame);
  if (opts.recolor !== undefined) {
    const map = opts.recolor;
    src = src.map((r) =>
      r
        .split('')
        .map((ch) => map[ch] ?? ch)
        .join(''),
    );
  }
  const w = def.size.w;
  const h = def.size.h;
  const mirror = opts.mirror === true;
  // The anchor is a pixel-edge coordinate: a mirrored frame keeps it at the same edge.
  const ox = mirror ? ax - (w - def.anchor.x) : ax - def.anchor.x;
  const oy = ay - def.anchor.y;
  const charAt = (x: number, y: number): string => {
    if (x < 0 || y < 0 || x >= w || y >= h) return TRANSPARENT;
    return src[y]?.charAt(mirror ? w - 1 - x : x) ?? TRANSPARENT;
  };
  const solid = (x: number, y: number): boolean => {
    const ch = charAt(x, y);
    return ch !== TRANSPARENT && STANDARD_LEGEND[ch] !== 'shadow';
  };
  const out: StampPixel[] = [];
  const mode = def.outline ?? 'none';
  const outline = PALETTES[def.palette].outline;
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      const color = colorOfChar(def, charAt(x, y));
      if (color !== null) {
        out.push({ x: ox + x, y: oy + y, color });
        continue;
      }
      if (mode === 'none' || solid(x, y)) continue;
      const four = solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1);
      const eight =
        mode === 'auto8' &&
        (solid(x - 1, y - 1) || solid(x + 1, y - 1) || solid(x - 1, y + 1) || solid(x + 1, y + 1));
      if (four || eight) out.push({ x: ox + x, y: oy + y, color: outline });
    }
  }
  return out;
}

/** Stamps a sprite's frame onto a still with its anchor at (ax, ay), in the still's ink. */
export function stampSprite(
  g: CharGrid,
  ink: SceneInk,
  def: SpriteDef,
  frame: string,
  ax: number,
  ay: number,
  opts: StampOpts = {},
): void {
  for (const p of framePixels(def, frame, ax, ay, opts)) plot(g, p.x, p.y, ink.char(p.color));
}
