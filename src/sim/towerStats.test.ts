import { describe, expect, it } from 'vitest';
import { FIXTURE_CONTENT, fixtureSim } from './__fixtures__/sim.ts';
import type { IdSpace } from '../content/types.ts';
import { NO_BONUSES } from './bonuses.ts';
import type { Modifier } from './config.ts';
import { towerStats } from './towerStats.ts';

const gun = FIXTURE_CONTENT.towers.fx_gun; // T1 10 dmg 2/s range 3; T2 12 dmg (80); T3 2.5/s pierce 3 (150)
const mortar = FIXTURE_CONTENT.towers.fx_mortar; // T1 20 dmg 0.5/s range 3.5 splash 0.9; T2 30 (100)

describe('towerStats', () => {
  it('reads a tier as the sim runs it, with the next tier’s delta and cost', () => {
    expect(towerStats(gun, 1)).toEqual({
      tier: 1,
      kind: 'hitscan',
      damageType: 'kinetic',
      damage: 10,
      ratePerSec: 2,
      rangeTiles: 3,
      minRangeTiles: 0,
      splashTiles: 0,
      armorPierce: 0,
      vsStatuses: [],
      vsStatusDamage: 10,
      next: {
        tier: 2,
        cost: 80,
        damage: 2,
        ratePerSec: 0,
        rangeTiles: 0,
        splashTiles: 0,
        armorPierce: 0,
      },
    });
    expect(towerStats(gun, 2).next).toEqual({
      tier: 3,
      cost: 150,
      damage: 0,
      ratePerSec: 0.5,
      rangeTiles: 0,
      splashTiles: 0,
      armorPierce: 3,
    });
  });

  it('has no next tier at tier 3, and refuses tiers outside 1–3', () => {
    expect(towerStats(gun, 3)).toMatchObject({
      tier: 3,
      ratePerSec: 2.5,
      armorPierce: 3,
      next: null,
    });
    expect(() => towerStats(gun, 0)).toThrow(RangeError);
    expect(() => towerStats(gun, 4)).toThrow(RangeError);
  });

  it('reports splash for lobbed shells and the simulated rate', () => {
    expect(towerStats(mortar, 1)).toMatchObject({
      kind: 'lobbed',
      damage: 20,
      ratePerSec: 0.5,
      splashTiles: 0.9,
    });
    expect(towerStats(mortar, 2).next).toMatchObject({ splashTiles: 0.3, ratePerSec: 0.1 });
  });

  it('takes a live tower’s def straight from sim state', () => {
    const sim = fixtureSim();
    sim.enqueue({ type: 'build', tile: [1, 1], tower: 'fx_gun' });
    sim.applyPending();
    const t = sim.state.towers.items[0]!;
    expect(towerStats(t.def!, t.tier).damage).toBe(10);
  });

  it('applies a tower’s bonuses through the stacking formula, capped (towers.md § 4)', () => {
    const b = {
      ...NO_BONUSES,
      flatDamage: 2,
      pctDamage: 0.5,
      pctRate: 0.1,
      flatRange: 0.3,
      pctRange: 0.25,
    };
    const line = towerStats(gun, 1, b);
    // (10 + 2) × 1.5; 2/s × 1.1 = 2.2/s → a 27-tick period → 2.22/s; (3 + 0.3) × 1.25.
    expect(line).toMatchObject({ damage: 18, ratePerSec: 2.22, rangeTiles: 4.13 });
    // The next tier keeps the bonuses: (12 + 2) × 1.5 = 21.
    expect(line.next).toMatchObject({ damage: 3, ratePerSec: 0, rangeTiles: 0 });
    // +500% damage is capped at +150%.
    expect(towerStats(gun, 1, { ...NO_BONUSES, pctDamage: 5 }).damage).toBe(25);
  });

  it('shows a conditional vsStatus bonus beside the plain damage', () => {
    const line = towerStats(mortar, 1, { ...NO_BONUSES, vsStatusMask: 1, vsStatusPct: 0.2 });
    expect(line).toMatchObject({ damage: 20, vsStatuses: ['chilled'], vsStatusDamage: 24 });
  });

  it('prices the next tier with the run’s towerCost modifiers', () => {
    const mods: Modifier<IdSpace>[] = [
      { kind: 'towerCost', tower: 'fx_gun', tiers: 'all', pct: -0.05, source: 'shop:tune' },
      { kind: 'towerCost', tower: '*', tiers: 'spec', pct: -0.25, source: 'protocol:specialist' },
    ];
    expect(towerStats(gun, 1, NO_BONUSES, mods).next!.cost).toBe(76); // 80 × 0.95
    expect(towerStats(mortar, 1, NO_BONUSES, mods).next!.cost).toBe(100); // not the mortar's
  });

  it('reads a built tower’s bonuses off the tower itself (high ground: +25% range)', () => {
    const sim = fixtureSim();
    sim.enqueue({ type: 'build', tile: [3, 2], tower: 'fx_gun' }); // fx_map's high ground
    sim.applyPending();
    sim.step(); // the links system sums the tile bonus
    const t = sim.state.towers.items[0]!;
    expect(towerStats(t.def!, t.tier, t).rangeTiles).toBe(3.75);
  });
});
