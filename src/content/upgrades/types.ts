// The meta catalog's shapes: what Zibzab's shop and QUILL's R&D sell, what each purchase grants,
// and when it's stocked (design/progression.md §§ 4, 5, 7, 8; the timing is story/campaign.md's).
//
// Grants are sim Modifiers without their `source`: meta adds `source: '<kind>:<id>'` when it
// turns a save or a reference profile into SimConfig.modifiers (meta-runtime.md § Meta). Content
// may not import the sim (architecture.md § 4), so ModifierGrant restates the kinds the catalog
// uses, and src/sim/modifierGrants.test.ts proves every grant is a valid `Modifier`.
import type { CampaignMapId } from '../campaign.ts';
import type { AbilityId, CompanionId, TowerFaction, TowerId, TowerStat } from '../types.ts';

export type Currency = 'stardust' | 'intel';
/**
 * Where an item is sold: Zibzab's shop (Stardust), R&D Command (Intel), R&D Engineering (Intel,
 * specializations), a Field Protocol unlock (Stardust, in the shop), or Ves'thara's Xenotech
 * (Intel, Aelari attunements: TOWER_ACCESS's `how: 'attune'` rows).
 */
export type CatalogKind = 'shop' | 'rnd' | 'engineering' | 'protocol' | 'xenotech';

/** Mirrors sim/config.ts EconomyStat. */
export type GrantEconomyStat =
  'startCredits' | 'coreIntegrity' | 'bounty' | 'earlyCallBonus' | 'salvage' | 'clearSpeed';

/**
 * A modifier as the catalog grants it: sim/config.ts's `Modifier` minus `source`, limited to the
 * kinds a purchase can grant (difficulty and veteran kinds, `enemyStat` and `countdown`, never
 * come from the catalog). `pct` is a fraction; percentages add (design/towers.md § 4).
 */
export type ModifierGrant =
  | {
      readonly kind: 'towerStat';
      readonly tower: TowerId | '*';
      readonly stat: TowerStat;
      readonly flat?: number;
      readonly pct?: number;
    }
  | {
      readonly kind: 'towerCost';
      readonly tower: TowerId | '*';
      readonly tiers: 'all' | 'spec';
      readonly pct: number;
    }
  | {
      readonly kind: 'economy';
      readonly stat: GrantEconomyStat;
      readonly set?: number;
      readonly flat?: number;
      readonly pct?: number;
    }
  | { readonly kind: 'sellRefund'; readonly flat: number }
  | {
      readonly kind: 'abilityStat';
      readonly ability: AbilityId | '*';
      readonly stat: 'cooldown' | 'radius';
      readonly flat?: number;
      readonly pct?: number;
    }
  /**
   * A support tower's tune-up (T406): aura strength or detection/aura radius, as a fraction; or
   * the Salvage Crane's per-wave income (T408).
   */
  | {
      readonly kind: 'supportStat';
      readonly tower: TowerId | '*';
      readonly stat: 'aura' | 'radius' | 'income';
      readonly pct: number;
    }
  | { readonly kind: 'linkBonus'; readonly pct: number }
  | { readonly kind: 'tileBonus'; readonly tile: 'highGround' | 'powerNode'; readonly flat: number }
  | { readonly kind: 'leakAbsorb'; readonly flat: number }
  | { readonly kind: 'firstBuildFree' }
  | { readonly kind: 'freeCast'; readonly wave: number };
export type GrantKind = ModifierGrant['kind'];

/** Display text. */
interface ItemText {
  readonly name: string;
  /**
   * The seller's in-voice line, ≤ 100 chars: Zibzab's in the shop, QUILL's in R&D (Ves'thara's in
   * Xenotech, keyed `attune_<tower>`). The text's home is copy.ts (`itemCopy`); null only for an
   * item that has none yet (copy.test.ts forbids that).
   */
  readonly copy: string | null;
}

/** One rank of an upgrade: its price and what it adds on top of the ranks below it. */
export interface UpgradeRank {
  readonly price: number;
  readonly grants: readonly ModifierGrant[];
  /** Field Protocol slots this rank adds (R&D Command's slots 2 and 3). */
  readonly protocolSlots?: number;
}

/**
 * A ranked permanent upgrade (`UpgradeId`): tune-ups and global upgrades in the shop, Command
 * items in R&D, and `grant` items no shelf sells (a story transaction grants them: the C2 Zibzab
 * Tune-up, T510). The save stores the owned rank (SaveData.upgrades); ranks are bought in order,
 * and owning rank n grants ranks 1..n.
 */
export interface UpgradeDef<
  Id extends string = string,
  M extends string = CampaignMapId,
> extends ItemText {
  readonly id: Id;
  readonly kind: 'shop' | 'rnd' | 'grant';
  readonly currency: Currency;
  /** Stocked once this campaign map is won; null from the start. */
  readonly availableAfter: M | null;
  readonly ranks: readonly UpgradeRank[];
  /** A tune-up's tower (one tune-up per tower). */
  readonly tower?: TowerId;
  /** A Companion Rapport's companion. */
  readonly companion?: CompanionId;
  /**
   * Kept off every shelf until it's stocked, instead of listed greyed out with "Arrives after
   * {map}": an item that would name an ally the player hasn't met yet (Ves'thara's Rapport).
   * meta/purchase.ts `shelf`.
   */
  readonly hideUntilStocked?: boolean;
}

/**
 * A Field Protocol (`ProtocolId`): a loadout perk unlocked once with Stardust, equipped before a
 * map in one of the player's slots (design/progression.md § 5).
 */
export interface ProtocolDef<
  Id extends string = string,
  M extends string = CampaignMapId,
> extends ItemText {
  readonly id: Id;
  readonly currency: 'stardust';
  readonly price: number;
  readonly availableAfter: M | null;
  readonly grants: readonly ModifierGrant[];
  /**
   * The player picks a tower when equipping it (Specialist); meta replaces the grants' `'*'`
   * tower with the pick.
   */
  readonly choice?: 'tower';
}

/** How a tower or ability is obtained, and from when (design/progression.md § 8). */
export type Access<M extends string = CampaignMapId> = {
  /** Owned once this campaign map is won; null from the start. */
  readonly availableAfter: M | null;
} & (
  | { readonly how: 'issued' | 'gift' }
  | {
      /** Bought: a Vrell license (Stardust; Zapcoil's sample costs 0) or an attunement (Intel). */
      readonly how: 'license' | 'attune' | 'rnd';
      readonly currency: Currency;
      readonly price: number;
      /**
       * An attunement's prerequisite: the tower the save must own before Xenotech sells it (the
       * Prism Spire, design/progression.md § 7.2).
       */
      readonly requires?: TowerId;
    }
);

/** R&D Engineering: one purchase unlocks both tier-4 specs of an owned tower (progression § 7.1). */
export interface EngineeringDef<M extends string = CampaignMapId> {
  readonly currency: 'intel';
  readonly availableAfter: M;
  readonly priceByFaction: Readonly<Record<TowerFaction, number>>;
}
