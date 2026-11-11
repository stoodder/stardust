// The Scuttle Den's swarmlings as rules (T604, polished by T630a; SwarmView applies them): pure, so
// they're unit-tested.
// - **Where a latched one clings:** on its target's back as EnemyView draws it, low enough that the
//   rider's own top stays inside the body's frame, so the target's health bar (which sits just over
//   the frame's top) is never under it: its feet RIDE_PX[kind] below the frame's top (its visible
//   height, outline included), but never past CLING_FLOOR_PX above the frame's bottom (on a body
//   shorter than the rider, it covers the body rather than climbing over the bar). Spread a few px
//   by uid inside the body's width, so a pile reads as a pile.
// - **The dash's dust:** a swarmling setting out kicks a small `grime.3` puff where it leaves.

/** A latched rider's visible height above its feet (px, its outline included), by kind. */
export const RIDE_PX: Readonly<Record<'swarmling' | 'champion', number>> = {
  swarmling: 8,
  champion: 10,
};
/** A rider's feet stay at least this far above the bottom of its target's frame (px). */
export const CLING_FLOOR_PX = 2;
/** A latched one's sideways spread by uid (px either way), at most the body's half-width. */
export const SPREAD_PX = 3;

/**
 * The screen y of a latched rider's feet on a body drawn from `top` to `bottom` (px): its own
 * height below the top, so it never rises over the frame (and the health bar above it), but not
 * past CLING_FLOOR_PX above the bottom.
 */
export function clingFeetY(top: number, bottom: number, ridePx: number): number {
  return Math.min(top + ridePx, Math.max(top, bottom - CLING_FLOOR_PX));
}

/** A latched one's sideways offset by uid (px), inside a body `halfW` px either side of centre. */
export function clingSpreadPx(uid: number, halfW: number): number {
  const spread = Math.max(0, Math.min(SPREAD_PX, Math.floor(halfW) - 2));
  // 11 is coprime with every width here (3, 5, 7), so neighbouring uids land apart.
  return ((uid * 11) % (2 * spread + 1)) - spread;
}
