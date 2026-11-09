// Depth sorting inside the `world` and `air` layers (art/tech-spec.md § Depth sorting):
// depth = footY + kindBias + (uid & 0xff) / 1e4. footY is the anchor's screen y on the ground
// plane (no elevation offset), so a tower on high ground sorts by its tile, not its drawn height.
import { HALF_H } from './iso.ts';

/**
 * At equal footY, towers draw in front of enemies, and enemies in front of props. A ground strip
 * (Suppressing Fire's live zone, T232) sits between: over the enemies on its tiles, under towers.
 */
export const KIND_BIAS = {
  highGround: 0.05,
  prop: 0.1,
  enemy: 0.2,
  strip: 0.25,
  tower: 0.3,
} as const;
export type DepthKind = keyof typeof KIND_BIAS;

/** The sort depth of an object in the `world` or `air` layer. `uid` breaks ties so nothing flickers. */
export function worldDepth(footY: number, kind: DepthKind, uid: number): number {
  return footY + KIND_BIAS[kind] + (uid & 0xff) / 1e4;
}

/**
 * A ground strip tile's sort depth (Suppressing Fire's live zone, T232), from its center's screen
 * y: just above its bottom vertex, so the enemies on the tile draw under it, and a tower or a
 * high-ground block on the tile in front (footY a half tile lower) draws over it.
 */
export function stripDepth(centerY: number): number {
  return worldDepth(centerY + HALF_H - 1, 'strip', 0);
}
