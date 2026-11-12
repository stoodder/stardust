// Where the memorial plate stands (MemorialView, T871): on the top of the wreck's art, measured from
// its frame's pixels, since each class's stump stands its own height. Pure, so it is tested here.

/**
 * The plate's foot this far below the top of the wreck's frame when its pixels can't be read: the
 * wreck lost the top of its head (art-direction §6), so its art starts well under its frame's top.
 */
export const PLATE_DROP_PX = 10;

/** The first row of an RGBA image `w` px wide holding an opaque pixel (its height when none). */
export function firstOpaqueRow(data: Uint8ClampedArray, w: number): number {
  const h = Math.floor(data.length / (4 * w));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) if ((data[(y * w + x) * 4 + 3] ?? 0) > 0) return y;
  }
  return h;
}
