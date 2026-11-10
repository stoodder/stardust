// Shared builders for Hollow sprites (art-direction §4 *The Hollow*; story/races.md § The Hollow):
// shapes of what its pieces used to be, drawn wrong, in drained greys with a pale (inverted)
// outline. The palette is `hollow`: `0`–`4` the drained greys (the outline slot is `hollow.4`), `a`–
// `e` the reserved acid.
// - `dropPixels`: the 1–3 missing pixels per frame (§4 *Hollow glitch*), baked into each authored
//   frame from a seed, so the pixels that are missing change as the walk plays and render needs no
//   RNG. A hole inside the body comes out of the outline pass as a pale speck (the inverted
//   outline drawn round nothing); one on the edge bites the silhouette.
// - `ringRound`: hand-placed outline pixels round everything opaque (the inner ring of Heavy's 2 px
//   swollen outline; the outline pass adds the outer one).
import { at, fromRows, hash01, line, plot, rows, type CharGrid } from '../helpers.ts';

/** Characters `dropPixels` may knock out: the body's greys (never a feature, outline, or eye). */
const BODY = new Set(['0', '1', '2', '3']);

/**
 * `src` with 1–3 body pixels missing, chosen by `seed` (cosmetic, deterministic). Only pixels with
 * body on both sides along one axis go, so a hole never cuts the sprite in two.
 */
export function dropPixels(src: readonly string[], seed: number): string[] {
  const g = fromRows(src);
  const h = g.length;
  const w = g[0]?.length ?? 0;
  const candidates: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!BODY.has(at(g, x, y))) continue;
      const across = at(g, x - 1, y) !== '.' && at(g, x + 1, y) !== '.';
      const down = at(g, x, y - 1) !== '.' && at(g, x, y + 1) !== '.';
      if (across || down) candidates.push([x, y]);
    }
  }
  const n = 1 + Math.floor(hash01(seed, 1, 41) * 3);
  for (let i = 0; i < n && candidates.length > 0; i++) {
    const k = Math.floor(hash01(seed, i + 2, 43) * candidates.length);
    const [x, y] = candidates.splice(k, 1)[0] ?? [0, 0];
    plot(g, x, y, '.');
  }
  return rows(g);
}

/** Rings everything opaque in `g` with hand-placed outline pixels (`x`), 4-adjacent. */
export function ringRound(g: CharGrid): void {
  const h = g.length;
  const w = g[0]?.length ?? 0;
  const ring: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (at(g, x, y) !== '.') continue;
      const touches =
        at(g, x - 1, y) !== '.' ||
        at(g, x + 1, y) !== '.' ||
        at(g, x, y - 1) !== '.' ||
        at(g, x, y + 1) !== '.';
      if (touches) ring.push([x, y]);
    }
  }
  for (const [x, y] of ring) plot(g, x, y, 'x');
}

/**
 * A drained body: a shaded ellipse lit from the upper left, darkest at its heart (the Hollow's
 * dark interior), with `bite` (−1–1) flattening one side wrong: a bite taken out of the far side
 * of the shape it remembers. `dark` drops every step one (Heavy's darker, fuller body).
 */
export function hollowBody(
  g: CharGrid,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  bite: number,
  dark = false,
): void {
  const h = g.length;
  const w = g[0]?.length ?? 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      // The bite: the right flank caves in near the top, so the round shape reads wrong.
      const caved = bite !== 0 && dx * Math.sign(bite) > 0.45 && dy < 0.1 && dy > -0.75;
      const d = Math.hypot(dx, dy) + (caved ? 0.35 * Math.abs(bite) : 0);
      if (d > 1) continue;
      const lit = -0.6 * dx - 0.8 * dy;
      let step = 1;
      if (lit > 0.45 && d > 0.45) step = 3;
      else if (lit > -0.1 && d > 0.35) step = 2;
      else if (d < 0.45) step = 0;
      if (dark) step = Math.max(0, step - 1);
      plot(g, x, y, String(step));
    }
  }
}

/** The victim's silhouette inside a Heavy Hollow unit: a little round Skitterkin with its tuft. */
// prettier-ignore
export const HEAVY_VICTIM = [
  '..w..',
  '.www.',
  'wwwww',
  '.w.w.',
] as const;

/** Pale speed lines trailing a Heavy Hollow unit (it is 15% faster), one pattern per step. */
// prettier-ignore
export const HEAVY_SPEED = [
  ['33.', '...', '.33', '...'],
  ['.33', '...', '33.', '...'],
  ['3.3', '...', '.33', '...'],
] as const;

/**
 * Dresses a Hollow body as Heavy (art-direction §8 `heavy`, after it hushes someone; T440a's
 * Mote set the look): the victim pale inside it at (vx, vy), the inner ring of its doubled 2 px
 * outline (the outline pass adds the outer one), and speed lines trailing at (sx, sy).
 */
export function heavyDress(
  g: CharGrid,
  vx: number,
  vy: number,
  sx: number,
  sy: number,
  step: number,
): void {
  for (const [dy, r] of HEAVY_VICTIM.entries()) {
    for (let dx = 0; dx < r.length; dx++) if (r.charAt(dx) === 'w') plot(g, vx + dx, vy + dy, 'w');
  }
  ringRound(g);
  const speed = HEAVY_SPEED[step % HEAVY_SPEED.length] ?? [];
  for (const [dy, r] of speed.entries()) {
    for (let dx = 0; dx < r.length; dx++) {
      if (r.charAt(dx) !== '.' && at(g, sx + dx, sy + dy) === '.') plot(g, sx + dx, sy + dy, '3');
    }
  }
}

/**
 * The hush reach (the `tell` pose, art-direction §8): two thin limbs the shape never had, from
 * (x0, y0) out to the canvas's leading edge at row `ey`, pale-tipped.
 */
export function reach(g: CharGrid, x0: number, y0: number, ex: number, ey: number): void {
  line(g, x0, y0, ex, ey, '2');
  line(g, x0, y0 + 2, ex, ey + 2, '1');
  plot(g, ex, ey, 'w');
  plot(g, ex, ey + 2, 'w');
}
