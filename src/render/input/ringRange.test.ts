// The selected or hovered tower's range ring reads the range the tower fires at (review C5): its
// links and the dark through the sim's own `bonusRangeTiles`, and the Lookout's detection radius.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import { GUN, placeTower, setup } from '../../sim/__fixtures__/combat.ts';
import { bonusRangeTiles, detectRadiusTiles } from '../../sim/index.ts';
import { ringDimmed, ringRangeTiles } from './ringRange.ts';

const LIVE = compileContent(RAW_CONTENT);

describe('the range ring', () => {
  it('is the authored range for a tower with no bonuses', () => {
    const { state } = setup();
    const t = placeTower(state, GUN, 1, 1);
    expect(ringRangeTiles(t, [])).toBe(GUN.tiers[0].attack!.rangeTiles);
    expect(ringDimmed(t)).toBe(false);
  });

  it('stacks range links and the dark exactly as targeting does, and dims in the dark', () => {
    const { state } = setup();
    const t = placeTower(state, GUN, 1, 1);
    const base = GUN.tiers[0].attack!.rangeTiles;
    t.flatRange = 0.5;
    t.pctRange = 0.1;
    expect(ringRangeTiles(t, [])).toBeCloseTo((base + 0.5) * 1.1, 9);
    t.darkRangePct = 0.15;
    expect(ringRangeTiles(t, [])).toBeCloseTo((base + 0.5) * 1.1 * 0.85, 9);
    expect(ringRangeTiles(t, [])).toBe(bonusRangeTiles(GUN.tiers[0].attack!, t));
    expect(ringDimmed(t)).toBe(true);
  });

  it('shows a tower without an attack its detection radius, never dimmed', () => {
    const { state } = setup();
    const t = placeTower(state, LIVE.towers.lookout, 1, 1);
    t.darkRangePct = 0.15; // an attack-less tower has none (review C4); the ring ignores it anyway
    expect(ringRangeTiles(t, [])).toBe(detectRadiusTiles(t, []));
    expect(ringRangeTiles(t, [])).toBeGreaterThan(0);
    expect(ringDimmed(t)).toBe(false);
  });

  it('shows nothing without a tower', () => {
    expect(ringRangeTiles(null, [])).toBe(0);
    expect(ringDimmed(null)).toBe(false);
  });
});
