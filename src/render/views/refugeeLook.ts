// How refugees walk on screen (design/maps.md § 5.2; T305c's view, T530a's polish): pure rules,
// unit-tested, applied by RefugeeView.
// - **A crowd, not a centipede:** groups file 0.6 tiles apart, closer than their bodies are wide, so
//   each refugee walks a little to the side of the road's line by uid (`refugeeLanePx`, −3 to +3 px
//   across the way it walks, as enemies do, D026).
// - **Variety:** every third refugee (by uid) carries a little one riding on its back, its
//   sprite's `carry_<facing>` (T540a); the rest walk with their bundles (`walk_<facing>`).
// - **Pebble is found, not lost:** she is small, and walking in the middle of a group the parent in
//   front of her hid her (T540a). She walks PEBBLE_SIDE_PX to the near side of the line (toward the
//   viewer: down the screen) and sorts PEBBLE_RAISE_PX further forward, so she toddles beside the
//   group in front of the grown-ups, her white cap showing.

/** Pebble walks this far to the near side of the group's line (px). */
export const PEBBLE_SIDE_PX = 5;
/** And sorts this much further forward (px of foot y): past the parent in front of her. */
export const PEBBLE_RAISE_PX = 8;
/** A refugee's lane step (px): ((uid % 5) − 2) steps across the way it walks. */
const LANE_STEP_PX = 1.5;

/** A refugee's sideways offset (px; signed, along the side vector), or Pebble's. */
export function refugeeLanePx(uid: number, pebble: boolean): number {
  if (pebble) return PEBBLE_SIDE_PX;
  return ((uid % 5) - 2) * LANE_STEP_PX;
}

/** The anim family a refugee walks in: `carry` for every third parent (by uid), else `walk`. */
export function refugeeAnim(uid: number, pebble: boolean): 'walk' | 'carry' {
  return !pebble && uid % 3 === 1 ? 'carry' : 'walk';
}

/**
 * Turns a screen side vector (sx, sy) to the near side (toward the viewer: +y; +x when it lies
 * flat), in place. Pebble's offset runs along it.
 */
export function nearSide(side: { x: number; y: number }): { x: number; y: number } {
  if (side.y < 0 || (side.y === 0 && side.x < 0)) {
    side.x = -side.x;
    side.y = -side.y;
  }
  return side;
}
