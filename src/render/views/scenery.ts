// The world's scenery in the `world` layer (D134): the objects the lighting grade tints with the
// ground (high-ground blocks, decor and wreckage props, assets, cue props, the Peeker's rock), as
// opposed to the actors it leaves alone (units, allies, towers). A view marks its scenery once when
// it creates it; LightingView tints every marked object in `world` when the light moves. A view
// that knows the tile its scenery stands on marks it with the tile's ground point (grid), which is
// where Sundown's darkness asks whether it stands in the light (T530b); otherwise its screen
// position stands in for it.
import type { Vec2 } from '../iso.ts';

const SCENERY = new WeakMap<object, Vec2 | null>();

/**
 * Marks `obj` as scenery (the lighting grade tints it), standing on grid point (`gx`, `gy`) when
 * given; returns it.
 */
export function markScenery<T extends object>(obj: T, gx?: number, gy?: number): T {
  SCENERY.set(obj, gx === undefined || gy === undefined ? null : { x: gx, y: gy });
  return obj;
}

/** Whether `obj` is scenery. */
export function isScenery(obj: object): boolean {
  return SCENERY.has(obj);
}

/** The grid point scenery `obj` was marked standing on, or null (unknown, or not scenery). */
export function sceneryGround(obj: object): Vec2 | null {
  return SCENERY.get(obj) ?? null;
}
