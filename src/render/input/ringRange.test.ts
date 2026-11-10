// The selected or hovered tower's range ring reads the range the tower fires at (review C5): its
// links and the dark through the sim's own `bonusRangeTiles`, and the Lookout's detection radius.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { bonusRangeTiles, detectRadiusTiles, type Tower } from '../../sim/index.ts';
import { ringDimmed, ringRangeTiles } from './ringRange.ts';

const LIVE = compileContent(RAW_CONTENT);
const RIVET = LIVE.towers.rivet;
const LOOKOUT = LIVE.towers.lookout;

/** A placed tower of `def` at tier 1 with no bonuses (only the fields the ring reads). */
function tower(def: typeof RIVET, over: Partial<Tower> = {}): DeepReadonly<Tower> {
  const t = {
    alive: true,
    def,
    tierDef: def.tiers[0],
    flatDamage: 0,
    flatRate: 0,
    flatRange: 0,
    pctDamage: 0,
    pctRate: 0,
    pctRange: 0,
    vsStatusMask: 0,
    vsStatusPct: 0,
    darkRangePct: 0,
    bonusDetectTiles: 0,
    ...over,
  };
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- only these fields are read
  return t as unknown as DeepReadonly<Tower>;
}

describe('the range ring', () => {
  const base = RIVET.tiers[0].attack!.rangeTiles;

  it('is the authored range for a tower with no bonuses', () => {
    const t = tower(RIVET);
    expect(ringRangeTiles(t, [])).toBe(base);
    expect(ringDimmed(t)).toBe(false);
  });

  it('stacks range links and the dark exactly as targeting does, and dims in the dark', () => {
    const linked = tower(RIVET, { flatRange: 0.5, pctRange: 0.1 });
    expect(ringRangeTiles(linked, [])).toBeCloseTo((base + 0.5) * 1.1, 9);
    const dark = tower(RIVET, { flatRange: 0.5, pctRange: 0.1, darkRangePct: 0.15 });
    expect(ringRangeTiles(dark, [])).toBeCloseTo((base + 0.5) * 1.1 * 0.85, 9);
    expect(ringRangeTiles(dark, [])).toBe(bonusRangeTiles(RIVET.tiers[0].attack!, dark));
    expect(ringDimmed(dark)).toBe(true);
  });

  it('shows a tower without an attack its detection radius, never dimmed', () => {
    const t = tower(LOOKOUT, { darkRangePct: 0.15 }); // attack-less: none (review C4); ignored
    expect(ringRangeTiles(t, [])).toBe(detectRadiusTiles(t, []));
    expect(ringRangeTiles(t, [])).toBeGreaterThan(0);
    expect(ringDimmed(t)).toBe(false);
  });

  it('shows nothing without a tower', () => {
    expect(ringRangeTiles(null, [])).toBe(0);
    expect(ringDimmed(null)).toBe(false);
  });
});
