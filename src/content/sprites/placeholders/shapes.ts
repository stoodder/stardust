// Placeholder builders (T300a): simple shapes that stand in for an M3 actor so content can name its
// final sprite id before the art lands. Only Chitterbloom is left (T311b replaces it, and these
// files go away with it). A placeholder still follows the sprite contract: walk anims in four
// facings, and one 14×14 `icon` frame (outlined to 16×16) for its icon.
import { finish, skitterBody } from '../enemies/skitter.ts';
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
