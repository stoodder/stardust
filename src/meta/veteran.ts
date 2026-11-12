// Veteran modifiers (design/progression.md § 6; T800b's seam, T860's rules): the ids, their
// Stardust bonuses and copy, which ones a replay offers, what each does to the run's SimConfig, the
// save's record per map (`SaveData.veteran`), and the Veteran medal. Pure: the app's briefing
// picker writes the record (`withVeteranPick`), app/battleSetup.ts applies it (`veteranConfig`),
// and run end (meta/runEnd.ts) pays the bonus and the medal from the mods the run's config carries
// (`veteranModsOf`).
//
// Rules:
// - **Unlock on Victory:** a map offers them once it is won (`isMapWon`); only a replay carries any.
// - **Stack, bonuses add:** each picked modifier adds its bonus once (`veteranBonusPct`).
// - **Only what bites:** a modifier that would change nothing on this map for this save is offered
//   dimmed and never applied, so no bonus is free (`veteranOffers`): Glass Core on a map with no
//   core (an Escort, a Holdout), Short-Handed with 3 tower types or fewer to bring, Radio Silence
//   with no ability in either slot, No Protocols with no protocol owned.
// - **The Veteran medal:** a replay victory carrying +100% or more, from wave 1 (a checkpoint retry
//   forfeits it as it does Perfect Core and the Challenge), +1 Intel the first time.
import type { CompanionId, MapId, ObjectiveKind } from '../content/types.ts';
import type { IdSpace } from '../content/types.ts';
import {
  PROTOCOL_SOURCE_PREFIX,
  type Modifier,
  type SimConfig,
  type SimRule,
} from '../sim/index.ts';
import { assertNever } from '../shared/types.ts';
import { abilityPool, towerPool } from './pools.ts';
import { isMapWon } from './progress.ts';
import type { SaveData, VeteranRecord } from './saveData.ts';

/** The eight modifiers, in progression.md § 6's order. */
export const VETERAN_MODIFIER_IDS = [
  'hardened_hides',
  'double_time',
  'lean_budget',
  'glass_core',
  'radio_silence',
  'short_handed',
  'no_protocols',
  'rush_hour',
] as const;
export type VeteranModifierId = (typeof VETERAN_MODIFIER_IDS)[number];

/** Each modifier's Stardust bonus on a replay victory, in percent (bonuses add). */
export const VETERAN_BONUS_PCT: Readonly<Record<VeteranModifierId, number>> = {
  hardened_hides: 40,
  double_time: 30,
  lean_budget: 30,
  glass_core: 40,
  radio_silence: 25,
  short_handed: 40,
  no_protocols: 15,
  rush_hour: 20,
};

/** A replay victory at this total bonus or more earns the Veteran medal (+1 Intel, once). */
export const VETERAN_MEDAL_PCT = 100;

/** The Veteran medal's id in a map record's `medals` (a fourth beside Victory, Perfect, Challenge). */
export const VETERAN_MEDAL_ID = 'veteran';

/** The Veteran medal's name on Results and in the briefing's picker. */
export const VETERAN_MEDAL_NAME = 'Veteran';

/** Short-Handed's limit: tower types a run may bring. */
export const SHORT_HANDED_MAX = 3;

/** Glass Core's integrity (`set`; Reinforced Core's ranks still add, as they do on Story). */
export const GLASS_CORE_INTEGRITY = 5;

/** The source prefix of every veteran modifier and rule in a SimConfig (`'veteran:glass_core'`). */
export const VETERAN_SOURCE_PREFIX = 'veteran:';

/** The total Stardust bonus of `mods`, in percent (each counted once). */
export function veteranBonusPct(mods: readonly VeteranModifierId[]): number {
  return [...new Set(mods)].reduce((sum, m) => sum + VETERAN_BONUS_PCT[m], 0);
}

/** The most bonus a run can carry: every modifier at once (240%). */
export const VETERAN_MAX_PCT = veteranBonusPct(VETERAN_MODIFIER_IDS);

/** True when `id` names a veteran modifier. */
export function isVeteranModifierId(id: string): id is VeteranModifierId {
  return (VETERAN_MODIFIER_IDS as readonly string[]).includes(id);
}

/** `mods` in table order, each once. */
export function inTableOrder(mods: readonly string[]): VeteranModifierId[] {
  return VETERAN_MODIFIER_IDS.filter((m) => mods.includes(m));
}

/** One modifier's copy in the briefing's picker. */
export interface VeteranCopy {
  readonly name: string;
  /** The toggle's one short line. */
  readonly short: string;
  /** The whole effect in plain words (shown on focus or hover, and to screen readers). */
  readonly effect: string;
  /** A quip beside it on focus or hover. */
  readonly quip: string;
}

/**
 * The picker's copy (style-guide § 6's UI voice: playful, never scolding): each toggle's name and
 * short line, and on focus or hover the whole effect and a quip.
 */
export const VETERAN_COPY: Readonly<Record<VeteranModifierId, VeteranCopy>> = {
  hardened_hides: {
    name: 'Hardened Hides',
    short: 'Tough foes',
    effect: 'Enemies +40% HP and shields',
    quip: 'They have been eating their vegetables.',
  },
  double_time: {
    name: 'Double Time',
    short: 'Fast foes',
    effect: 'Enemies +20% speed',
    quip: 'Somebody told them about the snacks.',
  },
  lean_budget: {
    name: 'Lean Budget',
    short: 'Fewer credits',
    effect: '−30% starting credits, −20% bounties',
    quip: 'Accounting found the coffee fund.',
  },
  glass_core: {
    name: 'Glass Core',
    short: 'Core integrity 5',
    effect: 'Core integrity 5',
    quip: 'Handle with care. Then with more care.',
  },
  radio_silence: {
    name: 'Radio Silence',
    short: 'No abilities',
    effect: 'No commander abilities',
    quip: 'Comms are down. You are the cavalry now.',
  },
  short_handed: {
    name: 'Short-Handed',
    short: '3 tower types',
    effect: '3 tower types, not 4',
    quip: 'Your first three picks deploy. The fourth is on break.',
  },
  no_protocols: {
    name: 'No Protocols',
    short: 'Protocols off',
    effect: 'Field Protocols off',
    quip: 'Strictly by the book. A very short book.',
  },
  rush_hour: {
    name: 'Rush Hour',
    short: 'Short countdowns',
    effect: 'Wave countdowns −50%',
    quip: 'Everyone is late for something.',
  },
};

/** Why a modifier is dimmed on a map (`VeteranOffer.why`). */
export const VETERAN_DIM_TEXT = {
  no_core: 'No core on this shift',
  few_towers: 'Only 3 tower types to bring',
  no_abilities: 'No abilities to silence',
  no_protocols: 'No Field Protocols owned',
} as const;

/** One modifier as a map offers it to a save. */
export interface VeteranOffer {
  readonly id: VeteranModifierId;
  /** False: dimmed, never applied (it would change nothing here). */
  readonly available: boolean;
  /** Why it's dimmed (VETERAN_DIM_TEXT), or null when available. */
  readonly why: string | null;
}

/** What `veteranOffers` reads of a map. */
export interface VeteranMap {
  readonly id: string;
  readonly objective: ObjectiveKind;
  readonly companion:
    | { readonly id: CompanionId; readonly state: 'present' | 'absent' }
    | { readonly pick: readonly CompanionId[] }
    | null;
}

/** Objectives with no core to protect (D143 R9; app/loadout.ts's CORELESS). */
const CORELESS: ReadonlySet<ObjectiveKind> = new Set(['escort', 'holdout']);

/** Why `id` would change nothing on `map` for `save`, or null when it bites. */
function dimmed(id: VeteranModifierId, save: SaveData, map: VeteranMap): string | null {
  switch (id) {
    case 'glass_core':
      return CORELESS.has(map.objective) ? VETERAN_DIM_TEXT.no_core : null;
    case 'short_handed':
      return towerPool(save).length > SHORT_HANDED_MAX ? null : VETERAN_DIM_TEXT.few_towers;
    case 'radio_silence': {
      const c = map.companion;
      const companion = c !== null && ('pick' in c || c.state === 'present');
      return companion || abilityPool(save).length > 0 ? null : VETERAN_DIM_TEXT.no_abilities;
    }
    case 'no_protocols':
      return save.unlocks.protocols.length > 0 ? null : VETERAN_DIM_TEXT.no_protocols;
    case 'hardened_hides':
    case 'double_time':
    case 'lean_budget':
    case 'rush_hour':
      return null; // they bite on every map
    default:
      return assertNever(id);
  }
}

/**
 * The modifiers `map` offers `save`, in table order, or an empty list when it offers none (the map
 * isn't won yet: modifiers unlock on Victory).
 */
export function veteranOffers(save: SaveData, map: VeteranMap): VeteranOffer[] {
  if (!isMapWon(save, map.id)) return [];
  return VETERAN_MODIFIER_IDS.map((id) => {
    const why = dimmed(id, save, map);
    return { id, available: why === null, why };
  });
}

/** The save's record on `mapId`, or null. */
export function veteranRecord(save: SaveData, mapId: string): VeteranRecord | null {
  const records: Readonly<Record<string, VeteranRecord | undefined>> = save.veteran ?? {};
  return Object.hasOwn(records, mapId) ? (records[mapId] ?? null) : null;
}

/**
 * The modifiers a run on `map` carries for `save`: the record's picks the map offers now (none
 * before the map is won, or on a modifier dimmed here).
 */
export function activeVeteranMods(save: SaveData, map: VeteranMap): VeteranModifierId[] {
  const picked = veteranRecord(save, map.id)?.mods ?? [];
  if (picked.length === 0) return [];
  const offers = veteranOffers(save, map);
  return inTableOrder(picked).filter((m) => offers.some((o) => o.id === m && o.available));
}

/**
 * `save` with `mods` as `mapId`'s picks (the briefing's picker; table order, each once). The best
 * bonus on file stays. Throws a RangeError for a map not won (a caller bug: the picker shows only
 * on a replay). Returns `save` itself when nothing changes.
 */
export function withVeteranPick(
  save: SaveData,
  mapId: MapId,
  mods: readonly VeteranModifierId[],
): SaveData {
  if (!isMapWon(save, mapId)) throw new RangeError(`veteran: '${mapId}' is not won yet`);
  const old = veteranRecord(save, mapId);
  const next = inTableOrder(mods);
  if (old === null && next.length === 0) return save;
  if (old !== null && old.mods.join() === next.join()) return save;
  return {
    ...save,
    veteran: { ...save.veteran, [mapId]: { mods: next, best: old?.best ?? 0 } },
  };
}

/** One modifier's sim grants: its modifiers and its run rules. */
export function veteranGrants(id: VeteranModifierId): {
  readonly modifiers: readonly Modifier[];
  readonly rules: readonly SimRule[];
} {
  const source = `${VETERAN_SOURCE_PREFIX}${id}`;
  switch (id) {
    case 'hardened_hides':
      return {
        modifiers: [
          { kind: 'enemyStat', stat: 'hp', pct: 0.4, source },
          { kind: 'enemyStat', stat: 'shield', pct: 0.4, source },
        ],
        rules: [],
      };
    case 'double_time':
      return { modifiers: [{ kind: 'enemyStat', stat: 'speed', pct: 0.2, source }], rules: [] };
    case 'lean_budget':
      return {
        modifiers: [
          { kind: 'economy', stat: 'startCredits', pct: -0.3, source },
          { kind: 'economy', stat: 'bounty', pct: -0.2, source },
        ],
        rules: [],
      };
    case 'glass_core':
      return {
        modifiers: [{ kind: 'economy', stat: 'coreIntegrity', set: GLASS_CORE_INTEGRITY, source }],
        rules: [],
      };
    case 'radio_silence':
      return { modifiers: [], rules: [{ kind: 'noAbilities', source }] };
    case 'short_handed':
      return { modifiers: [], rules: [{ kind: 'maxTowerTypes', max: SHORT_HANDED_MAX, source }] };
    case 'no_protocols':
      return { modifiers: [], rules: [{ kind: 'noProtocols', source }] };
    case 'rush_hour':
      return { modifiers: [{ kind: 'countdown', pct: -0.5, source }], rules: [] };
    default:
      return assertNever(id);
  }
}

/**
 * `cfg` under `mods` (pure; none: `cfg` itself). Each modifier's grants join the config; Radio
 * Silence empties slot 1 (the companion's slot stays, dark under the rule); Short-Handed keeps the
 * loadout's first three towers in build-slot order (and only their spec unlocks); No Protocols
 * drops every Field Protocol's modifiers.
 */
export function veteranConfig(
  cfg: SimConfig<IdSpace>,
  mods: readonly VeteranModifierId[],
): SimConfig<IdSpace> {
  const ids = inTableOrder(mods);
  if (ids.length === 0) return cfg;
  const grants = ids.map(veteranGrants);
  let modifiers = [...cfg.modifiers, ...grants.flatMap((g) => g.modifiers)];
  const rules = [...(cfg.rules ?? []), ...grants.flatMap((g) => g.rules)];
  if (ids.includes('no_protocols')) {
    modifiers = modifiers.filter((m) => !m.source.startsWith(PROTOCOL_SOURCE_PREFIX));
  }
  const loadout = ids.includes('short_handed')
    ? cfg.loadout.slice(0, SHORT_HANDED_MAX)
    : cfg.loadout;
  return {
    ...cfg,
    modifiers,
    rules,
    loadout,
    specsUnlocked: cfg.specsUnlocked.filter((t) => loadout.includes(t)),
    abilities: ids.includes('radio_silence') ? { ...cfg.abilities, slot1: null } : cfg.abilities,
  };
}

/** The veteran modifiers a config carries (from its sources), in table order. */
export function veteranModsOf(cfg: {
  readonly modifiers: readonly { readonly source: string }[];
  readonly rules?: readonly SimRule[] | undefined;
}): VeteranModifierId[] {
  const ids = [...cfg.modifiers, ...(cfg.rules ?? [])]
    .map((m) => m.source)
    .filter((s) => s.startsWith(VETERAN_SOURCE_PREFIX))
    .map((s) => s.slice(VETERAN_SOURCE_PREFIX.length));
  return inTableOrder(ids);
}

/** True when `mods` earn the Veteran medal on a win (+100% or more). */
export function earnsVeteranMedal(mods: readonly VeteranModifierId[]): boolean {
  return veteranBonusPct(mods) >= VETERAN_MEDAL_PCT;
}

/** The campaign medals in `medals` (Victory, Perfect, Challenge): the pips' count, of 3. */
export function campaignMedalCount(medals: readonly string[]): number {
  return medals.filter((m) => m !== VETERAN_MEDAL_ID).length;
}

/** True when `medals` hold the Veteran medal. */
export function hasVeteranMedal(medals: readonly string[]): boolean {
  return medals.includes(VETERAN_MEDAL_ID);
}
