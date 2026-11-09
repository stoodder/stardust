// Fleeing runners (design/enemies.md § 5.4 *Fleeing Skitterkin*; art-direction §8 Skittish: "ears
// flatten, panic hop"): every Act I Skitterkin that runs ahead of the Hollow in Act II has a fleeing
// body, `enemy.<id>_fleeing`, which render draws for a `fleeing`-tagged unit (render/views/
// spriteInfo.ts `enemyBody`). It is built from the sprite's own walk frames, so the family stays
// one family:
// - **`walk_<facing>`, the scurry:** its tuft (the Skitterkin's "ears") pressed flat and swept back
//   along the crown, as if into a headwind. Shown the whole run: the Skittish tell's body cue.
// - **`glance_<facing>`, the look back** (one frame; fleeLook.ts times it): facing you, its face
//   turns back over its shoulder the way it came (the eyes cross to the far side of the head); from
//   behind, one wide eye peeks round its shoulder at you. A bead of sweat flies off its crown.
// - **`panic_<facing>`, the panic hop** (render's `panic` pose: held in a hush tell, or bolting):
//   it jumps clear of the ground, 2 px up with the sweat flying, and lands (2 frames, 10 fps). Its
//   canvas is 2 px taller than its walking body's, room for the hop, on the same ground point.
// - **`death`:** the same pop as its walking body (Act II plays the quiet half).
// Fleeing bodies carry no palette variants: allies never flee.
import { DEATH_ANIM, deathFrames } from './death.ts';
import { at, fromRows, plot, rows, type CharGrid } from '../helpers.ts';
import type { AnimDef, FrameDef, SpriteDef } from '../types.ts';

/** Sweat: a `white.1` glint over a `blue.4` bead (custom legend). */
export const SWEAT_LEGEND = { Z: 'blue.4' } as const;

/** How a sprite's frames are read for the fleeing kit. */
export interface FleeSpec {
  /** Characters that are its tuft (default: the moss accent, `a`–`e`). */
  readonly tuft?: string;
  /** Characters that are its body mass (anything else opaque is a feature). */
  readonly body?: string;
  /** Characters that are its eyes and mouth (default `k` and `w`). */
  readonly face?: string;
  /**
   * How far its face moves to glance back (px, toward the back). Default: across the body's
   * centre (a face mirrored to the far side of the head).
   */
  readonly glanceShift?: number;
}

const DEFAULT_TUFT = 'abcde';
const DEFAULT_BODY = '012346789';
const DEFAULT_FACE = 'kw';

/** The topmost body pixel in each column (Infinity where the column has none). */
function contour(g: CharGrid, body: string): number[] {
  const w = g[0]?.length ?? 0;
  const out: number[] = [];
  for (let x = 0; x < w; x++) {
    let top = Infinity;
    for (let y = 0; y < g.length; y++) {
      if (body.includes(at(g, x, y))) {
        top = y;
        break;
      }
    }
    out.push(top);
  }
  return out;
}

/** The scurry frame: the tuft above the crown pressed flat and swept back (left). */
export function flatten(src: readonly string[], spec: FleeSpec = {}): string[] {
  const g = fromRows(src);
  const tuft = spec.tuft ?? DEFAULT_TUFT;
  const top = contour(g, spec.body ?? DEFAULT_BODY);
  const moved: [number, number, string][] = [];
  for (let y = 0; y < g.length; y++) {
    const row = g[y] ?? [];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x] ?? '.';
      if (!tuft.includes(ch) || y >= (top[x] ?? Infinity)) continue;
      moved.push([x, y, ch]);
      row[x] = '.';
    }
  }
  // Each pixel lies down behind its root: two pixels back for every pixel it stood above the crown,
  // on the crown's contour there (or level with its root where it streams off the back).
  for (const [x, y, ch] of moved) {
    const rootTop = top[x] ?? y + 1;
    const rise = Number.isFinite(rootTop) ? rootTop - 1 - y : 0;
    const nx = x - 2 * rise - 1;
    const there = top[nx] ?? Infinity;
    const ny = Number.isFinite(there) ? there - 1 : Number.isFinite(rootTop) ? rootTop - 1 : y;
    if (at(g, nx, ny) === '.') plot(g, nx, ny, ch);
  }
  return rows(g);
}

/** The opaque bounds of a frame's body pixels. */
function bodyBox(g: CharGrid, body: string): { x0: number; x1: number; y0: number } {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  g.forEach((row, y) =>
    row.forEach((ch, x) => {
      if (!body.includes(ch)) return;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
    }),
  );
  return { x0, x1, y0 };
}

/** A bead of sweat flying off the crown, ahead of (`front`) or behind its top. */
function sweat(g: CharGrid, body: string, front: boolean): void {
  const top = contour(g, body);
  const b = bodyBox(g, body);
  const x = front ? Math.min((g[0]?.length ?? 1) - 1, b.x1) : Math.max(0, b.x0 + 1);
  let y = Math.max(0, (top[x] ?? b.y0) - 2);
  // Up past anything already there (a scoop plate, a tuft), to clear air.
  while (y > 0 && (at(g, x, y) !== '.' || at(g, x, y + 1) !== '.')) y--;
  if (at(g, x, y) === '.') plot(g, x, y, 'w');
  if (at(g, x, y + 1) === '.') plot(g, x, y + 1, 'Z');
}

/**
 * The look back. Facing you (`se`), its face (eyes and mouth) crosses to the far side of its head;
 * from behind (`ne`), one wide eye peeks round its left shoulder. Sweat flies off its crown.
 */
export function glance(src: readonly string[], facing: 'se' | 'ne', spec: FleeSpec = {}): string[] {
  const g = fromRows(src);
  const body = spec.body ?? DEFAULT_BODY;
  const face = spec.face ?? DEFAULT_FACE;
  const b = bodyBox(g, body);
  if (facing === 'se') {
    const eyes: [number, number, string][] = [];
    g.forEach((row, y) =>
      row.forEach((ch, x) => {
        if (face.includes(ch) && y >= b.y0) eyes.push([x, y, ch]);
      }),
    );
    // Lift the face off, then lay it down again further back.
    for (const [x, y] of eyes) {
      const l = at(g, x - 1, y);
      const r = at(g, x + 1, y);
      plot(g, x, y, body.includes(l) ? l : body.includes(r) ? r : (DEFAULT_BODY[3] ?? '3'));
    }
    for (const [x, y, ch] of eyes) {
      const nx = spec.glanceShift === undefined ? b.x0 + b.x1 - x : x - spec.glanceShift;
      if (body.includes(at(g, nx, y)) || face.includes(at(g, nx, y))) plot(g, nx, y, ch);
    }
    sweat(g, body, true);
  } else {
    // One wide eye peeking round the shoulder, a third of the way down its back.
    const y = b.y0 + Math.max(2, Math.round((g.length - b.y0) / 3));
    let x = 0;
    while (x < (g[0]?.length ?? 0) && !body.includes(at(g, x, y))) x++;
    plot(g, x, y, 'w');
    plot(g, x + 1, y, 'k');
    plot(g, x, y + 1, 'k');
    plot(g, x + 1, y + 1, 'k');
    sweat(g, body, false);
  }
  return rows(g);
}

/** How high the panic hop jumps (px); a fleeing body is this much taller than its walking one. */
export const HOP_PX = 2;

/** The panic hop: the whole body jumps clear of the ground (HOP_PX, room allowing). */
export function hop(src: readonly string[], spec: FleeSpec = {}): string[] {
  let free = 0;
  while (free < src.length && /^\.*$/.test(src[free] ?? '')) free++;
  const lift = Math.min(HOP_PX, free);
  const lifted = [...src.slice(lift), ...src.slice(0, lift).map((r) => '.'.repeat(r.length))];
  const g = fromRows(lifted);
  sweat(g, spec.body ?? DEFAULT_BODY, false);
  return rows(g);
}

/**
 * The fleeing body for a Skitterkin sprite: `walk` (scurry), `glance`, and `panic` in SE and NE
 * (mirrored to SW and NW), and the death pop, from its SE and NE walk frames.
 */
export function fleeingSprite<const Id extends string>(
  base: SpriteDef,
  id: Id,
  spec: FleeSpec = {},
): SpriteDef<Id> {
  const grids = (prefix: string): string[][] => {
    const out: string[][] = [];
    for (let i = 0; ; i++) {
      const f: FrameDef | undefined = base.frames[`${prefix}_${i}`];
      if (f === undefined) return out;
      if (!Array.isArray(f)) throw new Error(`${base.id}: ${prefix}_${i} must be a grid`);
      const rowsOf: readonly string[] = f;
      // Headroom for the hop: HOP_PX clear rows on top (the anchor moves down with them).
      out.push([
        ...rowsOf.slice(0, 1).flatMap((r) => Array<string>(HOP_PX).fill('.'.repeat(r.length))),
        ...rowsOf,
      ]);
    }
  };
  const frames: Record<string, FrameDef> = {};
  const anims: Record<string, AnimDef> = {};
  let scurrySe: string[] = [];
  for (const facing of ['se', 'ne'] as const) {
    const walk = grids(`walk_${facing}`).map((f) => flatten(f, spec));
    if (facing === 'se') scurrySe = walk[0] ?? [];
    walk.forEach((f, i) => (frames[`walk_${facing}_${i}`] = f));
    const first = walk[0] ?? [];
    frames[`glance_${facing}_0`] = glance(first, facing, spec);
    frames[`panic_${facing}_0`] = hop(walk[walk.length > 1 ? 1 : 0] ?? first, spec);
    frames[`panic_${facing}_1`] = first;
    const fps = base.anims?.[`walk_${facing}`];
    anims[`walk_${facing}`] = {
      frames: walk.map((_, i) => `walk_${facing}_${i}`),
      fps: fps !== undefined && 'fps' in fps ? fps.fps : 8,
    };
    anims[`glance_${facing}`] = { frames: [`glance_${facing}_0`], fps: 1 };
    anims[`panic_${facing}`] = { frames: [`panic_${facing}_0`, `panic_${facing}_1`], fps: 10 };
  }
  for (const a of ['walk', 'glance', 'panic']) {
    anims[`${a}_sw`] = { mirrorOf: `${a}_se` };
    anims[`${a}_nw`] = { mirrorOf: `${a}_ne` };
  }
  const anchor = { x: base.anchor.x, y: base.anchor.y + HOP_PX };
  Object.assign(frames, deathFrames(scurrySe, anchor));
  anims['death'] = DEATH_ANIM;
  const { variants: _variants, ...rest } = base;
  return {
    ...rest,
    id,
    size: { w: base.size.w, h: base.size.h + HOP_PX },
    anchor,
    legend: { ...base.legend, ...SWEAT_LEGEND },
    frames,
    anims,
  };
}
