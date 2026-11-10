// How the player gets each tower and Technician ability, and from when (design/progression.md
// § 8; the schedule is story/campaign.md § 4.1–4.2), plus R&D Engineering's spec unlock prices
// (progression § 7.1). `availableAfter` is the campaign map whose win makes it available, so an
// item stocked "after A1M3" is first usable on A1M4. Every registered tower needs an entry (the
// conventions.md "Add a tower" recipe, step 7); licenses (Zapcoil's sample at 0, then Lookout,
// Crane, Harpoon) and Aelari attunements join with their towers, Scanner Sweep and System Reboot
// with their abilities.
import type { AbilityId, TowerId } from '../types.ts';
import type { Access, EngineeringDef } from './types.ts';

export const TOWER_ACCESS: Readonly<Record<TowerId, Access>> = {
  rivet: { how: 'issued', availableAfter: null },
  thumper: { how: 'issued', availableAfter: null },
  /** Issued for A1M2. */
  sprinkler: { how: 'issued', availableAfter: 'a1_m01' },
  /** Issued for A1M3 (its first use, W3). */
  skyhook: { how: 'issued', availableAfter: 'a1_m02' },
  /** Zibzab's free sample when the shop opens after A1M3 (T308 runs the license). */
  zapcoil: { how: 'license', currency: 'stardust', price: 0, availableAfter: 'a1_m03' },
  // M4 (campaign.md § 4.1–4.2). A license for a tower the sim still refuses (sim/gates.ts
  // STUB_TOWERS) is on no shelf until its task lifts the gate (meta/purchase.ts): the Lookout's is
  // live (T406); the Crane's and Harpoon's are data until T408.
  /** Stocked after A1M5 (the reference owns it from A2M1). */
  lookout: { how: 'license', currency: 'stardust', price: 150, availableAfter: 'a1_m05' },
  /** Zibzab's new shipment after A2M1 (progression.md § 4.1: Harpoon 250, Crane 200). */
  harpoon: { how: 'license', currency: 'stardust', price: 250, availableAfter: 'a2_m01' },
  crane: { how: 'license', currency: 'stardust', price: 200, availableAfter: 'a2_m01' },
  // M5 (progression.md § 7.2; campaign.md § 4.1). Stubs until their tasks (towers/index.ts
  // STUB_TOWER_TASKS), so on no shelf yet. Ves'thara gives the Prism in A2M5's debrief (T510's
  // `grantGift`); the Mindspike and the Lantern are attuned in Xenotech after A2M5 for 3 Intel each,
  // once the Prism is owned (that prerequisite is T509's).
  prism: { how: 'gift', availableAfter: 'a2_m05' },
  mindspike: { how: 'attune', currency: 'intel', price: 3, availableAfter: 'a2_m05' },
  lantern: { how: 'attune', currency: 'intel', price: 3, availableAfter: 'a2_m05' },
};

/**
 * Technician abilities (slot 1). A companion's own ability needs no entry: it comes with the
 * companion. An ability missing here can't be a reference profile's `technicianAbility`.
 */
export const ABILITY_ACCESS: Readonly<Partial<Record<AbilityId, Access>>> = {
  /** Sterling's welcome-memo gift (campaign.md § 4.2). */
  orbital_strike: { how: 'gift', availableAfter: null },
  /** Inherited in A3M4's closing scene, so a Technician ability from A3M5. */
  suppressing_fire: { how: 'gift', availableAfter: 'a3_m04' },
  /**
   * R&D Command after A2M1, 2 Intel (progression.md § 7.3): the R&D shelf sells it (meta/purchase.ts
   * `{ kind: 'ability' }`, T406), and owning it puts it in the loadout's slot-1 pool.
   */
  scanner_sweep: { how: 'rnd', currency: 'intel', price: 2, availableAfter: 'a2_m01' },
};

/** One purchase unlocks both tier-4 specs of an owned tower, once Engineering opens after A1M4. */
export const ENGINEERING: EngineeringDef = {
  currency: 'intel',
  availableAfter: 'a1_m04',
  priceByFaction: { everglow: 2, vrell: 3, aelari: 3, skitterkin: 3 },
};
