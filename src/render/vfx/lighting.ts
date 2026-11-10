// The lighting overlay's tint path (art-direction.md §7; T410a): a map's lighting schedule
// (MapDef.lighting) crossfades the sky and the shade between environment palettes across its
// waves, with no gameplay effect (A2M3's `act2.gold` → `act2.dusk`, D101). Pure, so the schedule's
// arithmetic and the colors are unit-tested; LightingView draws them.
//
// - **Where the light stands** is a position along the schedule's stops (the map's `env` before
//   wave 1, then each key): stop k once its wave has started, and between two stops in equal
//   steps per wave started. As a wave starts the light eases from the wave before's position over
//   `LIGHT_FADE_TICKS` sim ticks (so it holds while paused); under reduced motion it steps.
// - **The shade** is a multiply grade over the whole view (ENV_GRADE: each env's light over
//   daylight). The ground is baked in the map's own env, so the grade toward env E is E's over the
//   base's, capped at 1 (a grade only darkens): the map's own env grades to white (no change), and
//   gold to dusk is the dusk's lilac light. M5's Sundown adds darkness and light stamps on
//   top of this; nothing here reads the sim beyond the wave number.
// - **The sky** is each stop's sky gradient (ENV_SKY) as dithered bands across the top of the view
//   that fade into the void, crossfaded by alpha between the two stops in play. Two small moons
//   hang in it (art-direction §3: in every act's sky), up right of the map's north corner where
//   the HUD and the playfield leave the sky clear, the same in every stop so the crossfade never
//   doubles them (T430b).
import { ENV_SKY } from '../../content/palettes/env.ts';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { EnvPaletteId, LightingKeyDef } from '../../content/types.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';

/** How long the light takes to move to a new wave's position: 4 s of sim time. */
export const LIGHT_FADE_TICKS = 240;
/** The sky's bands fill this share of the view's height, then fade into the void below. */
export const SKY_SHARE = 0.42;

export interface LightStop {
  readonly wave: number;
  readonly env: EnvPaletteId;
}

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** The schedule's stops: the map's env at wave 0 (before wave 1), then each key. */
export function lightStops(env: EnvPaletteId, keys: readonly LightingKeyDef[]): LightStop[] {
  return [{ wave: 0, env }, ...keys.map((k) => ({ wave: k.wave, env: k.env }))];
}

/**
 * Where the light stands once wave `wave` has started (0: before wave 1): stop k at its wave, in
 * equal steps per wave between two stops, and the last stop from its wave on.
 */
export function lightPosition(stops: readonly LightStop[], wave: number): number {
  for (let k = stops.length - 1; k >= 0; k--) {
    const s = stops[k]!; // k < length
    if (wave < s.wave) continue;
    const next = stops[k + 1];
    if (next === undefined) return k;
    return k + (wave - s.wave) / (next.wave - s.wave);
  }
  return 0;
}

/**
 * The two stops a position falls between: the first's index (`stop`) and env, the second's env,
 * and how far toward it (0–1). Past the last stop, the last two at t = 1.
 */
export function lightMix(
  stops: readonly LightStop[],
  pos: number,
): {
  readonly stop: number;
  readonly from: EnvPaletteId;
  readonly to: EnvPaletteId;
  readonly t: number;
} {
  const last = stops.length - 1;
  const p = Math.min(Math.max(pos, 0), last);
  const k = Math.min(Math.floor(p), Math.max(0, last - 1));
  const from = stops[k]!.env; // k ≤ last
  const to = (stops[k + 1] ?? stops[k]!).env; // k ≤ last
  return { stop: k, from, to, t: last === 0 ? 0 : p - k };
}

/**
 * Each env's light as a multiply grade over daylight: the afternoon and the gold hour are the
 * daylight the world's ramps are drawn for (white); every later env's grade is its own `light`
 * (the dusk's lilac, the night's pale violet, the dawn's peach).
 */
export const ENV_GRADE: Readonly<Record<EnvPaletteId, ColorName>> = {
  act1: 'white.1',
  'act2.gold': 'white.1',
  'act2.dusk': 'act2.dusk.light',
  act3: 'act3.light',
  finale: 'finale.light',
};

/**
 * The multiply grade that lights a map baked in `base` as `env`: `env`'s grade over `base`'s, per
 * channel, capped at 1 (a grade only darkens; the base's own light is white, unchanged).
 */
export function gradeOf(base: EnvPaletteId, env: EnvPaletteId): Rgb {
  if (base === env) return { r: 255, g: 255, b: 255 };
  const b = rgbOf(ENV_GRADE[base]);
  const e = rgbOf(ENV_GRADE[env]);
  return { r: ratio(b.r, e.r), g: ratio(b.g, e.g), b: ratio(b.b, e.b) };
}

/** One channel of a grade: `env`'s over the base's, as 0–255, capped at 255. */
function ratio(base: number, env: number): number {
  return Math.round(255 * Math.min(1, env / Math.max(base, 1)));
}

/** The grade at position `pos` along `stops` for a map baked in `base`. */
export function gradeAt(base: EnvPaletteId, stops: readonly LightStop[], pos: number): Rgb {
  const { from, to, t } = lightMix(stops, pos);
  return lerpRgb(gradeOf(base, from), gradeOf(base, to), t);
}

export function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

/** `r`, `g`, `b` as one 0xRRGGBB number (a Phaser fill color). */
export function rgbNumber(c: Rgb): number {
  return (c.r << 16) | (c.g << 8) | c.b;
}

/**
 * Where the light stands at sim tick `tick`, once wave `wave` (0: none yet) started at
 * `waveStartTick`: easing linearly from the wave before's position to this wave's over
 * LIGHT_FADE_TICKS, or at this wave's at once under reduced motion (stepped). A function of sim
 * state alone, so it holds while paused, keeps up under fast-forward, and resumes a restored run.
 */
export function lightAt(
  stops: readonly LightStop[],
  wave: number,
  waveStartTick: number,
  tick: number,
  reducedMotion: boolean,
): number {
  const to = lightPosition(stops, wave);
  const ticks = tick - waveStartTick;
  if (reducedMotion || wave <= 0 || ticks >= LIGHT_FADE_TICKS) return to;
  const from = lightPosition(stops, wave - 1);
  return from + ((to - from) * Math.max(0, ticks)) / LIGHT_FADE_TICKS;
}

/**
 * The battle sky's two small moons (the menu backdrop's pair, smaller): centers as shares of the
 * sky image, radius in px, lit from the upper right.
 */
export const SKY_MOONS: readonly {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly lit: ColorName;
  readonly shade: ColorName;
}[] = [
  { x: 0.7, y: 0.11, r: 6, lit: 'white.0', shade: 'steel.3' },
  { x: 0.765, y: 0.19, r: 3, lit: 'pink.4', shade: 'coral.3' },
];

function drawMoon(img: RgbaImage, moon: (typeof SKY_MOONS)[number]): void {
  const cx = Math.round(moon.x * img.w);
  const cy = Math.round(moon.y * img.h);
  const r = moon.r;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r + r) continue;
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
      // The far side of an offset disc is in shade (a crescent of shadow lower left).
      const sx = dx - Math.ceil(r / 3);
      const sy = dy + Math.ceil(r / 4);
      const c = rgbOf(sx * sx + sy * sy > r * r ? moon.shade : moon.lit);
      const i = (y * img.w + x) * 4;
      img.data[i] = c.r;
      img.data[i + 1] = c.g;
      img.data[i + 2] = c.b;
      img.data[i + 3] = 255;
    }
  }
}

/** 4×4 ordered-dither thresholds (0–15). */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;

/**
 * `env`'s sky as a `w`×`h` image: its gradient (ENV_SKY, top first) in equal stepped bands over
 * the top SKY_SHARE of the height, each seam dithered over 4 rows, then dithered out to
 * transparent over the next eighth of the height, so it sinks into the void behind the map.
 */
export function skyImage(env: EnvPaletteId, w: number, h: number): RgbaImage {
  const bands: readonly ColorName[] = ENV_SKY[env];
  const data = new Uint8ClampedArray(new ArrayBuffer(w * h * 4));
  const skyH = Math.round(h * SKY_SHARE);
  const bandH = Math.max(1, Math.round(skyH / bands.length));
  const fadeH = Math.max(1, Math.round(h / 8));
  for (let y = 0; y < Math.min(h, skyH + fadeH); y++) {
    const band = Math.min(Math.floor(y / bandH), bands.length - 1);
    const next = Math.min(band + 1, bands.length - 1);
    // Over a band's last 4 rows, the dither steps into the next band.
    const into = Math.max(0, y - band * bandH - (bandH - 4)) * 4;
    // Below the sky, the dither steps out to transparent.
    const out = y < skyH ? 0 : ((y - skyH + 1) / fadeH) * 16;
    const on = rgbOf(bands[band]!); // band < length
    const off = rgbOf(bands[next]!);
    for (let x = 0; x < w; x++) {
      const th = BAYER4[(y % 4) * 4 + (x % 4)]!; // index < 16
      if (th < out) continue;
      const c = th < into && y < skyH ? off : on;
      const i = (y * w + x) * 4;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = 255;
    }
  }
  const img = { w, h, data };
  for (const moon of SKY_MOONS) drawMoon(img, moon);
  return img;
}
