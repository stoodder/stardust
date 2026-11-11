// M6 review round 2, the app's pure rules (D144): the SEAL button keeps clear of both of A3M3's
// blast doors, open or shut, and falls back to the top band when there's no room (S8).
import { describe, expect, it } from 'vitest';
import { createSim } from '../sim/index.ts';
import {
  SEAL_BOTTOM,
  SEAL_H,
  SEAL_TOP_BAND,
  SEAL_W,
  UI_H,
  UI_W,
  grow,
  overlaps,
  sealButtonBottom,
} from '../ui/hud/layout.ts';
import { battleConfig } from './battleSetup.ts';
import { doorBoxes } from './forcedInput.ts';
import { createHost } from './host.ts';

const button = (bottom: number) => ({
  x: (UI_W - SEAL_W) / 2,
  y: UI_H - bottom - SEAL_H,
  w: SEAL_W,
  h: SEAL_H,
});

describe('the SEAL button keeps both doors in sight (S8)', () => {
  it("covers neither of A3M3's doors, the shut one included", () => {
    const boxes = doorBoxes(createHost(createSim(battleConfig('a3_m03', 1, null))));
    expect(boxes).toHaveLength(2);
    const bottom = sealButtonBottom(boxes);
    expect(bottom).toBeGreaterThan(SEAL_BOTTOM);
    for (const b of boxes) expect(overlaps(button(bottom), grow(b, 4))).toBe(false);
  });

  it('goes to the top band, under the comms panel, when lifting leaves no room', () => {
    const wall = [
      { x: 200, y: 260, w: 240, h: 60 },
      { x: 200, y: 150, w: 240, h: 80 },
      { x: 200, y: 60, w: 240, h: 60 },
    ];
    const bottom = sealButtonBottom(wall);
    expect(button(bottom).y).toBe(SEAL_TOP_BAND);
  });
});
