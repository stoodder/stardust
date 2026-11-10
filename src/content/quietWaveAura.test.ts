// [quiet-wave-reach] and when a tower is first owned (T406, T408): the Lookout Shack's adjacency
// bonus is a range aura a pad could take, so the validator counts the best one a support tower
// beside the pad could give, but only from a tower the map's deciding run (its first win, the only
// run that sets its flags) can own. The Lookout is stocked after A1M5, so A1M5's Quiet Wave is
// judged without it; were it stocked one map earlier, two of A1M5's pads would reach the Quiet
// Wave's first tiles. The same scope holds for attack ranges (T408): the Harpoon's 4.0, stocked
// after A2M1, would reach it from two pads were it owned on A1M5's deciding run.
import { describe, expect, it } from 'vitest';
import { CAMPAIGN_PLAN_IDS } from './campaign.ts';
import { RAW_CONTENT } from './registry.ts';
import { TOWERS_AHEAD_OF_TASK } from './towers/index.ts';
import type { IdSpace, MapDef } from './types.ts';
import { DEFAULT_VALIDATION_RULES, validate } from './validate.ts';
import { Issues, gridOf } from './validateHelpers.ts';
import type { MapCtx } from './validateMap.ts';
import { TOWER_ACCESS } from './upgrades/access.ts';
import {
  rangeAuras,
  reachOnMap,
  towerReaches,
  validateQuietWaveReach,
  type AuraTower,
  type TargetedTower,
} from './validateWaves.ts';

const A1M5 = RAW_CONTENT.maps.a1_m05 as MapDef<IdSpace>;
const A1M5_INDEX = CAMPAIGN_PLAN_IDS.indexOf('a1_m05');

const plan = (id: string): number => (CAMPAIGN_PLAN_IDS as readonly string[]).indexOf(id);
/** Where the live access rows first stock each tower (−1: from the start). */
function liveStock(id: string): number {
  const access: Readonly<Record<string, { availableAfter: string | null }>> = TOWER_ACCESS;
  const after = Object.hasOwn(access, id) ? (access[id]?.availableAfter ?? null) : null;
  return after === null ? -1 : plan(after);
}

/**
 * [quiet-wave-reach] on A1M5 with `tower` first stocked after campaign map `stockedAt` (every
 * other tower where the live access rows stock it).
 */
function a1m5Errors(stockedAt: number, tower = 'lookout'): string[] {
  const towers = Object.entries<TargetedTower & AuraTower>(RAW_CONTENT.towers).filter(
    ([id]) => !TOWERS_AHEAD_OF_TASK.includes(id),
  );
  const stock = (id: string): number => (id === tower ? stockedAt : liveStock(id));
  const ctx: Pick<MapCtx, 'enemies' | 'towerReaches' | 'rangeAuras' | 'campaignIndex'> = {
    enemies: new Map(Object.entries(RAW_CONTENT.enemies)),
    towerReaches: towerReaches(towers, stock),
    rangeAuras: rangeAuras(towers, stock),
    campaignIndex: plan,
  };
  const issues = new Issues();
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the reach check reads only these fields
  validateQuietWaveReach(issues, ctx as MapCtx, A1M5, gridOf(A1M5)!, 'maps.a1_m05');
  return issues.errors;
}

describe('[quiet-wave-reach] counts range auras (T406)', () => {
  it("reads each tower's best tier-1-to-3 range aura: the Lookout's +20%, beside a pad", () => {
    const auras = rangeAuras(Object.entries<AuraTower>(RAW_CONTENT.towers), (id) =>
      id === 'lookout' ? A1M5_INDEX : -1,
    );
    expect(auras).toEqual([
      { tower: 'lookout', pct: 0.2, radiusTiles: 1.5, firstOwnedAfter: A1M5_INDEX },
    ]);
    // A fire-rate aura (Overclock Rig is a spec anyway) is no range aura.
    expect(
      rangeAuras(
        [['x', { tiers: [{ auras: [{ stat: 'rate', pct: 0.5, radiusTiles: 9 }] }] }]],
        () => -1,
      ),
    ).toEqual([]);
  });

  it('the live content passes: the Lookout is stocked only after A1M5 is won', () => {
    expect(
      validate(RAW_CONTENT, DEFAULT_VALIDATION_RULES).filter((e) => e.includes('quiet-wave-reach')),
    ).toEqual([]);
    expect(a1m5Errors(A1M5_INDEX)).toEqual([]);
  });

  it('a Lookout owned on the deciding run would let two A1M5 pads reach the Quiet Wave', () => {
    const errors = a1m5Errors(A1M5_INDEX - 1);
    // The Thumper's 3.5 beside a Lookout: (8,5) at 4.24 tiles and the gate's high ground (7,5) at 5.
    expect(errors).toHaveLength(2);
    expect(errors.join('\n')).toMatch(/\(8,5\) is 4\.24 tiles/);
    expect(errors.join('\n')).toMatch(/\(7,5\) is 5\.00 tiles/);
    // From the start (−1) counts too, and a map outside the plan counts every aura.
    expect(a1m5Errors(-1)).toHaveLength(2);
  });
});

describe('[quiet-wave-reach] counts attack ranges from the first-win run only (T408)', () => {
  it("the Harpoon's 4.0 counts from the map after its stocking map, not before", () => {
    const reaches = towerReaches(Object.entries<TargetedTower>(RAW_CONTENT.towers), liveStock);
    const harpoon = reaches.find((r) => r.tower === 'harpoon');
    expect(harpoon).toEqual({
      tower: 'harpoon',
      reach: { ground: 4, air: 4 },
      firstOwnedAfter: plan('a2_m01'),
    });
    // A1M5's deciding run owns at best the Thumper's 3.5 on the ground; A2M2's owns the Harpoon.
    expect(reachOnMap(reaches, 'ground', A1M5_INDEX)).toBe(3.5);
    expect(reachOnMap(reaches, 'ground', plan('a2_m02'))).toBe(4);
    // A map outside the plan counts every tower.
    expect(reachOnMap(reaches, 'ground', -1)).toBe(4);
  });

  it('a Harpoon owned on the deciding run would let two A1M5 pads reach the Quiet Wave', () => {
    expect(a1m5Errors(plan('a2_m01'), 'harpoon')).toEqual([]);
    const errors = a1m5Errors(A1M5_INDEX - 1, 'harpoon');
    expect(errors).toHaveLength(2);
    expect(errors.join('\n')).toMatch(/\(8,5\) is 4\.24 tiles/);
  });
});
