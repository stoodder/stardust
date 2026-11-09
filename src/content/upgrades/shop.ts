// Zibzab's global upgrades (design/progression.md § 4.3), stocked when the shop opens after A1M3
// (story/campaign.md § 4.6). Prices are per rank, bought in order; each rank's grants add to the
// ranks below it.
import { defineUpgrade, sameEachRank } from './define.ts';

const SHOP_OPENS = 'a1_m03';

/** +1 core integrity per rank (max +3). */
export const reinforced_core = defineUpgrade({
  id: 'reinforced_core',
  name: 'Reinforced Core',
  copy: null,
  kind: 'shop',
  currency: 'stardust',
  availableAfter: SHOP_OPENS,
  ranks: sameEachRank([120, 200, 300], [{ kind: 'economy', stat: 'coreIntegrity', flat: 1 }]),
});

/** +4% starting credits per rank. */
export const seed_money = defineUpgrade({
  id: 'seed_money',
  name: 'Seed Money',
  copy: null,
  kind: 'shop',
  currency: 'stardust',
  availableAfter: SHOP_OPENS,
  ranks: sameEachRank([80, 120, 180, 260], [{ kind: 'economy', stat: 'startCredits', pct: 0.04 }]),
});

/** +25% wreckage salvage per rank. */
export const salvage_rights = defineUpgrade({
  id: 'salvage_rights',
  name: 'Salvage Rights',
  copy: null,
  kind: 'shop',
  currency: 'stardust',
  availableAfter: SHOP_OPENS,
  ranks: sameEachRank([60, 120], [{ kind: 'economy', stat: 'salvage', pct: 0.25 }]),
});

/** Sell refund 70% → 75% → 80%. */
export const resale_value = defineUpgrade({
  id: 'resale_value',
  name: 'Resale Value',
  copy: null,
  kind: 'shop',
  currency: 'stardust',
  availableAfter: SHOP_OPENS,
  ranks: sameEachRank([100, 200], [{ kind: 'sellRefund', flat: 0.05 }]),
});

/** −5% commander ability cooldowns per rank (every ability, companions' included). */
export const ability_coolant = defineUpgrade({
  id: 'ability_coolant',
  name: 'Ability Coolant',
  copy: null,
  kind: 'shop',
  currency: 'stardust',
  availableAfter: SHOP_OPENS,
  ranks: sameEachRank(
    [100, 160, 240],
    [{ kind: 'abilityStat', ability: '*', stat: 'cooldown', pct: -0.05 }],
  ),
});

/** +5% kill bounties per rank. */
export const bounty_hunter = defineUpgrade({
  id: 'bounty_hunter',
  name: 'Bounty Hunter',
  copy: null,
  kind: 'shop',
  currency: 'stardust',
  availableAfter: SHOP_OPENS,
  ranks: sameEachRank([150, 250], [{ kind: 'economy', stat: 'bounty', pct: 0.05 }]),
});
