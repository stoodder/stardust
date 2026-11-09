// The menu backdrop's pixels (art-direction.md §9; BackdropScene draws them): a deep night sky in
// dithered bands over the silhouette of Dome Row, two small moons, a static starfield, and the
// layout of the animated pieces (twinkling stars and rising stardust motes). Pure RGBA buffers and
// a seeded layout, so the picture is the same every boot and unit-tested.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { createRng, nextFloat, nextInt, type Rng } from '../../shared/rng.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';

/** The backdrop's fixed seed: the same sky every boot. */
export const BACKDROP_SEED = 0x5d1;

/** Sky bands, top to bottom: [color, the row (as a fraction of the height) where it starts]. */
const SKY_BANDS: readonly (readonly [ColorName, number])[] = [
  ['ink.0', 0],
  ['ink.1', 0.33],
  ['ink.2', 0.58],
  ['violet.0', 0.72],
  ['pink.0', 0.86],
];
/** Half the height of the dithered seam between two bands, in px. */
const SEAM = 8;
/** 4×4 ordered-dither thresholds (0–15). */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;

/** Rows of ground below the horizon line, at its lowest. */
const GROUND_ROWS = 26;
/** Domes on the horizon: center x (fraction of the width), radius px, and lit windows. */
const DOMES: readonly { readonly cx: number; readonly r: number; readonly windows: number }[] = [
  { cx: 0.16, r: 24, windows: 3 },
  { cx: 0.235, r: 14, windows: 1 },
  { cx: 0.71, r: 30, windows: 4 },
  { cx: 0.79, r: 17, windows: 2 },
  { cx: 0.845, r: 11, windows: 1 },
];
/** Window light colors (Everglow teal and lamp gold). */
const WINDOW_COLORS: readonly ColorName[] = ['gold.3', 'teal.3', 'gold.4'];
/** The two small moons (art-direction §3: two moons in every act's sky). */
const MOONS: readonly {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly lit: ColorName;
  readonly shade: ColorName;
}[] = [
  { x: 0.8, y: 0.15, r: 10, lit: 'white.0', shade: 'steel.3' },
  { x: 0.87, y: 0.25, r: 4, lit: 'pink.4', shade: 'coral.3' },
];
/** Static star colors, weighted by repetition (dim ones most common). */
const STAR_COLORS: readonly ColorName[] = [
  'steel.1',
  'steel.1',
  'steel.2',
  'steel.2',
  'steel.2',
  'steel.3',
  'steel.3',
  'white.0',
  'blue.4',
  'pink.4',
  'teal.4',
  'violet.4',
];
const STAR_COUNT = 260;

/** Twinkling stars: a 5×5 plus with a white core and arms in one of these colors. */
export const TWINKLE_COLORS: readonly ColorName[] = ['blue.4', 'pink.4', 'teal.4', 'gold.4'];
const TWINKLE_COUNT = 14;
/** Stepped alpha (art-direction §7) a twinkle cycles through, one step per TWINKLE_STEP_MS. */
export const TWINKLE_ALPHAS: readonly number[] = [1, 0.75, 0.5, 0.25, 0.5, 0.75];
export const TWINKLE_STEP_MS = 220;

/** Stardust motes cycle `stardust.sung` (art-direction §2): one step every 150 ms. */
export const SHIMMER_CYCLE: readonly ColorName[] = ['pink.3', 'gold.3', 'gold.4'];
export const SHIMMER_STEP_MS = 150;
const MOTE_COUNT = 30;

export interface Twinkle {
  readonly x: number;
  readonly y: number;
  readonly color: ColorName;
  /** Offset into TWINKLE_ALPHAS, so the stars don't pulse together. */
  readonly phase: number;
}

export interface Mote {
  /** Start position (px); motes rise from the horizon and wrap back to it. */
  readonly x: number;
  readonly y: number;
  /** Rise speed, px per second. */
  readonly speed: number;
  /** 1 or 2 px square. */
  readonly size: 1 | 2;
  /** Offset into SHIMMER_CYCLE and the sideways sway. */
  readonly phase: number;
}

export interface BackdropLayout {
  readonly w: number;
  readonly h: number;
  /** The horizon row: motes wrap between here and `topY`. */
  readonly horizonY: number;
  readonly topY: number;
  readonly twinkles: readonly Twinkle[];
  readonly motes: readonly Mote[];
}

function setPx(img: RgbaImage, x: number, y: number, color: ColorName, alpha = 255): void {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
  const { r, g, b } = rgbOf(color);
  const i = (y * img.w + x) * 4;
  img.data[i] = r;
  img.data[i + 1] = g;
  img.data[i + 2] = b;
  img.data[i + 3] = alpha;
}

/** The ground line's row at column x: a low, rolling horizon. */
export function horizonAt(x: number, h: number): number {
  const wave = 2 * Math.sin(x / 41) + 1.5 * Math.sin(x / 17 + 1);
  return h - GROUND_ROWS + Math.round(wave);
}

/** The sky band color at (x, y), dithered across each seam. */
export function skyColorAt(x: number, y: number, h: number): ColorName {
  let idx = 0;
  for (let i = 1; i < SKY_BANDS.length; i++) {
    const start = Math.round(SKY_BANDS[i]![1] * h); // i < length
    if (y >= start + SEAM) {
      idx = i;
      continue;
    }
    if (y >= start - SEAM) {
      const t = (y - (start - SEAM)) / (2 * SEAM);
      const threshold = BAYER4[(y % 4) * 4 + (x % 4)]! / 16; // index < 16
      if (threshold < t) idx = i;
    }
    break;
  }
  return SKY_BANDS[idx]![0]; // idx < length
}

function drawMoon(img: RgbaImage, moon: (typeof MOONS)[number]): void {
  const cx = Math.round(moon.x * img.w);
  const cy = Math.round(moon.y * img.h);
  const r = moon.r;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      // Lit from the upper right: the far side of an offset disc is in shade.
      const sx = dx - Math.ceil(r / 3);
      const sy = dy + Math.ceil(r / 4);
      const shaded = sx * sx + sy * sy > r * r;
      setPx(img, cx + dx, cy + dy, shaded ? moon.shade : moon.lit);
    }
  }
  if (r >= 8) {
    // Two craters on the big moon.
    setPx(img, cx + 2, cy - 3, moon.shade);
    setPx(img, cx + 3, cy - 3, moon.shade);
    setPx(img, cx - 1, cy + 3, moon.shade);
  }
}

function drawDomes(img: RgbaImage, rng: Rng): void {
  const { w, h } = img;
  for (const dome of DOMES) {
    const cx = Math.round(dome.cx * w);
    const base = horizonAt(cx, h) + 2;
    const r = dome.r;
    // Silhouette, with a 1 px rim catching the sky glow along its top.
    for (let dx = -r; dx <= r; dx++) {
      const top = base - Math.round(Math.sqrt(r * r - dx * dx) * 0.8);
      for (let y = top; y < h; y++) setPx(img, cx + dx, y, 'ink.0');
      setPx(img, cx + dx, top, 'violet.1');
    }
    // Lit windows: 2×1 slits in a row a third of the way up.
    const wy = base - Math.round(r * 0.3);
    for (let i = 0; i < dome.windows; i++) {
      const wx = cx - r + Math.round(((i + 1) * 2 * r) / (dome.windows + 1)) - 1;
      const color = WINDOW_COLORS[nextInt(rng, WINDOW_COLORS.length)]!; // index < length
      setPx(img, wx, wy, color);
      setPx(img, wx + 1, wy, color);
    }
  }
}

/** The static backdrop: sky bands, stars, moons, and the Dome Row silhouette. */
export function backdropImage(w: number, h: number, seed = BACKDROP_SEED): RgbaImage {
  const img: RgbaImage = { w, h, data: new Uint8ClampedArray(w * h * 4) };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) setPx(img, x, y, skyColorAt(x, y, h));
  }
  const rng = createRng(seed);
  for (let i = 0; i < STAR_COUNT; i++) {
    const x = nextInt(rng, w);
    // Fewer stars near the glowing horizon: squaring biases them upward.
    const y = Math.floor(nextFloat(rng) ** 2 * (h - GROUND_ROWS - 24));
    setPx(img, x, y, STAR_COLORS[nextInt(rng, STAR_COLORS.length)]!); // index < length
  }
  for (const moon of MOONS) drawMoon(img, moon);
  // Ground: solid ink below the rolling horizon line.
  for (let x = 0; x < w; x++) {
    for (let y = horizonAt(x, h); y < h; y++) setPx(img, x, y, 'ink.0');
  }
  drawDomes(img, rng);
  return img;
}

/** Where the animated pieces go (seeded separately from the static stars). */
export function backdropLayout(w: number, h: number, seed = BACKDROP_SEED): BackdropLayout {
  const rng = createRng((seed + 1) >>> 0);
  const horizonY = h - GROUND_ROWS;
  const topY = Math.round(h * 0.3);
  const twinkles: Twinkle[] = [];
  for (let i = 0; i < TWINKLE_COUNT; i++) {
    twinkles.push({
      x: 4 + nextInt(rng, w - 8),
      y: 4 + nextInt(rng, Math.round(h * 0.55)),
      color: TWINKLE_COLORS[nextInt(rng, TWINKLE_COLORS.length)]!, // index < length
      phase: nextInt(rng, TWINKLE_ALPHAS.length),
    });
  }
  const motes: Mote[] = [];
  for (let i = 0; i < MOTE_COUNT; i++) {
    motes.push({
      x: nextInt(rng, w),
      y: topY + nextInt(rng, horizonY - topY),
      speed: 3 + nextFloat(rng) * 7,
      size: nextFloat(rng) < 0.3 ? 2 : 1,
      phase: nextInt(rng, 1000),
    });
  }
  return { w, h, horizonY, topY, twinkles, motes };
}

/** A twinkle's 5×5 plus: white core, colored arms. */
export function twinkleImage(color: ColorName): RgbaImage {
  const img: RgbaImage = { w: 5, h: 5, data: new Uint8ClampedArray(5 * 5 * 4) };
  setPx(img, 2, 2, 'white.1');
  for (const [x, y] of [
    [2, 1],
    [2, 3],
    [1, 2],
    [3, 2],
  ] as const) {
    setPx(img, x, y, color);
  }
  for (const [x, y] of [
    [2, 0],
    [2, 4],
    [0, 2],
    [4, 2],
  ] as const) {
    setPx(img, x, y, color, 128);
  }
  return img;
}

/** A mote's square of one shimmer color. */
export function moteImage(color: ColorName, size: 1 | 2): RgbaImage {
  const img: RgbaImage = { w: size, h: size, data: new Uint8ClampedArray(size * size * 4) };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) setPx(img, x, y, color);
  return img;
}

/** A mote's position `ms` after the backdrop started: rising, swaying, wrapping at the top. */
export function motePosition(
  m: Mote,
  layout: BackdropLayout,
  ms: number,
  out: { x: number; y: number },
): void {
  const span = layout.horizonY - layout.topY;
  const risen = (m.y - layout.topY - (m.speed * ms) / 1000) % span;
  out.y = Math.round(layout.topY + (risen < 0 ? risen + span : risen));
  out.x = Math.round(m.x + 2 * Math.sin(ms / 900 + m.phase));
}
