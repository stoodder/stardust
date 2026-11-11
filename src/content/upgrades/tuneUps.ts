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
import { TOWERS } from '../towers/index.ts';
import type { TowerId } from '../types.ts';
import type { CampaignMapId } from '../campaign.ts';

const PRICES = [40, 80, 140] as const;

/** Rank 1 +5% damage, rank 2 −5% build and upgrade cost (specs included), rank 3 +5% range. */
function tuneUp<const Id extends string>(
  id: Id,
  tower: TowerId,
  name: string,
  availableAfter: CampaignMapId = 'a1_m03',
): UpgradeDef<Id> {
  return defineUpgrade({
    id,
    name,
    copy: itemCopy(id),
    kind: 'shop',
    currency: 'stardust',
    availableAfter,
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
  availableAfter: CampaignMapId = 'a1_m03',
): UpgradeDef<Id> {
  return defineUpgrade({
    id,
    name,
    copy: itemCopy(id),
    kind: 'shop',
    currency: 'stardust',
    availableAfter,
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

// The Aelari tune-ups (T504, T507, T508; where they're sold is T509's): Zibzab's, like every other,
// since Ves'thara takes no stardust (her Xenotech shelf deals in Intel only). Stocked after A2M5,
// with the gift and the attunements. A tune-up for a given or attuned tower stays off the shelf
// until then (meta/purchase.ts `shelf`), so the shop never names an Aelari tower early.

/** The Prism Spire's tune-up: the usual three ranks (its beam's damage, its cost, its range). */
export const tune_prism = tuneUp('tune_prism', 'prism', 'Prism Tune-up', 'a2_m05');

/** The Mindspike Obelisk's tune-up: the usual three ranks. */
export const tune_mindspike = tuneUp('tune_mindspike', 'mindspike', 'Mindspike Tune-up', 'a2_m05');

/**
 * The Seer's Lantern's tune-up: rank 1 +5% damage (its beam), rank 2 −5% cost, and rank 3 +5%
 * range **and** +5% detection radius (the `supportStat` radius grant), because its beam's range is
 * its detection radius (design/towers.md § 7): one rank widens both, so the beam never reaches
 * past what the Lantern sees.
 */
export const tune_lantern = defineUpgrade({
  id: 'tune_lantern',
  name: 'Lantern Tune-up',
  copy: itemCopy('tune_lantern'),
  kind: 'shop',
  currency: 'stardust',
  availableAfter: 'a2_m05',
  tower: 'lantern',
  ranks: [
    {
      price: PRICES[0],
      grants: [{ kind: 'towerStat', tower: 'lantern', stat: 'damage', pct: 0.05 }],
    },
    {
      price: PRICES[1],
      grants: [{ kind: 'towerCost', tower: 'lantern', tiers: 'all', pct: -0.05 }],
    },
    {
      price: PRICES[2],
      grants: [
        { kind: 'towerStat', tower: 'lantern', stat: 'range', pct: 0.05 },
        { kind: 'supportStat', tower: 'lantern', stat: 'radius', pct: 0.05 },
      ],
    },
  ],
});

/**
 * The Scuttle Den's tune-up (T604): the usual three ranks (its swarmlings' DoT, its cost, its
 * range). Zibzab's, like every tune-up; stocked after A2M6 with the gift, and off the shelf until
 * the Den is given (meta/purchase.ts `shelf`), so the shop never names it early.
 */
export const tune_burrow = tuneUp('tune_burrow', 'burrow', 'Scuttle Den Tune-up', 'a2_m06');

/**
 * The Hum Choir's tune-up (T607): a support tower's three ranks (+5% aura strength, −5% cost, +5%
 * radius: its auras' and its Lullaby's). Zibzab's; stocked after A3M1 with the earliest gift, and
 * off the shelf until the Choir is given (meta/purchase.ts `shelf`), so the shop never names it
 * early (when the Quiet Wave wasn't spared, it waits for A3M4's gift).
 */
export const tune_choir = supportTuneUp('tune_choir', 'choir', 'Hum Choir Tune-up', 'a3_m01');

/**
 * The Stasis Bloom's tune-up (T608): a support tower's three ranks, read by its field
 * (sim/systems/fields.ts): +5% field strength (its chill, the `supportStat` aura grant), −5% cost,
 * +5% field radius (the `supportStat` radius grant). Zibzab's; stocked after A3M1 with the
 * attunement, and off the shelf until then (meta/purchase.ts `shelf`: an attuned tower's rows list
 * once its attunement is stocked, owned or not).
 */
export const tune_bloom = supportTuneUp('tune_bloom', 'bloom', 'Stasis Bloom Tune-up', 'a3_m01');

/**
 * The Zibzab Tune-up (design/progression.md § 2.1, C2 Sell; "Ten percent. Honestly, eight."): +8%
 * damage for every Vrell tower, permanently: one `towerStat` grant per Vrell tower in the registry,
 * so a later Vrell tower joins by itself. Never sold (`kind: 'grant'`, price 0): A2M4's C2 Sell
 * grants it (T510's `resolveC2`).
 */
export const tune_zibzab = defineUpgrade({
  id: 'tune_zibzab',
  name: 'Zibzab Tune-up',
  copy: itemCopy('tune_zibzab'),
  kind: 'grant',
  currency: 'stardust',
  availableAfter: 'a2_m04',
  ranks: [
    {
      price: 0,
      grants: Object.values(TOWERS)
        .filter((t) => t.faction === 'vrell')
        .map((t) => ({ kind: 'towerStat', tower: t.id, stat: 'damage', pct: 0.08 }) as const),
    },
  ],
});
