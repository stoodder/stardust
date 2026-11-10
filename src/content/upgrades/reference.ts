// The reference profile (design/progression.md § 10): what a Standard player owns before each
// campaign map (REFERENCE_PROFILES, the rows of story/campaign.md § 4.9) and what they have to
// spend on each map's timeline (REFERENCE_ECONOMY). Each map's builds.ts takes its row as its
// `referenceProfile`; the par-purchasable check (validatePurchasable.ts) prices it.
import type { CampaignMapId } from '../campaign.ts';
import type { ProfileDef } from '../types.ts';

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
} as const satisfies Partial<Record<CampaignMapId, ProfileDef>>;
