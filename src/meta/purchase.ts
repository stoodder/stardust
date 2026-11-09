// Purchases at the base (design/progression.md §§ 4, 5, 7; meta-runtime.md § Purchases): R&D
// Command's and Zibzab's ranked upgrades, Field Protocol unlocks, Zibzab's Vrell tower licenses
// (the Zapcoil sample at 0, given when the shop opens: meta/issued.ts), and R&D Engineering's spec
// unlocks. Pure functions over a SaveData: `offerFor` says what an item costs and whether it can be
// bought now (with the reason it can't), `buy` returns the save after the purchase, and `shelf`
// lists one pane's offers in catalog order for its screen. The app writes the new save at once.
//
// An item can be bought when, in order: it exists; its pane is open (`isSystemUnlocked`); it is
// stocked (its `availableAfter` map is won, or the dev hook's `devUnlocks` opens its pane, which
// stocks the whole pane); its tower is owned (tune-ups, spec unlocks) and has specs (spec
// unlocks); a next rank exists (ranked upgrades; a protocol, a license, or a spec unlock is bought
// once); and the bank covers that rank's price. Owning rank n grants ranks 1..n (meta/modifiers.ts).
import { CAMPAIGN_PLAN_IDS, type CampaignMapId } from '../content/campaign.ts';
import { TOWERS } from '../content/towers/index.ts';
import type { ProtocolId, TowerFaction, TowerId } from '../content/types.ts';
import { assertNever } from '../shared/types.ts';
import {
  ENGINEERING,
  PROTOCOLS,
  TOWER_ACCESS,
  UPGRADES,
  type Access,
  type Currency,
  type EngineeringDef,
  type ModifierGrant,
  type ProtocolDef,
  type UpgradeDef,
} from '../content/upgrades/index.ts';
import { isMapWon, isSystemUnlocked, SYSTEM_UNLOCKS, type MetaSystem } from './progress.ts';
import type { SaveData } from './saveData.ts';
import { clampCurrency } from './validate.ts';

/** The base's buy panes (each is a MetaSystem). */
export type StorePane = 'rnd' | 'shop' | 'engineering';
export const STORE_PANES: readonly StorePane[] = ['rnd', 'shop', 'engineering'];

/** Something the base sells. */
export type PurchaseItem =
  /** A ranked shop or R&D upgrade (UpgradeId); buys the next rank. */
  | { readonly kind: 'upgrade'; readonly id: string }
  /** A Field Protocol unlock (ProtocolId), bought once at Zibzab's. */
  | { readonly kind: 'protocol'; readonly id: string }
  /** R&D Engineering: both tier-4 specs of an owned tower, bought once. */
  | { readonly kind: 'specs'; readonly tower: string }
  /** A Vrell tower license at Zibzab's (an access row with `how: 'license'`), bought once. */
  | { readonly kind: 'license'; readonly tower: string };

/** Why an item can't be bought now, in check order. */
export type Refusal =
  /** No such item in the catalog (or a tower outside the registry). */
  | 'unknown'
  /** Its pane hasn't opened (meta/progress.ts SYSTEM_UNLOCKS). */
  | 'pane_locked'
  /** Its `availableAfter` map isn't won yet. */
  | 'not_stocked'
  /** A tune-up or spec unlock for a tower the save doesn't own. */
  | 'not_owned'
  /** A spec unlock for a tower with no tier-4 specs. */
  | 'no_specs'
  /** Every rank owned, or the protocol, license, or spec unlock already owned. */
  | 'maxed'
  /** The bank is short of the price. */
  | 'short';

/** What the shelves read: the catalog and the towers (tests pass fixtures). */
export interface StoreCatalog {
  readonly upgrades: Readonly<Record<string, UpgradeDef>>;
  readonly protocols: Readonly<Record<string, ProtocolDef>>;
  readonly engineering: EngineeringDef;
  readonly towers: Readonly<
    Record<string, { readonly faction: TowerFaction; readonly specs?: unknown }>
  >;
  /** How each tower is obtained (content/upgrades/access.ts); its licenses are on the shelf. */
  readonly towerAccess?: Readonly<Record<string, Access>>;
}

export const LIVE_STORE: StoreCatalog = {
  upgrades: UPGRADES,
  protocols: PROTOCOLS,
  engineering: ENGINEERING,
  towers: TOWERS,
  towerAccess: TOWER_ACCESS,
};

/** One item as a pane shows it, and whether it can be bought now. */
export interface Offer {
  readonly item: PurchaseItem;
  readonly pane: StorePane;
  readonly currency: Currency;
  /** The next rank's price; the top rank's once maxed. */
  readonly price: number;
  /** Ranks owned (0 or 1 for a protocol, a license, or a spec unlock). */
  readonly owned: number;
  /** Ranks in all (1 for a protocol, a license, or a spec unlock). */
  readonly ranks: number;
  /** What the next rank adds; the top rank's once maxed. Empty for a license or a spec unlock. */
  readonly grants: readonly ModifierGrant[];
  /** Field Protocol slots the next (or top) rank adds. */
  readonly protocolSlots: number;
  /** The map whose win stocks it (null: from the start). */
  readonly availableAfter: CampaignMapId | null;
  /** The tower a tune-up, license, or spec unlock is for. */
  readonly tower: TowerId | null;
  /** Why it can't be bought now, or null when it can. */
  readonly refusal: Refusal | null;
}

/** A purchase's outcome: the new save, or why not. */
export type BuyResult =
  | { readonly ok: true; readonly save: SaveData; readonly offer: Offer }
  | { readonly ok: false; readonly reason: Refusal; readonly message: string };

function isLiveProtocol(id: string): id is ProtocolId {
  return Object.hasOwn(PROTOCOLS, id);
}

/** The pane that sells an upgrade (by its catalog kind). */
function upgradePane(def: UpgradeDef): StorePane {
  return def.kind === 'rnd' ? 'rnd' : 'shop';
}

function isTower(id: string, catalog: StoreCatalog): id is TowerId {
  return Object.hasOwn(catalog.towers, id);
}

/** A tower's license terms: its price and when it's stocked. */
interface License {
  readonly currency: Currency;
  readonly price: number;
  readonly availableAfter: CampaignMapId | null;
}

/** The license row for `tower`, if the catalog sells one. */
function licenseOf(tower: string, catalog: StoreCatalog): License | null {
  const access = catalog.towerAccess ?? {};
  if (!Object.hasOwn(access, tower)) return null;
  const a = access[tower]!;
  return a.how === 'license' ? a : null;
}

function owns(save: SaveData, tower: string): boolean {
  const towers: readonly string[] = save.unlocks.towers;
  return towers.includes(tower);
}

interface Basics {
  readonly pane: StorePane;
  readonly currency: Currency;
  readonly price: number;
  readonly owned: number;
  readonly ranks: number;
  readonly grants: readonly ModifierGrant[];
  readonly protocolSlots: number;
  readonly availableAfter: CampaignMapId | null;
  readonly tower: TowerId | null;
}

/** An item's facts before the checks, or null for an unknown item. */
function basics(save: SaveData, item: PurchaseItem, catalog: StoreCatalog): Basics | null {
  switch (item.kind) {
    case 'upgrade': {
      if (!Object.hasOwn(catalog.upgrades, item.id)) return null;
      const def = catalog.upgrades[item.id]!;
      const upgrades: Readonly<Partial<Record<string, number>>> = save.upgrades;
      const owned = Math.min(upgrades[item.id] ?? 0, def.ranks.length);
      const rank = def.ranks[Math.min(owned, def.ranks.length - 1)];
      return {
        pane: upgradePane(def),
        currency: def.currency,
        price: rank?.price ?? 0,
        owned,
        ranks: def.ranks.length,
        grants: rank?.grants ?? [],
        protocolSlots: rank?.protocolSlots ?? 0,
        availableAfter: def.availableAfter,
        tower: def.tower ?? null,
      };
    }
    case 'protocol': {
      if (!Object.hasOwn(catalog.protocols, item.id)) return null;
      const def = catalog.protocols[item.id]!;
      const protocols: readonly string[] = save.unlocks.protocols;
      return {
        pane: 'shop',
        currency: def.currency,
        price: def.price,
        owned: protocols.includes(item.id) ? 1 : 0,
        ranks: 1,
        grants: def.grants,
        protocolSlots: 0,
        availableAfter: def.availableAfter,
        tower: null,
      };
    }
    case 'specs': {
      if (!isTower(item.tower, catalog)) return null;
      const specs: readonly string[] = save.unlocks.specs;
      const { engineering } = catalog;
      return {
        pane: 'engineering',
        currency: engineering.currency,
        price: engineering.priceByFaction[catalog.towers[item.tower]!.faction],
        owned: specs.includes(item.tower) ? 1 : 0,
        ranks: 1,
        grants: [],
        protocolSlots: 0,
        availableAfter: engineering.availableAfter,
        tower: item.tower,
      };
    }
    case 'license': {
      const license = licenseOf(item.tower, catalog);
      if (!isTower(item.tower, catalog) || license === null) return null;
      return {
        pane: 'shop',
        currency: license.currency,
        price: license.price,
        owned: owns(save, item.tower) ? 1 : 0,
        ranks: 1,
        grants: [],
        protocolSlots: 0,
        // A license is stocked no earlier than the shop opens.
        availableAfter: license.availableAfter ?? SYSTEM_UNLOCKS.shop,
        tower: item.tower,
      };
    }
    default:
      return assertNever(item);
  }
}

/** Why `b` can't be bought now, in the documented order, or null. */
function refusalOf(
  save: SaveData,
  item: PurchaseItem,
  b: Basics,
  devUnlocks: readonly MetaSystem[],
  catalog: StoreCatalog,
): Refusal | null {
  if (!isSystemUnlocked(save, b.pane, devUnlocks)) return 'pane_locked';
  const stocked =
    b.availableAfter === null || isMapWon(save, b.availableAfter) || devUnlocks.includes(b.pane);
  if (!stocked) return 'not_stocked';
  // A tune-up or spec unlock needs its tower (a license is how you get it).
  if (item.kind !== 'license' && b.tower !== null && !owns(save, b.tower)) return 'not_owned';
  if (item.kind === 'specs' && catalog.towers[item.tower]?.specs === undefined) return 'no_specs';
  if (b.owned >= b.ranks) return 'maxed';
  if (save.currencies[b.currency] < b.price) return 'short';
  return null;
}

/**
 * What `item` costs now and whether it can be bought (`refusal` null), or null for an item the
 * catalog doesn't have.
 */
export function offerFor(
  save: SaveData,
  item: PurchaseItem,
  devUnlocks: readonly MetaSystem[] = [],
  catalog: StoreCatalog = LIVE_STORE,
): Offer | null {
  const b = basics(save, item, catalog);
  if (b === null) return null;
  return { item, ...b, refusal: refusalOf(save, item, b, devUnlocks, catalog) };
}

function itemLabel(item: PurchaseItem): string {
  if (item.kind === 'specs') return `specs for '${item.tower}'`;
  if (item.kind === 'license') return `the license for '${item.tower}'`;
  return `${item.kind} '${item.id}'`;
}

/** A refusal in words, for logs and tests (the screens word their own, in voice). */
export function refusalMessage(save: SaveData, item: PurchaseItem, offer: Offer | null): string {
  const what = itemLabel(item);
  if (offer === null || offer.refusal === null) {
    return offer === null ? `${what} is not in the catalog` : `${what} can be bought`;
  }
  switch (offer.refusal) {
    case 'unknown':
      return `${what} is not in the catalog`;
    case 'pane_locked':
      return `${what}: the ${offer.pane} pane is not open yet`;
    case 'not_stocked':
      return `${what} is not stocked until ${offer.availableAfter ?? 'the start'} is won`;
    case 'not_owned':
      return `${what} needs the ${offer.tower ?? 'tower'} owned`;
    case 'no_specs':
      return `${what}: the tower has no tier-4 specializations`;
    case 'maxed':
      return `${what} is already owned at its top rank`;
    case 'short':
      return `${what} costs ${offer.price} ${offer.currency}; the bank holds ${save.currencies[offer.currency]}`;
    default:
      return assertNever(offer.refusal);
  }
}

/**
 * Buys `item`: deducts its price and records it (an upgrade's next rank, a protocol, a licensed
 * tower, or a tower's spec unlock). Returns a new save (the input is untouched), or the refusal.
 */
export function buy(
  save: SaveData,
  item: PurchaseItem,
  devUnlocks: readonly MetaSystem[] = [],
  catalog: StoreCatalog = LIVE_STORE,
): BuyResult {
  const offer = offerFor(save, item, devUnlocks, catalog);
  if (offer === null || offer.refusal !== null) {
    return {
      ok: false,
      reason: offer?.refusal ?? 'unknown',
      message: refusalMessage(save, item, offer),
    };
  }
  const currencies = {
    ...save.currencies,
    [offer.currency]: clampCurrency(save.currencies[offer.currency] - offer.price),
  };
  const next: SaveData = { ...save, currencies };
  switch (item.kind) {
    case 'upgrade':
      // offerFor checked the id against the catalog, and save ids are the registry's.
      next.upgrades = { ...save.upgrades, [item.id]: offer.owned + 1 };
      break;
    case 'protocol': {
      // A save holds only live protocol ids; a fixture catalog's other ids can't be stored.
      if (!isLiveProtocol(item.id)) {
        return { ok: false, reason: 'unknown', message: refusalMessage(save, item, null) };
      }
      next.unlocks = { ...save.unlocks, protocols: [...save.unlocks.protocols, item.id] };
      break;
    }
    case 'specs':
      next.unlocks = { ...save.unlocks, specs: [...save.unlocks.specs, offer.tower!] };
      break;
    case 'license':
      next.unlocks = { ...save.unlocks, towers: [...save.unlocks.towers, offer.tower!] };
      break;
    default:
      return assertNever(item);
  }
  return { ok: true, save: next, offer: { ...offer, owned: offer.owned + 1 } };
}

/** An item's place in the campaign: its `availableAfter` map's index (−1 from the start). */
function arrival(o: Offer): number {
  return o.availableAfter === null ? -1 : CAMPAIGN_PLAN_IDS.indexOf(o.availableAfter);
}

/** The display name an upgrade or protocol sorts by (a spec unlock keeps its registry order). */
function sortName(o: Offer, catalog: StoreCatalog): string {
  if (o.item.kind === 'upgrade') return catalog.upgrades[o.item.id]?.name ?? o.item.id;
  if (o.item.kind === 'protocol') return catalog.protocols[o.item.id]?.name ?? o.item.id;
  return '';
}

/** The first rank's price (a ranked item sorts by its entry price, whatever rank is owned). */
function entryPrice(o: Offer, catalog: StoreCatalog): number {
  return o.item.kind === 'upgrade' ? (catalog.upgrades[o.item.id]?.ranks[0]?.price ?? 0) : o.price;
}

/**
 * One pane's offers, in a fixed display order: R&D Command's upgrades; the shop's Vrell licenses,
 * then global upgrades, then tune-ups, then Field Protocols; Engineering's spec unlock for each
 * registered tower with specs. Within each group, by when the item is stocked (campaign order), then by entry
 * price, then by name, so the order never depends on how a module namespace lists its exports.
 */
export function shelf(
  save: SaveData,
  pane: StorePane,
  devUnlocks: readonly MetaSystem[] = [],
  catalog: StoreCatalog = LIVE_STORE,
): Offer[] {
  const groups: PurchaseItem[][] = [];
  if (pane === 'engineering') {
    groups.push(
      Object.entries(catalog.towers)
        .filter(([, t]) => t.specs !== undefined)
        .map(([id]) => ({ kind: 'specs', tower: id })),
    );
  } else {
    const upgrades = Object.values(catalog.upgrades).filter((u) => upgradePane(u) === pane);
    if (pane === 'shop') {
      groups.push(
        Object.keys(catalog.towerAccess ?? {})
          .filter((t) => licenseOf(t, catalog) !== null)
          .map((t) => ({ kind: 'license', tower: t })),
      );
    }
    // Global upgrades before tune-ups (a tune-up names its tower).
    groups.push(
      upgrades.filter((u) => u.tower === undefined).map((u) => ({ kind: 'upgrade', id: u.id })),
    );
    groups.push(
      upgrades.filter((u) => u.tower !== undefined).map((u) => ({ kind: 'upgrade', id: u.id })),
    );
    if (pane === 'shop') {
      groups.push(Object.values(catalog.protocols).map((p) => ({ kind: 'protocol', id: p.id })));
    }
  }
  return groups.flatMap((items) =>
    items
      .flatMap((item) => {
        const o = offerFor(save, item, devUnlocks, catalog);
        return o === null ? [] : [o];
      })
      .toSorted(
        (a, b) =>
          arrival(a) - arrival(b) ||
          entryPrice(a, catalog) - entryPrice(b, catalog) ||
          sortName(a, catalog).localeCompare(sortName(b, catalog), 'en'),
      ),
  );
}

/** The map that ends the open question: A2M4, where Zibzab tells everyone (progression.md § 4). */
export const OPEN_QUESTION_UNTIL: CampaignMapId = 'a2_m04';

/**
 * Whether Zibzab's shop carries the open question, "Where does stardust come from?"
 * (progression.md § 4; act1.md § A1M3): from the shop's opening until the player asks (the
 * `asked_zibzab_early` flag) or A2M4 is reached, when he tells everyone. Asking costs nothing;
 * the app plays the question's scene, whose answer sets the flag.
 */
export function openQuestionOffered(
  save: SaveData,
  devUnlocks: readonly MetaSystem[] = [],
): boolean {
  const maps: Readonly<Record<string, unknown>> = save.campaign.maps;
  return (
    isSystemUnlocked(save, 'shop', devUnlocks) &&
    save.story.flags.asked_zibzab_early !== true &&
    !Object.hasOwn(maps, OPEN_QUESTION_UNTIL)
  );
}
