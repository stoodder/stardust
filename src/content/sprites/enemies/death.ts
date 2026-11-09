// Act I's Skitterkin death, the comic "pop" (design/enemies.md § 8; art-direction §7 Impacts, hits,
// and deaths: a "poof" of fluff and confetti pixels). Built from any Skitterkin's SE walk frame,
// in its own canvas and anchor, so every Act I enemy gets the same four beats in its own colours:
//   death_0  squash: the body flattens and widens on the spot (the hit lands);
//   death_1  pop: a ring of its own fluff bursts out, with the first confetti;
//   death_2  confetti flung wide, the fluff thinning;
//   death_3  a few flecks settling on the ground.
// Anim `death` plays them once at 12 fps (a third of a second). Later acts' death looks (no
// confetti, a still body) are later art.
import { grid, hash01, plot, rows, type CharGrid } from '../helpers.ts';

/** The four death frames' names, in play order. */
export const DEATH_FRAMES = ['death_0', 'death_1', 'death_2', 'death_3'] as const;

/** The `death` anim: once, 12 fps. */
export const DEATH_ANIM = { frames: [...DEATH_FRAMES], fps: 12, loop: false } as const;

/** Confetti in standard-legend slots, so it is the unit's own palette: shimmer, belly, light. */
const CONFETTI = ['+', '*', '9', 'w', 'd', '4', '8'] as const;
/** Fluff: the body's lit ramp. */
const FLUFF = ['3', '4', '3', '2'] as const;

interface Box {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** The bounding box of the opaque pixels. */
function bounds(src: readonly string[]): Box {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  src.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      if (r[x] === '.') continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  });
  return { x0, y0, x1, y1 };
}

function scatter(
  g: CharGrid,
  n: number,
  cx: number,
  cy: number,
  rMin: number,
  rMax: number,
  fall: number,
  seed: number,
): void {
  const w = g[0]?.length ?? 0;
  const h = g.length;
  for (let i = 0; i < n; i++) {
    const a = hash01(i, 1, seed) * Math.PI * 2;
    const r = rMin + hash01(i, 2, seed) * (rMax - rMin);
    const x = Math.round(cx + Math.cos(a) * r);
    const y = Math.round(cy + Math.sin(a) * r * 0.7 + fall * hash01(i, 3, seed));
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    plot(g, x, y, CONFETTI[i % CONFETTI.length] ?? 'w');
  }
}

/**
 * The death frames for a Skitterkin whose SE walk frame is `walk`, standing on `anchor` (its foot
 * point, in pixel edges): one record to spread into the sprite's `frames`.
 */
export function deathFrames(
  walk: readonly string[],
  anchor: { readonly x: number; readonly y: number },
): Record<(typeof DEATH_FRAMES)[number], string[]> {
  const w = walk[0]?.length ?? 0;
  const h = walk.length;
  const b = bounds(walk);
  const cx = (b.x0 + b.x1 + 1) / 2;
  const cy = (b.y0 + b.y1 + 1) / 2;
  const rx = (b.x1 - b.x0 + 1) / 2;
  const ry = (b.y1 - b.y0 + 1) / 2;
  const seed = w * 31 + h;

  // Squash: sample the walk frame stretched 1.3× wide and 0.55× tall, feet on the ground.
  const squash = grid(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.floor(anchor.x + (x + 0.5 - anchor.x) / 1.3);
      const sy = Math.floor(anchor.y + (y + 0.5 - anchor.y) / 0.55);
      const ch = walk[sy]?.[sx];
      if (ch !== undefined && ch !== '.') plot(squash, x, y, ch);
    }
  }

  // Pop: a lumpy cloud of the body's fluff where the body was, a white star at its heart, the first
  // confetti just outside it.
  const pop = grid(w, h);
  const arm = Math.max(1, Math.round(Math.min(rx, ry) * 0.35));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const lobe = 1 + 0.18 * Math.sin(5 * Math.atan2(dy, dx) + seed);
      const d = Math.hypot(dx, dy) / lobe;
      const ax = Math.abs(x + 0.5 - cx);
      const ay = Math.abs(y + 0.5 - cy);
      if ((ax < 1 && ay <= arm) || (ay < 1 && ax <= arm)) plot(pop, x, y, 'w');
      else if (d > 0.55 && d < 1.05 && hash01(x, y, seed) < 0.65) {
        plot(pop, x, y, FLUFF[(x * 3 + y) % FLUFF.length] ?? '3');
      }
    }
  }
  scatter(pop, 6, cx, cy, Math.max(rx, ry) * 0.9, Math.max(rx, ry) * 1.1, 0, seed);

  // Confetti flung wide (and starting to fall), the fluff in a few tufts.
  const fling = grid(w, h);
  scatter(fling, 10, cx, cy, Math.max(rx, ry) * 0.6, Math.max(rx, ry) * 1.25, ry * 0.5, seed + 1);
  for (let i = 0; i < 3; i++) {
    const x = Math.round(cx + (hash01(i, 5, seed) - 0.5) * rx * 1.4);
    const y = Math.round(cy + (hash01(i, 6, seed) - 0.5) * ry);
    if (x >= 0 && y >= 0 && x < w && y < h) plot(fling, x, y, '3');
  }

  // Settling: a few flecks on the ground around the feet.
  const settle = grid(w, h);
  const ground = Math.min(h - 1, Math.round(anchor.y - 1));
  for (let i = 0; i < 5; i++) {
    const x = Math.round(anchor.x + (hash01(i, 7, seed) - 0.5) * rx * 2.2);
    const y = ground - Math.floor(hash01(i, 8, seed) * Math.min(3, ry));
    if (x >= 0 && y >= 0 && x < w && y < h)
      plot(settle, x, y, CONFETTI[(i * 3) % CONFETTI.length] ?? 'w');
  }

  return {
    death_0: rows(squash),
    death_1: rows(pop),
    death_2: rows(fling),
    death_3: rows(settle),
  };
}
