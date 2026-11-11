// BlockerView's look (T605): the bar's colour by health, and its ease towards the sim's health.
import { describe, expect, it } from 'vitest';
import { BAR_EASE_MS, blockerBarColor, blockerPose, easeBar } from './BlockerView.ts';
import { SPRITES } from '../../content/sprites/index.ts';

describe('the blocker bar (T605)', () => {
  it('is green above half, gold to a quarter, red below', () => {
    expect(blockerBarColor(1)).toBe('green.3');
    expect(blockerBarColor(0.51)).toBe('green.3');
    expect(blockerBarColor(0.5)).toBe('gold.3');
    expect(blockerBarColor(0.26)).toBe('gold.3');
    expect(blockerBarColor(0.25)).toBe('red.3');
    expect(blockerBarColor(0.05)).toBe('red.3');
  });

  it('eases a whole bar in BAR_EASE_MS, snaps under reduced motion and on its first frame', () => {
    expect(easeBar(Number.NaN, 0.6, 16, false)).toBe(0.6);
    expect(easeBar(1, 0.05, 16, true)).toBe(0.05);
    expect(easeBar(1, 0, BAR_EASE_MS / 2, false)).toBeCloseTo(0.5, 12);
    expect(easeBar(0.6, 0.05, BAR_EASE_MS, false)).toBe(0.05);
    expect(easeBar(0.05, 0.05, 16, false)).toBe(0.05);
  });
});

describe("the blocker's stance (T640a)", () => {
  it('braces above half, strains to a quarter, kneels below; none for an ally that never blocks', () => {
    expect(blockerPose({ blockCapacity: 2, health: 1 })).toBe('block');
    expect(blockerPose({ blockCapacity: 2, health: 0.51 })).toBe('block');
    expect(blockerPose({ blockCapacity: 2, health: 0.5 })).toBe('strain');
    expect(blockerPose({ blockCapacity: 2, health: 0.26 })).toBe('strain');
    expect(blockerPose({ blockCapacity: 2, health: 0.25 })).toBe('last');
    expect(blockerPose({ blockCapacity: 2, health: 0.05 })).toBe('last');
    expect(blockerPose({ blockCapacity: 0, health: 0.05 })).toBeNull();
    expect(blockerPose({})).toBeNull();
  });

  it("names anims Bricks's sprite draws, idle and shot, in every facing", () => {
    const anims = SPRITES.find((s) => s.id === 'ally.bricks')?.anims ?? {};
    for (const st of ['block', 'strain', 'last']) {
      for (const f of ['se', 'sw', 'ne', 'nw']) {
        expect(anims[`${st}_${f}`], `${st}_${f}`).toBeDefined();
        expect(anims[`${st}_fire_${f}`], `${st}_fire_${f}`).toBeDefined();
      }
    }
  });
});
