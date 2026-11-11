// The reference profile (design/progression.md § 10): what a Standard player owns before each
// campaign map (REFERENCE_PROFILES, the rows of story/campaign.md § 4.9) and what they have to
// spend on each map's timeline (REFERENCE_ECONOMY). Each map's builds.ts takes its row as its
// `referenceProfile`; the par-purchasable check (validatePurchasable.ts) prices it.
import type { CampaignMapId } from '../campaign.ts';
import type { FlagProfileDef, ProfileDef, UpgradeId } from '../types.ts';

export interface ReferenceEconomy<M extends string = CampaignMapId> {
  /** Intel per map won: Victory medals only (rule, § 10). */
  readonly intelPerMap: number;
  /** Field Protocol slots before R&D adds any (slot 1 comes with the shop, after A1M3). */
  readonly baseProtocolSlots: number;
  /**
   * Maps after whose results the whole Stardust bank is gone: A2M4's C2, where the reference
   * takes the weaker branch, Return (§ 2.1), so its payout and the Q3 Bonus go with it.
   */
  readonly bankResetAfter: readonly M[];
}

export const REFERENCE_ECONOMY: ReferenceEconomy = {
  intelPerMap: 1,
  baseProtocolSlots: 1,
  bankResetAfter: ['a2_m04'],
};

/** campaign.md § 4.9's Act I towers before A1M4 (the Zapcoil sample comes after A1M3). */
const A1M3: ProfileDef = {
  towers: ['rivet', 'thumper', 'sprinkler', 'skyhook'],
  specs: [],
  shop: {},
  protocols: [],
  technicianAbility: 'orbital_strike',
};
const A1M4: ProfileDef = {
  ...A1M3,
  towers: [...A1M3.towers, 'zapcoil'],
  shop: { tune_rivet: 1, tune_thumper: 1 },
  protocols: ['head_start'],
};
const A1M5: ProfileDef = {
  ...A1M4,
  specs: ['thumper'],
  shop: { ...A1M4.shop, tune_sprinkler: 1, reinforced_core: 1 },
};
/**
 * Zibzab's "new shipment" after A1M5: the Lookout Shack's license (150). A tower still ahead of its
 * task (towers/index.ts TOWERS_AHEAD_OF_TASK) fails the par-purchasable check in any row that
 * owns it, so a row goes live only with its license on the shelf.
 */
const A2M1: ProfileDef = { ...A1M5, towers: [...A1M5.towers, 'lookout'] };
const A2M2: ProfileDef = {
  ...A2M1,
  specs: [...A2M1.specs, 'sprinkler'],
  shop: { ...A2M1.shop, seed_money: 1, tune_zapcoil: 1 },
};
const A2M3: ProfileDef = { ...A2M2, shop: { ...A2M2.shop, tune_sprinkler: 2 } };
/** Zapcoil specs (Overload, 3 Intel: 7 in all) and the Zapcoil and Rivet tune 2 before A2M4. */
const A2M4: ProfileDef = {
  ...A2M3,
  specs: [...A2M3.specs, 'zapcoil'],
  shop: { ...A2M3.shop, tune_zapcoil: 2, tune_rivet: 2 },
};
/**
 * Nothing new before A2M5: the reference takes C2's Return, so the bank (A2M4's payout and the
 * Q3 Bonus) went to the Skitterkin (REFERENCE_ECONOMY.bankResetAfter).
 */
const A2M5: ProfileDef = A2M4;
/** Ves'thara's Prism Spire (a gift at A2M5's debrief) and Reinforced Core 2 before A2M6. */
const A2M6: ProfileDef = {
  ...A2M5,
  towers: [...A2M5.towers, 'prism'],
  shop: { ...A2M5.shop, reinforced_core: 2 },
};

/**
 * Bramble's warren gives the Scuttle Den in A3M1's briefing; Ability Coolant 1 and Emergency
 * Bulkhead before A3M1 (campaign.md § 4.9). A profile equips as many protocols as it has slots
 * (one: the reference buys no slot), so on A3M1's Escort it keeps Head Start, and the Bulkhead,
 * which absorbs core leaks an Escort doesn't count, goes on for A3M2's Defend. The one left off
 * is still owned (`unequippedProtocols`), so the bill prices both.
 */
const A3M1: ProfileDef = {
  ...A2M6,
  towers: [...A2M6.towers, 'burrow'],
  shop: { ...A2M6.shop, ability_coolant: 1 },
  unequippedProtocols: ['emergency_bulkhead'],
};
/** The Harpoon's license (250 Stardust) and the Mindspike's attunement (3 Intel: 10) before A3M2. */
const A3M2: ProfileDef = {
  ...A3M1,
  towers: [...A3M1.towers, 'harpoon', 'mindspike'],
  protocols: ['emergency_bulkhead'],
  unequippedProtocols: ['head_start'],
};
/**
 * After A3M2's Clean Exit: the class its par build loses (the Rivet, the most credits invested;
 * act3.md § A3M2) and Orbital Strike are gone (slot 1 holds Scanner Sweep only if bought, and the
 * reference never buys it); Seed Money 2. Holdout has no core to leak into, so Head Start is back
 * on. Content validation's `[revocation]` rule (T606) checks this profile against every class
 * A3M2's cue could take, not only the Rivet.
 */
const A3M3: ProfileDef = {
  ...A3M2,
  towers: A3M2.towers.filter((t) => t !== 'rivet'),
  shop: { ...A3M2.shop, seed_money: 2 },
  protocols: ['head_start'],
  unequippedProtocols: ['emergency_bulkhead'],
  technicianAbility: null,
};

/**
 * A3M4 (campaign.md § 4.9): the jailbreak brings the Rivet back (bought for 300 under the warren,
 * free under the convoy: `REFERENCE_STORY_PRICING`), the shelter elders give the Hum Choir in the
 * briefing (the reference cleared C1, so A3M1 didn't), and QUILL patches in System Reboot, slot 1's
 * par ability. A Defend with a core, so the Bulkhead is on (as A3M2). The warren also has its
 * Gloop Spitter (`A3M4_WARREN`).
 */
const A3M4: ProfileDef = {
  ...A3M3,
  towers: [...A3M3.towers, 'rivet', 'choir'],
  protocols: ['emergency_bulkhead'],
  unequippedProtocols: ['head_start'],
  technicianAbility: 'system_reboot',
};
const A3M4_WARREN: ProfileDef = { ...A3M4, towers: [...A3M4.towers, 'gloop'] };
/**
 * A3M5: Pebble's Sproing Pad (a briefing gift), the Stasis Bloom attuned (3 Intel: 13) and
 * Mindspike tune 1. Protect with a core, so the Bulkhead stays on. Par's slot 1 is System Reboot,
 * but C4 Rewrite takes QUILL offline and locks it, so that cell runs Suppressing Fire (inherited in
 * A3M4's mail) instead (core-loop.md § 6.11); Keep's Time Dilation and Purge's armor change no row.
 */
const A3M5: ProfileDef = {
  ...A3M4,
  towers: [...A3M4.towers, 'sproing', 'bloom'],
  shop: { ...A3M4.shop, tune_mindspike: 1 },
};
const A3M5_WARREN: ProfileDef = { ...A3M5, towers: [...A3M5.towers, 'gloop'] };
const REWRITE = { technicianAbility: 'suppressing_fire' } as const;
/**
 * A3M6: Goldie's Gloop Spitter under the convoy (the warren's came in A3M4, so both doors own it),
 * Harpoon tune 2 bought, then Zibzab's crate (opened as the briefing closes): every rank of an
 * owned Vrell tower's tune-up the save lacks, free (`REFERENCE_STORY_PRICING.giftedShop`). An
 * Escort with no core, so Head Start is back on. Par's slot 1 is Suppressing Fire, whatever C4 was.
 */
const A3M6_BOUGHT = { tune_harpoon: 2 } as const;
/** The crate's tune-ups as owned after it (each at its top rank). */
const A3M6_CRATE = { tune_zapcoil: 3, tune_lookout: 3, tune_harpoon: 3 } as const;
/** How many of each one's top ranks the crate gave (Zapcoil 2 → 3, Lookout 0 → 3, Harpoon 2 → 3). */
const A3M6_CRATE_RANKS = { tune_zapcoil: 1, tune_lookout: 3, tune_harpoon: 1 } as const;
const A3M6: ProfileDef = {
  ...A3M5,
  towers: [...A3M5.towers, 'gloop'],
  shop: { ...A3M5.shop, ...A3M6_BOUGHT, ...A3M6_CRATE },
  protocols: ['head_start'],
  unequippedProtocols: ['emergency_bulkhead'],
  technicianAbility: 'suppressing_fire',
};

/**
 * The reference profile before each campaign map (story/campaign.md § 4.9: Standard, first-clear
 * Stardust spent sensibly, one Intel per map won, the weaker branch of every flag), through the
 * last map built or being built. A map's builds.ts uses its row as `referenceProfile`.
 */
export const REFERENCE_PROFILES = {
  a1_m01: { ...A1M3, towers: ['rivet', 'thumper'] },
  a1_m02: { ...A1M3, towers: ['rivet', 'thumper', 'sprinkler'] },
  a1_m03: A1M3,
  a1_m04: A1M4,
  a1_m05: A1M5,
  a2_m01: A2M1,
  a2_m02: A2M2,
  a2_m03: A2M3,
  a2_m04: A2M4,
  a2_m05: A2M5,
  a2_m06: A2M6,
  a3_m01: A3M1,
  a3_m02: A3M2,
  a3_m03: A3M3,
  // A3M4–A3M6: the convoy's rows (the other cells are REFERENCE_VARIANTS).
  a3_m04: A3M4,
  a3_m05: A3M5,
  a3_m06: A3M6,
} as const satisfies Partial<Record<CampaignMapId, ProfileDef>>;

/**
 * The flag-variant cells of the maps whose reference differs by a story flag (campaign.md § 4.9:
 * "both C3 branches, every C4"; D146), as each map's builds.ts takes them for
 * `referenceProfileByFlag` (first match wins; a run no cell matches uses its REFERENCE_PROFILES
 * row, the convoy's). A3M4: the warren owns the Gloop. A3M5: the warren's Gloop, and Rewrite's
 * slot 1. A3M6 owns the same whichever door or answer (what differs is the bank, below).
 */
export const REFERENCE_VARIANTS = {
  a3_m04: [{ when: { door_choice: 'warren' }, profile: A3M4_WARREN }],
  a3_m05: [
    {
      when: { door_choice: 'warren', quill_choice: 'rewrite' },
      profile: { ...A3M5_WARREN, ...REWRITE },
    },
    { when: { door_choice: 'convoy', quill_choice: 'rewrite' }, profile: { ...A3M5, ...REWRITE } },
    { when: { door_choice: 'warren' }, profile: A3M5_WARREN },
  ],
  a3_m06: [],
} as const satisfies Partial<Record<CampaignMapId, readonly FlagProfileDef[]>>;

/**
 * What a reference row's bank paid, or didn't, outside the catalog the [purchasable] check prices
 * (validatePurchasable.ts): `stardust` the story took for an item no shelf lists (the jailbreak,
 * 300 under the warren, free under the convoy; still spent on every later map), and `giftedShop`,
 * how many of the top ranks of each item in the row's `shop` the story gave (Zibzab's crate),
 * owned but never paid for.
 * The [purchasable] check reads it (validatePurchasable.ts `storyPricing`, T710).
 */
export interface StoryPricing {
  readonly stardust: number;
  readonly giftedShop?: Readonly<Partial<Record<UpgradeId, number>>>;
}

/** `StoryPricing` for A3M4–A3M6 by C3's door (C4 moves no Stardust). */
export const REFERENCE_STORY_PRICING = {
  a3_m04: { convoy: { stardust: 0 }, warren: { stardust: 300 } },
  a3_m05: { convoy: { stardust: 0 }, warren: { stardust: 300 } },
  a3_m06: {
    convoy: { stardust: 0, giftedShop: A3M6_CRATE_RANKS },
    warren: { stardust: 300, giftedShop: A3M6_CRATE_RANKS },
  },
} as const satisfies Partial<
  Record<CampaignMapId, Readonly<Record<'convoy' | 'warren', StoryPricing>>>
>;
