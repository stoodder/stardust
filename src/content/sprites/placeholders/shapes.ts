// Placeholder builders (T300a): simple shapes that stand in for M3's new actors so content can
// name its final sprite ids before the art lands. T311a and T311b replace the art behind the
// same ids (sprites/index.ts imports each placeholder by its final export name), and these files
// go away with the last of them. Each placeholder still follows the sprite contract: walk anims
// in four facings for enemies, t1–t3 frames and a mount for tower bases, aiming heads with fire
// anims, and one 14×14 `icon` frame (outlined to 16×16) for icons.
import { finish, skitterBody } from '../enemies/skitter.ts';
import { disc, grid, line, plot, rows, type CharGrid } from '../helpers.ts';
import type { AnimDef, FrameDef } from '../types.ts';

/** A feature stamp: `[x, y, rows]`, `.` skipped (enemies/skitter.ts `finish`). */
export type Stamp = readonly [number, number, readonly string[]];

/** A round Skitterkin placeholder: the shared body plus per-facing stamps. */
export interface BlobSpec {
  readonly w: number;
  readonly h: number;
  readonly rx: number;
  readonly ry: number;
  /** Seen from the front (SE): eyes, tuft, and whatever marks the unit. */
  readonly se: readonly Stamp[];
  /** Seen from behind (NE). */
  readonly ne: readonly Stamp[];
}

/** Stamps shifted up by `dy` (the walk bob). */
function lifted(stamps: readonly Stamp[], dy: number): Stamp[] {
  return stamps.map(([x, y, r]) => [x, y - dy, r]);
}

/** One walk frame: the body (bobbing 1 px on step 1), little legs, and the facing's stamps. */
function blobFrame(s: BlobSpec, facing: 'se' | 'ne', step: 0 | 1): string[] {
  const g = skitterBody({
    w: s.w,
    h: s.h,
    cx: s.w / 2,
    cy: s.h / 2 - step,
    rx: s.rx,
    ry: s.ry,
    facing,
    belly: 0.4,
  });
  const legs = step === 0 ? ['1.1', '0.0'] : ['.1.', '0.0'];
  const feet: Stamp[] = [
    [Math.round(s.w / 2 - s.rx / 2) - 1, s.h - 2, legs],
    [Math.round(s.w / 2 + s.rx / 2) - 1, s.h - 2, legs],
  ];
  return finish(g, [...feet, ...lifted(facing === 'se' ? s.se : s.ne, step)]);
}

/** The four-facing walk (SE and NE authored, mirrored to SW and NW) of a blob placeholder. */
export function blobWalk(s: BlobSpec): {
  frames: Record<string, FrameDef>;
  anims: Record<string, AnimDef>;
} {
  return {
    frames: {
      walk_se_0: blobFrame(s, 'se', 0),
      walk_se_1: blobFrame(s, 'se', 1),
      walk_ne_0: blobFrame(s, 'ne', 0),
      walk_ne_1: blobFrame(s, 'ne', 1),
    },
    anims: {
      walk_se: { frames: ['walk_se_0', 'walk_se_1'], fps: 6 },
      walk_sw: { mirrorOf: 'walk_se' },
      walk_ne: { frames: ['walk_ne_0', 'walk_ne_1'], fps: 6 },
      walk_nw: { mirrorOf: 'walk_ne' },
    },
  };
}

/** Fills a w×h rectangle. */
export function box(g: CharGrid, x: number, y: number, w: number, h: number, ch: string): void {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) plot(g, xx, yy, ch);
}

/** A lit ball: `lit` in the upper left, `mid`, then `dark` at the rim. */
export function ball(
  g: CharGrid,
  cx: number,
  cy: number,
  r: number,
  lit: string,
  mid: string,
  dark: string,
): void {
  disc(g, cx, cy, r, (d, x, y) =>
    d > r - 1 ? dark : x + 0.5 < cx && y + 0.5 < cy ? lit : mid,
  );
}

/** Head frame size and anchor shared by the placeholder turret heads. */
export const HEAD_W = 18;
export const HEAD_H = 16;
export const HEAD_ANCHOR = { x: 9, y: 14 } as const;

/**
 * A placeholder turret head facing `facing`: a squat housing (`housing`) with `barrels` drawn on
 * it by the caller, and a white muzzle flash when `fire`.
 */
export function headFrame(
  facing: 'se' | 'ne',
  fire: boolean,
  draw: (g: CharGrid, dir: 1 | -1) => readonly (readonly [number, number])[],
): string[] {
  const g = grid(HEAD_W, HEAD_H);
  // The housing: a lit dome on a dark collar.
  box(g, 4, 11, 10, 3, '1');
  box(g, 4, 11, 10, 1, '2');
  ball(g, 9, 10, 4.5, '4', '3', '2');
  const muzzles = draw(g, facing === 'se' ? 1 : -1);
  if (fire) {
    for (const [x, y] of muzzles) {
      plot(g, x, y, 'w');
      plot(g, x + 1, y, 'e');
      plot(g, x, y - 1, 'e');
    }
  }
  return rows(g);
}

/** Aiming-head anims: fire in four facings, SE and NE authored. */
export const HEAD_ANIMS: Readonly<Record<string, AnimDef>> = {
  fire_se: { frames: ['se_fire', 'se'], fps: 12, loop: false },
  fire_sw: { mirrorOf: 'fire_se' },
  fire_ne: { frames: ['ne_fire', 'ne'], fps: 12, loop: false },
  fire_nw: { mirrorOf: 'fire_ne' },
};

export { line };
