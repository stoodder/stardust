// Depth sorting inside the `world` and `air` layers (art/tech-spec.md § Depth sorting):
// depth = footY + kindBias + (uid & 0xff) / 1e4. footY is the anchor's screen y on the ground
// plane (no elevation offset), so a tower on high ground sorts by its tile, not its drawn height.

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
