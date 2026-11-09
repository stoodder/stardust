// Shared builders for Aelari constructs (art-direction §4: *woven, never plated*; story/races.md §
// Aelari: lumenglass, glass drawn into thread with song and woven into lattices). A construct is a
// shape filled with an open weave of taut 1 px strands that cross at bright knot-nodes, with real
// see-through gaps between them, framed by a rim thread, lit from inside at its heart, and ringed
// by the faction's coloured `blue.0` outline on the outside only (`outlineOutside`), so the ground
// shows through the gaps: no other faction has holes in its silhouette. Palette `aelari`: `0`–`4`
// sapphire, `5`–`9` emerald, `a`–`e` ruby, `+` `teal.4` and `*` `white.1` the inner light, `x` the
// `blue.0` outline.
// - The weave runs on diagonals (`diag`: the Glimmer's and the Lightwing's wings) or on warp and
//   weft (`grid`: the Weft Warden's cloth of horizontal threads), every `spacing` px.
// - Strands are shaded by the light from the upper left: `4` lit, `3`, `2` shaded; knots one step
//   brighter (`4`, or `+` where the light is strongest).
// - `hum` shifts a few strand pixels 1 px on alternate frames (the threads' slow vibration).
import { at, hash01, plot, type CharGrid } from '../helpers.ts';

/** Whether pixel (x, y) is inside a construct's shape. */
export type Mask = (x: number, y: number) => boolean;

export interface WeaveOpts {
  readonly mode: 'diag' | 'grid';
  readonly spacing: number;
  /** Shifts the weave (px) along x, so two parts of one construct can weave out of step. */
  readonly phase?: number;
  /** Shifts the weave (px) along y, so it rides with a bobbing body. */
  readonly rise?: number;
  /** The light centre (pixel edges): strands nearest it are brightest. */
  readonly lx: number;
  readonly ly: number;
  /** Strand ramp: `p` sapphire (`0`–`4`) or `s` emerald (`5`–`9`). */
  readonly ramp?: 'p' | 's';
}

const P = ['0', '1', '2', '3', '4'] as const;
const S = ['5', '6', '7', '8', '9'] as const;

/** One strand or knot pixel's character, by its distance from the light. */
function shade(x: number, y: number, o: WeaveOpts, knot: boolean, scale: number): string {
  const ramp = o.ramp === 's' ? S : P;
  const d = Math.hypot(x + 0.5 - o.lx, y + 0.5 - o.ly) / scale;
  let step = d < 0.5 ? 3 : 2;
  if (knot) step = Math.min(4, step + 1);
  if (knot && d < 0.3) return '+';
  return ramp[step] ?? '3';
}

/** Fills `mask` with the weave (strands and knots; gaps stay transparent). */
export function weave(g: CharGrid, mask: Mask, o: WeaveOpts, scale: number): void {
  const h = g.length;
  const w = g[0]?.length ?? 0;
  const s = o.spacing;
  const ph = o.phase ?? 0;
  const mod = (n: number): number => ((n % s) + s) % s;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask(x, y)) continue;
      const yy = y + (o.rise ?? 0);
      const a = o.mode === 'diag' ? mod(x + ph + yy) === 0 : mod(x + ph) === 0;
      const b = o.mode === 'diag' ? mod(x + ph - yy) === 0 : mod(yy) === 0;
      if (!a && !b) continue;
      plot(g, x, y, shade(x, y, o, a && b, scale));
    }
  }
}

/**
 * The rim thread: every pixel of `mask` with a 4-neighbour outside it, lit on the upper-left half
 * (`3`) and shaded on the lower-right (`2`), in the strand ramp.
 */
export function rim(g: CharGrid, mask: Mask, cx: number, cy: number, ramp: 'p' | 's' = 'p'): void {
  const h = g.length;
  const w = g[0]?.length ?? 0;
  const r = ramp === 's' ? S : P;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask(x, y)) continue;
      const edge = !mask(x - 1, y) || !mask(x + 1, y) || !mask(x, y - 1) || !mask(x, y + 1);
      if (!edge) continue;
      const lit = -(x + 0.5 - cx) * 0.6 - (y + 0.5 - cy) * 0.8 > 0;
      plot(g, x, y, (lit ? r[3] : r[2]) ?? '3');
    }
  }
}

/**
 * The coloured outline on the outside only: every transparent pixel reachable from the canvas
 * edge that touches an opaque one (4-adjacent) becomes `x`. Gaps inside the weave stay clear, so
 * the ground shows through. The canvas needs a free 1 px margin.
 */
export function outlineOutside(g: CharGrid): void {
  const h = g.length;
  const w = g[0]?.length ?? 0;
  const outside = new Set<number>();
  const stack: number[] = [];
  const push = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const k = y * w + x;
    if (outside.has(k) || at(g, x, y) !== '.') return;
    outside.add(k);
    stack.push(k);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length > 0) {
    const k = stack.pop() ?? 0;
    const x = k % w;
    const y = Math.floor(k / w);
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }
  const ring: [number, number][] = [];
  for (const k of outside) {
    const x = k % w;
    const y = Math.floor(k / w);
    const solid = (xx: number, yy: number): boolean => {
      const c = at(g, xx, yy);
      return c !== '.' && c !== 'x' && c !== '_';
    };
    if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) ring.push([x, y]);
  }
  for (const [x, y] of ring) plot(g, x, y, 'x');
}

/**
 * The hum: on frame `beat`, a few strand pixels (chosen by `seed`) slide 1 px sideways, so the
 * weave reads as sounding, not solid (art-direction §4 *Aelari threads hum and fray*).
 */
export function hum(g: CharGrid, mask: Mask, beat: number, seed: number): void {
  if (beat % 2 === 0) return;
  const h = g.length;
  const w = g[0]?.length ?? 0;
  const strands: [number, number][] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const c = at(g, x, y);
      // Never the rim: only a strand inside the shape, with the shape on both sides of it.
      if (!/[2-3]|[78]/.test(c) || !mask(x - 1, y) || !mask(x + 1, y)) continue;
      // Only a strand pixel with a gap on either side may slide into it.
      if (at(g, x - 1, y) === '.' && at(g, x + 1, y) === '.') strands.push([x, y]);
    }
  }
  for (let i = 0; i < 3 && strands.length > 0; i++) {
    const k = Math.floor(hash01(seed, i, 53) * strands.length);
    const [x, y] = strands.splice(k, 1)[0] ?? [0, 0];
    const c = at(g, x, y);
    plot(g, x, y, '.');
    plot(g, x + (hash01(seed, i, 59) < 0.5 ? -1 : 1), y, c);
  }
}
