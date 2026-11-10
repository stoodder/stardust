// Meta → SimConfig.modifiers (meta-runtime.md § Meta; design/progression.md §§ 4, 5, 7, 9). A pure
// mapping from what the player owns and equips (upgrade ranks, Field Protocols, difficulty) to the
// sim's Modifiers. The game calls it on a save (meta/loadout.ts `saveModifiers`, which fits the
// equipped Field Protocols first); the balance harness calls the
// same `metaModifiers` on a map's reference profile and on the full-catalog profile
// (balance/profile.ts), so the harness tests the real progression math.
//
// Each catalog grant becomes one Modifier with `source: '<kind>:<id>'` (`shop:seed_money`,
// `rnd:orbital_strike_mk2`, `protocol:linked_up`); owning rank n adds the grants of ranks 1..n, one
// modifier each, and the sim's stacking formula adds them up. Difficulty arrives the same way
// (`difficulty:story`). Anything malformed (an unknown id, a rank out of range, more protocols than
// slots, a missing Specialist pick) throws a RangeError: refuse, don't ignore (D013).
import type { IdSpace } from '../content/types.ts';
import {
  PROTOCOLS,
  UPGRADES,
  type ModifierGrant,
  type ProtocolDef,
  type UpgradeDef,
} from '../content/upgrades/index.ts';
import { REFERENCE_ECONOMY } from '../content/upgrades/reference.ts';
import type { DifficultyId, Modifier } from '../sim/index.ts';

/** What the mapping reads: the ranked upgrades and Field Protocols on sale. */
export interface MetaCatalog {
  readonly upgrades: Readonly<Record<string, UpgradeDef>>;
  readonly protocols: Readonly<Record<string, ProtocolDef>>;
}

/** The live catalog (content/upgrades/). Tests pass a fixture catalog for fixture content. */
export const LIVE_CATALOG: MetaCatalog = { upgrades: UPGRADES, protocols: PROTOCOLS };

/** What a run's modifiers come from: a save's, or a balance profile's. */
export interface MetaLoadout {
  /** Owned ranks by upgrade id (SaveData.upgrades, ProfileDef.shop); 0 or absent: not owned. */
  readonly upgrades: Readonly<Partial<Record<string, number>>>;
  /** Equipped Field Protocols, in slot order. */
  readonly protocols: readonly string[];
  /** The tower each equipped `choice: 'tower'` protocol (Specialist) picked. */
  readonly picks?: Readonly<Partial<Record<string, string>>>;
  readonly difficulty: DifficultyId;
}

/**
 * Each difficulty's modifiers (design/progression.md § 9). Story: enemies −30% HP and shields,
 * +50% starting credits, core integrity 30 (a `set`, before Reinforced Core's flat ranks), and
 * countdowns +50%. Standard is the game as designed.
 */
export const DIFFICULTY_MODIFIERS: Readonly<Record<DifficultyId, readonly Modifier[]>> = {
  standard: [],
  story: [
    { kind: 'enemyStat', stat: 'hp', pct: -0.3, source: 'difficulty:story' },
    { kind: 'enemyStat', stat: 'shield', pct: -0.3, source: 'difficulty:story' },
    { kind: 'economy', stat: 'startCredits', pct: 0.5, source: 'difficulty:story' },
    { kind: 'economy', stat: 'coreIntegrity', set: 30, source: 'difficulty:story' },
    { kind: 'countdown', pct: 0.5, source: 'difficulty:story' },
  ],
};

/** A grant with its source: a sim Modifier (sim/modifierGrants.test.ts holds the shapes together). */
function sourced(g: ModifierGrant, source: string): Modifier<IdSpace> {
  return { ...g, source };
}

/**
 * Field Protocol slots `upgrades` give: the base slot (it comes with Zibzab's shop, after A1M3)
 * plus each owned rank's `protocolSlots` (R&D's slots 2 and 3).
 */
export function protocolSlots(
  upgrades: MetaLoadout['upgrades'],
  catalog: MetaCatalog = LIVE_CATALOG,
): number {
  let slots = REFERENCE_ECONOMY.baseProtocolSlots;
  for (const u of Object.values(catalog.upgrades)) {
    const rank = upgrades[u.id] ?? 0;
    for (let r = 0; r < rank && r < u.ranks.length; r++) slots += u.ranks[r]!.protocolSlots ?? 0;
  }
  return slots;
}

/** Problems with `own` against `catalog` (metaModifiers throws them). */
function loadoutErrors(own: MetaLoadout, catalog: MetaCatalog): string[] {
  const errors: string[] = [];
  for (const [id, rank] of Object.entries(own.upgrades)) {
    const def = Object.hasOwn(catalog.upgrades, id) ? catalog.upgrades[id] : undefined;
    if (def === undefined) errors.push(`unknown upgrade '${id}'`);
    else if (rank === undefined || !Number.isInteger(rank) || rank < 0 || rank > def.ranks.length) {
      errors.push(`upgrade '${id}': rank ${rank} is not in 0..${def.ranks.length}`);
    }
  }
  const seen = new Set<string>();
  for (const id of own.protocols) {
    if (!Object.hasOwn(catalog.protocols, id)) errors.push(`unknown protocol '${id}'`);
    else if (catalog.protocols[id]!.choice === 'tower' && own.picks?.[id] === undefined) {
      errors.push(`protocol '${id}' needs a tower pick`);
    }
    if (seen.has(id)) errors.push(`protocol '${id}' is equipped twice`);
    seen.add(id);
  }
  for (const id of Object.keys(own.picks ?? {})) {
    if (!seen.has(id)) errors.push(`a pick for protocol '${id}', which isn't equipped`);
    else if (catalog.protocols[id]!.choice === undefined) {
      errors.push(`protocol '${id}' takes no pick`);
    }
  }
  if (errors.length === 0) {
    const slots = protocolSlots(own.upgrades, catalog);
    if (own.protocols.length > slots) {
      errors.push(`${own.protocols.length} protocols equipped, but only ${slots} slots`);
    }
  }
  return errors;
}

/**
 * The modifiers `own` grants, in a stable order: upgrades in catalog order (each owned rank's
 * grants), then equipped protocols in slot order (a `choice: 'tower'` protocol's `'*'` tower
 * replaced by its pick), then the difficulty's. Throws a RangeError listing every problem.
 */
export function metaModifiers(
  own: MetaLoadout,
  catalog: MetaCatalog = LIVE_CATALOG,
): Modifier<IdSpace>[] {
  const errors = loadoutErrors(own, catalog);
  if (errors.length > 0) throw new RangeError(`invalid meta loadout:\n- ${errors.join('\n- ')}`);
  const out: Modifier<IdSpace>[] = [];
  for (const u of Object.values(catalog.upgrades)) {
    const rank = own.upgrades[u.id] ?? 0;
    for (let r = 0; r < rank; r++) {
      for (const g of u.ranks[r]!.grants) out.push(sourced(g, `${u.kind}:${u.id}`)); // r < ranks
    }
  }
  for (const id of own.protocols) {
    const p = catalog.protocols[id]!; // loadoutErrors checked it
    const pick = p.choice === 'tower' ? own.picks?.[id] : undefined;
    for (const g of p.grants) {
      const m = sourced(g, `protocol:${p.id}`);
      out.push(pick !== undefined && 'tower' in m && m.tower === '*' ? { ...m, tower: pick } : m);
    }
  }
  out.push(...DIFFICULTY_MODIFIERS[own.difficulty]);
  return out;
}

/** Every ranked upgrade in `catalog` at its top rank (the full-catalog profile's ranks). */
export function maxRanks(catalog: MetaCatalog = LIVE_CATALOG): Record<string, number> {
  const out: Record<string, number> = {};
  for (const u of Object.values(catalog.upgrades)) out[u.id] = u.ranks.length;
  return out;
}
