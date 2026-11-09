// The loadout (design/core-loop.md § 1, T201): what a save may bring into a map, when the loadout
// screen is shown (the skip rule), the presets it remembers (SaveData.loadouts), and what a pick
// answers on a map (its counters and synergy links). Pure: the app builds the screen's view from
// these, and app/battleSetup.ts asks `resolveLoadout` for the battle's towers and ability.
// Field Protocols and the finale's companion pick join the screen with their pickers (M3, M5).
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
  Layer,
  MapId,
  TowerId,
  Trait,
} from '../content/types.ts';
import { abilityPool, towerPool } from './pools.ts';
import { isSystemUnlocked, type MetaSystem } from './progress.ts';
import type { LoadoutPreset, SaveData } from './saveData.ts';

/**
 * What the loadout screen offers: the save's unrevoked towers and Technician abilities. The pick
 * rules are generic over the id types, so tests can try pools the registries can't fill yet.
 */
export interface LoadoutPools<T extends string = TowerId, A extends string = AbilityId> {
  readonly towers: readonly T[];
  readonly abilities: readonly A[];
}

/** A pick on the loadout screen (or a stored preset): towers in build-slot order, and slot 1. */
export interface LoadoutPick<T extends string = TowerId, A extends string = AbilityId> {
  readonly towers: readonly T[];
  readonly ability: A | null;
}

export function loadoutPools(save: SaveData): LoadoutPools {
  return { towers: towerPool(save), abilities: abilityPool(save) };
}

/**
 * The skip rule's "a choice to make" (core-loop.md § 1): more tower types than fit, or more than
 * one Technician ability. Protocols don't count until their picker exists (M3), nor the companion
 * until the finale's pick list (M5).
 */
export function hasLoadoutChoice(pools: LoadoutPools<string, string>): boolean {
  return pools.towers.length > MAX_LOADOUT || pools.abilities.length > 1;
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
  return isSystemUnlocked(save, 'loadout', devUnlocks) && hasLoadoutChoice(loadoutPools(save));
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
 * The save with `pick` remembered as `mapId`'s preset and as the last one. Throws a RangeError on
 * a pick the pools don't allow (a caller bug: the screen only offers valid picks).
 */
export function withPreset(save: SaveData, mapId: MapId, pick: LoadoutPick): SaveData {
  const problems = pickProblems(pick, loadoutPools(save));
  if (problems.length > 0) throw new RangeError(`loadout: ${problems.join('; ')}`);
  const preset = (): LoadoutPreset => ({ towers: [...pick.towers], ability: pick.ability });
  return {
    ...save,
    loadouts: { last: preset(), byMap: { ...save.loadouts.byMap, [mapId]: preset() } },
  };
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

// ── What a pick answers on a map ─────────────────────────────────────────────────────────────

/** What the counter checks need to know about a map (from its compiled data). */
export interface LoadoutMap {
  readonly act: Act;
  readonly threatIntel: readonly Trait[];
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
    const c = TRAIT_COUNTER[t];
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

/** A spec's display name, by tower and letter (from the compiled tower data). */
export type SpecNames = (tower: TowerId, spec: 'a' | 'b') => string | null;

/**
 * The map's counters a tower can answer (mapCounters), each by its easiest route: a plain answer
 * first, then the lowest tier, then a spec. Spec answers count only with `specsOwned` (the save's
 * Engineering unlock for this tower).
 */
export function towerAnswers(
  tower: TowerId,
  specsOwned: boolean,
  map: LoadoutMap,
  specName: SpecNames = () => null,
): TowerAnswerNote[] {
  const out: TowerAnswerNote[] = [];
  for (const counter of mapCounters(map)) {
    const scope = answerScope(counter, map.act, map.enemies);
    let best: TowerAnswerNote | null = null;
    for (const entry of COUNTER_ANSWERS[counter].towers) {
      if (entry.tower !== tower) continue;
      if (entry.spec !== undefined && !specsOwned) continue;
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
              spec: specName(tower, entry.spec) ?? entry.specName ?? entry.spec,
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
