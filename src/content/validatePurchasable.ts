// [purchasable]: every campaign map's reference profile can be bought on its own timeline
// (design/progression.md § 10, "purchasable profiles"; conventions.md § Balance sims). For each
// registered map on the campaign plan, in its reference profile:
// - every tower, spec unlock, shop or R&D rank, protocol, and the Technician ability is
//   obtainable (it has a catalog or access entry) and available: its `availableAfter` map comes
//   earlier in the campaign plan; a tower registered ahead of its task (towers/index.ts
//   TOWERS_AHEAD_OF_TASK: its license is on no shelf yet) isn't, until its task lifts it (T412);
// - a tower whose access `requires` another (an attunement needs the Prism Spire owned; T566)
//   comes with that tower in the same profile;
// - shop ranks are whole numbers within the item's ranks, protocols are listed once (equipped or
//   `unequippedProtocols`: owned, not equipped, still paid for), and no more protocols are
//   equipped than the profile's slots;
// - the Stardust spent is at most what the earlier maps' first clears paid (from each map's
//   `stardust`; an unregistered map counts 0), restarting after a bank reset (A2M4's C2 Return:
//   what's owned then stays owned, and only later payouts count);
// - the Intel spent is at most `intelPerMap` (Victory only) per earlier map.
// Spending is the whole profile's price, since a profile lists everything owned by then; a
// refunded item (Mk II after A3M2) simply drops out of later profiles. Maps off the plan (test
// fixtures with their own campaign, dev maps) have no timeline and aren't checked.
//
// Par builds using only what the profile owns is validateBuilds.ts's [loadout] and [build-step].
import { CAMPAIGN_PLAN_IDS } from './campaign.ts';
import type { IdSpace, MapDef, ProfileDef, RawContent, TowerDef } from './types.ts';
import {
  ABILITY_ACCESS,
  ENGINEERING,
  PROTOCOLS,
  TOWER_ACCESS,
  UPGRADES,
  type Access,
  type Currency,
  type EngineeringDef,
  type ProtocolDef,
  type UpgradeDef,
} from './upgrades/index.ts';
import { REFERENCE_ECONOMY, type ReferenceEconomy } from './upgrades/reference.ts';
import { TOWERS_AHEAD_OF_TASK } from './towers/index.ts';
import { duplicates, type Issues } from './validateHelpers.ts';

/** The catalog and timeline the check reads; tests pass their own plan and access tables. */
export interface PurchaseRules {
  /** The campaign plan, built or not (CAMPAIGN_PLAN_IDS). */
  readonly plan: readonly string[];
  readonly upgrades: Readonly<Record<string, UpgradeDef<string, string>>>;
  readonly protocols: Readonly<Record<string, ProtocolDef<string, string>>>;
  readonly towers: Readonly<Record<string, Access<string>>>;
  readonly abilities: Readonly<Partial<Record<string, Access<string>>>>;
  readonly engineering: EngineeringDef<string>;
  readonly economy: ReferenceEconomy<string>;
  /** Towers registered ahead of their task, whose licenses no shelf sells yet. */
  readonly aheadOfTask: readonly string[];
}

export const LIVE_PURCHASE_RULES: PurchaseRules = {
  plan: CAMPAIGN_PLAN_IDS,
  upgrades: UPGRADES,
  protocols: PROTOCOLS,
  towers: TOWER_ACCESS,
  abilities: ABILITY_ACCESS,
  engineering: ENGINEERING,
  economy: REFERENCE_ECONOMY,
  aheadOfTask: TOWERS_AHEAD_OF_TASK,
};

type Purse = Record<Currency, number>;

/** Discards reports (pricing an earlier map's profile, whose problems that map reports). */
function quiet(): void {
  // Nothing to report.
}

/** What a profile costs in all, and the protocol slots it owns. */
interface Bill {
  readonly spent: Purse;
  readonly protocolSlots: number;
}

export function validatePurchasable<K extends IdSpace>(
  issues: Issues,
  raw: RawContent<K>,
  rules: PurchaseRules = LIVE_PURCHASE_RULES,
): void {
  const maps = new Map<string, MapDef<IdSpace>>(Object.entries<MapDef<IdSpace>>(raw.maps));
  const towers = new Map<string, TowerDef>(Object.entries<TowerDef>(raw.towers));
  const campaign = new Set<string>(raw.campaign);
  for (const [index, id] of rules.plan.entries()) {
    const def = maps.get(id);
    if (def === undefined || !campaign.has(id)) continue;
    const where = `maps.${id}.referenceProfile`;
    const report = (field: string, msg: string): void =>
      issues.add('purchasable', `${where}${field}`, msg);
    const bill = billOf(def.referenceProfile, index, rules, towers, report);

    // What the earlier maps paid, restarting at each bank reset.
    let stardust = 0;
    let spentBeforeReset = 0;
    let resetAfter: string | null = null;
    for (const earlier of rules.plan.slice(0, index)) {
      stardust += maps.get(earlier)?.stardust ?? 0;
      if (rules.economy.bankResetAfter.includes(earlier)) {
        const owned = maps.get(earlier)?.referenceProfile;
        const at = rules.plan.indexOf(earlier);
        spentBeforeReset =
          owned === undefined ? 0 : billOf(owned, at, rules, towers, quiet).spent.stardust;
        stardust = 0;
        resetAfter = earlier;
      }
    }
    const intel = index * rules.economy.intelPerMap;
    const stardustSpent = bill.spent.stardust - spentBeforeReset;
    if (stardustSpent > stardust) {
      report(
        '',
        `spends ${stardustSpent} Stardust${resetAfter === null ? '' : ` since the bank reset after ${resetAfter}`}; ` +
          `the maps before it pay ${stardust}`,
      );
    }
    if (bill.spent.intel > intel) {
      report('', `spends ${bill.spent.intel} Intel; Victory medals before it pay ${intel}`);
    }
    const equipped = def.referenceProfile.protocols.length;
    if (equipped > bill.protocolSlots) {
      report(
        '.protocols',
        `${equipped} protocols in ${bill.protocolSlots} slot${bill.protocolSlots === 1 ? '' : 's'}`,
      );
    }
  }
}

/** Prices a profile at plan position `index` and reports what isn't available by then. */
function billOf(
  profile: ProfileDef<IdSpace>,
  index: number,
  rules: PurchaseRules,
  towers: ReadonlyMap<string, TowerDef>,
  report: (field: string, msg: string) => void,
): Bill {
  const spent: Purse = { stardust: 0, intel: 0 };
  const pay = (currency: Currency, price: number): void => {
    spent[currency] += price;
  };
  const available = (after: string | null, field: string, what: string): void => {
    if (after === null) return;
    const at = rules.plan.indexOf(after);
    if (at < 0) report(field, `${what} is available after '${after}', which isn't on the plan`);
    else if (at >= index) {
      report(field, `${what} is available only after ${after}, so not yet on this map`);
    }
  };

  for (const t of profile.towers) {
    const access = rules.towers[t];
    if (access === undefined) {
      report('.towers', `'${t}' has no access entry (upgrades/access.ts)`);
      continue;
    }
    available(access.availableAfter, '.towers', `'${t}'`);
    if (rules.aheadOfTask.includes(t)) {
      report('.towers', `'${t}' waits for its task: no shelf sells it yet (TOWERS_AHEAD_OF_TASK)`);
    }
    if ('price' in access) {
      pay(access.currency, access.price);
      const needs = access.requires;
      if (needs !== undefined && !profile.towers.includes(needs)) {
        report('.towers', `'${t}' needs '${needs}' owned first (its access \`requires\`)`);
      }
    }
  }

  const eng = rules.engineering;
  for (const t of profile.specs) {
    available(eng.availableAfter, '.specs', `'${t}' specs (R&D Engineering)`);
    const faction = towers.get(t)?.faction;
    if (faction !== undefined) pay(eng.currency, eng.priceByFaction[faction]);
  }

  let protocolSlots = rules.economy.baseProtocolSlots;
  for (const [id, rank] of Object.entries<number | undefined>(profile.shop)) {
    const def = rules.upgrades[id];
    const field = `.shop.${id}`;
    if (def === undefined) {
      report(field, `'${id}' is not a shop or R&D upgrade`);
      continue;
    }
    if (rank === undefined || !Number.isInteger(rank) || rank < 1 || rank > def.ranks.length) {
      report(field, `rank ${String(rank)} must be a whole number from 1 to ${def.ranks.length}`);
      continue;
    }
    available(def.availableAfter, field, `'${id}'`);
    for (const r of def.ranks.slice(0, rank)) {
      pay(def.currency, r.price);
      protocolSlots += r.protocolSlots ?? 0;
    }
  }

  // Every protocol owned is paid for, equipped or not (a protocol is listed once across both).
  const owned = [...profile.protocols, ...(profile.unequippedProtocols ?? [])];
  for (const id of duplicates(owned)) {
    report('.protocols', `'${id}' is listed twice`);
  }
  for (const id of owned) {
    const def = rules.protocols[id];
    if (def === undefined) {
      report('.protocols', `'${id}' is not a Field Protocol`);
      continue;
    }
    available(def.availableAfter, '.protocols', `'${id}'`);
    pay(def.currency, def.price);
  }

  const ability = profile.technicianAbility;
  if (ability !== null) {
    const access = rules.abilities[ability];
    if (access === undefined) {
      report('.technicianAbility', `'${ability}' isn't a Technician ability the player can own`);
    } else {
      available(access.availableAfter, '.technicianAbility', `'${ability}'`);
      if ('price' in access) pay(access.currency, access.price);
    }
  }
  return { spent, protocolSlots };
}
