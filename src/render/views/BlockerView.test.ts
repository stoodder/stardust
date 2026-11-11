// BlockerView's look (T605): the bar's colour by health, and its ease towards the sim's health.
import { describe, expect, it } from 'vitest';
import {
  BAR_EASE_MS,
  BAR_H,
  BAR_LIFT,
  BAR_W,
  barLayout,
  blockerBarColor,
  blockerPose,
  easeBar,
  STONE_PIP,
  type BarLayout,
} from './BlockerView.ts';
import { SPRITES } from '../../content/sprites/index.ts';
import { HEALTH_BAR_GAP_PX } from '../vfx/healthBar.ts';

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

describe('the blocker bar, polished (T630a)', () => {
  const out: BarLayout = { fillPx: 0, chipPx: 0, color: 'green.3' };

  it('drains into a chip as it falls, coloured by the sim level', () => {
    // The sim says a quarter; the bar still shows 0.6 on its way down.
    barLayout(0.25, 0.6, out);
    expect(out.fillPx).toBe(Math.round(BAR_W * 0.25));
    expect(out.fillPx + out.chipPx).toBe(Math.round(BAR_W * 0.6));
    expect(out.color).toBe('red.3');
    // Caught up: no chip. Rising: the fill follows the ease, no chip.
    expect(barLayout(0.5, 0.5, out).chipPx).toBe(0);
    barLayout(0.9, 0.7, out);
    expect([out.fillPx, out.chipPx]).toEqual([Math.round(BAR_W * 0.7), 0]);
    // Never empty while he stands.
    expect(barLayout(0, 0, out).fillPx).toBe(1);
  });

  it('carries his stone at its left end, outside the bar, in an ink rim', () => {
    for (const [dx] of STONE_PIP) expect(dx).toBeLessThan(-1);
    expect(STONE_PIP.filter(([, , c]) => c === 'pink.3').length).toBeGreaterThan(0);
    expect(STONE_PIP.filter(([, , c]) => c === 'gold.4')).toHaveLength(1);
  });

  it('sits over his head as a unit bar does, a pixel clear of his standing frame (review R3)', () => {
    const def = SPRITES.find((s) => s.id === 'ally.bricks')!;
    // His frame's top above his ground point, the baked 1 px outline included, standing and
    // straining; kneeling only drops it, so the bar holds where it is.
    const headPx = (frame: string): number => {
      const f = def.frames[frame];
      const rows: readonly string[] = Array.isArray(f) ? f : [];
      return def.anchor.y - rows.findIndex((r) => /[^.]/.test(r)) + 1;
    };
    const head = headPx('block_se_0');
    // The bar's frame's bottom row is BAR_LIFT − BAR_H px up and his top row `head` px up: one
    // clear row between (HEALTH_BAR_GAP_PX), as over a unit.
    expect(BAR_LIFT - BAR_H - head - 1).toBe(HEALTH_BAR_GAP_PX);
    for (const st of ['strain', 'last']) {
      expect(headPx(`${st}_se_0`), st).toBeLessThanOrEqual(head);
    }
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
