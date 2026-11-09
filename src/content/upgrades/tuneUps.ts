// Tower tune-ups (design/progression.md § 4.2): three ranks per tower, bought in order, stocked
// when Zibzab's shop opens after A1M3. Every registered tower has one (catalog.test.ts checks it).
//
// Support towers (+5% aura strength, +5% radius) and the Salvage Crane (+5% income) tune other
// stats; no Modifier kind expresses those yet, so their tune-ups arrive with those towers.
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
