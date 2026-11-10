// Tower tune-ups (design/progression.md § 4.2): three ranks per tower, bought in order, stocked
// when Zibzab's shop opens after A1M3. Every registered tower has one (catalog.test.ts checks it).
//
// Support towers tune other stats: +5% aura strength (rank 1) and +5% radius (rank 3), the
// `supportStat` grant (T406; the Lookout Shack's detection and aura radii). The Salvage Crane's
// rank 1 is +5% income (`supportStat` income: its per-wave payment) and its rank 3 the usual +5%
// range, which widens its economy radius (sim/towerEconomy.ts; T408).
import { itemCopy } from './copy.ts';
import { defineUpgrade } from './define.ts';
import type { UpgradeDef } from './types.ts';
import type { TowerId } from '../types.ts';

const PRICES = [40, 80, 140] as const;

/** Rank 1 +5% damage, rank 2 −5% build and upgrade cost (specs included), rank 3 +5% range. */
function tuneUp<const Id extends string>(id: Id, tower: TowerId, name: string): UpgradeDef<Id> {
  return defineUpgrade({
    id,
    name,
    copy: itemCopy(id),
    kind: 'shop',
    currency: 'stardust',
    availableAfter: 'a1_m03',
    tower,
    ranks: [
      { price: PRICES[0], grants: [{ kind: 'towerStat', tower, stat: 'damage', pct: 0.05 }] },
      { price: PRICES[1], grants: [{ kind: 'towerCost', tower, tiers: 'all', pct: -0.05 }] },
      { price: PRICES[2], grants: [{ kind: 'towerStat', tower, stat: 'range', pct: 0.05 }] },
    ],
  });
}

export const tune_rivet = tuneUp('tune_rivet', 'rivet', 'Rivet Tune-up');
export const tune_thumper = tuneUp('tune_thumper', 'thumper', 'Thumper Tune-up');
export const tune_sprinkler = tuneUp('tune_sprinkler', 'sprinkler', 'Sprinkler Tune-up');
export const tune_skyhook = tuneUp('tune_skyhook', 'skyhook', 'Skyhook Tune-up');
export const tune_zapcoil = tuneUp('tune_zapcoil', 'zapcoil', 'Zapcoil Tune-up');

/** A support tower's tune-up: rank 1 +5% aura strength, rank 2 −5% cost, rank 3 +5% radius. */
function supportTuneUp<const Id extends string>(
  id: Id,
  tower: TowerId,
  name: string,
): UpgradeDef<Id> {
  return defineUpgrade({
    id,
    name,
    copy: itemCopy(id),
    kind: 'shop',
    currency: 'stardust',
    availableAfter: 'a1_m03',
    tower,
    ranks: [
      { price: PRICES[0], grants: [{ kind: 'supportStat', tower, stat: 'aura', pct: 0.05 }] },
      { price: PRICES[1], grants: [{ kind: 'towerCost', tower, tiers: 'all', pct: -0.05 }] },
      { price: PRICES[2], grants: [{ kind: 'supportStat', tower, stat: 'radius', pct: 0.05 }] },
    ],
  });
}

export const tune_lookout = supportTuneUp('tune_lookout', 'lookout', 'Lookout Tune-up');
export const tune_harpoon = tuneUp('tune_harpoon', 'harpoon', 'Harpoon Tune-up');

/** The Salvage Crane's tune-up: rank 1 +5% income, rank 2 −5% cost, rank 3 +5% range (radius). */
export const tune_crane = defineUpgrade({
  id: 'tune_crane',
  name: 'Crane Tune-up',
  copy: itemCopy('tune_crane'),
  kind: 'shop',
  currency: 'stardust',
  availableAfter: 'a1_m03',
  tower: 'crane',
  ranks: [
    {
      price: PRICES[0],
      grants: [{ kind: 'supportStat', tower: 'crane', stat: 'income', pct: 0.05 }],
    },
    {
      price: PRICES[1],
      grants: [{ kind: 'towerCost', tower: 'crane', tiers: 'all', pct: -0.05 }],
    },
    { price: PRICES[2], grants: [{ kind: 'towerStat', tower: 'crane', stat: 'range', pct: 0.05 }] },
  ],
});
