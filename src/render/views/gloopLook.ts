// The Gloop Spitter's hit (towers.md § Gloop Spitter; T730a): pure rules and pixels, unit-tested,
// applied by TransientFx's `splat` (battleEvents.ts calls it for the shots in SPLAT_PROJECTILES).
// - **The splat:** where a glob lands, a green splash over what it hit (`splatImage`: a ragged
//   `green.3` blob with a `green.4` heart and a `white.1` glint, an `ink.0` rim, flung drops round
//   it; 17×9), stepping out over SPLAT_MS (fxTiming's `fadeAlpha`), not the Thumper's orange
//   explosion: acid, not fire. Under it the splash's reach rings in `green.3` (the Thumper's ring
//   is orange), and SPLAT_DROPS `green.4`/`green.3`/`white.1` drops spray up and fall (none under
//   reduced motion: the splat and ring alone). Not the `acid` ramp: its yellow-green is the
//   Hollow's (art-direction §2). Big Glorp's puddle is PuddleView's.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';

/** The projectile sprites that splat green instead of exploding (the Gloop's glob). */
export const SPLAT_PROJECTILES: ReadonlySet<string> = new Set(['projectile.gloop_glob']);
export const SPLAT_RING: ColorName = 'green.3';
export const SPLAT_MS = 600;
export const SPLAT_W = 17;
export const SPLAT_H = 9;
/** The drops a splat flings (TransientFx's debris): how many, how fast, how long. */
export const SPLAT_DROPS = {
  count: 8,
  speed: [0.03, 0.055],
  lift: 0.05,
  g: 0.0003,
  ms: 360,
  sizes: [2, 1, 1],
} as const;
export const SPLAT_DROP_COLORS: readonly ColorName[] = ['green.4', 'green.3', 'white.1'];

/** Whether a lobbed shot with sprite `sprite` splats (the Gloop's glob). */
export function splats(sprite: string | null): boolean {
  return sprite !== null && SPLAT_PROJECTILES.has(sprite);
}

/** Flung drops round the blob (x, y), each one pixel. */
const DROPS: readonly (readonly [number, number])[] = [
  [1, 2],
  [15, 1],
  [0, 6],
  [16, 6],
  [5, 0],
  [12, 8],
];

/**
 * The splat (SPLAT_W × SPLAT_H, its centre at (8, 4)): a ragged blob (`green.3`) with a heart
 * (`green.4`), a glint (`white.1`), an `ink.0` rim, and six drops flung round it.
 */
export function splatImage(): RgbaImage {
  const w = SPLAT_W;
  const h = SPLAT_H;
  const code = new Uint8Array(w * h); // 0 clear, 1 rim, 2 body, 3 heart, 4 glint
  const cx = 8;
  const cy = 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / 6;
      const dy = (y - cy) / 3;
      // Lobes: the edge bulges five times round, so it reads as a splash, not a disc.
      const lobe = 0.22 * Math.cos(Math.atan2(dy, dx) * 5);
      const d = Math.hypot(dx, dy) - lobe;
      if (d < 0.4) code[y * w + x] = 3;
      else if (d < 0.95) code[y * w + x] = 2;
    }
  }
  for (const [x, y] of DROPS) code[y * w + x] = 3;
  code[(cy - 1) * w + (cx - 1)] = 4;
  // The rim: every clear pixel beside a filled one.
  const out = new Uint8Array(code);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (code[y * w + x] !== 0) continue;
      const near =
        (x > 0 && code[y * w + x - 1]! > 1) ||
        (x < w - 1 && code[y * w + x + 1]! > 1) ||
        (y > 0 && code[(y - 1) * w + x]! > 1) ||
        (y < h - 1 && code[(y + 1) * w + x]! > 1);
      if (near) out[y * w + x] = 1;
    }
  }
  const colors: readonly (ColorName | null)[] = [null, 'ink.0', 'green.3', 'green.4', 'white.1'];
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const name = colors[out[i]!]; // out[i] < colors.length
    if (name === null || name === undefined) continue;
    const c = rgbOf(name);
    data[i * 4] = c.r;
    data[i * 4 + 1] = c.g;
    data[i * 4 + 2] = c.b;
    data[i * 4 + 3] = 255;
  }
  return { w, h, data };
}
