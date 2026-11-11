// Everglow Security's looks (T603's minimal views; design/enemies.md § 3 `haste_aura`, § 5.3, § 8;
// art-direction.md §8's `haste_aura` row: speed lines on the source and on affected allies,
// `orange.3`). Pure rules and pixel images, unit-tested; EverglowView applies them. T630a polishes
// the ring and lines, T640a draws the shutdown and the price tag as sprites.
// - **The haste ring:** a solid `orange.3` ring over a 1 px `ink.0` under-stroke at the aura's
//   radius round every unit projecting one (the sim's `projectedHaste`), beating like a metronome:
//   bright for METRONOME_HIGH_TICKS of every METRONOME_TICKS (2 beats a second, on sim time, so it
//   holds while paused and keeps pace at 2×), dim between. Solid, where the Cantor's shield ring is
//   dashed and crawling, so the two auras read apart at a glance. Steady (bright) under reduced
//   motion.
// - **Speed lines:** the source and every unit a ring is hasting (`Enemy.auraHastePct` > 0, the
//   sim's own value) trail three `orange.3` streaks beside the body, stepping back a pixel on the beat (offset per
//   uid, so a hasted column doesn't flicker in unison); still under reduced motion.
// - **The shutdown** (`deathLook.ts` `shutdown`, Everglow's death in every act: a clean shutdown and
//   a falling price tag): an old-monitor power-off at the body, a `white.1` line collapsing to a
//   dot over SHUTDOWN_LINE_MS that then winks out, and a white price tag on its string, hung over
//   the body, dropping to the ground and fading out by TAG_MS. No pop, no debris, no sound of its own
//   (audio is T650's). Under reduced motion the tag doesn't fall; it fades where it hung.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';
import { STEPPED_ALPHA } from '../vfx/fxTiming.ts';

export const HASTE_COLOR: ColorName = 'orange.3';
export const HASTE_UNDER: ColorName = 'ink.0';
/** The ring's alpha on the beat and between beats. */
export const RING_ALPHA_HIGH = 1;
export const RING_ALPHA_LOW = 0.7;
/** The metronome: one beat every this many sim ticks (2 a second at 60 Hz), bright this long. */
export const METRONOME_TICKS = 30;
export const METRONOME_HIGH_TICKS = 6;

/** Whether the ring is on its beat at sim tick `tick` (always, under reduced motion). */
export function metronomeHigh(tick: number, reducedMotion: boolean): boolean {
  if (reducedMotion) return true;
  return tick % METRONOME_TICKS < METRONOME_HIGH_TICKS;
}

/** The speed lines' frame (0 or 1: stepped back a pixel) for unit `uid` at sim tick `tick`. */
export function speedLinesFrame(tick: number, uid: number, reducedMotion: boolean): 0 | 1 {
  if (reducedMotion) return 0;
  return Math.floor((tick + uid * 7) / (METRONOME_TICKS / 2)) % 2 === 0 ? 0 : 1;
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

/** Speed lines, frame 0 and frame 1 (each streak a pixel further back): 'L' a streak. */
const LINES: readonly (readonly string[])[] = [
  ['.LLL.', '.....', 'LLLL.', '.....', '.LLL.'],
  ['LLL..', '.....', 'LLL..', '.....', 'LLL..'],
];

/** The speed lines' image for `frame`, in an `ink.0` rim (7×7). */
export function speedLinesImage(frame: 0 | 1): RgbaImage {
  return pixels(LINES[frame]!, { L: HASTE_COLOR }, HASTE_UNDER); // frame is 0 or 1
}
/** The speed lines' size with their rim (px). */
export const SPEED_LINES_SIZE = 7;

/**
 * The price tag (7×10 with its rim): a `steel.4` string ('s') down to a white tag ('W') with a
 * punched hole ('o') and a `gold.3` price line ('$'): Everglow's product, priced to the last.
 */
const TAG: readonly string[] = [
  '..s..',
  '..s..',
  '.WWW.',
  'WWoWW',
  'WWWWW',
  'W$$$W',
  'WWWWW',
  '.WWW.',
];

/** The price tag's image, in an `ink.0` rim. */
export function priceTagImage(): RgbaImage {
  return pixels(TAG, { s: 'steel.4', W: 'white.1', o: 'ink.1', $: 'gold.3' }, 'ink.0');
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
