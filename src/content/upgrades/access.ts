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
  // M5 (progression.md § 7.2; campaign.md § 4.1). Ves'thara gives the Prism in A2M5's debrief
  // (meta/storyTransactions.ts `grantGift`); Xenotech, her shelf, lists it once given. The
  // Mindspike and the Lantern are attuned there after A2M5 for 3 Intel each, once the Prism is
  // owned (`requires`; meta/purchase.ts, T509).
  prism: { how: 'gift', availableAfter: 'a2_m05' },
  mindspike: {
    how: 'attune',
    currency: 'intel',
    price: 3,
    availableAfter: 'a2_m05',
    requires: 'prism',
  },
  lantern: {
    how: 'attune',
    currency: 'intel',
    price: 3,
    availableAfter: 'a2_m05',
    requires: 'prism',
  },
  // M6 (campaign.md § 4.1). The Scuttle Den is Bramble's warren's gift in A3M1's briefing, so it is
  // available for A3M1 (granted as A3M1's loadout first opens; T610). The Hum Choir is the A3M1
  // debrief's gift if `spared_quiet_wave` (Thrum's ring), else A3M4's briefing (the story
  // transaction picks; T610). A gift's tune-up and spec rows wait until it is owned (meta/
  // purchase.ts `shelf`), since a gift can come later than its `availableAfter`. The Stasis Bloom
  // is attuned in Xenotech after A3M1 for 3 Intel once the Prism is owned (progression.md § 7.2).
  burrow: { how: 'gift', availableAfter: 'a2_m06' },
  choir: { how: 'gift', availableAfter: 'a3_m01' },
  bloom: {
    how: 'attune',
    currency: 'intel',
    price: 3,
    availableAfter: 'a3_m01',
    requires: 'prism',
  },
  // M7 (campaign.md § 4.1; act3.md § A3M4–A3M6). Both are gifts given in a briefing (meta/
  // storyTransactions.ts BRIEFING_GIFTS): the Gloop Spitter in A3M4's under the warren (so from
  // A3M4) or A3M6's under the convoy; Pebble's Sproing Pad in A3M5's. Their tune-ups come with
  // their tasks (T705, T704), since each is registered ahead of its task (STUB_TOWER_TASKS).
  gloop: { how: 'gift', availableAfter: 'a3_m03' },
  sproing: { how: 'gift', availableAfter: 'a3_m04' },
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
  /** QUILL patches it in during A3M4's briefing (a briefing gift), so slot 1 holds it from A3M4. */
  system_reboot: { how: 'gift', availableAfter: 'a3_m03' },
  /** C4 Keep (A3M4's card): QUILL's own ability inherited into slot 1 from A3M5. */
  time_dilation: { how: 'gift', availableAfter: 'a3_m04' },
};

/** One purchase unlocks both tier-4 specs of an owned tower, once Engineering opens after A1M4. */
export const ENGINEERING: EngineeringDef = {
  currency: 'intel',
  availableAfter: 'a1_m04',
  priceByFaction: { everglow: 2, vrell: 3, aelari: 3, skitterkin: 3 },
};
