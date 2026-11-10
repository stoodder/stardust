// A resting Prism shows its light disc's ghost (review R9): a live light source whose beam is off;
// a beaming one has its real disc instead, and a tower without a light radius never has one.
import { describe, expect, it } from 'vitest';
import { isLightSource } from '../../sim/index.ts';
import { showsGhost } from './LightGhostView.ts';

const prism = { alive: true, beamActive: false, x: 2.5, y: 3.5, def: { lightRadiusSq: 4 } };

describe('the ghost of a Prism’s light', () => {
  it('shows under a live Prism whose beam is off, never as a light source', () => {
    expect(showsGhost(prism)).toBe(true);
    expect(isLightSource(prism)).toBe(false);
  });

  it('gives way to the real disc while it beams: exactly one of the two, never both', () => {
    const beaming = { ...prism, beamActive: true };
    expect(showsGhost(beaming)).toBe(false);
    expect(isLightSource(beaming)).toBe(true);
  });

  it('never shows for a sold tower or one without a light radius', () => {
    expect(showsGhost({ ...prism, alive: false })).toBe(false);
    expect(showsGhost({ ...prism, def: { lightRadiusSq: 0 } })).toBe(false);
    expect(showsGhost({ ...prism, def: null })).toBe(false);
  });
});
