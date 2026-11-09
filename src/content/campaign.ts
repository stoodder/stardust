// Campaign map order (mirrors docs/story/campaign.md § 2, whose names and order are canonical).
// CAMPAIGN_PLAN is the whole planned campaign, built or not: shop and R&D items name the map they
// unlock after (`availableAfter`) on it, the par-purchasable check walks it for the Stardust and
// Intel paid out before each map, and the Shift board lists it. CAMPAIGN is the registered part,
// in the same order, so a map joins the campaign the moment its folder is registered.
import { MAPS } from './maps/index.ts';
import type { MapId } from './types.ts';

/** Every campaign map in order, by data id and display name (story/campaign.md § 2). */
export const CAMPAIGN_PLAN = [
  { id: 'a1_m01', name: 'Orientation Day' },
  { id: 'a1_m02', name: 'Hatching Season' },
  { id: 'a1_m03', name: 'Special Delivery' },
  { id: 'a1_m04', name: 'The Audit' },
  { id: 'a1_m05', name: 'Record Quarter' },
  { id: 'a2_m01', name: 'Rig Nine' },
  { id: 'a2_m02', name: 'The Glass Witch' },
  { id: 'a2_m03', name: 'Second Look' },
  { id: 'a2_m04', name: 'Second Harvest' },
  { id: 'a2_m05', name: 'The Long Walk' },
  { id: 'a2_m06', name: 'Sundown' },
  { id: 'a3_m01', name: 'The Preserve' },
  { id: 'a3_m02', name: 'License Revoked' },
  { id: 'a3_m03', name: 'The Gap' },
  { id: 'a3_m04', name: 'Empty Slot' },
  { id: 'a3_m05', name: 'Unsung' },
  { id: 'a3_m06', name: 'Let Them In' },
  { id: 'fin_m01', name: 'Clearing the Way' },
] as const;

/** A planned campaign map's id, whether or not its content is registered yet. */
export type CampaignMapId = (typeof CAMPAIGN_PLAN)[number]['id'];

/** The planned order, ids only. */
export const CAMPAIGN_PLAN_IDS: readonly CampaignMapId[] = CAMPAIGN_PLAN.map((m) => m.id);

function isRegistered(id: string): id is MapId {
  return Object.hasOwn(MAPS, id);
}

/** The registered campaign maps, in campaign order. */
export const CAMPAIGN: readonly MapId[] = CAMPAIGN_PLAN_IDS.filter(isRegistered);
