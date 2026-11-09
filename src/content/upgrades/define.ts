// Identity helpers for catalog items: each returns its argument, so an item file gets the type's
// checking and keeps its literal id (the registries in index.ts turn ids into UpgradeId and
// ProtocolId). Shapes: types.ts.
import type { ModifierGrant, ProtocolDef, UpgradeDef, UpgradeRank } from './types.ts';

/** Defines a ranked shop or R&D upgrade. */
export function defineUpgrade<const Id extends string>(def: UpgradeDef<Id>): UpgradeDef<Id> {
  return def;
}

/** Defines a Field Protocol. */
export function defineProtocol<const Id extends string>(def: ProtocolDef<Id>): ProtocolDef<Id> {
  return def;
}

/** Ranks that each add the same grants, one per price (most global upgrades). */
export function sameEachRank(
  prices: readonly number[],
  grants: readonly ModifierGrant[],
): UpgradeRank[] {
  return prices.map((price) => ({ price, grants }));
}
