// The strict schema check for SaveData. Saves are untrusted input (a pasted code, a hand-edited
// localStorage value), so validation never trusts a field: every key must be known, every id must
// exist in the live registries, every number must be a bounded integer, and nothing outside the
// schema survives. On success it returns a freshly built copy, so the caller never holds the
// parsed object (no extra keys, no shared references, no prototype tricks).
import { CALLSIGN_IDS, PRONOUN_IDS, isValidPlayerName } from '../content/dialogue/profile.ts';
import { MAX_LOADOUT } from '../content/rules.ts';
import type { FlagValue, MapId, ProtocolId, TowerId } from '../content/types.ts';
import type {
  KnownIds,
  LoadoutPreset,
  MapRecord,
  PlayerProfile,
  SaveData,
  SaveEnvelope,
  StoryFlagId,
} from './saveData.ts';
import { CODEX_VERSIONS, DIFFICULTIES, LIVE_KNOWN_IDS } from './saveData.ts';
import { hintIds } from './hints.ts';
import { protocolSlots } from './modifiers.ts';

export type Validated<T> = { ok: true; value: T } | { ok: false; errors: string[] };

/** Validation stops collecting after this many errors. */
export const MAX_ERRORS = 20;
/** Bounds that no legitimate save comes near; they keep hostile values out of the game. */
export const SAVE_LIMITS = {
  currency: 1_000_000_000,
  count: Number.MAX_SAFE_INTEGER,
  meter: 1_000_000,
  medalsPerMap: 3,
  /** Optional objectives a map record may hold (no map has more than one yet). */
  objectivesPerMap: 3,
  upgradeRank: 10,
  /** Longest list of free-form ids (scenes, memos, codex entries, grants). */
  idList: 1024,
  bricksTagIndex: 10_000,
} as const;

/**
 * A currency balance as a save may hold it: a whole number in [0, SAVE_LIMITS.currency]. Run end
 * and purchases clamp with it, so a long campaign (or a dev save near the cap) never writes a save
 * that validation then refuses.
 */
export function clampCurrency(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.floor(n), SAVE_LIMITS.currency);
}

/** Ids with no registry yet (scenes, memos, codex entries, grants, medals, flag values). */
const FREE_ID = /^[a-z][a-z0-9_]{0,47}$/;

/**
 * Whether a save can hold `id` as a free-form id (lowercase snake_case from a letter, ≤ 48
 * chars): what `story.seen` keeps (scene, bark, and codex-read ids), so content whose id fails it
 * would make a save validation refuses (meta/freeIds.test.ts checks every one).
 */
export function isFreeId(id: string): boolean {
  return FREE_ID.test(id);
}

/** True for a plain object (from JSON.parse or a literal): not null, not a list, not a class. */
export function isPlainRecord(x: unknown): x is Record<string, unknown> {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return false;
  const proto: unknown = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}

/** Narrows `x` to a member of `list`. */
function isMember<T extends string>(list: readonly T[], x: string): x is T {
  const wide: readonly string[] = list;
  return wide.includes(x);
}

class Checker {
  readonly errors: string[] = [];

  fail(path: string, message: string): void {
    if (this.errors.length < MAX_ERRORS) this.errors.push(`${path}: ${message}`);
  }

  /** Checks `x` is a plain object with exactly `keys`; returns it, or null after reporting. */
  /** `optional`: fields that may be absent (each reader supplies its default). */
  object(
    x: unknown,
    path: string,
    keys: readonly string[],
    optional: readonly string[] = [],
  ): Record<string, unknown> | null {
    const obj = this.record(x, path);
    if (obj === null) return null;
    for (const key of keys) {
      if (!Object.hasOwn(obj, key)) this.fail(path, `missing field "${key}"`);
    }
    for (const key of Object.keys(obj)) {
      if (!keys.includes(key) && !optional.includes(key)) {
        this.fail(path, `unknown field ${JSON.stringify(key.slice(0, 64))}`);
      }
    }
    return obj;
  }

  /** Checks `x` is a plain object (any keys); returns it, or null after reporting. */
  record(x: unknown, path: string): Record<string, unknown> | null {
    if (isPlainRecord(x)) return x;
    const isObject = typeof x === 'object' && x !== null && !Array.isArray(x);
    this.fail(
      path,
      isObject ? 'expected a plain object' : `expected an object, got ${describe(x)}`,
    );
    return null;
  }

  int(x: unknown, path: string, min: number, max: number): number {
    if (typeof x !== 'number' || !Number.isSafeInteger(x) || x < min || x > max) {
      this.fail(path, `expected an integer in [${min}, ${max}], got ${describe(x)}`);
      return min;
    }
    return x;
  }

  bool(x: unknown, path: string): boolean {
    if (typeof x !== 'boolean') {
      this.fail(path, `expected a boolean, got ${describe(x)}`);
      return false;
    }
    return x;
  }

  /** An id from `known`. */
  id<T extends string>(x: unknown, path: string, known: readonly T[]): T | null {
    if (typeof x !== 'string') {
      this.fail(path, `expected an id string, got ${describe(x)}`);
      return null;
    }
    if (!isMember(known, x)) {
      this.fail(path, `unknown id ${JSON.stringify(x.slice(0, 64))}`);
      return null;
    }
    return x;
  }

  /** A free-form id (no registry yet): lowercase snake_case, starting with a letter. */
  freeId(x: unknown, path: string): string | null {
    if (typeof x !== 'string') {
      this.fail(path, `expected an id string, got ${describe(x)}`);
      return null;
    }
    if (!FREE_ID.test(x)) {
      this.fail(path, `unknown id ${JSON.stringify(x.slice(0, 64))}`);
      return null;
    }
    return x;
  }

  /** A list of distinct ids from `known` (or free-form ids, when `known` is null). */
  ids<T extends string>(x: unknown, path: string, known: readonly T[], max?: number): T[];
  ids(x: unknown, path: string, known: null, max: number): string[];
  ids(
    x: unknown,
    path: string,
    known: readonly string[] | null,
    max = known?.length ?? 0,
  ): string[] {
    if (!Array.isArray(x)) {
      this.fail(path, `expected a list, got ${describe(x)}`);
      return [];
    }
    if (x.length > max) {
      this.fail(path, `expected at most ${max} entries, got ${x.length}`);
      return [];
    }
    const out: string[] = [];
    x.forEach((item: unknown, i) => {
      const at = `${path}[${i}]`;
      const id = known === null ? this.freeId(item, at) : this.id(item, at, known);
      if (id === null) return;
      if (out.includes(id)) this.fail(at, `duplicate id "${id}"`);
      else out.push(id);
    });
    return out;
  }

  subset(sub: readonly string[], of: readonly string[], path: string, ofPath: string): void {
    for (const id of sub) {
      if (!of.includes(id)) this.fail(path, `"${id}" is not in ${ofPath}`);
    }
  }
}

function describe(x: unknown): string {
  if (x === null) return 'null';
  if (Array.isArray(x)) return 'a list';
  if (typeof x === 'string') return `the string ${JSON.stringify(x.slice(0, 32))}`;
  if (typeof x === 'number') return String(x);
  return typeof x;
}

/**
 * Validates untrusted SaveData of the current version against the known ids. Returns a fresh,
 * normalized copy, or every error found (up to MAX_ERRORS), each prefixed with its field path.
 */
export function validateSave(x: unknown, known: KnownIds = LIVE_KNOWN_IDS): Validated<SaveData> {
  const c = new Checker();
  const data = checkSave(c, x, 'data', known);
  return data === null || c.errors.length > 0
    ? { ok: false, errors: c.errors }
    : { ok: true, value: data };
}

/** Validates an envelope `{ v, savedAt, data }` whose data is already at the current version. */
export function validateEnvelope(
  x: unknown,
  version: number,
  known: KnownIds = LIVE_KNOWN_IDS,
): Validated<SaveEnvelope> {
  const c = new Checker();
  const env = c.object(x, 'save', ['v', 'savedAt', 'data']);
  if (env === null) return { ok: false, errors: c.errors };
  if (env['v'] !== version)
    c.fail('save.v', `expected version ${version}, got ${describe(env['v'])}`);
  const savedAt = c.int(env['savedAt'], 'save.savedAt', 0, Number.MAX_SAFE_INTEGER);
  const data = checkSave(c, env['data'], 'save.data', known);
  return data === null || c.errors.length > 0
    ? { ok: false, errors: c.errors }
    : { ok: true, value: { v: version, savedAt, data } };
}

function checkSave(c: Checker, x: unknown, path: string, known: KnownIds): SaveData | null {
  const root = c.object(x, path, [
    'profile',
    'campaign',
    'currencies',
    'unlocks',
    'upgrades',
    'story',
    'stats',
    'settings',
    'loadouts',
    'seenHints',
  ]);
  if (root === null) return null;
  const profile =
    root['profile'] === null ? null : checkProfile(c, root['profile'], `${path}.profile`);
  const campaign = checkCampaign(c, root['campaign'], `${path}.campaign`, known);
  const currencies = checkCurrencies(c, root['currencies'], `${path}.currencies`);
  const unlocks = checkUnlocks(c, root['unlocks'], `${path}.unlocks`, known);
  const upgrades = checkUpgrades(c, root['upgrades'], `${path}.upgrades`, known);
  const story = checkStory(c, root['story'], `${path}.story`, known);
  const stats = checkStats(c, root['stats'], `${path}.stats`);
  const settings = checkSettings(c, root['settings'], `${path}.settings`);
  const loadouts =
    unlocks &&
    upgrades &&
    checkLoadouts(c, root['loadouts'], `${path}.loadouts`, known, unlocks, upgrades);
  const seenHints = c.ids(root['seenHints'], `${path}.seenHints`, hintIds(known.towers));
  if (
    (root['profile'] !== null && !profile) ||
    !campaign ||
    !currencies ||
    !unlocks ||
    !upgrades ||
    !story ||
    !stats ||
    !settings ||
    !loadouts
  ) {
    return null;
  }
  return {
    profile,
    campaign,
    currencies,
    unlocks,
    upgrades,
    story,
    stats,
    settings,
    loadouts,
    seenHints,
  };
}

/** The intake's profile: a valid name (core-loop.md § 6.1), a pronoun set, and a callsign. */
function checkProfile(c: Checker, x: unknown, path: string): PlayerProfile | null {
  const p = c.object(x, path, ['name', 'pronouns', 'callsign']);
  if (p === null) return null;
  const name = p['name'];
  if (typeof name !== 'string' || !isValidPlayerName(name)) {
    c.fail(
      `${path}.name`,
      `expected 1–16 letters, digits, spaces, apostrophes, hyphens, or periods, got ${describe(name)}`,
    );
  }
  const pronouns = c.id(p['pronouns'], `${path}.pronouns`, PRONOUN_IDS);
  const callsign = c.id(p['callsign'], `${path}.callsign`, CALLSIGN_IDS);
  if (typeof name !== 'string' || !isValidPlayerName(name) || !pronouns || !callsign) return null;
  return { name, pronouns, callsign };
}

function checkCampaign(
  c: Checker,
  x: unknown,
  path: string,
  known: KnownIds,
): SaveData['campaign'] | null {
  const campaign = c.object(x, path, ['maps', 'seenEnemies']);
  if (campaign === null) return null;
  const seenEnemies = c.ids(campaign['seenEnemies'], `${path}.seenEnemies`, known.enemies);
  const maps = c.record(campaign['maps'], `${path}.maps`);
  if (maps === null) return null;
  const out: Partial<Record<MapId, MapRecord>> = {};
  for (const [mapId, raw] of Object.entries(maps)) {
    const mapPath = `${path}.maps.${mapId}`;
    if (!isMember(known.maps, mapId)) {
      c.fail(`${path}.maps`, `unknown map id ${JSON.stringify(mapId.slice(0, 64))}`);
      continue;
    }
    const rec = c.object(raw, mapPath, ['completed', 'medals', 'bestMeter'], ['objectives']);
    if (rec === null) continue;
    const completed = c.bool(rec['completed'], `${mapPath}.completed`);
    const medals = c.ids(rec['medals'], `${mapPath}.medals`, null, SAVE_LIMITS.medalsPerMap);
    if (medals.length > 0 && !completed) {
      c.fail(`${mapPath}.medals`, 'medals need a win, but the map is not completed');
    }
    const bestMeter = c.int(rec['bestMeter'], `${mapPath}.bestMeter`, 0, SAVE_LIMITS.meter);
    if (rec['objectives'] === undefined) {
      out[mapId] = { completed, medals, bestMeter };
      continue;
    }
    const objPath = `${mapPath}.objectives`;
    const objectives = c.ids(rec['objectives'], objPath, null, SAVE_LIMITS.objectivesPerMap);
    if (objectives.length > 0 && !completed) {
      c.fail(objPath, 'objectives need a win, but the map is not completed');
    }
    out[mapId] = { completed, medals, bestMeter, objectives };
  }
  return { maps: out, seenEnemies };
}

function checkCurrencies(c: Checker, x: unknown, path: string): SaveData['currencies'] | null {
  const cur = c.object(x, path, ['stardust', 'intel']);
  if (cur === null) return null;
  return {
    stardust: c.int(cur['stardust'], `${path}.stardust`, 0, SAVE_LIMITS.currency),
    intel: c.int(cur['intel'], `${path}.intel`, 0, SAVE_LIMITS.currency),
  };
}

function checkUnlocks(
  c: Checker,
  x: unknown,
  path: string,
  known: KnownIds,
): SaveData['unlocks'] | null {
  const u = c.object(
    x,
    path,
    ['towers', 'specs', 'revokedTowers', 'jailbroken', 'abilities', 'revokedAbilities', 'protocols'],
    ['inheritedAbilities'],
  );
  if (u === null) return null;
  const towers = c.ids(u['towers'], `${path}.towers`, known.towers);
  const specs = c.ids(u['specs'], `${path}.specs`, known.towers);
  const revokedTowers = c.ids(u['revokedTowers'], `${path}.revokedTowers`, known.towers);
  const jailbroken = c.ids(u['jailbroken'], `${path}.jailbroken`, known.towers);
  const abilities = c.ids(u['abilities'], `${path}.abilities`, known.abilities);
  const revokedAbilities = c.ids(
    u['revokedAbilities'],
    `${path}.revokedAbilities`,
    known.abilities,
  );
  const towersPath = `${path}.towers`;
  c.subset(specs, towers, `${path}.specs`, towersPath);
  c.subset(revokedTowers, towers, `${path}.revokedTowers`, towersPath);
  c.subset(jailbroken, towers, `${path}.jailbroken`, towersPath);
  c.subset(revokedAbilities, abilities, `${path}.revokedAbilities`, `${path}.abilities`);
  const protocols = c.ids(u['protocols'], `${path}.protocols`, known.protocols);
  const out = { towers, specs, revokedTowers, jailbroken, abilities, revokedAbilities, protocols };
  // Optional (absent until the first inheritance, so no SaveData bump): kept absent when absent.
  if (u['inheritedAbilities'] === undefined) return out;
  const inheritedAbilities = c.ids(
    u['inheritedAbilities'],
    `${path}.inheritedAbilities`,
    known.abilities,
  );
  c.subset(inheritedAbilities, abilities, `${path}.inheritedAbilities`, `${path}.abilities`);
  return { ...out, inheritedAbilities };
}

function checkUpgrades(
  c: Checker,
  x: unknown,
  path: string,
  known: KnownIds,
): SaveData['upgrades'] | null {
  const ups = c.record(x, path);
  if (ups === null) return null;
  // Keyed by string so this compiles while UpgradeId is never; every key is checked below.
  const out: Record<string, number> = {};
  for (const [id, rank] of Object.entries(ups)) {
    const ranks: Readonly<Record<string, number>> = known.upgradeRanks;
    if (!Object.hasOwn(ranks, id)) {
      c.fail(path, `unknown upgrade id ${JSON.stringify(id.slice(0, 64))}`);
      continue;
    }
    // Each item's own rank count: a hostile rank past it would pass a global bound, then crash
    // every battle start (metaModifiers refuses it).
    out[id] = c.int(rank, `${path}.${id}`, 1, Math.min(ranks[id] ?? 0, SAVE_LIMITS.upgradeRank));
  }
  return out;
}

function checkStory(
  c: Checker,
  x: unknown,
  path: string,
  known: KnownIds,
): SaveData['story'] | null {
  const s = c.object(x, path, [
    'flags',
    'seen',
    'memosRead',
    'memosDelivered',
    'codex',
    'bricksTagIndex',
    'memorialTower',
    'granted',
  ]);
  if (s === null) return null;
  const flags = checkFlags(c, s['flags'], `${path}.flags`, known);
  const codex = checkCodex(c, s['codex'], `${path}.codex`);
  if (flags === null || codex === null) return null;
  const memorial = s['memorialTower'];
  const max = SAVE_LIMITS.idList;
  const memosRead = c.ids(s['memosRead'], `${path}.memosRead`, null, max);
  const memosDelivered = c.ids(s['memosDelivered'], `${path}.memosDelivered`, null, max);
  c.subset(memosRead, memosDelivered, `${path}.memosRead`, `${path}.memosDelivered`);
  return {
    flags,
    seen: c.ids(s['seen'], `${path}.seen`, null, max),
    memosRead,
    memosDelivered,
    codex,
    bricksTagIndex: c.int(
      s['bricksTagIndex'],
      `${path}.bricksTagIndex`,
      0,
      SAVE_LIMITS.bricksTagIndex,
    ),
    memorialTower: memorial === null ? null : c.id(memorial, `${path}.memorialTower`, known.towers),
    granted: c.ids(s['granted'], `${path}.granted`, null, max),
  };
}

function checkFlags(
  c: Checker,
  x: unknown,
  path: string,
  known: KnownIds,
): SaveData['story']['flags'] | null {
  const flags = c.record(x, path);
  if (flags === null) return null;
  const out: Partial<Record<StoryFlagId, FlagValue>> = {};
  for (const [id, value] of Object.entries(flags)) {
    if (!isMember(known.storyFlags, id)) {
      c.fail(path, `unknown story flag ${JSON.stringify(id.slice(0, 64))}`);
      continue;
    }
    // T218: each flag holds one of its own declared values (content/dialogue/flags.ts).
    const values: readonly FlagValue[] = known.flagValues[id] ?? [];
    const match = values.find((v) => v === value);
    if (match !== undefined) out[id] = match;
    else {
      const allowed = values.map((v) => JSON.stringify(v)).join(', ');
      c.fail(`${path}.${id}`, `expected one of ${allowed}, got ${describe(value)}`);
    }
  }
  return out;
}

function checkCodex(c: Checker, x: unknown, path: string): SaveData['story']['codex'] | null {
  const codex = c.record(x, path);
  if (codex === null) return null;
  const entries = Object.entries(codex);
  if (entries.length > SAVE_LIMITS.idList) {
    c.fail(path, `expected at most ${SAVE_LIMITS.idList} entries, got ${entries.length}`);
    return null;
  }
  const out: SaveData['story']['codex'] = {};
  for (const [id, list] of entries) {
    if (c.freeId(id, path) === null) continue;
    const versions = c.ids(list, `${path}.${id}`, CODEX_VERSIONS);
    if (Array.isArray(list) && list.length === 0) {
      c.fail(`${path}.${id}`, 'expected at least one version');
    }
    out[id] = versions;
  }
  return out;
}

function checkStats(c: Checker, x: unknown, path: string): SaveData['stats'] | null {
  const s = c.object(x, path, ['pestsProcessed', 'runs']);
  if (s === null) return null;
  return {
    pestsProcessed: c.int(s['pestsProcessed'], `${path}.pestsProcessed`, 0, SAVE_LIMITS.count),
    runs: c.int(s['runs'], `${path}.runs`, 0, SAVE_LIMITS.count),
  };
}

function checkSettings(c: Checker, x: unknown, path: string): SaveData['settings'] | null {
  const s = c.object(x, path, ['difficulty']);
  if (s === null) return null;
  const difficulty = c.id(s['difficulty'], `${path}.difficulty`, DIFFICULTIES);
  return difficulty === null ? null : { difficulty };
}

/**
 * Loadout presets: each 1 to MAX_LOADOUT distinct owned towers and an owned ability (or null), keyed
 * by known map. Revoked towers and abilities are allowed: a preset can predate a revocation, and
 * meta/loadout.ts drops what the pools no longer hold when it reads one.
 */
function checkLoadouts(
  c: Checker,
  x: unknown,
  path: string,
  known: KnownIds,
  unlocks: SaveData['unlocks'],
  upgrades: SaveData['upgrades'],
): SaveData['loadouts'] | null {
  const l = c.object(x, path, ['last', 'byMap', 'protocols', 'protocolPicks']);
  if (l === null) return null;
  const equipped = checkEquipped(c, l, path, known, unlocks, upgrades);
  const byMap = c.record(l['byMap'], `${path}.byMap`);
  if (byMap === null) return null;
  const outMaps: Partial<Record<MapId, LoadoutPreset>> = {};
  for (const [mapId, raw] of Object.entries(byMap)) {
    if (!isMember(known.maps, mapId)) {
      c.fail(`${path}.byMap`, `unknown map id ${JSON.stringify(mapId.slice(0, 64))}`);
      continue;
    }
    const preset = checkPreset(c, raw, `${path}.byMap.${mapId}`, known, unlocks);
    if (preset !== null) outMaps[mapId] = preset;
  }
  const last =
    l['last'] === null ? null : checkPreset(c, l['last'], `${path}.last`, known, unlocks);
  if (equipped === null) return null;
  return { last, byMap: outMaps, ...equipped };
}

/**
 * Equipped Field Protocols: owned, distinct, no more than the save's slots (`protocolSlots` over
 * its upgrades), and a tower pick (an owned tower) for exactly the equipped protocols that take
 * one. These are the rules `metaModifiers` refuses, so a valid save never fails a battle start.
 */
function checkEquipped(
  c: Checker,
  l: Record<string, unknown>,
  path: string,
  known: KnownIds,
  unlocks: SaveData['unlocks'],
  upgrades: SaveData['upgrades'],
): Pick<SaveData['loadouts'], 'protocols' | 'protocolPicks'> | null {
  const protocols = c.ids(l['protocols'], `${path}.protocols`, known.protocols);
  c.subset(protocols, unlocks.protocols, `${path}.protocols`, 'unlocks.protocols');
  const slots = protocolSlots(upgrades);
  if (protocols.length > slots) {
    c.fail(`${path}.protocols`, `${protocols.length} protocols equipped, but only ${slots} slots`);
  }
  const raw = c.record(l['protocolPicks'], `${path}.protocolPicks`);
  if (raw === null) return null;
  const picks: Partial<Record<ProtocolId, TowerId>> = {};
  for (const [id, tower] of Object.entries(raw)) {
    const at = `${path}.protocolPicks`;
    if (!isMember(protocols, id)) {
      c.fail(at, `a pick for ${JSON.stringify(id.slice(0, 64))}, which isn't equipped`);
      continue;
    }
    if (!known.protocolsWithPick.includes(id)) {
      c.fail(at, `protocol "${id}" takes no pick`);
      continue;
    }
    const t = c.id(tower, `${at}.${id}`, known.towers);
    if (t === null) continue;
    c.subset([t], unlocks.towers, `${at}.${id}`, 'unlocks.towers');
    picks[id] = t;
  }
  for (const id of protocols) {
    if (known.protocolsWithPick.includes(id) && !Object.hasOwn(raw, id)) {
      c.fail(`${path}.protocolPicks`, `protocol "${id}" is equipped with no tower pick`);
    }
  }
  return { protocols, protocolPicks: picks };
}

function checkPreset(
  c: Checker,
  x: unknown,
  path: string,
  known: KnownIds,
  unlocks: SaveData['unlocks'],
): LoadoutPreset | null {
  const p = c.object(x, path, ['towers', 'ability']);
  if (p === null) return null;
  const towers = c.ids(p['towers'], `${path}.towers`, known.towers, MAX_LOADOUT);
  if (Array.isArray(p['towers']) && p['towers'].length === 0) {
    c.fail(`${path}.towers`, 'expected at least one tower');
  }
  c.subset(towers, unlocks.towers, `${path}.towers`, 'unlocks.towers');
  const raw = p['ability'];
  const ability = raw === null ? null : c.id(raw, `${path}.ability`, known.abilities);
  if (ability !== null)
    c.subset([ability], unlocks.abilities, `${path}.ability`, 'unlocks.abilities');
  return { towers, ability };
}
