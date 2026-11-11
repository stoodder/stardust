// Link callouts (D059, D061): every link's name must be drawable in the 3×5 pixel font, or
// BattleScene skips its floating text.
import { describe, expect, it } from 'vitest';
import { PRESENTATION } from '../../content/presentation.ts';
import { LINKS } from '../../content/links/index.ts';
import { canDraw } from '../vfx/pixelFont.ts';
import {
  calloutLiftOver,
  calloutText,
  LINK_CALLOUT,
  TETHER_LIFT_PX,
  tetherLift,
} from './LinkView.ts';

describe('link callouts', () => {
  it('every link name floats as drawable text, with a callout look', () => {
    const links = Object.values(LINKS);
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(canDraw(calloutText(link.name)), link.name).toBe(true);
      expect(LINK_CALLOUT[link.id], link.id).toBeDefined();
    }
  });

  it('cheers in Acts I–II and drops the "!" from Act III on (T630a; style-guide § 2)', () => {
    expect(calloutText('Crossfire')).toBe('CROSSFIRE!');
    expect(calloutText('Crossfire', 'starred')).toBe('CROSSFIRE!');
    expect(calloutText('Crossfire', 'plain')).toBe('CROSSFIRE!');
    expect(calloutText('Splash Zone', 'meter')).toBe('SPLASH ZONE');
    expect(calloutText('Harmony', 'remembered')).toBe('HARMONY');
    // Every act's presentation dial maps to one of these four.
    for (const act of [1, 2, 3, 'finale'] as const) {
      const quiet = act === 3 || act === 'finale';
      expect(calloutText('X', PRESENTATION.byAct[act].counter).endsWith('!')).toBe(!quiet);
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

describe('a callout over a build floater (T329)', () => {
  it('stays put when the floater is already below it', () => {
    // Built tower right of the pair's middle on the same screen row: the plain lift clears it.
    expect(calloutLiftOver(40, { x: 3, y: 3 }, { x: 3, y: 3 }, 24)).toBe(40);
  });

  it("rises over a floater higher on screen than the pair's middle", () => {
    // Partner one tile down-right (x + 1, y + 1): the middle is 8 px lower on screen than the new
    // tower, so the callout's base must clear the floater's top (24 + 7 px) plus 2 px from there.
    const lift = calloutLiftOver(30, { x: 4, y: 4 }, { x: 3.5, y: 3.5 }, 24);
    expect(lift).toBe(8 + 24 + 7 + 2);
    // On high ground the floater sits 8 px higher, and so does the callout.
    expect(calloutLiftOver(30, { x: 4, y: 4 }, { x: 3.5, y: 3.5 }, 32)).toBe(lift + 8);
  });
});
