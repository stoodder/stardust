// Link callouts (D059, D061): every link's name must be drawable in the 3×5 pixel font, or
// BattleScene skips its floating text.
import { describe, expect, it } from 'vitest';
import { LINKS } from '../../content/links/index.ts';
import { canDraw } from '../vfx/pixelFont.ts';
import { calloutText, LINK_CALLOUT, TETHER_LIFT_PX, tetherLift } from './LinkView.ts';

describe('link callouts', () => {
  it('every link name floats as drawable text, with a callout look', () => {
    const links = Object.values(LINKS);
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(canDraw(calloutText(link.name)), link.name).toBe(true);
      expect(LINK_CALLOUT[link.id], link.id).toBeDefined();
    }
  });

  it("a name the font can't draw is caught by the guard", () => {
    expect(canDraw(calloutText('Acid Rain'))).toBe(true);
    expect(canDraw(calloutText("Bricks's Tip"))).toBe(false); // the apostrophe isn't in the font
  });

  it("rides a flat-to-high tether at the ends' mean height (T221)", () => {
    expect(tetherLift(0, 0)).toBe(TETHER_LIFT_PX);
    expect(tetherLift(8, 8)).toBe(8 + TETHER_LIFT_PX);
    // Either way round, each end is half a step (4 px) from its head.
    expect(tetherLift(0, 8)).toBe(4 + TETHER_LIFT_PX);
    expect(tetherLift(8, 0)).toBe(4 + TETHER_LIFT_PX);
  });
});
