// R&D Command (design/progression.md § 7.3): Intel items. The branch opens after A1M1 with only
// Orbital Strike Mk II and Companion Rapport; the protocol slots appear after A1M3 (story/
// campaign.md § 4.1). Scanner Sweep (2 Intel, after A2M1) is an ability purchase: it joins
// access.ts with its ability. Refunds (Mk II at A3M2's revocation, QUILL's Rapport under C4 Purge)
// are meta's story transactions (meta-runtime.md).
import { defineUpgrade } from './define.ts';
import type { UpgradeDef } from './types.ts';
import type { AbilityId, CompanionId } from '../types.ts';
import type { CampaignMapId } from '../campaign.ts';

/** Orbital Strike Mk II: radius 1.5 → 2.0. */
export const orbital_strike_mk2 = defineUpgrade({
  id: 'orbital_strike_mk2',
  name: 'Orbital Strike Mk II',
  copy: null,
  kind: 'rnd',
  currency: 'intel',
  availableAfter: 'a1_m01',
  ranks: [
    {
      price: 2,
      grants: [{ kind: 'abilityStat', ability: 'orbital_strike', stat: 'radius', flat: 0.5 }],
    },
  ],
});

/**
 * Companion Rapport: the companion's ability cooldown −15% (keyed by ability, so Bricks's carries
 * over to inherited Suppressing Fire). Stocked once the companion's ability has been met: after
 * the map it first appears on. The other four arrive with their abilities.
 */
function rapport<const Id extends string>(
  id: Id,
  companion: CompanionId,
  ability: AbilityId,
  availableAfter: CampaignMapId,
  name: string,
): UpgradeDef<Id> {
  return defineUpgrade({
    id,
    name,
    copy: null,
    kind: 'rnd',
    currency: 'intel',
    availableAfter,
    companion,
    ranks: [{ price: 2, grants: [{ kind: 'abilityStat', ability, stat: 'cooldown', pct: -0.15 }] }],
  });
}

export const rapport_bricks = rapport(
  'rapport_bricks',
  'bricks',
  'suppressing_fire',
  'a1_m01',
  'Rapport: Sgt. Bricks',
);

/** Field Protocol slots 2 (4 Intel) and 3 (6 Intel); slot 1 comes with the shop. */
export const protocol_slots = defineUpgrade({
  id: 'protocol_slots',
  name: 'Field Protocol Slot',
  copy: null,
  kind: 'rnd',
  currency: 'intel',
  availableAfter: 'a1_m03',
  ranks: [
    { price: 4, grants: [], protocolSlots: 1 },
    { price: 6, grants: [], protocolSlots: 1 },
  ],
});
