// Where a gate's loss number floats (M8 review R4; art-direction §7 *Floating numbers*): a leak's
// "−N" rises from the core's heart, unless a lettered memorial stands by it (FIN's HE HELD THE DOOR
// beside the colony gate, A3M4's under convoy, the memorial wreck, A3M3's ridge): then it starts
// GATE_FLOAT_SHIFT_TILES to the side away from the memorial on screen (east, unless the memorial
// stands east of the gate), so a number never rises over the lettering. Pure; allocation-free.
import type { Vec2 } from '../iso.ts';

/** Markers whose props carry lettering a number must not cover (groundTiles.ts MARKER_PROPS). */
export const LETTERED_MARKERS: readonly string[] = [
  'held_door',
  'memorial_wreck',
  'memorial_ridge',
];
/** A memorial this near the core (grid tiles, centre to centre) is beside it. */
export const MEMORIAL_NEAR_TILES = 3;
/** The side step (grid units along x and against y: a sideways move on screen, no rise). */
export const GATE_FLOAT_SHIFT_TILES = 0.75;

/**
 * The grid point a gate's loss number rises from: the core's (`core`), or stepped sideways on
 * screen away from a lettered memorial beside it (see the header). Writes `out` and returns it.
 */
export function gateFloatAt(
  core: { readonly x: number; readonly y: number },
  markers: Readonly<Record<string, readonly [number, number]>>,
  out: Vec2,
): Vec2 {
  out.x = core.x;
  out.y = core.y;
  let best = MEMORIAL_NEAR_TILES * MEMORIAL_NEAR_TILES;
  let side = 0;
  for (const name of LETTERED_MARKERS) {
    const at = Object.hasOwn(markers, name) ? markers[name] : undefined;
    if (at === undefined) continue;
    const dx = at[0] + 0.5 - core.x;
    const dy = at[1] + 0.5 - core.y;
    const d = dx * dx + dy * dy;
    if (d > best) continue;
    best = d;
    // Its screen x against the core's (iso.ts: screen x runs with grid x − grid y).
    side = dx - dy > 0 ? -1 : 1;
  }
  out.x += side * GATE_FLOAT_SHIFT_TILES;
  out.y -= side * GATE_FLOAT_SHIFT_TILES;
  return out;
}
