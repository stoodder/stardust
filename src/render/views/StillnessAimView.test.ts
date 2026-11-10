// Stillness's aim (T531; review U14): a dashed `teal.3` rim over an `ink.0` under-stroke, so the
// circle reads on A2M4's pale gold, over the faint blue disc of the cast it previews.
import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import { ringImage } from '../vfx/overlayPixels.ts';
import { STILL_AIM_RIM, STILL_AIM_UNDER } from './StillnessAimView.ts';

describe('Stillness’s aim', () => {
  it('is a dashed teal.3 rim with an ink.0 under-stroke', () => {
    expect(STILL_AIM_RIM).toBe('teal.3');
    expect(STILL_AIM_UNDER).toBe('ink.0');
    const ring = ringImage(2.5, STILL_AIM_RIM, true, STILL_AIM_UNDER);
    const solid = ringImage(2.5, STILL_AIM_RIM, false, STILL_AIM_UNDER);
    const count = (img: typeof ring.image, name: typeof STILL_AIM_RIM): number => {
      const c = rgbOf(name);
      let n = 0;
      for (let i = 0; i < img.data.length; i += 4) {
        const d = img.data;
        if (d[i + 3] === 255 && d[i] === c.r && d[i + 1] === c.g && d[i + 2] === c.b) n++;
      }
      return n;
    };
    // Dashed: fewer rim pixels than the solid ring, but plenty; and an under-stroke under them.
    expect(count(ring.image, STILL_AIM_RIM)).toBeLessThan(count(solid.image, STILL_AIM_RIM));
    expect(count(ring.image, STILL_AIM_RIM)).toBeGreaterThan(
      0.4 * count(solid.image, STILL_AIM_RIM),
    );
    expect(count(ring.image, STILL_AIM_UNDER)).toBeGreaterThan(0);
  });
});
