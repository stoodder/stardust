import { describe, expect, it } from 'vitest';
import { FIXTURE_CONTENT, fixtureSim } from './__fixtures__/sim.ts';
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
});
