// Sharing the ally views' baked x-ray textures (AllyView; T664). Pure, so it is tested alone.
/** The texture manager's part the x-ray textures' sharing uses (a scene's `textures`). */
interface XrayTextures {
  exists(key: string): boolean;
  remove(key: string): unknown;
}

/**
 * How many ally views hold each baked x-ray texture, per texture manager (T664): the textures are
 * keyed by look, so two views showing the same frame share one, and a view freeing it must not
 * pull it from the other. Freed when the last holder lets go.
 */
const xrayHolders = new WeakMap<XrayTextures, Map<string, number>>();

/** Notes one more view holding the x-ray texture `key`. */
export function holdXray(textures: XrayTextures, key: string): void {
  let held = xrayHolders.get(textures);
  if (held === undefined) {
    held = new Map();
    xrayHolders.set(textures, held);
  }
  held.set(key, (held.get(key) ?? 0) + 1);
}

/** A view lets go of the x-ray texture `key`; the last to let go removes it. */
export function releaseXray(textures: XrayTextures, key: string): void {
  const held = xrayHolders.get(textures);
  const n = (held?.get(key) ?? 1) - 1;
  if (n > 0) {
    held?.set(key, n);
    return;
  }
  held?.delete(key);
  if (textures.exists(key)) textures.remove(key);
}
