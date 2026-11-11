// R&D Command (design/progression.md § 7.3): Intel items. The branch opens after A1M1 with only
// Orbital Strike Mk II and Companion Rapport; the protocol slots appear after A1M3 (story/
// campaign.md § 4.1). Scanner Sweep (2 Intel, after A2M1) is an ability purchase: it joins
// access.ts with its ability. Refunds (Mk II at A3M2's revocation, QUILL's Rapport under C4 Purge)
// are meta's story transactions (meta-runtime.md).
import { itemCopy } from './copy.ts';
import { defineUpgrade } from './define.ts';
import type { UpgradeDef } from './types.ts';
import type { AbilityId, CompanionId } from '../types.ts';
import type { CampaignMapId } from '../campaign.ts';

/** Orbital Strike Mk II: radius 1.5 → 2.0. */
export const orbital_strike_mk2 = defineUpgrade({
  id: 'orbital_strike_mk2',
  name: 'Orbital Strike Mk II',
  copy: itemCopy('orbital_strike_mk2'),
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
 * the map it first appears on: Bricks's after A1M1, QUILL's after A1M3 (T308), Ves'thara's after
 * A2M6 (T509), Bramble's after A3M1 (T609b). Zibzab's is a deliberate gap until M7 (progression.md
 * § 7.3). `hideUntilStocked` keeps the Rapport of an ally the player hasn't met yet off the shelf
 * until then.
 */
function rapport<const Id extends string>(
  id: Id,
  companion: CompanionId,
  ability: AbilityId,
  availableAfter: CampaignMapId,
  name: string,
  hideUntilStocked = false,
): UpgradeDef<Id> {
  return defineUpgrade({
    id,
    name,
    copy: itemCopy(id),
    kind: 'rnd',
    currency: 'intel',
    availableAfter,
    companion,
    ranks: [{ price: 2, grants: [{ kind: 'abilityStat', ability, stat: 'cooldown', pct: -0.15 }] }],
    ...(hideUntilStocked ? { hideUntilStocked } : {}),
  });
}

export const rapport_bricks = rapport(
  'rapport_bricks',
  'bricks',
  'suppressing_fire',
  'a1_m01',
  'Rapport: Sgt. Bricks',
);

/** QUILL's Rapport: Time Dilation first plays on A1M3, so it's stocked from A1M4 (T308). */
export const rapport_quill = rapport(
  'rapport_quill',
  'quill',
  'time_dilation',
  'a1_m03',
  'Rapport: QUILL',
);

/**
 * Ves'thara's Rapport: Stillness first plays on A2M6, her first map as a companion, so it's stocked
 * once A2M6 is won (T509). Sold here, in QUILL's voice, with the other Rapports; never listed
 * before then, since the row would name an ally the player hasn't met.
 */
export const rapport_vesthara = rapport(
  'rapport_vesthara',
  'vesthara',
  'stillness',
  'a2_m06',
  "Rapport: Ves'thara",
  true,
);

/**
 * Bramble's Rapport: Underfoot first plays on A3M1, her map as a companion, so it's stocked once
 * A3M1 is won (T609b). It pays on an A3M1 replay and in the finale if she walks with you (the pick
 * list, core-loop.md § 3.2). Off the shelf until then (`hideUntilStocked`): before A3M1 the row
 * would name the Act I boss as an ally.
 */
export const rapport_bramble = rapport(
  'rapport_bramble',
  'bramble',
  'underfoot',
  'a3_m01',
  'Rapport: Bramble',
  true,
);

/** Field Protocol slots 2 (4 Intel) and 3 (6 Intel); slot 1 comes with the shop. */
export const protocol_slots = defineUpgrade({
  id: 'protocol_slots',
  name: 'Field Protocol Slot',
  copy: itemCopy('protocol_slots'),
  kind: 'rnd',
  currency: 'intel',
  availableAfter: 'a1_m03',
  ranks: [
    { price: 4, grants: [], protocolSlots: 1 },
    { price: 6, grants: [], protocolSlots: 1 },
  ],
});
