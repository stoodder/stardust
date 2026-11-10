// The loadout (design/core-loop.md § 1, T201): what a save may bring into a map, when the loadout
// screen is shown (the skip rule), the presets it remembers (SaveData.loadouts), and what a pick
// answers on a map (its counters and synergy links). Pure: the app builds the screen's view from
// these, and app/battleSetup.ts asks `resolveLoadout` for the battle's towers and ability and
// `equippedProtocols` for its Field Protocols (T308: equipped save-wide, swapped freely between
// maps; progression.md § 5). The finale's companion pick joins the screen with the finale (M5).
import { answerScope, answersCarried, type ReachedTower } from '../content/counterAnswers.ts';
import {
  COUNTER_ANSWERS,
  MAX_LOADOUT,
  MAX_TIER_BEFORE_SPEC,
  TRAIT_COUNTER,
} from '../content/rules.ts';
import type {
  AbilityId,
  Act,
  Body,
  CounterId,
  IdSpace,
  Layer,
  MapId,
  ProtocolId,
  TowerId,
  ThreatIntelId,
  Trait,
} from '../content/types.ts';
import { TOWERS } from '../content/towers/index.ts';
import { PROTOCOLS } from '../content/upgrades/index.ts';
import type { Modifier } from '../sim/index.ts';
import { metaModifiers } from './modifiers.ts';
import { abilityPool, protocolPool, protocolSlotCount, towerPool } from './pools.ts';
import { isSystemUnlocked, type MetaSystem } from './progress.ts';
import type { LoadoutPreset, SaveData } from './saveData.ts';

/**
 * What the loadout screen offers: the save's unrevoked towers and Technician abilities. The pick
 * rules are generic over the id types, so tests can try pools the registries can't fill yet.
 */
export interface LoadoutPools<T extends string = TowerId, A extends string = AbilityId> {
  readonly towers: readonly T[];
  readonly abilities: readonly A[];
  /** The Field Protocols owned (none when absent). */
  readonly protocols?: readonly string[];
  /** The save's Field Protocol slots: 0 before Zibzab's shop opens (none when absent). */
  readonly protocolSlots?: number;
}

/**
 * A pick on the loadout screen (or a stored preset): towers in build-slot order, and slot 1. The
 * screen's pick also carries the Field Protocols to equip (save-wide, not part of the preset);
 * without them, the equipped protocols stay as they are.
 */
export interface LoadoutPick<T extends string = TowerId, A extends string = AbilityId> {
  readonly towers: readonly T[];
  readonly ability: A | null;
  readonly equip?: ProtocolPick;
}

/** Field Protocols to equip, in slot order, and the tower each `choice: 'tower'` one picked. */
export interface ProtocolPick {
  readonly equipped: readonly ProtocolId[];
  readonly picks: Readonly<Partial<Record<ProtocolId, TowerId>>>;
}

export function loadoutPools(save: SaveData, devUnlocks: readonly MetaSystem[] = []): LoadoutPools {
  return {
    towers: towerPool(save),
    abilities: abilityPool(save),
    protocols: protocolPool(save),
    protocolSlots: protocolSlotCount(save, devUnlocks),
  };
}

/**
 * The skip rule's "a choice to make" (core-loop.md § 1): more tower types than fit, more than one
 * Technician ability, or a Field Protocol to equip (a slot and an owned protocol). The companion
 * counts once the finale's pick list exists (M5).
 */
export function hasLoadoutChoice(pools: LoadoutPools<string, string>): boolean {
  return (
    pools.towers.length > MAX_LOADOUT || pools.abilities.length > 1 || hasProtocolChoice(pools)
  );
}

/** Whether there's a Field Protocol to equip: a slot, and a protocol owned to fill it. */
export function hasProtocolChoice(pools: LoadoutPools<string, string>): boolean {
  return (pools.protocolSlots ?? 0) > 0 && (pools.protocols?.length ?? 0) > 0;
}

/**
 * Whether the loadout screen comes before a map: the system is open (A1M3 won, first shown at
 * A1M4; or the dev hook's `devUnlocks`) and there is a choice to make. Otherwise the map starts
 * with everything owned.
 */
export function showsLoadoutScreen(
  save: SaveData,
  devUnlocks: readonly MetaSystem[] = [],
): boolean {
  return (
    isSystemUnlocked(save, 'loadout', devUnlocks) &&
    hasLoadoutChoice(loadoutPools(save, devUnlocks))
  );
}

/** Why a pick can't be locked in (empty when it can): the CLAUDE.md 4-tower rule and the pools. */
export function pickProblems<T extends string, A extends string>(
  pick: LoadoutPick<T, A>,
  pools: LoadoutPools<T, A>,
): string[] {
  const out: string[] = [];
  if (pick.towers.length === 0) out.push('pick at least one tower');
  if (pick.towers.length > MAX_LOADOUT) {
    out.push(`at most ${MAX_LOADOUT} towers, got ${pick.towers.length}`);
  }
  const seen = new Set<T>();
  for (const t of pick.towers) {
    if (seen.has(t)) out.push(`'${t}' is picked twice`);
    seen.add(t);
    if (!pools.towers.includes(t)) out.push(`'${t}' is not in the tower pool`);
  }
  if (pick.ability === null) {
    if (pools.abilities.length > 0) out.push('pick a Technician ability');
  } else if (!pools.abilities.includes(pick.ability)) {
    out.push(`'${pick.ability}' is not in the ability pool`);
  }
  return out;
}

export function isValidPick<T extends string, A extends string>(
  pick: LoadoutPick<T, A>,
  pools: LoadoutPools<T, A>,
): boolean {
  return pickProblems(pick, pools).length === 0;
}

/**
 * A pick cut down to what the pools hold now (a preset can predate a revocation): pool towers
 * only, each once, at most MAX_LOADOUT; the ability if it's still in the pool, else the first one.
 */
export function fitPick<T extends string, A extends string>(
  pick: LoadoutPick<T, A>,
  pools: LoadoutPools<T, A>,
): { towers: T[]; ability: A | null } {
  const towers = [...new Set(pick.towers)]
    .filter((t) => pools.towers.includes(t))
    .slice(0, MAX_LOADOUT);
  const ability =
    pick.ability !== null && pools.abilities.includes(pick.ability)
      ? pick.ability
      : (pools.abilities[0] ?? null);
  return { towers, ability };
}

/** `mapId`'s preset (any map id: a dev battle's map simply has none). */
function presetOn(save: SaveData, mapId: string): LoadoutPreset | undefined {
  const byMap: Readonly<Record<string, LoadoutPreset | undefined>> = save.loadouts.byMap;
  return Object.hasOwn(byMap, mapId) ? byMap[mapId] : undefined;
}

/**
 * Where the screen starts on `mapId`: this map's preset, else the last one locked in anywhere,
 * else `fallback` (app/battleSetup.ts's default: the par build's towers first), fitted to the pools.
 */
export function initialPick(save: SaveData, mapId: string, fallback: LoadoutPick): LoadoutPick {
  const pools = loadoutPools(save);
  for (const p of [presetOn(save, mapId), save.loadouts.last, fallback]) {
    if (p === undefined || p === null) continue;
    const fitted = fitPick(p, pools);
    if (fitted.towers.length > 0) return fitted;
  }
  return fitPick(fallback, pools);
}

/**
 * The battle's towers and ability on `mapId`: the map's preset when the save has a loadout choice
 * and the preset still fits the pools; otherwise `fallback` (everything owned when there's no
 * choice, the skip rule). The screen writes the preset before the battle starts, so a retry
 * keeps it too.
 */
export function resolveLoadout(save: SaveData, mapId: string, fallback: LoadoutPick): LoadoutPick {
  const pools = loadoutPools(save);
  const preset = presetOn(save, mapId);
  if (preset === undefined || !hasLoadoutChoice(pools) || !isValidPick(preset, pools)) {
    return fallback;
  }
  return preset;
}

/**
 * The save with `pick` remembered as `mapId`'s preset and as the last one, and its Field
 * Protocols (when it carries them) equipped save-wide. Throws a RangeError on a pick the pools
 * don't allow (a caller bug: the screen only offers valid picks).
 */
export function withPreset(
  save: SaveData,
  mapId: MapId,
  pick: LoadoutPick,
  devUnlocks: readonly MetaSystem[] = [],
): SaveData {
  const problems = pickProblems(pick, loadoutPools(save, devUnlocks));
  if (problems.length > 0) throw new RangeError(`loadout: ${problems.join('; ')}`);
  const preset = (): LoadoutPreset => ({ towers: [...pick.towers], ability: pick.ability });
  const next: SaveData = {
    ...save,
    loadouts: {
      ...save.loadouts,
      last: preset(),
      byMap: { ...save.loadouts.byMap, [mapId]: preset() },
    },
  };
  return pick.equip === undefined ? next : withProtocols(next, pick.equip, devUnlocks);
}

/**
 * Toggles a tower in a pick: a picked one leaves (the rest move up a build slot), an unpicked one
 * joins at the end while there's room. Unchanged when the loadout is full or the tower isn't in
 * the pool.
 */
export function toggleTower<T extends string, A extends string>(
  pick: LoadoutPick<T, A>,
  tower: T,
  pools: LoadoutPools<T, A>,
): LoadoutPick<T, A> {
  if (pick.towers.includes(tower)) {
    return { ...pick, towers: pick.towers.filter((t) => t !== tower) };
  }
  if (pick.towers.length >= MAX_LOADOUT || !pools.towers.includes(tower)) return pick;
  return { ...pick, towers: [...pick.towers, tower] };
}

// ── Field Protocols (progression.md § 5; T308) ──────────────────────────────────────────────────

/** Whether protocol `id` takes a tower pick when equipped (Specialist). */
export function takesTowerPick(id: string): boolean {
  const defs: Readonly<Record<string, { readonly choice?: 'tower' }>> = PROTOCOLS;
  return Object.hasOwn(defs, id) && defs[id]?.choice === 'tower';
}

/**
 * Why `pick` can't be equipped (empty when it can): each protocol owned and equipped once, no more
 * than the save's slots, and a tower pick (an owned, unrevoked tower) for exactly the equipped
 * protocols that take one. The rules `metaModifiers` and the save validator enforce.
 */
export function protocolProblems(
  save: SaveData,
  pick: ProtocolPick,
  devUnlocks: readonly MetaSystem[] = [],
): string[] {
  const out: string[] = [];
  const owned = protocolPool(save);
  const slots = protocolSlotCount(save, devUnlocks);
  if (pick.equipped.length > slots) {
    out.push(`${pick.equipped.length} protocols equipped, but only ${slots} slots`);
  }
  const seen = new Set<string>();
  for (const id of pick.equipped) {
    if (seen.has(id)) out.push(`protocol '${id}' is equipped twice`);
    seen.add(id);
    if (!owned.includes(id)) out.push(`protocol '${id}' is not owned`);
    if (takesTowerPick(id)) {
      const tower = pick.picks[id];
      if (tower === undefined) out.push(`protocol '${id}' needs a tower pick`);
      else if (!towerPool(save).includes(tower)) out.push(`'${tower}' is not in the tower pool`);
    }
  }
  for (const id of Object.keys(pick.picks)) {
    if (!seen.has(id)) out.push(`a pick for protocol '${id}', which isn't equipped`);
  }
  return out;
}

/**
 * `pick` cut down to what the save allows now: owned protocols, each once, up to the slots; a
 * protocol that takes a tower keeps its pick while the tower is in the pool, else takes
 * `fallbackTower` (or leaves, with no tower to pick).
 */
export function fitProtocols(
  save: SaveData,
  pick: ProtocolPick,
  devUnlocks: readonly MetaSystem[] = [],
  fallbackTower: TowerId | null = null,
): { equipped: ProtocolId[]; picks: Partial<Record<ProtocolId, TowerId>> } {
  const owned = protocolPool(save);
  const pool = towerPool(save);
  const slots = protocolSlotCount(save, devUnlocks);
  const equipped: ProtocolId[] = [];
  const picks: Partial<Record<ProtocolId, TowerId>> = {};
  for (const id of pick.equipped) {
    if (equipped.length >= slots) break;
    if (equipped.includes(id) || !owned.includes(id)) continue;
    if (takesTowerPick(id)) {
      const kept = pick.picks[id];
      const tower = kept !== undefined && pool.includes(kept) ? kept : (fallbackTower ?? pool[0]);
      if (tower === undefined) continue;
      picks[id] = tower;
    }
    equipped.push(id);
  }
  return { equipped, picks };
}

/**
 * A save's modifiers (meta-runtime.md § Meta): its owned ranks, its equipped Field Protocols as the
 * battle takes them (`equippedProtocols`: owned, within its slots, with their tower picks), and its
 * difficulty, through `metaModifiers` (T327: protocols were left out). Owning a protocol grants
 * nothing until it's equipped.
 */
export function saveModifiers(
  save: SaveData,
  devUnlocks: readonly MetaSystem[] = [],
): Modifier<IdSpace>[] {
  const { equipped, picks } = equippedProtocols(save, devUnlocks);
  return metaModifiers({
    upgrades: save.upgrades,
    protocols: equipped,
    picks,
    difficulty: save.settings.difficulty,
  });
}

/** The save's equipped protocols as the battle takes them (fitProtocols over `loadouts`). */
export function equippedProtocols(
  save: SaveData,
  devUnlocks: readonly MetaSystem[] = [],
): { equipped: ProtocolId[]; picks: Partial<Record<ProtocolId, TowerId>> } {
  return fitProtocols(
    save,
    { equipped: save.loadouts.protocols, picks: save.loadouts.protocolPicks },
    devUnlocks,
  );
}

/**
 * The save with `pick` equipped (save-wide; progression.md § 5). Throws a RangeError on a pick
 * protocolProblems refuses (a caller bug: the picker only offers valid picks).
 */
export function withProtocols(
  save: SaveData,
  pick: ProtocolPick,
  devUnlocks: readonly MetaSystem[] = [],
): SaveData {
  const problems = protocolProblems(save, pick, devUnlocks);
  if (problems.length > 0) throw new RangeError(`protocols: ${problems.join('; ')}`);
  return {
    ...save,
    loadouts: { ...save.loadouts, protocols: [...pick.equipped], protocolPicks: { ...pick.picks } },
  };
}

/**
 * Toggles protocol `id` in the equipped list: an equipped one leaves, an unequipped one joins at
 * the end while a slot is free. With every slot full and only one slot, it swaps in for the one
 * equipped (one click to change your mind); with more slots, it's unchanged until one is dropped.
 */
export function toggleProtocol<P extends string>(
  equipped: readonly P[],
  id: P,
  slots: number,
): readonly P[] {
  if (equipped.includes(id)) return equipped.filter((p) => p !== id);
  if (equipped.length < slots) return [...equipped, id];
  if (slots === 1) return [id];
  return equipped;
}

// ── What a pick answers on a map ─────────────────────────────────────────────────────────────

/** What the counter checks need to know about a map (from its compiled data). */
export interface LoadoutMap {
  readonly act: Act;
  readonly threatIntel: readonly ThreatIntelId[];
  readonly requiredCounters: readonly CounterId[];
  /** The enemies in its waves (answerScope's act, body, and air conditions). */
  readonly enemies: readonly {
    readonly traits: readonly Trait[];
    readonly body: Body;
    readonly layer: Layer;
  }[];
  /** The companion's slot-2 ability (fixed by the map; it answers too when it can), or null. */
  readonly slot2: string | null;
}

/** Counter categories in enemies.md § 3.1's order. */
const COUNTER_ORDER: readonly CounterId[] = [
  'armor',
  'shield',
  'detection',
  'air',
  'burrowed',
  'splash',
  'jam',
];

/** The counter categories a map's threat intel calls for, plus its required ones, in order. */
export function mapCounters(map: LoadoutMap): CounterId[] {
  const set = new Set<CounterId>(map.requiredCounters);
  for (const t of map.threatIntel) {
    const c = t === 'boss' ? null : TRAIT_COUNTER[t]; // `boss` is intel-only
    if (c !== null) set.add(c);
  }
  return COUNTER_ORDER.filter((c) => set.has(c));
}

/**
 * How a tower answers a counter on a map: from tier 1, from a tier (`minTier`, reached in the
 * map with upgrades), or only as a tier-4 spec (`spec`, its name; needs the Engineering unlock).
 */
export interface TowerAnswerNote {
  readonly counter: CounterId;
  readonly minTier: number;
  readonly spec: string | null;
}

/**
 * A spec's display name, by tower and letter (from the compiled tower data), or null when the
 * tower has no such spec authored: an answer through it then doesn't count (T319).
 */
export type SpecNames = (tower: TowerId, spec: 'a' | 'b') => string | null;

/** The live registry's spec names: null for a tower whose specs ship later (D064). */
export const LIVE_SPEC_NAMES: SpecNames = (tower, spec) => {
  const def: { readonly specs?: Readonly<Record<'a' | 'b', { readonly name: string }>> } =
    TOWERS[tower];
  return def.specs?.[spec].name ?? null;
};

/**
 * The towers whose spec unlock `save` owns and that have specs authored (T319): a save can own an
 * unlock for specs still to ship (the all_unlocked dev save once did), which answers nothing.
 */
export function specsOwned(save: SaveData, names: SpecNames = LIVE_SPEC_NAMES): TowerId[] {
  return save.unlocks.specs.filter((t) => names(t, 'a') !== null);
}

/**
 * The map's counters a tower can answer (mapCounters), each by its easiest route: a plain answer
 * first, then the lowest tier, then a spec. Spec answers count only with `specsUnlocked` (the save's
 * Engineering unlock for this tower) and only for a spec that exists (`specName` isn't null; T319).
 */
export function towerAnswers(
  tower: TowerId,
  specsUnlocked: boolean,
  map: LoadoutMap,
  specName: SpecNames = LIVE_SPEC_NAMES,
): TowerAnswerNote[] {
  const out: TowerAnswerNote[] = [];
  for (const counter of mapCounters(map)) {
    const scope = answerScope(counter, map.act, map.enemies);
    let best: TowerAnswerNote | null = null;
    for (const entry of COUNTER_ANSWERS[counter].towers) {
      if (entry.tower !== tower) continue;
      const name = entry.spec === undefined ? null : specName(tower, entry.spec);
      if (entry.spec !== undefined && (!specsUnlocked || name === null)) continue;
      const reached: ReachedTower =
        entry.spec === undefined
          ? { tower, tier: entry.minTier ?? 1, spec: null }
          : { tower, tier: MAX_TIER_BEFORE_SPEC + 1, spec: entry.spec };
      const one = { towers: [entry], abilities: [] };
      if (answersCarried(one, scope, [reached], []).length === 0) continue;
      const note: TowerAnswerNote =
        entry.spec === undefined
          ? { counter, minTier: entry.minTier ?? 1, spec: null }
          : {
              counter,
              minTier: MAX_TIER_BEFORE_SPEC + 1,
              spec: name,
            };
      if (best === null || note.minTier < best.minTier) best = note;
    }
    if (best !== null) out.push(best);
  }
  return out;
}

/** The map's counters an ability answers when cast (COUNTER_ANSWERS' detection and jam lists). */
export function abilityAnswers(ability: string, map: LoadoutMap): CounterId[] {
  return mapCounters(map).filter((c) => COUNTER_ANSWERS[c].abilities.includes(ability));
}

/**
 * The map's required counters a pick leaves unanswered: no picked tower answers it by any route
 * the save can reach (towerAnswers), and neither the Technician's ability nor the companion's.
 * The screen warns about these; it never blocks the pick.
 */
export function uncoveredCounters(
  pick: LoadoutPick,
  save: SaveData,
  map: LoadoutMap,
  specName?: SpecNames,
): CounterId[] {
  const covered = new Set<CounterId>();
  for (const t of pick.towers) {
    const owned = save.unlocks.specs.includes(t);
    for (const a of towerAnswers(t, owned, map, specName)) covered.add(a.counter);
  }
  for (const ability of [pick.ability, map.slot2]) {
    if (ability !== null) for (const c of abilityAnswers(ability, map)) covered.add(c);
  }
  return map.requiredCounters.filter((c) => !covered.has(c));
}

/** A synergy link as the screen needs it: two partner towers (content/links). */
export interface LinkPair {
  readonly id: string;
  readonly partners: readonly [{ readonly tower: string }, { readonly tower: string }];
}

/** The links whose partners are both in `towers` (the ones a loadout of them can form). */
export function linksAmong<L extends LinkPair>(
  towers: readonly string[],
  links: readonly L[],
): L[] {
  return links.filter((l) => l.partners.every((p) => towers.includes(p.tower)));
}
