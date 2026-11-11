// BlockerView's look (T605): the bar's colour by health, and its ease towards the sim's health.
import { describe, expect, it } from 'vitest';
import {
  BAR_EASE_MS,
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

  it("sits just over his head as he stands braced (the sprite's top)", () => {
    const def = SPRITES.find((s) => s.id === 'ally.bricks')!;
    const frame = def.frames['block_se_0'];
    const rows: readonly string[] = Array.isArray(frame) ? frame : [];
    const head = rows.findIndex((r) => /[^.]/.test(r));
    expect(head).toBeGreaterThan(0);
    // The frame's anchor is his ground point; the bar's bottom clears his head (plus outline).
    const headPx = def.anchor.y - head + 1;
    expect(BAR_LIFT - 2).toBeGreaterThan(headPx);
    expect(BAR_LIFT - 2 - headPx).toBeLessThanOrEqual(4);
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
