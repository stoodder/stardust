// The reference profile's economy (design/progression.md § 10): what a Standard player has to
// spend on each map's timeline. The par-purchasable check (validatePurchasable.ts) reads it.
import type { CampaignMapId } from '../campaign.ts';

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
