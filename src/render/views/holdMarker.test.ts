import { describe, expect, it } from 'vitest';
import { holdMarkerImage, tintOf } from './holdMarker.ts';

describe('the Hold Fire marker', () => {
  it('is a 9×9 plate with chamfered corners and two white pause bars', () => {
    const img = holdMarkerImage();
    expect([img.w, img.h]).toEqual([9, 9]);
    const alpha = (x: number, y: number) => img.data[(y * img.w + x) * 4 + 3];
    const rgb = (x: number, y: number) => [...img.data.slice((y * img.w + x) * 4, (y * img.w + x) * 4 + 3)];
    expect(alpha(0, 0)).toBe(0);
    expect(alpha(8, 8)).toBe(0);
    expect(rgb(2, 4)).toEqual([255, 255, 255]);
    expect(rgb(6, 4)).toEqual([255, 255, 255]);
    // The gap between the bars is the plate's fill, not white: two bars, not one block.
    expect(rgb(4, 4)).not.toEqual([255, 255, 255]);
  });

  it('turns palette colors into Phaser tints', () => {
    expect(tintOf('white.1')).toBe(0xffffff);
    expect(tintOf('steel.3')).toBe(0x929db6);
  });
});
