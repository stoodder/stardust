// The finale's night and its Dawn, the pure part (art-direction.md §3 *Finale*, §7 *Darkness and
// lighting overlay*; design/maps.md § 5.5; T831). DarknessView draws it.
//
// - **The night** (Phases 1–2): a song map stands in full dark from its first tick until Dawn. It
//   is render's alone (D154 addendum, T831): the sim's darkness stays 0, so no tower loses range and
//   the actors take no veil; only the world darkens (the ground, the sky behind it, the scenery),
//   SONG_NIGHT_STRENGTH of the way to Sundown's plum (darknessPixels' NIGHT_SHADE), so what is
//   drawn dark never reads as a range penalty.
// - **The song's light.** The one warm source: each song circle (sim/choir.ts `songCircles`, the
//   leader's and each Returned's) is a hole in the night exactly the size of its drawn ring (the
//   ring's snapped radius, at the ring's pixel), so what reads lit is what the song holds: a kill
//   inside it is laid to rest. A warm-gold pool lies in it (`SONG_POOL`, glowPixels' bands).
// - **Dawn** (Phase 3): from the tick `setLighting: 'dawn'` runs, the first sunlight rakes in from
//   the east edge (grid +x, the map's right-hand edge on screen) over the set's 8 s: a front crosses
//   the map westward, everything east of it out of the night (a dithered edge SUN_SOFT wide), a
//   band of raking gold just behind it (SUN_RAKE), and the morning's warm wash over the ground it
//   has passed (SUN_WASH). Under reduced motion it lands at once. The front is quantized to
//   SUN_STEPS steps, so the masks redraw at most that often.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { HALF_H, HALF_W, type IsoOrigin } from '../iso.ts';
import {
  MASK_DARK,
  MASK_LIT,
  NIGHT_SHADE,
  stampDiscs,
  type DarkTones,
  type LightDisc,
} from './darknessPixels.ts';

/** How far toward NIGHT_SHADE the finale's night takes the world (Sundown's full dark is 0.92). */
export const SONG_NIGHT_STRENGTH = 0.7;
/** The song's pool: warm gold (art-direction §3: "a warm-gold light"). */
export const SONG_POOL: ColorName = 'gold.3';
/** The sunlight's colour (its rake and its wash). */
export const SUN_LIGHT: ColorName = 'gold.3';
/** The front's dithered edge, as a share of the sweep. */
export const SUN_SOFT = 0.06;
/** The raking band just behind the front, as a share of the sweep, and its additive alpha. */
export const SUN_RAKE = 0.12;
export const SUN_RAKE_ALPHA = 0.32;
/** The morning's wash over the ground the sun has reached (additive alpha). */
export const SUN_WASH_ALPHA = 0.1;
/** The sweep's steps over the set's turn: the masks redraw only when the step changes. */
export const SUN_STEPS = 48;
/** The sweep runs from this many tiles east of the map to as many west of it (the apron). */
export const SUN_MARGIN_TILES = 4;

const pack = (r: number, g: number, b: number): number => (r << 16) | (g << 8) | b;
const toward = (s: number, k: number): number => Math.round(255 + (s - 255) * k);

/**
 * The night's tones (DarknessView reads them as Sundown's): the world's multiply on the ground and
 * the scenery, and nothing on the actors (white veil, no lift). `lamp` is unused (no lamps).
 */
export function songNightTones(out: DarkTones): DarkTones {
  const s = rgbOf(NIGHT_SHADE);
  const k = SONG_NIGHT_STRENGTH;
  out.world = pack(toward(s.r, k), toward(s.g, k), toward(s.b, k));
  out.ground = out.world;
  out.veil = 0xffffff;
  out.lift = 0;
  out.lamp = 0xffffff;
  return out;
}

/** Dawn's progress quantized to SUN_STEPS (0: no sun yet; SUN_STEPS: risen). */
export function sunStep(dawn: number): number {
  return Math.round(Math.min(1, Math.max(0, dawn)) * SUN_STEPS);
}

/** 4×4 ordered-dither thresholds (0–15). */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;

/**
 * How far past the sun's front grid point (`gx`, …) stands at step `step` (of SUN_STEPS), on a map
 * `cols` wide, with the pixel's dither `th` (0–15): ≥ 0 is sunlit (that far behind the front, as a
 * share of the sweep), < 0 still in the night. Only the grid x matters: the sun rises in the east.
 */
export function sunPast(gx: number, cols: number, step: number, th = 15): number {
  if (step <= 0) return -1;
  const span = cols + 2 * SUN_MARGIN_TILES;
  const s = Math.min(1, Math.max(0, (gx + SUN_MARGIN_TILES) / span));
  const front = 1 - (step / SUN_STEPS) * (1 + SUN_SOFT);
  return s + (th / 16 - 1) * SUN_SOFT - front;
}

/** Whether grid point (`gx`, `gy`) is sunlit at step `step` (its scenery wears no night). */
export function isSunlit(gx: number, cols: number, step: number): boolean {
  return sunPast(gx, cols, step) >= 0;
}

/**
 * Draws the night's mask into `px` (`w`×`h`, as darknessPixels' `drawDarkMask`, whose buffer (0, 0)
 * sits at screen (`left`, `top`)): opaque everywhere but the song's discs and, from Dawn, the
 * ground the sun has reached.
 */
export function drawSongNightMask(
  px: Uint32Array,
  w: number,
  h: number,
  left: number,
  top: number,
  origin: IsoOrigin,
  discs: readonly LightDisc[],
  count: number,
  cols: number,
  step: number,
): void {
  px.fill(MASK_DARK);
  stampDiscs(px, w, h, left, top, origin, discs, 0, count, MASK_LIT);
  if (step <= 0) return;
  for (let y = 0; y < h; y++) {
    const v = (y + 0.5 + top - origin.y) / HALF_H;
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5 + left - origin.x) / HALF_W;
      const th = BAYER4[(y % 4) * 4 + (x % 4)]!; // index < 16
      if (sunPast((u + v) / 2, cols, step, th) >= 0) px[y * w + x] = MASK_LIT;
    }
  }
}

/**
 * Draws the sunlight into `px` (RGBA words, little-endian as an ImageData's view; additive): clear
 * in the night, the rake's gold just behind the front, the wash over the rest the sun has reached.
 */
export function drawSunMask(
  px: Uint32Array,
  w: number,
  h: number,
  left: number,
  top: number,
  origin: IsoOrigin,
  cols: number,
  step: number,
): void {
  px.fill(0);
  if (step <= 0) return;
  const c = rgbOf(SUN_LIGHT);
  const word = (a: number): number =>
    ((Math.round(255 * a) << 24) | (c.b << 16) | (c.g << 8) | c.r) >>> 0;
  const rake = word(SUN_RAKE_ALPHA);
  const wash = word(SUN_WASH_ALPHA);
  // Past the end of the sweep the front has left the view: the rake no longer shows.
  const raking = step < SUN_STEPS;
  for (let y = 0; y < h; y++) {
    const v = (y + 0.5 + top - origin.y) / HALF_H;
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5 + left - origin.x) / HALF_W;
      const th = BAYER4[(y % 4) * 4 + (x % 4)]!; // index < 16
      const past = sunPast((u + v) / 2, cols, step, th);
      if (past < 0) continue;
      px[y * w + x] = raking && past < SUN_RAKE ? rake : wash;
    }
  }
}
