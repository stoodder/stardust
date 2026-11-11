// Everglow Security's looks (T603, polished by T630a; design/enemies.md § 3 `haste_aura`, § 5.3,
// § 8; art-direction.md §8's `haste_aura` row: speed lines on the source and on affected allies,
// `orange.3`). Pure rules and pixel images, unit-tested; EverglowView applies them. The shutdown's
// line and price tag are sprites (T640a: `fx.power_off`, `fx.price_tag`).
// - **The haste ring:** a solid `orange.3` ring over a 1 px `ink.0` under-stroke at the aura's
//   radius round every unit projecting one (the sim's `projectedHaste`), beating like a metronome:
//   bright for METRONOME_HIGH_TICKS of every METRONOME_TICKS (2 beats a second, on sim time, so it
//   holds while paused and keeps pace at 2×), a step dimmer between (at night, Act III and the
//   finale, whole and a step brighter, `orange.4`, on the beat instead: `hasteRingLook`). On each beat it **swells**: an
//   `orange.4` echo ring ticks out SWELL_PX beyond it, then a step further (`swellPx`), and is gone
//   by the next beat, so the ring reads as keeping time. Solid, where the Cantor's shield ring is
//   dashed and crawling, so the two auras read apart at a glance. Steady (bright, no swell) under
//   reduced motion.
// - **Speed marks:** the source and every unit a ring is hasting (`Enemy.auraHastePct` > 0, the
//   sim's own value) trail a **double chevron** (the `haste_aura` glyph's », `orange.4` leading
//   `orange.3`, in an `ink.0` rim) just behind the body, pointing the way it moves on screen
//   (`screenHeading`: behind its left edge walking right, its right edge walking left), stepping
//   back a pixel on the half-beat (offset per uid, so a hasted column doesn't flicker in unison);
//   still under reduced motion.
// - **The shutdown** (`deathLook.ts` `shutdown`, Everglow's death in every act: a clean shutdown and
//   a falling price tag): an old-monitor power-off at the body, a `white.1` line collapsing to a
//   dot over SHUTDOWN_LINE_MS that then winks out, and a white price tag on its string, hung over
//   the body, dropping to the ground and fading out by TAG_MS. No pop, no debris, no sound of its own
//   (audio is T650's). Under reduced motion the tag doesn't fall; it fades where it hung.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { rangeEllipsePx, type Vec2 } from '../iso.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';
import { STEPPED_ALPHA } from '../vfx/fxTiming.ts';
import { ellipseQuadrant, snapRingRadius, type RingImage } from '../vfx/overlayPixels.ts';

export const HASTE_COLOR: ColorName = 'orange.3';
export const HASTE_UNDER: ColorName = 'ink.0';
/** The ring's alpha on the beat and between beats. */
export const RING_ALPHA_HIGH = 1;
export const RING_ALPHA_LOW = 0.6;
/** The swell's echo ring: its colour and alpha, and how far out it ticks on the beat (px). */
export const SWELL_COLOR: ColorName = 'orange.4';
export const SWELL_ALPHA = 0.6;
export const SWELL_PX = 2;
/** The metronome: one beat every this many sim ticks (2 a second at 60 Hz), bright this long. */
export const METRONOME_TICKS = 30;
export const METRONOME_HIGH_TICKS = 6;

/** The ring's colour on the beat on a night map (a step brighter than HASTE_COLOR). */
export const HASTE_BEAT_COLOR: ColorName = 'orange.4';

/**
 * The haste ring's look at sim tick `tick`: by day (Acts I–II) `orange.3`, bright on the beat and a
 * step dimmer between; at night (`night`: Act III and the finale, `nightRings`), where partial alpha
 * sinks into the near-black ground, always whole, beating a step brighter (`orange.4`) instead.
 */
export function hasteRingLook(
  tick: number,
  reducedMotion: boolean,
  night: boolean,
): { readonly color: ColorName; readonly alpha: number } {
  const high = metronomeHigh(tick, reducedMotion);
  if (night) return { color: high ? HASTE_BEAT_COLOR : HASTE_COLOR, alpha: 1 };
  return { color: HASTE_COLOR, alpha: high ? RING_ALPHA_HIGH : RING_ALPHA_LOW };
}

/** Whether the ring is on its beat at sim tick `tick` (always, under reduced motion). */
export function metronomeHigh(tick: number, reducedMotion: boolean): boolean {
  if (reducedMotion) return true;
  return tick % METRONOME_TICKS < METRONOME_HIGH_TICKS;
}

/**
 * How far the swell's echo ring stands out past the ring at sim tick `tick` (px): SWELL_PX for the
 * first half of the beat, twice that for the second, 0 between beats and under reduced motion.
 */
export function swellPx(tick: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  const t = tick % METRONOME_TICKS;
  if (t >= METRONOME_HIGH_TICKS) return 0;
  return t < METRONOME_HIGH_TICKS / 2 ? SWELL_PX : 2 * SWELL_PX;
}

/** The speed marks' frame (0 or 1: stepped back a pixel) for unit `uid` at sim tick `tick`. */
export function speedLinesFrame(tick: number, uid: number, reducedMotion: boolean): 0 | 1 {
  if (reducedMotion) return 0;
  return Math.floor((tick + uid * 7) / (METRONOME_TICKS / 2)) % 2 === 0 ? 0 : 1;
}

/**
 * Which way a move of (dx, dy) grid units runs on screen: 1 right, −1 left, 0 straight up or down
 * (the iso camera's x is col − row; render/iso.ts).
 */
export function screenHeading(dx: number, dy: number): -1 | 0 | 1 {
  const sx = dx - dy;
  if (Math.abs(sx) < 1e-9) return 0;
  return sx > 0 ? 1 : -1;
}

const semi: Vec2 = { x: 0, y: 0 };

/**
 * The swell's echo ring: a solid 1 px SWELL_COLOR ellipse `px` wider each side than the haste ring
 * of `radiusTiles` (snapped as the ring is), `px / 2` taller, keeping the ground's 2:1; (cx, cy)
 * sits on the source, as the ring's does.
 */
export function swellRingImage(radiusTiles: number, px: number): RingImage {
  rangeEllipsePx(snapRingRadius(radiusTiles), semi);
  const a = Math.max(1, Math.round(semi.x)) + px;
  const b = Math.max(1, Math.round(semi.y)) + Math.round(px / 2);
  const w = 2 * a + 1;
  const h = 2 * b + 1;
  const data = new Uint8ClampedArray(w * h * 4);
  const { r, g, b: bl } = rgbOf(SWELL_COLOR);
  const put = (x: number, y: number): void => {
    const i = (y * w + x) * 4;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = bl;
    data[i + 3] = 255;
  };
  for (const [x, y] of ellipseQuadrant(a, b)) {
    put(a + x, b + y);
    put(a - x, b + y);
    put(a + x, b - y);
    put(a - x, b - y);
  }
  return { image: { w, h, data }, cx: a, cy: b };
}

/** Turns rows of legend characters into an image ('.' clear); `rim` outlines every lit pixel. */
function pixels(
  rows: readonly string[],
  legend: Readonly<Record<string, ColorName>>,
  rim: ColorName | null,
): RgbaImage {
  const pad = rim === null ? 0 : 1;
  const h = rows.length + 2 * pad;
  const w = Math.max(...rows.map((r) => r.length)) + 2 * pad;
  const data = new Uint8ClampedArray(w * h * 4);
  const lit = (x: number, y: number): boolean => {
    const ch = rows[y - pad]?.[x - pad];
    return ch !== undefined && ch !== '.';
  };
  const put = (x: number, y: number, c: ColorName): void => {
    const { r, g, b } = rgbOf(c);
    const i = (y * w + x) * 4;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (lit(x, y)) {
        const ch = rows[y - pad]![x - pad]!; // lit checked both
        const c = legend[ch];
        if (c !== undefined) put(x, y, c);
      } else if (rim !== null) {
        if (lit(x - 1, y) || lit(x + 1, y) || lit(x, y - 1) || lit(x, y + 1)) put(x, y, rim);
      }
    }
  }
  return { w, h, data };
}

/**
 * The speed marks, frame 0 and frame 1 (a pixel further back), for a unit walking right: a double
 * chevron », 'A' the leading chevron (`orange.4`), 'B' the trailing one (`orange.3`).
 */
const MARKS: readonly (readonly string[])[] = [
  ['.B..A..', '..B..A.', '...B..A', '..B..A.', '.B..A..'],
  ['B..A...', '.B..A..', '..B..A.', '.B..A..', 'B..A...'],
];

/** The speed marks' size with their rim (px). */
export const SPEED_MARKS_W = 9;
export const SPEED_MARKS_H = 7;

/**
 * The speed marks' image for `frame`, pointing `heading` (1 walking right, −1 walking left: the
 * chevrons mirrored), in an `ink.0` rim (SPEED_MARKS_W × SPEED_MARKS_H).
 */
export function speedMarksImage(frame: 0 | 1, heading: 1 | -1): RgbaImage {
  const rows = MARKS[frame]!; // frame is 0 or 1
  const drawn = heading === 1 ? rows : rows.map((r) => r.split('').toReversed().join(''));
  return pixels(drawn, { A: 'orange.4', B: HASTE_COLOR }, HASTE_UNDER);
}

/** The power-off line's collapse, then its dot's wink (ms). */
export const SHUTDOWN_LINE_MS = 140;
export const SHUTDOWN_MS = 260;
/** The line's half-width at the start of the collapse (px). */
export const SHUTDOWN_HALF_W = 6;
/** The tag's whole life (ms) and how long it falls (to the ground, however high it hung). */
export const TAG_MS = 900;
export const TAG_FALL_MS = 450;
/** The tag hangs this far over the body's centre (px, its top) as it starts to fall. */
export const TAG_HANG_PX = 12;

/** The power-off at `ms` after the death: the line's half-width (px; 0 a dot) and alpha (0 gone). */
export function shutdownLine(ms: number): { readonly halfW: number; readonly alpha: number } {
  if (ms < 0 || ms >= SHUTDOWN_MS) return { halfW: 0, alpha: 0 };
  if (ms < SHUTDOWN_LINE_MS) {
    // Collapses in whole-pixel steps: 6, 5, … 1.
    const left = 1 - ms / SHUTDOWN_LINE_MS;
    return { halfW: Math.max(1, Math.ceil(SHUTDOWN_HALF_W * left)), alpha: 1 };
  }
  const t = (ms - SHUTDOWN_LINE_MS) / (SHUTDOWN_MS - SHUTDOWN_LINE_MS);
  const step = Math.min(STEPPED_ALPHA.length - 1, Math.floor(t * STEPPED_ALPHA.length));
  return { halfW: 0, alpha: STEPPED_ALPHA[step]! }; // step < length
}

/**
 * The tag at `ms` after the death: how far it has fallen of its `fallPx` (px, whole) and its alpha
 * (0: gone). It drops under gravity for TAG_FALL_MS, lies on the ground, then fades in
 * STEPPED_ALPHA steps over the last third; under reduced motion it never falls.
 */
export function tagDrop(
  ms: number,
  fallPx: number,
  reducedMotion: boolean,
): { readonly dy: number; readonly alpha: number } {
  if (ms < 0 || ms >= TAG_MS) return { dy: 0, alpha: 0 };
  const f = Math.min(1, ms / TAG_FALL_MS);
  const dy = reducedMotion ? 0 : Math.round(fallPx * f * f);
  const fadeFrom = (TAG_MS * 2) / 3;
  if (ms < fadeFrom) return { dy, alpha: 1 };
  const t = (ms - fadeFrom) / (TAG_MS - fadeFrom);
  const step = Math.min(STEPPED_ALPHA.length - 1, Math.floor(t * STEPPED_ALPHA.length));
  return { dy, alpha: STEPPED_ALPHA[step]! }; // step < length
}
