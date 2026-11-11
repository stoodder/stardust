// "Shareholder Value"'s crash site as rules (A3M5, act3.md § A3M5; art-direction §6 *The crash
// site's plates* and *"Shareholder Value"'s hangar*; T730b; PlatformSiteView draws it). Pure and on
// sim ticks (pause holds a plate in the air, 2× runs it fast), so it is unit-tested.
// - **The plates** (`prop.crash_plate`): as the jettison opens each `crash_<n>` tile (T707,
//   sim/openTile.ts), its plate blows off the hull where the platform stands and lands on that
//   tile: a high arc (higher and longer the farther it is thrown), the plates leaving one after
//   another in the order their tiles opened, each its own piece of the shell (`v0` a flank plate,
//   `v1` a shoulder plate, `v2` the hazard skirt, `v3` the bridge's screen). It lands with a puff of dust and lies there, askew in its gouge. Under
//   reduced motion, or when the battle opens with the tile already open (a checkpoint retry), it
//   lies there at once.
// - **The hangar** (`prop.hangar`, the `hangar` marker): shut, its REC lamp blinking, until the
//   platform has rolled out (any boss with a hangar phase on the field), then `open` for the rest of
//   the map: the empty bay, a drone's visor glinting inside.

/** The plate sprite and its looks (one per piece, by the order its tile opened). */
export const PLATE_SPRITE = 'prop.crash_plate' as const;
export const PLATE_LOOKS = 4;

/** The hangar's sprite and its open frame. */
export const HANGAR_SPRITE = 'prop.hangar' as const;
export const HANGAR_MARKER = 'hangar';
export const HANGAR_OPEN = 'open';

/**
 * A plate's flight (sim ticks, 60 a second): longer the farther it is thrown (the platform can
 * jettison anywhere on its road; the crash site is fixed), from FLIGHT_MIN_TICKS up to
 * FLIGHT_MAX_TICKS; each next plate leaves STAGGER_TICKS later.
 */
export const FLIGHT_MIN_TICKS = 30;
export const FLIGHT_MAX_TICKS = 96;
const FLIGHT_PER_TILE = 5;
export const STAGGER_TICKS = 7;
/** Where it leaves the hull (px up from the platform's ground point), and the arc's top (px). */
export const HULL_PX = 18;
export const ARC_MIN_PX = 30;
export const ARC_MAX_PX = 84;
const ARC_PER_TILE = 4;

/** How long a plate thrown `tiles` tiles flies (ticks). */
export function flightTicks(tiles: number): number {
  const t = Math.round(FLIGHT_MIN_TICKS + FLIGHT_PER_TILE * Math.max(0, tiles - 1));
  return Math.min(FLIGHT_MAX_TICKS, t);
}

/** How high a plate thrown `tiles` tiles arcs over the ground (px). */
export function arcPx(tiles: number): number {
  return Math.min(ARC_MAX_PX, Math.round(ARC_MIN_PX + ARC_PER_TILE * Math.max(0, tiles - 1)));
}

/** A plate's frame by the order its tile opened. */
export function plateFrame(order: number): string {
  return `v${((order % PLATE_LOOKS) + PLATE_LOOKS) % PLATE_LOOKS}`;
}

/** Where a plate is in its flight. */
export interface PlatePose {
  /** Still on the hull: not shown yet. */
  waiting: boolean;
  /** How far from the hull to its tile it has come (0–1, along the ground). */
  share: number;
  /** How high over the ground under it (px). */
  liftPx: number;
  /** Down on its tile. */
  landed: boolean;
}

/**
 * The pose of the plate that left `order`-th, thrown `tiles` tiles, `ticks` after its tile opened
 * (into `out`). `still` (reduced motion) lands it at once.
 */
export function platePose(
  ticks: number,
  order: number,
  tiles: number,
  still: boolean,
  out: PlatePose,
): PlatePose {
  const t = still ? 1 : (ticks - order * STAGGER_TICKS) / flightTicks(tiles);
  out.waiting = t < 0;
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  out.share = k;
  // Off the hull and up over the arc, then down onto the tile.
  out.liftPx = Math.round(HULL_PX * (1 - k) + arcPx(tiles) * 4 * k * (1 - k));
  out.landed = t >= 1;
  return out;
}

/** The hull as the hangar reads it: a boss phase list, each with or without a hangar. */
interface BossLike {
  readonly alive: boolean;
  readonly def: {
    readonly boss: { readonly phases: readonly { readonly hangar: unknown }[] } | null;
  } | null;
}

/** Whether the platform has rolled out: a live boss with a hangar phase is on the field. */
export function platformOut(enemies: {
  readonly used: number;
  readonly items: readonly BossLike[];
}): boolean {
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    const phases = e.alive ? (e.def?.boss?.phases ?? null) : null;
    if (phases === null) continue;
    for (const p of phases) if (p.hangar !== null && p.hangar !== undefined) return true;
  }
  return false;
}
