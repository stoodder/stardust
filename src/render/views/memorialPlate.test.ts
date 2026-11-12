// The memorial plate's foot (T871): MemorialView measures the top of the wreck's art from its
// frame's pixels, since each class's stump stands its own height (the 10 px drop it replaced was
// one class's guess). Here the baked frames stand in for the atlas page.
import { describe, expect, it } from 'vitest';
import { PALETTES } from '../../content/palettes/index.ts';
import { propMemorialWreck, MEMORIAL_SOURCES } from '../../content/sprites/props/memorial_wreck.ts';
import { bakeSprite, DEFAULT_VARIANT, frameKey } from '../sprites/bake.ts';
import { firstOpaqueRow } from './memorialPlate.ts';

describe('the memorial plate', () => {
  it('finds the first opaque row of an image', () => {
    const img = new Uint8ClampedArray(3 * 4 * 4);
    expect(firstOpaqueRow(img, 3)).toBe(4);
    img[(2 * 3 + 1) * 4 + 3] = 255;
    expect(firstOpaqueRow(img, 3)).toBe(2);
  });

  it("sits on each class's own stump: the art's top differs by class", () => {
    const baked = bakeSprite(propMemorialWreck, PALETTES);
    const tops: Record<string, number> = {};
    for (const cls of Object.keys(MEMORIAL_SOURCES)) {
      const f = baked.frames.find(
        (b) => b.key === frameKey(propMemorialWreck.id, DEFAULT_VARIANT, cls),
      );
      if (f === undefined) throw new Error(`no wreck frame '${cls}'`);
      const top = firstOpaqueRow(f.image.data, f.image.w);
      expect(top, cls).toBeGreaterThan(0);
      expect(top, cls).toBeLessThan(f.image.h / 2);
      tops[cls] = top;
    }
    // From 3 px (the Mindspike's spire) to 15 (the Rivet's low stump), not one fixed drop.
    expect(new Set(Object.values(tops)).size).toBeGreaterThan(1);
  });
});
