// The world's scenery in the `world` layer (D134): the objects the lighting grade tints with the
// ground (high-ground blocks, decor and wreckage props, assets, cue props, the Peeker's rock), as
// opposed to the actors it leaves alone (units, allies, towers). A view marks its scenery once when
// it creates it; LightingView tints every marked object in `world` when the light moves.
const SCENERY = new WeakSet<object>();

/** Marks `obj` as scenery (the lighting grade tints it); returns it. */
export function markScenery<T extends object>(obj: T): T {
  SCENERY.add(obj);
  return obj;
}

/** Whether `obj` is scenery. */
export function isScenery(obj: object): boolean {
  return SCENERY.has(obj);
}
