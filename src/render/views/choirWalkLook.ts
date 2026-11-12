// The finale's choir on its walk, as rules (T830; art-direction §6 *The choir*, §7 *Song aura*;
// design/maps.md § 5.5; sim/choir.ts): pure, unit-tested; ChoirWalkView applies them.
// - **Bodies** (`memberSprite`, sprites/allies/choir.ts): Pebble leads in `ally.pebble_lead`, Old
//   Thrum walks beside her in `ally.thrum`, the singers are `ally.singer`; all in their own palette
//   (DEFAULT_VARIANT: `skitterkin.ally`). The Returned are bearers (BearerView).
// - **Poses** (`memberPose`): a hushed singer (`isHushedSinger`) wears `hushed` (drained steel grey,
//   head bowed, no note) wherever it trails. Pebble wears `halt` only while the choir is halted
//   (a Hollow unit in the window ahead: stopped short, a foot held out), never while it waits at a
//   leg's end (`ChoirState.waiting`: that is no halt; she sings, facing on up the road). Anyone
//   moving walks (`walk`, singing as they go); anyone standing sings (`sing`: halted, waiting,
//   arrived at the Halls, or the column closed up behind her). The pose holds while the sim is
//   paused (only a tick that moved it changes walk to sing).
// - **The gate queue** (`queuePoint`): before the column has room on the road, the sim keeps every
//   member whose place is still behind the road's core end standing on that end (one point, so a
//   choir of 28 heaps on the colony gate). Render draws each one queued instead: `q` tiles back in
//   the column (its place's overshoot past the end: rank × CHOIR_SPACING_TILES − the leader's
//   walk), on a double file running sideways from the gate (perpendicular to the road's last
//   stretch, on the side that stays on the map), QUEUE_ALONG of a tile per tile of `q`. As the
//   leader walks, `q` falls smoothly, so the queue files forward and each member steps onto the
//   road exactly where the sim puts it (q = 0 is the gate).
// - **The song ring** (art-direction §7): round each song circle (`songCircles`: the leader's, and
//   each Returned's 1-tile aura), a 1 px dashed `gold.4` ring over an `ink.0` under-stroke at its
//   radius (shrinking as voices fall), over a soft `gold.3` fill whose alpha steps between two low
//   rungs on the hymn's beat (HYMN_BEAT_TICKS, sim time; steady under reduced motion), and its
//   dashes crawl a step on the beat.
// - **The halt window** (maps.md § 5.5): the stretch of road from Pebble `haltTiles` toward the
//   Hollow (`windowPath`, following the road round its corners), with a bar across the road at its
//   far edge. Faint `gold.2` while she walks; `red.3` over an `ink.0` under-stroke while the choir
//   is halted, and a HALTED plate (`haltPlateImage`) over her head, so a halt reads at once and why.
//   Not drawn while waiting or once she has arrived.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { SpriteId } from '../../content/sprites/index.ts';
import { CHOIR_SPACING_TILES } from '../../content/rules.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';
import { textImage } from '../vfx/pixelFont.ts';

export const PEBBLE_LEAD_SPRITE: SpriteId = 'ally.pebble_lead';
export const SINGER_SPRITE: SpriteId = 'ally.singer';
export const THRUM_LEAD_SPRITE: SpriteId = 'ally.thrum';

/** A choir member as the look reads it. */
export interface MemberFacts {
  readonly kind: string | null;
  readonly pebble: boolean;
}

/** The member's body sprite. */
export function memberSprite(a: MemberFacts): SpriteId {
  if (a.kind === 'thrum') return THRUM_LEAD_SPRITE;
  return a.pebble ? PEBBLE_LEAD_SPRITE : SINGER_SPRITE;
}

export type MemberPose = 'walk' | 'sing' | 'halt' | 'hushed';

/** What the pose reads of the choir. */
export interface ChoirFacts {
  readonly halted: boolean;
  readonly waiting: boolean;
  readonly arrived: boolean;
}

/** The member's pose (see the header): `moving` is whether its last sim tick moved it. */
export function memberPose(
  a: MemberFacts,
  hushed: boolean,
  choir: ChoirFacts,
  moving: boolean,
): MemberPose {
  if (hushed) return 'hushed';
  if (a.pebble && choir.halted) return 'halt';
  return moving ? 'walk' : 'sing';
}

// ── The gate queue ──────────────────────────────────────────────────────────────────────────

/** Tiles along the queue per tile of column behind the gate (two files, so about half). */
export const QUEUE_ALONG = 0.6;
/** Each file's offset either side of the queue's line (tiles, along the road's direction). */
export const QUEUE_FILE = 0.18;

/** The road's core end, its direction up the road, and the side the queue runs to. */
export interface Gate {
  x: number;
  y: number;
  /** Unit vector up the road (toward its spawn) from the core end. */
  fx: number;
  fy: number;
  /** Unit vector the queue runs along (perpendicular to f, the side that stays on the map). */
  sx: number;
  sy: number;
}

/** A route as the look reads it (sim CompiledRoute). */
export interface RouteLike {
  readonly xs: readonly number[];
  readonly ys: readonly number[];
  readonly cumLenTiles: readonly number[];
  readonly lengthTiles: number;
}

/**
 * The gate of a choir road ending at its last point, for a map `cols`×`rows` and a queue as long as
 * `maxQueue` tiles of column: the side is whichever perpendicular keeps the far end of the queue on
 * the map (the left one when both do), into `out`.
 */
export function gateOf(
  route: RouteLike,
  cols: number,
  rows: number,
  maxQueue: number,
  out: Gate,
): Gate {
  const n = route.xs.length;
  const ex = route.xs[n - 1] ?? 0;
  const ey = route.ys[n - 1] ?? 0;
  let fx = (route.xs[n - 2] ?? ex) - ex;
  let fy = (route.ys[n - 2] ?? ey) - ey;
  const len = Math.hypot(fx, fy);
  if (len > 0) {
    fx /= len;
    fy /= len;
  } else {
    fx = 0;
    fy = -1;
  }
  out.x = ex;
  out.y = ey;
  out.fx = fx;
  out.fy = fy;
  const far = maxQueue * QUEUE_ALONG;
  const inside = (sx: number, sy: number): boolean => {
    const x = ex + sx * far;
    const y = ey + sy * far;
    return x >= 0 && y >= 0 && x <= cols && y <= rows;
  };
  // The two perpendiculars to f: (fy, −fx) and (−fy, fx).
  if (inside(fy, -fx) || !inside(-fy, fx)) {
    out.sx = fy;
    out.sy = -fx;
  } else {
    out.sx = -fy;
    out.sy = fx;
  }
  return out;
}

/**
 * Where a member `q` tiles back in the queue stands (grid units, into `out`): it leaves the gate
 * sideways, QUEUE_ALONG per tile of `q`, in the file `file` (0 or 1) puts it in. At q = 0 it is the
 * gate itself, where the sim puts it on the road.
 */
export function queuePoint(
  gate: Gate,
  q: number,
  file: 0 | 1,
  out: { x: number; y: number },
): { x: number; y: number } {
  const along = q * QUEUE_ALONG;
  // The files open up over the first step out of the gate, so q = 0 is exactly the gate.
  const open = Math.min(1, q / CHOIR_SPACING_TILES);
  const side = (file === 0 ? -QUEUE_FILE : QUEUE_FILE) * open;
  out.x = gate.x + gate.sx * along + gate.fx * side;
  out.y = gate.y + gate.sy * along + gate.fy * side;
  return out;
}

/** How far back in the gate queue a member of column rank `rank` is (tiles; ≤ 0: on the road). */
export function queueDepth(rank: number, leaderWalked: number): number {
  return rank * CHOIR_SPACING_TILES - leaderWalked;
}

// ── The song ring ────────────────────────────────────────────────────────────────────────────

export const SONG_RING_COLOR: ColorName = 'gold.4';
export const SONG_RING_UNDER: ColorName = 'ink.0';
export const SONG_FILL_COLOR: ColorName = 'gold.3';
/** The hymn's beat (sim ticks): a slow, swelling 0.8 s. */
export const HYMN_BEAT_TICKS = 48;
/** The fill's two rungs: on the beat and off it. */
export const SONG_FILL_ON = 0.1;
export const SONG_FILL_OFF = 0.06;

/** The fill's alpha at sim tick `tick`: on the beat's first half, off its second; steady under reduced motion. */
export function songFillAlpha(tick: number, reducedMotion: boolean): number {
  if (reducedMotion) return SONG_FILL_ON;
  return Math.floor((tick * 2) / HYMN_BEAT_TICKS) % 2 === 0 ? SONG_FILL_ON : SONG_FILL_OFF;
}

/** The ring's dash shift (0 or 1): a step on each beat; still under reduced motion. */
export function songRingShift(tick: number, reducedMotion: boolean): 0 | 1 {
  if (reducedMotion) return 0;
  return Math.floor(tick / HYMN_BEAT_TICKS) % 2 === 0 ? 0 : 1;
}

// ── The halt window ──────────────────────────────────────────────────────────────────────────

export const WINDOW_WALK: ColorName = 'gold.2';
export const WINDOW_HALT: ColorName = 'red.3';
export const WINDOW_UNDER: ColorName = 'ink.0';
/** The bar across the road at the window's far edge (tiles either side of the road). */
export const WINDOW_BAR_TILES = 0.3;

/** The point `d` tiles along `route` from its first point, into `out`. */
export function routePoint(
  route: RouteLike,
  d: number,
  out: { x: number; y: number },
): { x: number; y: number } {
  const cum = route.cumLenTiles;
  const last = route.xs.length - 1;
  if (d <= 0 || last <= 0) {
    out.x = route.xs[0] ?? 0;
    out.y = route.ys[0] ?? 0;
    return out;
  }
  if (d >= route.lengthTiles) {
    out.x = route.xs[last]!; // last ≥ 1
    out.y = route.ys[last]!;
    return out;
  }
  let s = 0;
  while (s < last - 1 && d >= cum[s + 1]!) s++; // s + 1 ≤ last
  const a = cum[s]!;
  const b = cum[s + 1] ?? a;
  const t = b > a ? (d - a) / (b - a) : 0;
  out.x = route.xs[s]! + (route.xs[s + 1]! - route.xs[s]!) * t;
  out.y = route.ys[s]! + (route.ys[s + 1]! - route.ys[s]!) * t;
  return out;
}

/**
 * The window's path from road distance `from` back toward the spawn to `to` (`to` < `from`): its
 * points, the road's corners between included, into `xs`/`ys`; returns how many (≥ 2).
 */
export function windowPath(
  route: RouteLike,
  from: number,
  to: number,
  xs: number[],
  ys: number[],
): number {
  const p = { x: 0, y: 0 };
  routePoint(route, from, p);
  xs[0] = p.x;
  ys[0] = p.y;
  let n = 1;
  const lo = Math.max(0, to);
  for (let i = route.cumLenTiles.length - 2; i >= 1 && n < xs.length - 1; i--) {
    const c = route.cumLenTiles[i]!; // i < length
    if (c < from && c > lo) {
      xs[n] = route.xs[i]!;
      ys[n] = route.ys[i]!;
      n++;
    }
  }
  routePoint(route, lo, p);
  xs[n] = p.x;
  ys[n] = p.y;
  return n + 1;
}

// ── The HALTED plate ─────────────────────────────────────────────────────────────────────────

export const HALT_TEXT = 'HALTED';
const PLATE_FILL: ColorName = 'red.2';
const PLATE_EDGE: ColorName = 'ink.0';
const PLATE_TEXT: ColorName = 'white.1';
/** The plate floats this far over Pebble's head (px over her anchor). */
export const HALT_PLATE_LIFT_PX = 21;

/** The plate: HALT_TEXT in `white.1` on `red.2`, a 1 px `ink.0` edge with clipped corners. */
export function haltPlateImage(): RgbaImage {
  const t = textImage(HALT_TEXT, PLATE_TEXT, PLATE_FILL);
  const w = t.w + 2;
  const h = t.h + 2;
  const data = new Uint8ClampedArray(w * h * 4);
  const fill = rgbOf(PLATE_FILL);
  const edge = rgbOf(PLATE_EDGE);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const border = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      const corner = (x === 0 || x === w - 1) && (y === 0 || y === h - 1);
      if (corner) continue;
      const i = (y * w + x) * 4;
      let c = border ? edge : fill;
      let alpha = 255;
      if (!border) {
        const j = ((y - 1) * t.w + (x - 1)) * 4;
        if ((t.data[j + 3] ?? 0) > 0) {
          c = { r: t.data[j]!, g: t.data[j + 1]!, b: t.data[j + 2]! }; // j < t.data.length
          alpha = t.data[j + 3]!;
        }
      }
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = alpha;
    }
  }
  return { w, h, data };
}
