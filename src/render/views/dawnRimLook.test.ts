// Dawn's rims on the actors (T901): gold toward the sun, cyan from the sky, on actors only.
import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import {
  DAWN_RIMS,
  hasNoDawnRim,
  markNoDawnRim,
  takesDawnRim,
  type RimCandidate,
} from './dawnRimLook.ts';

const body: RimCandidate = {
  visible: true,
  alpha: 1,
  blendMode: 0,
  tintMode: 0,
  frameName: 'walk_se_0',
  scenery: false,
  noRim: false,
};

describe("Dawn's rims (art-direction §3: highlights go gold and cyan)", () => {
  it('edges the sun side gold and the top cyan, the sun the brighter', () => {
    const [sun, sky] = DAWN_RIMS;
    expect(sun!.color.startsWith('gold')).toBe(true);
    expect(sun!.dx).toBeGreaterThan(0); // east: grid +x is screen right
    expect(sky!.color.startsWith('teal')).toBe(true);
    expect(sky!.dy).toBeLessThan(0); // the sky's light falls from above
    expect(sun!.alpha).toBeGreaterThan(sky!.alpha);
    const c = rgbOf(sky!.color);
    expect(c.g).toBeGreaterThan(c.r); // cyan, not white
  });

  it('rims actors only: not scenery, glows, someone else’s rim, or a faint ghost', () => {
    expect(takesDawnRim(body)).toBe(true);
    expect(takesDawnRim({ ...body, scenery: true })).toBe(false);
    expect(takesDawnRim({ ...body, frameName: 'walk_se_0@glow' })).toBe(false);
    expect(takesDawnRim({ ...body, blendMode: 1 })).toBe(false); // additive light
    expect(takesDawnRim({ ...body, tintMode: 1 })).toBe(false); // a fill-tinted rim copy
    expect(takesDawnRim({ ...body, alpha: 0.1 })).toBe(false);
    expect(takesDawnRim({ ...body, visible: false })).toBe(false);
  });

  it('never rims what a view marked no-rim: a placement ghost at 60%, a raised highlight (C5)', () => {
    const ghost = {};
    const actor = {};
    expect(markNoDawnRim(ghost)).toBe(ghost);
    expect(hasNoDawnRim(ghost)).toBe(true);
    expect(hasNoDawnRim(actor)).toBe(false);
    // The ghost is opaque enough and drawn normally: only the mark keeps it out.
    expect(takesDawnRim({ ...body, alpha: 0.6, noRim: hasNoDawnRim(actor) })).toBe(true);
    expect(takesDawnRim({ ...body, alpha: 0.6, noRim: hasNoDawnRim(ghost) })).toBe(false);
  });
});
