// Pure pixel passes for the sprite baker (docs/art/tech-spec.md § What the baker produces).
// No DOM and no Phaser: everything works on plain typed arrays, so it is unit-tested in Node.
import { luminance } from '../../content/palettes/color.ts';
import { KEEP, TRANSPARENT } from '../../content/sprites/legend.ts';
import type { OutlineMode } from '../../content/sprites/types.ts';

/** A grid of legend characters, stored as char codes. */
export interface IndexedImage {
  readonly w: number;
  readonly h: number;
  readonly px: Uint8Array;
}

/** Straight-alpha RGBA pixels, row-major (the layout of `ImageData`). */
export interface RgbaImage {
  readonly w: number;
  readonly h: number;
  readonly data: Uint8ClampedArray<ArrayBuffer>;
}

/** RGBA for one legend character, or `null` for transparent. */
export interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

/** Maps a legend char code to a color (`null`: transparent). */
export type ColorLookup = (code: number) => Rgba | null;

const DOT = TRANSPARENT.charCodeAt(0);
const SPACE = KEEP.charCodeAt(0);

/** An image of the given size, all transparent. */
export function blankImage(w: number, h: number): IndexedImage {
  return { w, h, px: new Uint8Array(w * h).fill(DOT) };
}

/** True if the char code is the transparent character. */
export function isClear(code: number): boolean {
  return code === DOT;
}

/**
 * Parses grid rows into an image. Every row must be `w` characters, there must be `h` rows, and
 * every character must pass `isLegal`. Errors name `where`, the row, and the column.
 */
export function parseGrid(
  rows: readonly string[],
  w: number,
  h: number,
  isLegal: (ch: string) => boolean,
  where: string,
): IndexedImage {
  if (rows.length !== h) throw new Error(`${where}: has ${rows.length} rows, expected ${h}`);
  const img = blankImage(w, h);
  rows.forEach((row, y) => {
    if (row.length !== w) {
      throw new Error(`${where}: row ${y} is ${row.length} wide, expected ${w}`);
    }
    for (let x = 0; x < w; x++) {
      const ch = row.charAt(x);
      if (!isLegal(ch))
        throw new Error(`${where}: row ${y} col ${x}: '${ch}' is not in the legend`);
      img.px[y * w + x] = ch.charCodeAt(0);
    }
  });
  return img;
}

/**
 * Returns a copy of `base` with `rows` written at (x, y). `.` writes transparency; a space keeps
 * the pixel underneath. Patches must fit inside the image.
 */
export function applyPatch(
  base: IndexedImage,
  x: number,
  y: number,
  rows: readonly string[],
  isLegal: (ch: string) => boolean,
  where: string,
): IndexedImage {
  const px = base.px.slice();
  rows.forEach((row, dy) => {
    const ty = y + dy;
    for (let dx = 0; dx < row.length; dx++) {
      const tx = x + dx;
      const ch = row.charAt(dx);
      if (tx < 0 || ty < 0 || tx >= base.w || ty >= base.h) {
        throw new Error(`${where}: patch pixel (${tx}, ${ty}) is outside ${base.w}×${base.h}`);
      }
      if (ch === KEEP) continue;
      if (!isLegal(ch))
        throw new Error(`${where}: patch row ${dy} col ${dx}: '${ch}' is not in the legend`);
      px[ty * base.w + tx] = ch.charCodeAt(0);
    }
  });
  return { w: base.w, h: base.h, px };
}

/** The image flipped left to right. */
export function mirrorH(img: IndexedImage): IndexedImage {
  const px = new Uint8Array(img.px.length);
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) px[y * img.w + x] = img.px[y * img.w + (img.w - 1 - x)] ?? DOT;
  }
  return { w: img.w, h: img.h, px };
}

/**
 * The outline pass: pads the image by 1 px on every side, then turns every transparent pixel that
 * touches an opaque one (4-adjacent for `auto`, 8-adjacent for `auto8`) into `outlineCode`.
 * `isSolid` decides which codes count as opaque (shadow pixels don't grow an outline).
 */
export function outlinePass(
  img: IndexedImage,
  mode: OutlineMode,
  outlineCode: number,
  isSolid: (code: number) => boolean,
): IndexedImage {
  if (mode === 'none') return img;
  const w = img.w + 2;
  const h = img.h + 2;
  const out = blankImage(w, h);
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) out.px[(y + 1) * w + (x + 1)] = img.px[y * img.w + x] ?? DOT;
  }
  const solidAt = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    const code = out.px[y * w + x] ?? DOT;
    return code !== outlineCode && isSolid(code);
  };
  const neighbors =
    mode === 'auto8'
      ? [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ]
      : [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];
  const ring: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const code = out.px[y * w + x] ?? DOT;
      if (code !== DOT && code !== SPACE) continue;
      if (neighbors.some(([dx = 0, dy = 0]) => solidAt(x + dx, y + dy))) ring.push(y * w + x);
    }
  }
  for (const i of ring) out.px[i] = outlineCode;
  return out;
}

/** Converts an indexed image to RGBA through a color lookup. */
export function colorize(img: IndexedImage, lookup: ColorLookup): RgbaImage {
  const data = new Uint8ClampedArray(img.w * img.h * 4);
  // A lookup is a pure function of the code, so each code is looked up once per image, not once
  // per pixel: the boot bakes thousands of frames (conventions.md § Gate time, keep boot cheap).
  const seen: (Rgba | null | undefined)[] = [];
  for (let i = 0; i < img.px.length; i++) {
    const code = img.px[i] ?? DOT;
    let c = seen[code];
    if (c === undefined) {
      c = lookup(code);
      seen[code] = c;
    }
    if (c === null) continue;
    data[i * 4] = c.r;
    data[i * 4 + 1] = c.g;
    data[i * 4 + 2] = c.b;
    data[i * 4 + 3] = c.a;
  }
  return { w: img.w, h: img.h, data };
}

/** Glow alpha by distance from an emissive pixel: stepped, never smooth (art-direction §7). */
export const GLOW_STEPS: readonly number[] = [0.6, 0.35, 0.15];

/**
 * The `@glow` pass: emissive pixels (codes in `emissive`) dilated by `radius` with stepped alpha,
 * each halo pixel taking the color of its nearest emissive pixel. The result is padded by
 * `radius` on every side so the halo is never clipped; draw it additively, offset by `-radius`.
 * Distance is Euclidean, rounded to the nearest pixel; step `d` uses GLOW_STEPS[min(d, last)].
 */
export function glowPass(
  img: IndexedImage,
  lookup: ColorLookup,
  emissive: ReadonlySet<number>,
  radius: number,
): RgbaImage {
  const w = img.w + 2 * radius;
  const h = img.h + 2 * radius;
  const data = new Uint8ClampedArray(w * h * 4);
  const sources: { x: number; y: number; c: Rgba }[] = [];
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const code = img.px[y * img.w + x] ?? DOT;
      const c = emissive.has(code) ? lookup(code) : null;
      if (c !== null) sources.push({ x: x + radius, y: y + radius, c });
    }
  }
  if (sources.length === 0) return { w, h, data };
  const lastStep = GLOW_STEPS.length - 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let best = Infinity;
      let color: Rgba | null = null;
      for (const s of sources) {
        const d2 = (s.x - x) * (s.x - x) + (s.y - y) * (s.y - y);
        if (d2 < best) {
          best = d2;
          color = s.c;
        }
      }
      const d = Math.round(Math.sqrt(best));
      if (color === null || d > radius) continue;
      const i = (y * w + x) * 4;
      data[i] = color.r;
      data[i + 1] = color.g;
      data[i + 2] = color.b;
      data[i + 3] = Math.round(255 * (GLOW_STEPS[Math.min(d, lastStep)] ?? 0));
    }
  }
  return { w, h, data };
}

/** Mean luminance of the opaque pixels of an RGBA image (0 if none). */
export function meanLuminance(img: RgbaImage): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < img.data.length; i += 4) {
    if ((img.data[i + 3] ?? 0) === 0) continue;
    sum += luminance({ r: img.data[i] ?? 0, g: img.data[i + 1] ?? 0, b: img.data[i + 2] ?? 0 });
    n++;
  }
  return n === 0 ? 0 : sum / n;
}
